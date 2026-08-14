"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireOrganization = exports.authenticateUser = void 0;
const jwt_1 = require("../utils/jwt");
const db_1 = __importDefault(require("../config/db"));
const authenticateUser = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Authorization header missing or invalid" });
        }
        const token = authHeader.split(" ")[1];
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};
exports.authenticateUser = authenticateUser;
const requireOrganization = (req, res, next) => {
    const orgId = req.headers["x-organization-id"] || req.params.orgId;
    const userId = req.user?.userId;
    if (!orgId) {
        return res.status(400).json({ success: false, message: "Organization ID is required in headers (x-organization-id) or path params" });
    }
    if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }
    db_1.default.userOrganization.findUnique({
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
exports.requireOrganization = requireOrganization;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.org) {
            return res.status(403).json({ success: false, message: "Organization context missing" });
        }
        if (!allowedRoles.includes(req.org.role)) {
            return res.status(403).json({ success: false, message: "Insufficient permissions for this action" });
        }
        next();
    };
};
exports.requireRole = requireRole;
