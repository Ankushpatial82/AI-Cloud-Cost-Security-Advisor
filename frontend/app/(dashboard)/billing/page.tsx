"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../lib/api";
import {
  CreditCard,
  CheckCircle,
  Zap,
  Building,
  Shield,
  Download,
  Clock,
  Sparkles
} from "lucide-react";

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  // Fetch Billing Subscription & Invoices
  const { data: billingData, isLoading } = useQuery({
    queryKey: ["billingData"],
    queryFn: async () => {
      const res = await api.get("/billing/subscription");
      return res.data?.data;
    },
  });

  const subscription = billingData?.subscription || { plan: "FREE", status: "ACTIVE" };
  const invoices = billingData?.invoices || [];

  // Update Subscription Mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await api.post("/billing/subscribe", { plan });
      return res.data;
    },
    onSuccess: (data) => {
      setMsg(data.message || "Subscription updated successfully!");
      setError("");
      setSelectedPlan(null);
      queryClient.invalidateQueries({ queryKey: ["billingData"] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Failed to update subscription");
      setMsg("");
    },
  });

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await api.get(`/billing/invoices/${invoiceId}/pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice-${invoiceId.substring(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert("Failed to download invoice receipt PDF.");
    }
  };

  const plans = [
    {
      id: "FREE",
      name: "Community",
      price: "$0",
      period: "forever free",
      description: "Essential cloud cost and security monitoring for developer workloads.",
      icon: Shield,
      features: [
        "Up to 2 Cloud Accounts",
        "Basic Daily Cost Telemetry",
        "CIS Security Compliance Check",
        "Community Support",
      ],
    },
    {
      id: "STARTUP",
      name: "Pro Startup",
      price: "$99",
      period: "per month",
      description: "AI-powered FinOps optimization, Kubernetes metrics & real-time alerts.",
      icon: Zap,
      recommended: true,
      features: [
        "Up to 10 Cloud Accounts",
        "AI Anomaly Detection & AI Insights",
        "Kubernetes Resource Optimization",
        "SRE Log Analyzer & Alert Webhooks",
        "Exportable PDF Receipts",
      ],
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise",
      price: "$499",
      period: "per month",
      description: "Unlimited scale, dedicated multi-tenant governance & 24/7 SLA.",
      icon: Building,
      features: [
        "Unlimited Cloud Accounts & Clusters",
        "Custom Compliance Rule Engine",
        "Dedicated Account Executive",
        "24/7 Priority Support & 99.99% SLA",
        "Custom Audit Trail Export",
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-violet-400" />
            Billing & Subscription Plans
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage tier subscriptions, payment receipts, and enterprise invoicing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2.5 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Current Plan: <span className="font-bold text-violet-400 uppercase">{subscription.plan}</span>
          </div>
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          {msg}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = subscription.plan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative bg-slate-900/40 border rounded-2xl p-6 flex flex-col justify-between transition-all ${
                plan.recommended
                  ? "border-violet-500/50 shadow-xl shadow-violet-500/5"
                  : "border-slate-800"
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-600 text-white font-semibold text-[10px] uppercase tracking-wider rounded-full flex items-center gap-1 shadow-lg">
                  <Sparkles className="w-3 h-3" /> Most Popular
                </div>
              )}

              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-violet-600/10 border border-violet-500/20 rounded-xl text-violet-400">
                    <Icon className="w-6 h-6" />
                  </div>
                  {isCurrent && (
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-full">
                      Active Plan
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-xs text-slate-400 mb-6">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-slate-500 text-xs ml-2">/ {plan.period}</span>
                </div>

                <div className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-slate-300">
                      <CheckCircle className="w-4 h-4 text-violet-400 shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              <button
                disabled={isCurrent || updateSubscriptionMutation.isPending}
                onClick={() => updateSubscriptionMutation.mutate(plan.id)}
                className={`w-full py-3 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : plan.recommended
                    ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20"
                    : "bg-slate-800 hover:bg-slate-700 text-white"
                }`}
              >
                {updateSubscriptionMutation.isPending && selectedPlan === plan.id
                  ? "Processing..."
                  : isCurrent
                  ? "Current Plan"
                  : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Invoice History Section */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-lg text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-violet-400" />
              Invoice Receipts & Payment History
            </h3>
            <p className="text-xs text-slate-500">Download itemized PDF receipts for your accounting records.</p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No invoice records found yet. Subscriptions generate downloadable receipts automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-medium uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Invoice ID</th>
                  <th className="py-3.5 px-4">Date Issued</th>
                  <th className="py-3.5 px-4">Amount Paid</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Receipt PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4 font-mono text-slate-300">{inv.id.substring(0, 12)}...</td>
                    <td className="py-4 px-4">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 px-4 font-bold text-white">${inv.amount.toFixed(2)} USD</td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleDownloadInvoice(inv.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-violet-400" />
                        PDF Receipt
                      </button>
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
