import { Request, Response } from "express";
import prisma from "../config/db";
import { logAuditEvent } from "../middlewares/audit";

export const getOrganizations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const memberships = await prisma.userOrganization.findMany({
      where: { userId },
      include: {
        organization: true,
      },
    });

    const organizations = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      role: m.role,
      createdAt: m.organization.createdAt,
    }));

    return res.json({ success: true, data: organizations });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to load organizations", error: error.message });
  }
};

export const createOrganization = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!name) return res.status(400).json({ success: false, message: "Organization name is required" });

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name } });
      
      const membership = await tx.userOrganization.create({
        data: {
          userId,
          organizationId: org.id,
          role: "OWNER",
        },
      });

      await tx.notificationSetting.create({
        data: {
          organizationId: org.id,
          emailAlerts: true,
        },
      });

      await tx.billingSubscription.create({
        data: {
          organizationId: org.id,
          plan: "FREE",
          status: "TRIALING",
        },
      });

      return { org, membership };
    });

    await logAuditEvent({
      userId,
      organizationId: result.org.id,
      action: "ORGANIZATION_CREATED",
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
      details: { name },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: result.org.id,
        name: result.org.name,
        role: result.membership.role,
        createdAt: result.org.createdAt,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to create organization", error: error.message });
  }
};

export const getMembers = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    const memberships = await prisma.userOrganization.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    const members = memberships.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      createdAt: m.createdAt,
    }));

    return res.json({ success: true, data: members });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to load members", error: error.message });
  }
};

export const addMember = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    const { email, role } = req.body;

    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });
    if (!email || !role) {
      return res.status(400).json({ success: false, message: "Email and role are required" });
    }

    // Find if user exists
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Mock automatic registration for invited user to simplify local experience
      const mockPasswordHash = await prisma.user.findFirst().then(u => u?.passwordHash || "mock");
      user = await prisma.user.create({
        data: {
          email,
          name: email.split("@")[0],
          passwordHash: mockPasswordHash,
          isEmailVerified: true,
        },
      });
    }

    // Check if user is already a member
    const existingMember = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: orgId,
        },
      },
    });

    if (existingMember) {
      return res.status(409).json({ success: false, message: "User is already a member of this organization" });
    }

    const membership = await prisma.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: orgId,
        role: role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await logAuditEvent({
      userId: req.user?.userId,
      organizationId: orgId,
      action: "TEAM_MEMBER_ADDED",
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
      details: { memberEmail: email, role },
    });

    return res.status(201).json({
      success: true,
      message: "Member added successfully",
      data: {
        id: membership.id,
        userId: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
        createdAt: membership.createdAt,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to add member", error: error.message });
  }
};

export const updateMemberRole = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    const { memberId } = req.params;
    const { role } = req.body;

    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });
    if (!role) return res.status(400).json({ success: false, message: "Role is required" });

    const membership = await prisma.userOrganization.findFirst({
      where: { id: memberId, organizationId: orgId },
      include: { user: true },
    });

    if (!membership) {
      return res.status(404).json({ success: false, message: "Member not found in this organization" });
    }

    if (membership.role === "OWNER" && req.org?.role !== "OWNER") {
      return res.status(403).json({ success: false, message: "Only owners can modify other owners" });
    }

    const updated = await prisma.userOrganization.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await logAuditEvent({
      userId: req.user?.userId,
      organizationId: orgId,
      action: "TEAM_MEMBER_ROLE_UPDATED",
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
      details: { memberEmail: updated.user.email, oldRole: membership.role, newRole: role },
    });

    return res.json({
      success: true,
      message: "Member role updated successfully",
      data: {
        id: updated.id,
        userId: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        role: updated.role,
        createdAt: updated.createdAt,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to update member role", error: error.message });
  }
};

export const removeMember = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    const { memberId } = req.params;

    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    const membership = await prisma.userOrganization.findFirst({
      where: { id: memberId, organizationId: orgId },
      include: { user: true },
    });

    if (!membership) {
      return res.status(404).json({ success: false, message: "Member not found in this organization" });
    }

    if (membership.role === "OWNER") {
      return res.status(400).json({ success: false, message: "Owners cannot be removed directly. Transfer ownership first." });
    }

    await prisma.userOrganization.delete({ where: { id: memberId } });

    await logAuditEvent({
      userId: req.user?.userId,
      organizationId: orgId,
      action: "TEAM_MEMBER_REMOVED",
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
      details: { memberEmail: membership.user.email },
    });

    return res.json({ success: true, message: "Member removed successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to remove member", error: error.message });
  }
};
