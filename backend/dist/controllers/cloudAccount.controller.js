"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.validateAccount = exports.getAccounts = exports.addAccount = void 0;
const db_1 = __importDefault(require("../config/db"));
const crypto_1 = require("../utils/crypto");
const audit_1 = require("../middlewares/audit");
const discovery_queue_1 = require("../jobs/discovery.queue");
const addAccount = async (req, res) => {
    try {
        const orgId = req.org?.id;
        const { provider, name, credentials } = req.body;
        if (!orgId)
            return res.status(400).json({ success: false, message: "Organization context required" });
        if (!provider || !name || !credentials) {
            return res.status(400).json({ success: false, message: "Provider, name, and credentials are required" });
        }
        if (!["AWS", "AZURE", "GCP"].includes(provider)) {
            return res.status(400).json({ success: false, message: "Unsupported cloud provider" });
        }
        // Encrypt the credentials JSON string
        const credentialsStr = typeof credentials === "object" ? JSON.stringify(credentials) : credentials;
        const encryptedCredentials = (0, crypto_1.encrypt)(credentialsStr);
        const account = await db_1.default.cloudAccount.create({
            data: {
                organizationId: orgId,
                provider,
                name,
                credentials: encryptedCredentials,
                isValid: true, // Mark valid on addition, worker will validate
                lastValidated: new Date(),
            },
        });
        await (0, audit_1.logAuditEvent)({
            userId: req.user?.userId,
            organizationId: orgId,
            action: "CLOUD_ACCOUNT_CONNECTED",
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.headers["user-agent"],
            details: { accountId: account.id, name, provider },
        });
        // Enqueue background cloud discovery job
        await (0, discovery_queue_1.queueDiscoveryJob)(account.id, orgId, provider);
        return res.status(201).json({
            success: true,
            message: "Cloud account added successfully. Initial scan queued.",
            data: {
                id: account.id,
                name: account.name,
                provider: account.provider,
                isValid: account.isValid,
                lastValidated: account.lastValidated,
                createdAt: account.createdAt,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Failed to connect cloud account", error: error.message });
    }
};
exports.addAccount = addAccount;
const getAccounts = async (req, res) => {
    try {
        const orgId = req.org?.id;
        if (!orgId)
            return res.status(400).json({ success: false, message: "Organization context required" });
        const accounts = await db_1.default.cloudAccount.findMany({
            where: { organizationId: orgId },
            select: {
                id: true,
                name: true,
                provider: true,
                isValid: true,
                lastValidated: true,
                createdAt: true,
            },
        });
        return res.json({ success: true, data: accounts });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Failed to list cloud accounts", error: error.message });
    }
};
exports.getAccounts = getAccounts;
const validateAccount = async (req, res) => {
    try {
        const orgId = req.org?.id;
        const { accountId } = req.params;
        if (!orgId)
            return res.status(400).json({ success: false, message: "Organization context required" });
        const account = await db_1.default.cloudAccount.findFirst({
            where: { id: accountId, organizationId: orgId },
        });
        if (!account) {
            return res.status(404).json({ success: false, message: "Cloud account not found" });
        }
        // Attempt decryption to verify key integrity
        try {
            const decrypted = (0, crypto_1.decrypt)(account.credentials);
            JSON.parse(decrypted);
        }
        catch {
            await db_1.default.cloudAccount.update({
                where: { id: accountId },
                data: { isValid: false, lastValidated: new Date() },
            });
            return res.status(400).json({ success: false, message: "Decryption of account credentials failed. Please reconnect." });
        }
        // Queue confirmation scan
        await (0, discovery_queue_1.queueDiscoveryJob)(account.id, orgId, account.provider);
        await db_1.default.cloudAccount.update({
            where: { id: accountId },
            data: { isValid: true, lastValidated: new Date() },
        });
        return res.json({
            success: true,
            message: "Credentials valid. Background validation and sync job triggered.",
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Failed to validate credentials", error: error.message });
    }
};
exports.validateAccount = validateAccount;
const deleteAccount = async (req, res) => {
    try {
        const orgId = req.org?.id;
        const { accountId } = req.params;
        if (!orgId)
            return res.status(400).json({ success: false, message: "Organization context required" });
        const account = await db_1.default.cloudAccount.findFirst({
            where: { id: accountId, organizationId: orgId },
        });
        if (!account) {
            return res.status(404).json({ success: false, message: "Cloud account not found" });
        }
        await db_1.default.cloudAccount.delete({
            where: { id: accountId },
        });
        await (0, audit_1.logAuditEvent)({
            userId: req.user?.userId,
            organizationId: orgId,
            action: "CLOUD_ACCOUNT_DISCONNECTED",
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.headers["user-agent"],
            details: { accountId, name: account.name, provider: account.provider },
        });
        return res.json({ success: true, message: "Cloud account disconnected successfully" });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Failed to disconnect cloud account", error: error.message });
    }
};
exports.deleteAccount = deleteAccount;
