"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../lib/api";
import {
  ShieldAlert,
  Sparkles,
  CheckCircle,
  Eye,
  ChevronRight,
  RefreshCw,
  EyeOff
} from "lucide-react";

export default function SecurityPage() {
  const queryClient = useQueryClient();
  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Query 1: Security Dashboard KPI metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["securityDashboard"],
    queryFn: async () => {
      const res = await api.get("/security/dashboard");
      return res.data?.data;
    },
  });

  // Query 2: Open security findings
  const { data: findings = [], isLoading: findingsLoading } = useQuery({
    queryKey: ["securityFindings"],
    queryFn: async () => {
      const res = await api.get("/security/findings");
      return res.data?.data;
    },
  });

  // Mutator: Update Finding Status (Muted/Resolved)
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.put(`/security/findings/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["securityFindings"] });
      queryClient.invalidateQueries({ queryKey: ["securityDashboard"] });
      setSelectedFinding(null);
      setAiReport("");
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to edit vulnerability status.");
    },
  });

  const handleFetchRemediation = async (finding: any) => {
    setSelectedFinding(finding);
    setAiReport("");
    setAiLoading(true);

    try {
      const res = await api.post(`/security/findings/${finding.id}/explain`);
      if (res.data?.success) {
        setAiReport(res.data.data.explanation);
      }
    } catch (err) {
      console.error(err);
      setAiReport("Failed to generate AI remediation advisor. Ensure API key is configured.");
    } finally {
      setAiLoading(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case "CRITICAL": return "text-red-400 bg-red-500/10 border-red-500/20";
      case "HIGH": return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      case "MEDIUM": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      default: return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Security Compliance</h2>
        <p className="text-slate-400 mt-1">Continuous static analysis scanning of IAM roles, ports, and storage policies</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security Grade</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-3xl font-bold text-white">
              {metricsLoading ? "..." : `${metrics?.securityScore || 100}`}
            </h3>
            <span className="text-slate-500 text-sm">/ 100</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Calculated by vulnerability weighting</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Compliance Index</p>
          <h3 className="text-3xl font-bold text-white mt-2">
            {metricsLoading ? "..." : `${metrics?.compliancePercentage || 100}%`}
          </h3>
          <p className="text-xs text-slate-500 mt-2">Estimated CIS best practice checks passing</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical Faults</p>
          <h3 className="text-3xl font-bold text-red-400 mt-2">
            {metricsLoading ? "..." : `${metrics?.severityCounts?.CRITICAL || 0}`}
          </h3>
          <p className="text-xs text-slate-500 mt-2">Immediate threat ingress targets</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">High Risk Faults</p>
          <h3 className="text-3xl font-bold text-orange-400 mt-2">
            {metricsLoading ? "..." : `${metrics?.severityCounts?.HIGH || 0}`}
          </h3>
          <p className="text-xs text-slate-500 mt-2">Requires scheduled sprint adjustments</p>
        </div>
      </div>

      {/* Main Section layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Vulnerability Table (Left/Colspan 2) */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 xl:col-span-2">
          <h3 className="font-semibold text-lg text-white mb-6 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-violet-400" />
            Detected Vulnerabilities
          </h3>

          {findingsLoading ? (
            <div className="flex justify-center p-8">
              <span className="w-8 h-8 border-3 border-violet-600/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : findings.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              All clear! No security misconfigurations detected on running subscriptions.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-3 pr-4">Rule / ID</th>
                    <th className="pb-3 pr-4">Resource</th>
                    <th className="pb-3 pr-4">Severity</th>
                    <th className="pb-3 text-right">Remediation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {findings.map((f: any) => (
                    <tr key={f.id} className="hover:bg-slate-900/20 text-slate-300">
                      <td className="py-4 pr-4">
                        <div>
                          <p className="font-semibold text-white max-w-xs truncate">{f.title}</p>
                          <p className="text-[10px] text-slate-500 font-mono uppercase">{f.ruleId}</p>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        {f.resource ? (
                          <div>
                            <p className="font-medium text-white truncate max-w-xs">{f.resource.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase">{f.account.provider} ({f.resource.type})</p>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs font-mono">Global Credential</span>
                        )}
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getSeverityColor(f.severity)}`}>
                          {f.severity}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => handleFetchRemediation(f)}
                          className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-semibold cursor-pointer"
                        >
                          AI Assist
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AI Remediation Advisor Sidebar Panel (Right/Colspan 1) */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col min-h-[400px]">
          <h3 className="font-semibold text-lg text-white mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            AI Remediation Advisor
          </h3>
          <p className="text-xs text-slate-500 mb-6">Select a vulnerability from the table to view sandbox resolution steps</p>

          {aiLoading ? (
            <div className="flex-grow flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
              <p className="text-xs text-slate-400">Synthesizing command steps...</p>
            </div>
          ) : selectedFinding ? (
            <div className="flex-grow flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getSeverityColor(selectedFinding.severity)}`}>
                    {selectedFinding.severity}
                  </span>
                  <h4 className="font-semibold text-white mt-2">{selectedFinding.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{selectedFinding.description}</p>
                </div>

                {aiReport && (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 font-sans text-xs text-slate-350 overflow-y-auto max-h-[300px] leading-relaxed whitespace-pre-line">
                    {aiReport}
                  </div>
                )}
              </div>

              <div className="flex gap-2 border-t border-slate-800 pt-4 mt-6">
                <button
                  onClick={() => statusMutation.mutate({ id: selectedFinding.id, status: "RESOLVED" })}
                  className="flex-grow flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Resolved
                </button>
                <button
                  onClick={() => statusMutation.mutate({ id: selectedFinding.id, status: "MUTED" })}
                  className="flex items-center justify-center bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-slate-600 text-sm">
              <Eye className="w-8 h-8 mb-2 text-slate-800" />
              Advisor Idle
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
