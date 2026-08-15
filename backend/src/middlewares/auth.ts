import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyAccessToken } from "../utils/jwt";
import prisma from "../config/db";

export const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authorization header missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

export const requireOrganization = (req: Request, res: Response, next: NextFunction) => {
  const orgId = (req.headers["x-organization-id"] as string) || (req.params.orgId as string);
  const userId = req.user?.userId;

  if (!orgId) {
    return res.status(400).json({ success: false, message: "Organization ID is required in headers (x-organization-id) or path params" });
  }

  if (!userId) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: orgId,
      }
    }
  }).then((membership) => {
    if (!membership) {
      return res.status(403).json({ success: false, message: "You are not a member of this organization" });
    }
    req.org = {
      id: orgId,
      role: membership.role,
    };
    next();
  }).catch((err) => {
    return res.status(500).json({ success: false, message: "Error verifying organization membership", error: err.message });
  });
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.org) {
      return res.status(403).json({ success: false, message: "Organization context missing" });
    }

    if (!allowedRoles.includes(req.org.role)) {
      return res.status(403).json({ success: false, message: "Insufficient permissions for this action" });
    }

    next();
  };
};
