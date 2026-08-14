"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../lib/api";
import {
  AlertTriangle,
  BellRing,
  Mail,
  MessageCircle,
  Check,
  Disc,
  FolderOpen
} from "lucide-react";

export default function AlertsPage() {
  const queryClient = useQueryClient();

  // Settings state
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackWebhook, setSlackWebhook] = useState("");
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Query 1: Alerts log
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ["alertsLog"],
    queryFn: async () => {
      const res = await api.get("/alerts");
      return res.data?.data;
    },
  });

  // Query 2: Settings
  const { isLoading: settingsLoading } = useQuery({
    queryKey: ["notificationSettings"],
    queryFn: async () => {
      const res = await api.get("/alerts/settings");
      const data = res.data?.data;
      if (data) {
        setEmailAlerts(data.emailAlerts);
        setSlackWebhook(data.slackWebhook || "");
        setDiscordWebhook(data.discordWebhook || "");
      }
      return data;
    },
  });

  // Mutator: Acknowledge Alert
  const ackMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const res = await api.put(`/alerts/${alertId}/acknowledge`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alertsLog"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to acknowledge alert");
    },
  });

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await api.put("/alerts/settings", {
        emailAlerts,
        slackWebhook,
        discordWebhook,
      });
      if (res.data?.success) {
        alert("Alert notification settings updated successfully!");
        queryClient.invalidateQueries({ queryKey: ["notificationSettings"] });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaveLoading(false);
    }
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case "CRITICAL": return "text-red-400 border-red-500/20 bg-red-500/10";
      case "WARNING": return "text-yellow-400 border-yellow-500/20 bg-yellow-500/10";
      default: return "text-blue-400 border-blue-500/20 bg-blue-500/10";
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Alert Center</h2>
        <p className="text-slate-400 mt-1">Manage infrastructure incident alarm logs and dispatch configurations</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Active Alerts Log (Colspan 2) */}
        <div className="xl:col-span-2 bg-slate-900/40 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-lg text-white mb-6 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-violet-400" />
            Triggered Alarms Log
          </h3>

          {alertsLoading ? (
            <div className="flex justify-center p-8">
              <span className="w-8 h-8 border-3 border-violet-600/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
              <FolderOpen className="w-8 h-8 text-slate-700" />
              All alarm channels quiet. No infrastructure anomalies recorded.
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2">
              {alerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 flex items-center justify-between transition-colors ${
                    alert.acknowledged
                      ? "bg-slate-950/40 border-slate-850 opacity-60"
                      : "bg-slate-900 border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-4.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getSeverityStyle(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{alert.message}</p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Timestamp: {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {!alert.acknowledged && (
                    <button
                      onClick={() => ackMutation.mutate(alert.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Acknowledge
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Webhook and Email Integrations (Colspan 1) */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-lg text-white mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-violet-400" />
            Webhook Integrations
          </h3>
          <p className="text-xs text-slate-500 mb-6">Forward incidents directly to engineering channel hubs</p>

          {settingsLoading ? (
            <div className="flex justify-center p-6">
              <span className="w-8 h-8 border-3 border-violet-600/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* Email Alert Toggle */}
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3.5 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4.5 h-4.5 text-slate-400" />
                  <div>
                    <label className="text-xs font-semibold text-white block">Email Alerts</label>
                    <span className="text-[10px] text-slate-500">Send digests of new vulnerabilities</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-800 text-violet-600 focus:ring-violet-500"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                />
              </div>

              {/* Slack Webhook */}
              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <MessageCircle className="w-4 h-4 text-orange-400" />
                  Slack Ingress Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-650"
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                />
              </div>

              {/* Discord Webhook */}
              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Disc className="w-4 h-4 text-blue-400" />
                  Discord Ingress Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-650"
                  value={discordWebhook}
                  onChange={(e) => setDiscordWebhook(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={saveLoading}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-4"
              >
                {saveLoading ? "Saving Settings..." : "Save Config Settings"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
