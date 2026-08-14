import { Request, Response } from "express";
import prisma from "../config/db";
import { logAuditEvent } from "../middlewares/audit";

export const getAlerts = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    const alerts = await prisma.alert.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json({ success: true, data: alerts });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to load alerts", error: error.message });
  }
};

export const acknowledgeAlert = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    const { alertId } = req.params;

    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    const alert = await prisma.alert.findFirst({
      where: { id: alertId, organizationId: orgId },
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: { acknowledged: true },
    });

    return res.json({ success: true, message: "Alert acknowledged successfully", data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to acknowledge alert", error: error.message });
  }
};

export const getNotificationSettings = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    const settings = await prisma.notificationSetting.findUnique({
      where: { organizationId: orgId },
    });

    return res.json({ success: true, data: settings });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to load notification settings", error: error.message });
  }
};

export const updateNotificationSettings = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    const { emailAlerts, slackWebhook, discordWebhook } = req.body;

    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    const updated = await prisma.notificationSetting.upsert({
      where: { organizationId: orgId },
      update: { emailAlerts, slackWebhook, discordWebhook },
      create: { organizationId: orgId, emailAlerts, slackWebhook, discordWebhook },
    });

    await logAuditEvent({
      userId: req.user?.userId,
      organizationId: orgId,
      action: "NOTIFICATION_SETTINGS_UPDATED",
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
      details: { emailAlerts, hasSlack: !!slackWebhook, hasDiscord: !!discordWebhook },
    });

    return res.json({ success: true, message: "Notification settings updated successfully", data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to save settings", error: error.message });
  }
};

// Global helper to fire system alerts
export const fireAlert = async (orgId: string, severity: "INFO" | "WARNING" | "CRITICAL", message: string) => {
  try {
    // 1. Write to database
    const alert = await prisma.alert.create({
      data: {
        organizationId: orgId,
        severity,
        message,
      },
    });

    // 2. Fetch Notification Integration webhooks
    const settings = await prisma.notificationSetting.findUnique({
      where: { organizationId: orgId },
    });

    if (settings) {
      // Dispatch Slack Hook asynchronously
      if (settings.slackWebhook) {
        fetch(settings.slackWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `⚠️ *[${severity}] AI Cloud Advisor Notification*\n${message}`,
          }),
        }).catch((err) => console.error("Slack notification hook failed:", err.message));
      }
      
      // Dispatch Discord Hook asynchronously
      if (settings.discordWebhook) {
        fetch(settings.discordWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `🚨 **[${severity}] AI Cloud Advisor Alert**\n${message}`,
          }),
        }).catch((err) => console.error("Discord notification hook failed:", err.message));
      }
    }

    return alert;
  } catch (error) {
    console.error("Failed to process system alert trigger:", error);
  }
};
