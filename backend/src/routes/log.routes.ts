import { Router } from "express";
import { analyzeLogs } from "../controllers/log.controller";
import { authenticateUser, requireOrganization } from "../middlewares/auth";

const router = Router();

router.use(authenticateUser);
router.use(requireOrganization);

router.post("/analyze", analyzeLogs);

export default router;
