"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const organization_controller_1 = require("../controllers/organization.controller");
const auth_1 = require("../middlewares/auth");
const audit_1 = require("../middlewares/audit");
const router = (0, express_1.Router)();
// Base middleware for all organization routes
router.use(auth_1.authenticateUser);
router.get("/", organization_controller_1.getOrganizations);
router.post("/", (0, audit_1.auditLogger)("ORGANIZATION_CREATE"), organization_controller_1.createOrganization);
// Scoped endpoints with membership validation
router.get("/:orgId/members", auth_1.requireOrganization, organization_controller_1.getMembers);
router.post("/:orgId/members", auth_1.requireOrganization, (0, auth_1.requireRole)(["OWNER", "ADMIN"]), (0, audit_1.auditLogger)("TEAM_MEMBER_INVITE"), organization_controller_1.addMember);
router.put("/:orgId/members/:memberId", auth_1.requireOrganization, (0, auth_1.requireRole)(["OWNER", "ADMIN"]), (0, audit_1.auditLogger)("TEAM_MEMBER_ROLE_UPDATE"), organization_controller_1.updateMemberRole);
router.delete("/:orgId/members/:memberId", auth_1.requireOrganization, (0, auth_1.requireRole)(["OWNER", "ADMIN"]), (0, audit_1.auditLogger)("TEAM_MEMBER_REMOVE"), organization_controller_1.removeMember);
exports.default = router;
