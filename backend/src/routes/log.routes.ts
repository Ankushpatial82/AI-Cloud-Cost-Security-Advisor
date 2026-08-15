import { Router } from "express";
import { analyzeLogs, getAuditLogs } from "../controllers/log.controller";
import { authenticateUser, requireOrganization } from "../middlewares/auth";

const router = Router();

router.use(authenticateUser);
router.use(requireOrganization);

router.post("/analyze", analyzeLogs);
router.get("/audit", getAuditLogs);

export default router;
