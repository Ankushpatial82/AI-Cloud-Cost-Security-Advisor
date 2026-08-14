import { Router } from "express";
import {
  getOrganizations,
  createOrganization,
  getMembers,
  addMember,
  updateMemberRole,
  removeMember
} from "../controllers/organization.controller";
import { authenticateUser, requireOrganization, requireRole } from "../middlewares/auth";
import { auditLogger } from "../middlewares/audit";

const router = Router();

// Base middleware for all organization routes
router.use(authenticateUser);

router.get("/", getOrganizations);
router.post("/", auditLogger("ORGANIZATION_CREATE"), createOrganization);

// Scoped endpoints with membership validation
router.get("/:orgId/members", requireOrganization, getMembers);
router.post("/:orgId/members", requireOrganization, requireRole(["OWNER", "ADMIN"]), auditLogger("TEAM_MEMBER_INVITE"), addMember);
router.put("/:orgId/members/:memberId", requireOrganization, requireRole(["OWNER", "ADMIN"]), auditLogger("TEAM_MEMBER_ROLE_UPDATE"), updateMemberRole);
router.delete("/:orgId/members/:memberId", requireOrganization, requireRole(["OWNER", "ADMIN"]), auditLogger("TEAM_MEMBER_REMOVE"), removeMember);

export default router;
