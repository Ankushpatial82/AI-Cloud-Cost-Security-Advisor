"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogger = exports.logAuditEvent = void 0;
const db_1 = __importDefault(require("../config/db"));
const logAuditEvent = async (params) => {
    try {
        await db_1.default.auditLog.create({
            data: {
                userId: params.userId || null,
                organizationId: params.organizationId,
                action: params.action,
                ipAddress: params.ipAddress || null,
                userAgent: params.userAgent || null,
                details: params.details || {},
            },
        });
    }
    catch (error) {
        console.error("Failed to write audit log:", error);
    }
};
exports.logAuditEvent = logAuditEvent;
// Middleware helper to log specific operations automatically after response finishes
const auditLogger = (actionName) => {
    return (req, res, next) => {
        const orgId = req.headers["x-organization-id"] || req.params.orgId || req.body.organizationId;
        const userId = req.user?.userId;
        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers["user-agent"];
        // Wrap res.end to write audit log upon successful execution
        const originalEnd = res.end;
        res.end = function (chunk, encoding, cb) {
            res.end = originalEnd;
            const response = res.end(chunk, encoding, cb);
            if (res.statusCode >= 200 && res.statusCode < 300 && orgId) {
                (0, exports.logAuditEvent)({
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
exports.auditLogger = auditLogger;
