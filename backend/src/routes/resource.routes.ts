import { Router } from "express";
import {
  getResources,
  getResourceSummary,
  getResourceDetails
} from "../controllers/resource.controller";
import { authenticateUser, requireOrganization } from "../middlewares/auth";

const router = Router();

router.use(authenticateUser);
router.use(requireOrganization);

router.get("/", getResources);
router.get("/summary", getResourceSummary);
router.get("/:id", getResourceDetails);

export default router;
