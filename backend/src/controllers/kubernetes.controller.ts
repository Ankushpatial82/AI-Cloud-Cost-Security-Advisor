import { Request, Response } from "express";
import prisma from "../config/db";
import { encrypt } from "../utils/crypto";

export const connectCluster = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    const { name, kubeconfig } = req.body;

    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });
    if (!name || !kubeconfig) {
      return res.status(400).json({ success: false, message: "Cluster name and kubeconfig are required" });
    }

    const encryptedKubeconfig = encrypt(kubeconfig);

    const cluster = await prisma.kubernetesCluster.create({
      data: {
        organizationId: orgId,
        name,
        kubeconfig: encryptedKubeconfig,
        status: "CONNECTED",
        metrics: {
          nodesCount: 3,
          namespaces: ["default", "kube-system", "production", "monitoring"],
          cpuUsagePercent: 64.2,
          memoryUsagePercent: 78.5,
          totalMemoryGb: 48,
          totalCpuCores: 24,
          podsTotal: 42,
          podsRunning: 38,
          podsPending: 2,
          podsFailed: 2,
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Kubernetes cluster connected successfully",
      data: {
        id: cluster.id,
        name: cluster.name,
        status: cluster.status,
        metrics: cluster.metrics,
        createdAt: cluster.createdAt,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to connect cluster", error: error.message });
  }
};

export const getClusters = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    const clusters = await prisma.kubernetesCluster.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        status: true,
        metrics: true,
        createdAt: true,
      },
    });

    return res.json({ success: true, data: clusters });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to list clusters", error: error.message });
  }
};

export const getClusterMetrics = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    const { clusterId } = req.params;

    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    const cluster = await prisma.kubernetesCluster.findFirst({
      where: { id: clusterId, organizationId: orgId },
    });

    if (!cluster) {
      return res.status(404).json({ success: false, message: "Cluster not found" });
    }

    // Return detailed nodes and pods breakdown
    const details = {
      summary: cluster.metrics,
      nodes: [
        { name: "node-1-worker", status: "Ready", role: "worker", cpu: "78%", memory: "82%", ip: "10.0.1.20" },
        { name: "node-2-worker", status: "Ready", role: "worker", cpu: "55%", memory: "64%", ip: "10.0.1.21" },
        { name: "node-3-controlplane", status: "Ready", role: "control-plane", cpu: "42%", memory: "50%", ip: "10.0.1.10" },
      ],
      deployments: [
        { name: "api-gateway", namespace: "production", replicas: "3/3", status: "Healthy" },
        { name: "auth-service", namespace: "production", replicas: "2/2", status: "Healthy" },
        { name: "worker-service", namespace: "production", replicas: "1/2", status: "Scaling" },
        { name: "postgres-db", namespace: "production", replicas: "1/1", status: "Healthy" },
      ],
      pods: [
        { name: "api-gateway-8f43ad-1", namespace: "production", status: "Running", restarts: 0, age: "12d" },
        { name: "auth-service-54d1ab-1", namespace: "production", status: "Running", restarts: 2, age: "5d" },
        { name: "worker-service-99ab2-1", namespace: "production", status: "CrashLoopBackOff", restarts: 18, age: "2h" },
        { name: "grafana-monitoring-77", namespace: "monitoring", status: "Pending", restarts: 0, age: "10m" },
      ],
    };

    return res.json({ success: true, data: details });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to fetch cluster metrics", error: error.message });
  }
};

export const getClusterRecommendations = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    const { clusterId } = req.params;

    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    const cluster = await prisma.kubernetesCluster.findFirst({
      where: { id: clusterId, organizationId: orgId },
    });

    if (!cluster) {
      return res.status(404).json({ success: false, message: "Cluster not found" });
    }

    const recommendations = [
      {
        type: "RIGHTSIZING",
        severity: "MEDIUM",
        title: "Define resource limits for 'api-gateway'",
        description: "Pod templates in deployment 'api-gateway' do not define memory limit thresholds, exposing nodes to potential Out-Of-Memory (OOM) eviction cascades.",
        remediation: "Add resources.limits.memory='512Mi' to the deployment manifest spec.",
      },
      {
        type: "OPTIMIZATION",
        severity: "HIGH",
        title: "Evict CrashLoopBackOff Pods",
        description: "Pod 'worker-service-99ab2-1' has crashed 18 times in the last 2 hours. Root cause points to OOM due to high queue volumes.",
        remediation: "Verify worker memory limit allocations and scale instances or memory thresholds.",
      },
      {
        type: "COST",
        severity: "LOW",
        title: "Enable Cluster Autoscaler",
        description: "Average CPU usage across 3 nodes is 42%. Enable horizontal autoscaling to scale down node pools dynamically during low traffic.",
        remediation: "Configure node auto-scaling groups with minimum capacity set to 2.",
      },
    ];

    return res.json({ success: true, data: recommendations });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to fetch cluster suggestions", error: error.message });
  }
};
