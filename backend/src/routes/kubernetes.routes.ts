import { Router } from "express";
import {
  connectCluster,
  getClusters,
  getClusterMetrics,
  getClusterRecommendations
} from "../controllers/kubernetes.controller";
import { authenticateUser, requireOrganization, requireRole } from "../middlewares/auth";
import { auditLogger } from "../middlewares/audit";

const router = Router();

router.use(authenticateUser);
router.use(requireOrganization);

router.post("/connect", requireRole(["OWNER", "ADMIN"]), auditLogger("K8S_CLUSTER_CONNECT"), connectCluster);
router.get("/", getClusters);
router.get("/:clusterId/metrics", getClusterMetrics);
router.get("/:clusterId/recommendations", getClusterRecommendations);

export default router;
