"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../../lib/api";
import {
  TrendingDown,
  Cpu,
  Sparkles,
  RefreshCw,
  FolderOpen
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

export default function CostsPage() {
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");

  // Query 1: Cost Dashboard summary (service breakdown, daily charts)
  const { data: costData, isLoading: costLoading } = useQuery({
    queryKey: ["costDashboard"],
    queryFn: async () => {
      const res = await api.get("/api/costs/dashboard");
      return res.data?.data;
    },
  });

  // Query 2: Cost Forecast (regression calculations)
  const { data: forecastData, isLoading: forecastLoading } = useQuery({
    queryKey: ["costForecast"],
    queryFn: async () => {
      const res = await api.get("/api/costs/forecast");
      return res.data?.data;
    },
  });

  // Query 3: Rightsizing Suggestions
  const { data: recommendations = [], isLoading: recsLoading } = useQuery({
    queryKey: ["costRecommendations"],
    queryFn: async () => {
      const res = await api.get("/api/costs/recommendations");
      return res.data?.data;
    },
  });

  const fetchAISummary = async () => {
    setAiReportLoading(true);
    try {
      const res = await api.get("/api/costs/summary");
      if (res.data?.success) {
        setAiSummary(res.data.data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiReportLoading(false);
    }
  };

  // Combine historical and forecast data for the trend chart
  const historicalDays = costData?.dailyCosts || [];
  const forecastDays = forecastData?.forecast || [];
  
  const combinedChartData = [
    ...historicalDays.map((d: any) => ({ ...d, type: "Actual" })),
    ...forecastDays.map((d: any) => ({ ...d, type: "Projected" })),
  ];

  const totalMonthlySavings = recommendations.reduce((sum: number, rec: any) => sum + rec.potentialSavings, 0);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Cost Optimizer</h2>
          <p className="text-slate-400 mt-1">Rightsize oversized running resources and forecast monthly budgets</p>
        </div>
        <button
          onClick={fetchAISummary}
          disabled={aiReportLoading}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-indigo-600/10 cursor-pointer"
        >
          <Sparkles className="w-4.5 h-4.5" />
          {aiReportLoading ? "Analyzing..." : "Generate AI Cost Report"}
        </button>
      </div>

      {/* Dynamic AI Report Display */}
      {aiSummary && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-violet-500 to-indigo-500" />
          <h3 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            AI FinOps Infrastructure Report
          </h3>
          <div className="text-slate-300 text-sm space-y-4 leading-relaxed whitespace-pre-line border-t border-slate-800/60 pt-4">
            {aiSummary}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">30-Day Spending</p>
          <h3 className="text-3xl font-bold text-white mt-2">${costData?.totalSpend?.toFixed(2) || "0.00"}</h3>
          <p className="text-xs text-slate-500 mt-3">Run-rate across connected cloud services</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">30-Day Budget Forecast</p>
          <h3 className="text-3xl font-bold text-white mt-2">${forecastData?.projectedMonthlyCost?.toFixed(2) || "0.00"}</h3>
          <p className="text-xs text-slate-500 mt-3">Calculated via historical linear progression trends</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Potential Monthly Savings</p>
          <h3 className="text-3xl font-bold text-emerald-400 mt-2">${totalMonthlySavings.toFixed(2)}</h3>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
            {recommendations.length} active rightsizing options available
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Forecast Graph */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col">
          <h3 className="font-semibold text-lg text-white mb-2">30-Day Projection Forecast</h3>
          <p className="text-xs text-slate-500 mb-6">Historical daily expenditure side-by-side with forecasted budget trendline</p>
          
          <div className="h-80 w-full mt-auto">
            {costLoading || forecastLoading ? (
              <div className="h-full flex items-center justify-center">
                <span className="w-8 h-8 border-3 border-violet-600/30 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : combinedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}
                    labelClassName="text-slate-400 font-mono text-xs"
                    itemStyle={{ color: "#ffffff", fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Insufficient data to build trendline graphs.
              </div>
            )}
          </div>
        </div>

        {/* Breakdown bar chart */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col">
          <h3 className="font-semibold text-lg text-white mb-2">Cost Breakdown by Service</h3>
          <p className="text-xs text-slate-500 mb-6">Aggregate spending distributed over cloud resource categories</p>
          
          <div className="h-80 w-full mt-auto">
            {costLoading ? (
              <div className="h-full flex items-center justify-center">
                <span className="w-8 h-8 border-3 border-violet-600/30 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : costData?.serviceBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costData.serviceBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="service" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b" }}
                    itemStyle={{ color: "#ffffff", fontSize: 12 }}
                  />
                  <Bar dataKey="amount" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No service metrics recorded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rightsizing Recommendations Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold text-lg text-white mb-2 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          Rightsizing Opportunities
        </h3>
        <p className="text-xs text-slate-500 mb-6">Scanned suggestions matching low-utilization resources to optimal price specs</p>

        {recsLoading ? (
          <div className="flex justify-center p-6">
            <span className="w-8 h-8 border-3 border-violet-600/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : recommendations.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
            <FolderOpen className="w-8 h-8 text-slate-700" />
            No active optimizations found. Your running assets comply with load configurations.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 pr-4">Resource</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Action Target</th>
                  <th className="pb-3 pr-4">Monthly Cost</th>
                  <th className="pb-3 text-right">Potential Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recommendations.map((rec: any) => (
                  <tr key={rec.resourceId} className="hover:bg-slate-900/20 text-slate-300">
                    <td className="py-3.5 pr-4">
                      <div>
                        <p className="font-medium text-white">{rec.resourceName}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{rec.provider}</p>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-xs">{rec.type}</td>
                    <td className="py-3.5 pr-4 text-xs">
                      <div>
                        <p className="font-semibold text-violet-400">{rec.suggestedAction}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5 max-w-sm">{rec.description}</p>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 font-semibold">${rec.currentCostMonthly}</td>
                    <td className="py-3.5 text-right font-bold text-emerald-400">
                      -${rec.potentialSavings}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
