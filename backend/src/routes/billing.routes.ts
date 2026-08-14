import { Router } from "express";
import {
  getBillingDashboard,
  updateSubscription,
  downloadInvoicePdf
} from "../controllers/billing.controller";
import { authenticateUser, requireOrganization, requireRole } from "../middlewares/auth";

const router = Router();

router.use(authenticateUser);
router.use(requireOrganization);

router.get("/dashboard", getBillingDashboard);
router.put("/subscribe", requireRole(["OWNER", "ADMIN"]), updateSubscription);
router.get("/invoices/:invoiceId/download", downloadInvoicePdf);

export default router;
