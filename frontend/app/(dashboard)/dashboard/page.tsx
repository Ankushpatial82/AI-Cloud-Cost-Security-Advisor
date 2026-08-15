"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../../lib/api";
import {
  TrendingUp,
  ShieldAlert,
  Server,
  DollarSign,
  ArrowUpRight,
  RefreshCw
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function OverviewPage() {
  // Query 1: Resources summary
  const { data: resSummary, isLoading: resLoading, refetch: refetchRes } = useQuery({
    queryKey: ["resourceSummary"],
    queryFn: async () => {
      const res = await api.get("/resources/summary");
      return res.data?.data;
    },
  });

  // Query 2: Security status
  const { data: secSummary, isLoading: secLoading, refetch: refetchSec } = useQuery({
    queryKey: ["securitySummary"],
    queryFn: async () => {
      const res = await api.get("/security/dashboard");
      return res.data?.data;
    },
  });

  // Query 3: Cost details
  const { data: costSummary, isLoading: costLoading, refetch: refetchCost } = useQuery({
    queryKey: ["costSummary"],
    queryFn: async () => {
      const res = await api.get("/api/costs/dashboard");
      return res.data?.data;
    },
  });

  const handleRefreshAll = () => {
    refetchRes();
    refetchSec();
    refetchCost();
  };

  const loading = resLoading || secLoading || costLoading;

  // Pie chart variables
  const COLORS = ["#8b5cf6", "#06b6d4", "#ec4899", "#3b82f6", "#10b981"];
  const pieData = resSummary?.byType?.map((t: any) => ({
    name: t.type,
    value: t.count,
  })) || [];

  return (
    <div className="space-y-8">
      {/* Top Title Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Cloud Command Center</h2>
          <p className="text-slate-400 mt-1">Multi-cloud cost forecasting & continuous security scanner metrics</p>
        </div>
        <button
          onClick={handleRefreshAll}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Stats
        </button>
      </div>

      {/* Grid of KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Active Resources */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-500/40 to-indigo-500/0" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Resources Count</p>
              <h3 className="text-3xl font-bold text-white mt-2">
                {resSummary?.totalResources || 0}
              </h3>
            </div>
            <div className="p-3 bg-violet-600/10 rounded-lg border border-violet-500/20 text-violet-400">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-4">
            <span className="font-semibold text-slate-400">{resSummary?.byProvider?.length || 0}</span> cloud subscriptions connected
          </div>
        </div>

        {/* KPI 2: Daily Cost Run-rate */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500/40 to-teal-500/0" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daily Spending</p>
              <h3 className="text-3xl font-bold text-white mt-2">
                ${resSummary?.totalDailySpend?.toFixed(2) || "0.00"}
              </h3>
            </div>
            <div className="p-3 bg-emerald-600/10 rounded-lg border border-emerald-500/20 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs mt-4">
            <span className={`font-semibold flex items-center ${costSummary?.momChangePercentage >= 0 ? "text-emerald-400" : "text-emerald-400"}`}>
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              {costSummary?.momChangePercentage || 0}%
            </span>
            <span className="text-slate-500">vs previous fortnight</span>
          </div>
        </div>

        {/* KPI 3: Security Score */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500/40 to-blue-500/0" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security Score</p>
              <h3 className="text-3xl font-bold text-white mt-2">
                {secSummary?.securityScore || 100}/100
              </h3>
            </div>
            <div className="p-3 bg-cyan-600/10 rounded-lg border border-cyan-500/20 text-cyan-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-4">
            <span className="font-semibold text-slate-400">{secSummary?.compliancePercentage || 100}%</span> CIS compliance coverage
          </div>
        </div>

        {/* KPI 4: Security Findings */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-pink-500/40 to-rose-500/0" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open Vulnerabilities</p>
              <h3 className="text-3xl font-bold text-white mt-2">
                {secSummary?.totalOpenFindings || 0}
              </h3>
            </div>
            <div className="p-3 bg-pink-600/10 rounded-lg border border-pink-500/20 text-pink-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs mt-4">
            <span className="text-red-400 font-semibold">{secSummary?.severityCounts?.CRITICAL || 0} Critical</span>
            <span className="text-amber-500 font-semibold">{secSummary?.severityCounts?.HIGH || 0} High</span>
          </div>
        </div>
      </div>

      {/* Graphs Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cost Runrate Graph */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-semibold text-lg text-white">Aggregate Spend Runrate</h3>
              <p className="text-xs text-slate-500">Aggregated cost trends for all connected subscriptions</p>
            </div>
            <Link
              href="/costs"
              className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
            >
              Analyze Costs
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-80 w-full">
            {costSummary?.dailyCosts?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costSummary.dailyCosts}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}
                    labelClassName="text-slate-400 font-mono text-xs"
                    itemStyle={{ color: "#ffffff", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No subscription cost data yet. Add a cloud account to start telemetry.
              </div>
            )}
          </div>
        </div>

        {/* Resources Distribution Pie Chart */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-semibold text-lg text-white">Resource Diversity</h3>
              <p className="text-xs text-slate-500">Distribution of instances by technology category</p>
            </div>
          </div>

          <div className="h-64 w-full relative flex-grow">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}
                    itemStyle={{ color: "#ffffff", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No active resources discovered
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
            {pieData.map((item: any, index: number) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="truncate">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
