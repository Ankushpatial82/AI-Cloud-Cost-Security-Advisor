"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../lib/api";
import {
  FolderLock,
  Plus,
  Terminal,
  Activity,
  Heart,
  TrendingDown,
  Cpu,
  Info
} from "lucide-react";

export default function KubernetesPage() {
  const queryClient = useQueryClient();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

  // New Cluster form state
  const [name, setName] = useState("");
  const [kubeconfig, setKubeconfig] = useState("");
  const [error, setError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  // Fetch Connected Clusters
  const { data: clusters = [], isLoading: clustersLoading } = useQuery({
    queryKey: ["k8sClusters"],
    queryFn: async () => {
      const res = await api.get("/kubernetes");
      return res.data?.data;
    },
  });

  // Fetch metrics/pods for selected cluster
  const { data: clusterMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["k8sClusterMetrics", selectedClusterId],
    queryFn: async () => {
      if (!selectedClusterId) return null;
      const res = await api.get(`/kubernetes/${selectedClusterId}/metrics`);
      return res.data?.data;
    },
    enabled: !!selectedClusterId,
  });

  // Fetch recommendations for selected cluster
  const { data: clusterRecs = [] } = useQuery({
    queryKey: ["k8sClusterRecommendations", selectedClusterId],
    queryFn: async () => {
      if (!selectedClusterId) return [];
      const res = await api.get(`/kubernetes/${selectedClusterId}/recommendations`);
      return res.data?.data;
    },
    enabled: !!selectedClusterId,
  });

  // Mutator: Connect K8s Cluster
  const connectMutation = useMutation({
    mutationFn: async (payload: { name: string; kubeconfig: string }) => {
      const res = await api.post("/kubernetes/connect", payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["k8sClusters"] });
      setShowConnectModal(false);
      setName("");
      setKubeconfig("");
      if (data.data?.id) {
        setSelectedClusterId(data.data.id);
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Failed to connect Kubernetes cluster.");
    },
  });

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitLoading(true);
    connectMutation.mutate({ name, kubeconfig }, {
      onSettled: () => setSubmitLoading(false),
    });
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Kubernetes Module</h2>
          <p className="text-slate-400 mt-1">Ingest kubeconfig configurations to monitor container utilization and OOM faults</p>
        </div>
        <button
          onClick={() => setShowConnectModal(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Connect Cluster
        </button>
      </div>

      {clustersLoading ? (
        <div className="flex justify-center p-12">
          <span className="w-10 h-10 border-4 border-violet-600/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : clusters.length === 0 ? (
        /* Empty state */
        <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl p-12 text-center max-w-xl mx-auto mt-12">
          <div className="w-12 h-12 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto mb-4">
            <FolderLock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-white">No Kubernetes Clusters Connected</h3>
          <p className="text-slate-400 text-sm mt-2 mb-6">
            Paste your encrypted kubeconfig settings or upload config files to inspect Pod state tables, node allocation metrics, and namespace limits.
          </p>
          <button
            onClick={() => setShowConnectModal(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all cursor-pointer"
          >
            Connect Kubernetes Cluster
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Cluster List / Cards Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {clusters.map((cluster: any) => {
              const isActive = selectedClusterId === cluster.id;
              const meta = cluster.metrics || {};
              return (
                <button
                  key={cluster.id}
                  onClick={() => setSelectedClusterId(cluster.id)}
                  className={`w-full text-left bg-slate-900/40 border rounded-xl p-6 transition-all hover:bg-slate-900/60 cursor-pointer ${
                    isActive ? "border-violet-500/80 shadow-lg shadow-violet-500/5" : "border-slate-800"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-white text-lg">{cluster.name}</h3>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-full">
                      {cluster.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6 text-xs">
                    <div>
                      <span className="text-slate-500 block">Nodes Count</span>
                      <span className="font-bold text-white text-sm mt-0.5 block">{meta.nodesCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Pods (Running)</span>
                      <span className="font-bold text-white text-sm mt-0.5 block">
                        {meta.podsRunning || 0} / {meta.podsTotal || 0}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detailed metrics section of selected cluster */}
          {selectedClusterId && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Cluster Status details (Colspan 2) */}
              <div className="xl:col-span-2 space-y-8">
                {metricsLoading ? (
                  <div className="flex justify-center p-12 bg-slate-900/10 border border-slate-800 rounded-xl">
                    <span className="w-8 h-8 border-3 border-violet-600/30 border-t-violet-500 rounded-full animate-spin" />
                  </div>
                ) : clusterMetrics ? (
                  <>
                    {/* Node utilization metrics */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
                      <h3 className="font-semibold text-lg text-white mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-violet-400" />
                        Cluster Workload Metrics
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="flex justify-between text-xs font-semibold text-slate-400 mb-2">
                            <span>CPU Resource allocation</span>
                            <span className="text-white">{clusterMetrics.summary.cpuUsagePercent}%</span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-3.5 border border-slate-800">
                            <div className="bg-violet-600 h-full rounded-full" style={{ width: `${clusterMetrics.summary.cpuUsagePercent}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500 mt-2 block">Allocating {Math.round(clusterMetrics.summary.totalCpuCores * (clusterMetrics.summary.cpuUsagePercent/100))} of {clusterMetrics.summary.totalCpuCores} cores</span>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-semibold text-slate-400 mb-2">
                            <span>Memory Pool allocation</span>
                            <span className="text-white">{clusterMetrics.summary.memoryUsagePercent}%</span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-3.5 border border-slate-800">
                            <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${clusterMetrics.summary.memoryUsagePercent}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500 mt-2 block">Allocating {Math.round(clusterMetrics.summary.totalMemoryGb * (clusterMetrics.summary.memoryUsagePercent/100))}GB of {clusterMetrics.summary.totalMemoryGb}GB RAM</span>
                        </div>
                      </div>
                    </div>

                    {/* Cluster Nodes Status */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
                      <h3 className="font-semibold text-md text-white mb-4">Cluster Nodes</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
                              <th className="pb-2">Name</th>
                              <th className="pb-2">Role</th>
                              <th className="pb-2">CPU</th>
                              <th className="pb-2">Memory</th>
                              <th className="pb-2">IP Address</th>
                              <th className="pb-2 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40 text-slate-350">
                            {clusterMetrics.nodes?.map((node: any) => (
                              <tr key={node.name} className="hover:bg-slate-900/10">
                                <td className="py-2.5 font-semibold text-white">{node.name}</td>
                                <td className="py-2.5 font-mono text-slate-400">{node.role}</td>
                                <td className="py-2.5 font-semibold">{node.cpu}</td>
                                <td className="py-2.5 font-semibold">{node.memory}</td>
                                <td className="py-2.5 font-mono text-slate-400">{node.ip}</td>
                                <td className="py-2.5 text-right">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    node.status === "Ready" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                                  }`}>
                                    {node.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Deployments status */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
                      <h3 className="font-semibold text-md text-white mb-4">Replica Deployments</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
                              <th className="pb-2">Name</th>
                              <th className="pb-2">Namespace</th>
                              <th className="pb-2">Replicas (Ready)</th>
                              <th className="pb-2 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40 text-slate-350">
                            {clusterMetrics.deployments.map((d: any) => (
                              <tr key={d.name} className="hover:bg-slate-900/10">
                                <td className="py-2.5 font-semibold text-white">{d.name}</td>
                                <td className="py-2.5 font-mono">{d.namespace}</td>
                                <td className="py-2.5 font-bold">{d.replicas}</td>
                                <td className="py-2.5 text-right">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    d.status === "Healthy" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                  }`}>
                                    {d.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pod list showing failure colors */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
                      <h3 className="font-semibold text-md text-white mb-4">Active Pods (Troubleshooting)</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase">
                              <th className="pb-2">Pod Identifier</th>
                              <th className="pb-2">Namespace</th>
                              <th className="pb-2">Restarts</th>
                              <th className="pb-2">Age</th>
                              <th className="pb-2 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40 text-slate-350">
                            {clusterMetrics.pods.map((p: any) => {
                              const isFailure = p.status === "CrashLoopBackOff" || p.status === "Failed";
                              return (
                                <tr key={p.name} className="hover:bg-slate-900/10">
                                  <td className="py-3 font-semibold text-white font-mono">{p.name}</td>
                                  <td className="py-3 font-mono">{p.namespace}</td>
                                  <td className="py-3 font-semibold">{p.restarts}</td>
                                  <td className="py-3 text-slate-500">{p.age}</td>
                                  <td className="py-3 text-right">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                      isFailure ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" :
                                      p.status === "Pending" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                                      "bg-slate-800 text-slate-300"
                                    }`}>
                                      {p.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Recommendations and Suggestions (Colspan 1) */}
              <div className="space-y-6">
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
                  <h3 className="font-semibold text-lg text-white mb-2 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-emerald-400" />
                    K8s Recommendations
                  </h3>
                  <p className="text-xs text-slate-500 mb-6">Cluster-scoped suggestions to prevent out-of-memory container crashes</p>

                  <div className="space-y-4">
                    {clusterRecs.map((rec: any, idx: number) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-lg relative">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            rec.severity === "HIGH" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                            rec.severity === "MEDIUM" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                            "bg-slate-850 text-slate-400 border border-slate-800"
                          }`}>
                            {rec.severity}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase">{rec.type}</span>
                        </div>
                        <h4 className="font-semibold text-white text-xs mt-2">{rec.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-1">{rec.description}</p>
                        
                        <div className="mt-3 bg-slate-900/50 border border-slate-850 p-2 rounded text-[10px] font-mono text-violet-400">
                          Fix: {rec.remediation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connect Cluster Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg p-6 rounded-xl shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Connect Kubernetes Cluster</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-200 text-xs text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleConnectSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-medium mb-1.5">Cluster Connection Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GKE Production Cluster"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-white placeholder-slate-650"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-medium mb-1.5">Kubeconfig File Content</label>
                <textarea
                  required
                  rows={8}
                  placeholder={`apiVersion: v1\nclusters:\n  - cluster:\n      certificate-authority-data: ...\n      server: https://1.2.3.4\n    name: production-cluster`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-white font-mono text-xs"
                  value={kubeconfig}
                  onChange={(e) => setKubeconfig(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  {submitLoading ? "Connecting..." : "Validate & Ingest Cluster"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
