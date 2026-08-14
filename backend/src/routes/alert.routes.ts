import { Router } from "express";
import {
  getAlerts,
  acknowledgeAlert,
  getNotificationSettings,
  updateNotificationSettings
} from "../controllers/alert.controller";
import { authenticateUser, requireOrganization, requireRole } from "../middlewares/auth";

const router = Router();

router.use(authenticateUser);
router.use(requireOrganization);

router.get("/", getAlerts);
router.put("/:alertId/acknowledge", acknowledgeAlert);
router.get("/settings", getNotificationSettings);
router.put("/settings", requireRole(["OWNER", "ADMIN"]), updateNotificationSettings);

export default router;
