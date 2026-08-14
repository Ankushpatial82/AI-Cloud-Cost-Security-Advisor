import { Router } from "express";
import {
  getSecurityDashboard,
  getFindings,
  explainFinding,
  updateFindingStatus
} from "../controllers/security.controller";
import { authenticateUser, requireOrganization } from "../middlewares/auth";

const router = Router();

router.use(authenticateUser);
router.use(requireOrganization);

router.get("/dashboard", getSecurityDashboard);
router.get("/findings", getFindings);
router.post("/findings/:findingId/explain", explainFinding);
router.put("/findings/:findingId/status", updateFindingStatus);

export default router;
