import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";

export const logAuditEvent = async (params: {
  userId?: string;
  organizationId: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  details: any;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        organizationId: params.organizationId,
        action: params.action,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        details: params.details || {},
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
};

// Middleware helper to log specific operations automatically after response finishes
export const auditLogger = (actionName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const orgId = req.headers["x-organization-id"] as string || req.params.orgId || req.body.organizationId;
    const userId = req.user?.userId;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    // Wrap res.end to write audit log upon successful execution
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any, cb?: any) {
      res.end = originalEnd;
      const response = res.end(chunk, encoding, cb);

      if (res.statusCode >= 200 && res.statusCode < 300 && orgId) {
        logAuditEvent({
          userId,
          organizationId: orgId,
          action: actionName,
          ipAddress,
          userAgent,
          details: {
            method: req.method,
            path: req.originalUrl,
            params: req.params,
            body: { ...req.body, password: undefined, credentials: undefined, mfaSecret: undefined },
          },
        });
      }
      return response;
    };

    next();
  };
};
