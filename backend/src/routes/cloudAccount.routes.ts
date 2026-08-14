import { Router } from "express";
import {
  addAccount,
  getAccounts,
  validateAccount,
  deleteAccount
} from "../controllers/cloudAccount.controller";
import { authenticateUser, requireOrganization, requireRole } from "../middlewares/auth";
import { auditLogger } from "../middlewares/audit";

const router = Router();

router.use(authenticateUser);

router.post("/", requireOrganization, requireRole(["OWNER", "ADMIN"]), auditLogger("CLOUD_ACCOUNT_CONNECT"), addAccount);
router.get("/", requireOrganization, getAccounts);
router.post("/:accountId/validate", requireOrganization, validateAccount);
router.delete("/:accountId", requireOrganization, requireRole(["OWNER", "ADMIN"]), auditLogger("CLOUD_ACCOUNT_DISCONNECT"), deleteAccount);

export default router;
