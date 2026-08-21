"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fireAlert = exports.updateNotificationSettings = exports.getNotificationSettings = exports.acknowledgeAlert = exports.getAlerts = void 0;
const db_1 = __importDefault(require("../config/db"));
const audit_1 = require("../middlewares/audit");
const getAlerts = async (req, res) => {
    try {
        const orgId = req.org?.id;
        if (!orgId)
            return res.status(400).json({ success: false, message: "Organization context required" });
        const alerts = await db_1.default.alert.findMany({
            where: { organizationId: orgId },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        return res.json({ success: true, data: alerts });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Failed to load alerts", error: error.message });
    }
};
exports.getAlerts = getAlerts;
const acknowledgeAlert = async (req, res) => {
    try {
        const orgId = req.org?.id;
        const alertId = req.params.alertId;
        if (!orgId)
            return res.status(400).json({ success: false, message: "Organization context required" });
        const alert = await db_1.default.alert.findFirst({
            where: { id: alertId, organizationId: orgId },
        });
        if (!alert) {
            return res.status(404).json({ success: false, message: "Alert not found" });
        }
        const updated = await db_1.default.alert.update({
            where: { id: alertId },
            data: { acknowledged: true },
        });
        return res.json({ success: true, message: "Alert acknowledged successfully", data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Failed to acknowledge alert", error: error.message });
    }
};
exports.acknowledgeAlert = acknowledgeAlert;
const getNotificationSettings = async (req, res) => {
    try {
        const orgId = req.org?.id;
        if (!orgId)
            return res.status(400).json({ success: false, message: "Organization context required" });
        const settings = await db_1.default.notificationSetting.findUnique({
            where: { organizationId: orgId },
        });
        return res.json({ success: true, data: settings });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Failed to load notification settings", error: error.message });
    }
};
exports.getNotificationSettings = getNotificationSettings;
const updateNotificationSettings = async (req, res) => {
    try {
        const orgId = req.org?.id;
        const { emailAlerts, slackWebhook, discordWebhook } = req.body;
        if (!orgId)
            return res.status(400).json({ success: false, message: "Organization context required" });
        const updated = await db_1.default.notificationSetting.upsert({
            where: { organizationId: orgId },
            update: { emailAlerts, slackWebhook, discordWebhook },
            create: { organizationId: orgId, emailAlerts, slackWebhook, discordWebhook },
        });
        await (0, audit_1.logAuditEvent)({
            userId: req.user?.userId,
            organizationId: orgId,
            action: "NOTIFICATION_SETTINGS_UPDATED",
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.headers["user-agent"],
            details: { emailAlerts, hasSlack: !!slackWebhook, hasDiscord: !!discordWebhook },
        });
        return res.json({ success: true, message: "Notification settings updated successfully", data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Failed to save settings", error: error.message });
    }
};
exports.updateNotificationSettings = updateNotificationSettings;
// Global helper to fire system alerts
const fireAlert = async (orgId, severity, message) => {
    try {
        // 1. Write to database
        const alert = await db_1.default.alert.create({
            data: {
                organizationId: orgId,
                severity,
                message,
            },
        });
        // 2. Fetch Notification Integration webhooks
        const settings = await db_1.default.notificationSetting.findUnique({
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
    }
    catch (error) {
        console.error("Failed to process system alert trigger:", error);
    }
};
exports.fireAlert = fireAlert;
