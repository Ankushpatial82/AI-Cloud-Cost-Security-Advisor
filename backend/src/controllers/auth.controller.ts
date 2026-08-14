import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/db";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { generateMFASecret, generateQRCodeDataURL, verifyMFAToken } from "../utils/mfa";
import { logAuditEvent } from "../middlewares/audit";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: "Email, password, and name are required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "User with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          isEmailVerified: true, // Auto-verified for local simplicity
        },
      });

      // 2. Create Default Organization
      const org = await tx.organization.create({
        data: {
          name: `${name}'s Organization`,
        },
      });

      // 3. Connect User as OWNER of Organization
      await tx.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: "OWNER",
        },
      });

      // 4. Default Notification Settings
      await tx.notificationSetting.create({
        data: {
          organizationId: org.id,
          emailAlerts: true,
        },
      });

      // 5. Default Billing Subscription (Trialing Free tier)
      await tx.billingSubscription.create({
        data: {
          organizationId: org.id,
          plan: "FREE",
          status: "TRIALING",
        },
      });

      return { user, org };
    });

    const tokenPayload = { userId: result.user.id, email: result.user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Write audit log
    await logAuditEvent({
      userId: result.user.id,
      organizationId: result.org.id,
      action: "USER_REGISTERED",
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
      details: { email: result.user.email, name: result.user.name },
    });

    // Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          mfaEnabled: result.user.mfaEnabled,
        },
        organization: {
          id: result.org.id,
          name: result.org.name,
          role: "OWNER",
        },
        accessToken,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Registration failed", error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Check if user has MFA enabled
    if (user.mfaEnabled) {
      // Return a temporary token indicating MFA is required
      const mfaToken = generateAccessToken({ userId: user.id, email: user.email });
      return res.json({
        success: true,
        message: "MFA code verification required",
        data: {
          mfaRequired: true,
          mfaToken,
        },
      });
    }

    const tokenPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const primaryOrg = user.memberships[0]?.organization;
    const primaryRole = user.memberships[0]?.role;

    if (primaryOrg) {
      await logAuditEvent({
        userId: user.id,
        organizationId: primaryOrg.id,
        action: "USER_LOGGED_IN",
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
        details: { email: user.email },
      });
    }

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          mfaEnabled: false,
        },
        organization: primaryOrg
          ? {
              id: primaryOrg.id,
              name: primaryOrg.name,
              role: primaryRole,
            }
          : null,
        accessToken,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Login failed", error: error.message });
  }
};

export const verifyMFA = async (req: Request, res: Response) => {
  try {
    const { code, mfaToken } = req.body;

    if (!code || !mfaToken) {
      return res.status(400).json({ success: false, message: "Code and mfaToken are required" });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(mfaToken); // Treat mfaToken as normal JWT payload
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired MFA token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user || !user.mfaSecret) {
      return res.status(400).json({ success: false, message: "MFA not configured for this user" });
    }

    const isVerified = verifyMFAToken(user.mfaSecret, code);
    if (!isVerified) {
      return res.status(401).json({ success: false, message: "Invalid code" });
    }

    const tokenPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const primaryOrg = user.memberships[0]?.organization;
    const primaryRole = user.memberships[0]?.role;

    if (primaryOrg) {
      await logAuditEvent({
        userId: user.id,
        organizationId: primaryOrg.id,
        action: "USER_LOGGED_IN_MFA",
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
        details: { email: user.email },
      });
    }

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "MFA verification successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          mfaEnabled: true,
        },
        organization: primaryOrg
          ? {
              id: primaryOrg.id,
              name: primaryOrg.name,
              role: primaryRole,
            }
          : null,
        accessToken,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Verification failed", error: error.message });
  }
};

export const setupMFA = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { secret, otpauthUrl } = generateMFASecret(user.email);
    const qrCodeUrl = await generateQRCodeDataURL(otpauthUrl);

    // Temporarily save secret in DB to verify in next step
    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    return res.json({
      success: true,
      data: {
        secret,
        qrCodeUrl,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "MFA setup failed", error: error.message });
  }
};

export const confirmMFASetup = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { code } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!code) return res.status(400).json({ success: false, message: "Code is required" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      return res.status(400).json({ success: false, message: "MFA setup has not been initialized" });
    }

    const isValid = verifyMFAToken(user.mfaSecret, code);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid MFA verification code" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    return res.json({
      success: true,
      message: "Multi-Factor Authentication enabled successfully",
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to enable MFA", error: error.message });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) {
      return res.status(400).json({ success: false, message: "Refresh token is required" });
    }

    const decoded = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const tokenPayload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(tokenPayload);

    return res.json({
      success: true,
      data: {
        accessToken,
      },
    });
  } catch (error: any) {
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie("refreshToken");
  return res.json({ success: true, message: "Logged out successfully" });
};
