import { Router } from "express";
import {
  getCostDashboard,
  getCostForecast,
  getCostRecommendations,
  getAICostSummary
} from "../controllers/cost.controller";
import { authenticateUser, requireOrganization } from "../middlewares/auth";

const router = Router();

router.use(authenticateUser);
router.use(requireOrganization);

router.get("/dashboard", getCostDashboard);
router.get("/forecast", getCostForecast);
router.get("/recommendations", getCostRecommendations);
router.get("/summary", getAICostSummary);

export default router;
