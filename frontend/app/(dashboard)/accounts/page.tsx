"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../lib/api";
import {
  Cloud,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  RefreshCw,
  Info
} from "lucide-react";

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New account form state
  const [provider, setProvider] = useState("AWS");
  const [name, setName] = useState("");
  const [awsKey, setAwsKey] = useState("");
  const [awsSecret, setAwsSecret] = useState("");
  const [awsRole, setAwsRole] = useState("");
  const [azureCreds, setAzureCreds] = useState("");
  const [gcpCreds, setGcpCreds] = useState("");
  const [error, setError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  // Fetch Connected Accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["cloudAccounts"],
    queryFn: async () => {
      const res = await api.get("/accounts");
      return res.data?.data;
    },
  });

  // Mutator: Validate Credentials
  const validateMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await api.post(`/accounts/${accountId}/validate`);
      return res.data;
    },
    onSuccess: (data) => {
      alert(data.message || "Account validation queued successfully.");
      queryClient.invalidateQueries({ queryKey: ["cloudAccounts"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to trigger credentials validation.");
    },
  });

  // Mutator: Disconnect Account
  const disconnectMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const res = await api.delete(`/accounts/${accountId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudAccounts"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Failed to disconnect account.");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitLoading(true);

    let credentialsObj = {};
    if (provider === "AWS") {
      credentialsObj = { accessKeyId: awsKey, secretAccessKey: awsSecret, roleArn: awsRole };
    } else if (provider === "AZURE") {
      try {
        credentialsObj = JSON.parse(azureCreds);
      } catch {
        setError("Invalid Azure credentials JSON format");
        setSubmitLoading(false);
        return;
      }
    } else if (provider === "GCP") {
      try {
        credentialsObj = JSON.parse(gcpCreds);
      } catch {
        setError("Invalid GCP credentials JSON format");
        setSubmitLoading(false);
        return;
      }
    }

    try {
      const res = await api.post("/accounts", {
        provider,
        name,
        credentials: credentialsObj,
      });

      if (res.data?.success) {
        queryClient.invalidateQueries({ queryKey: ["cloudAccounts"] });
        setShowAddModal(false);
        setName("");
        setAwsKey("");
        setAwsSecret("");
        setAwsRole("");
        setAzureCreds("");
        setGcpCreds("");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to connect cloud account.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-sans">Cloud Accounts</h2>
          <p className="text-slate-400 mt-1">Configure secure credential links for multi-cloud telemetry</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Connect Subscription
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <span className="w-10 h-10 border-4 border-violet-600/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        /* Empty State */
        <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl p-12 text-center max-w-xl mx-auto mt-12">
          <div className="w-12 h-12 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto mb-4">
            <Cloud className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-white">No Cloud Accounts Connected</h3>
          <p className="text-slate-400 text-sm mt-2 mb-6">
            Link your AWS role, Azure AD Principal, or GCP Service Account to begin scanning configuration vulnerabilities and optimizing running costs.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all cursor-pointer"
          >
            Connect First Account
          </button>
        </div>
      ) : (
        /* Connected Accounts List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc: any) => (
            <div
              key={acc.id}
              className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                    acc.provider === "AWS" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                    acc.provider === "AZURE" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                    "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}>
                    {acc.provider}
                  </span>
                  <div className="flex items-center gap-1">
                    {acc.isValid ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Valid
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" />
                        Invalid
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-lg text-white mt-4">{acc.name}</h3>
                <p className="text-xs text-slate-500 mt-1 truncate">ID: {acc.id}</p>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-2">
                  <Info className="w-3 h-3 text-slate-600" />
                  Synced: {acc.lastValidated ? new Date(acc.lastValidated).toLocaleTimeString() : "Never"}
                </div>
              </div>

              <div className="flex gap-2 border-t border-slate-800 mt-6 pt-4">
                <button
                  disabled={validateMutation.isPending}
                  onClick={() => validateMutation.mutate(acc.id)}
                  className="flex-grow flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${validateMutation.isPending ? "animate-spin" : ""}`} />
                  Sync / Validate
                </button>
                
                <button
                  onClick={() => {
                    if (confirm("Disconnect this subscription? Associated assets and vulnerabilities will be purged.")) {
                      disconnectMutation.mutate(acc.id);
                    }
                  }}
                  className="px-3 py-2 bg-slate-950 border border-slate-800 hover:border-red-900/40 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect Subscription Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg p-6 rounded-xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-semibold text-white mb-4">Connect Cloud Subscription</h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-200 text-xs text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-medium mb-1.5">Provider</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-white"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="AWS">Amazon Web Services (AWS)</option>
                  <option value="AZURE">Microsoft Azure</option>
                  <option value="GCP">Google Cloud Platform (GCP)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-medium mb-1.5">Connection Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Production Account"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-white placeholder-slate-650"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {provider === "AWS" && (
                <>
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">AWS Access Key ID</label>
                    <input
                      type="text"
                      required
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-white"
                      value={awsKey}
                      onChange={(e) => setAwsKey(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">AWS Secret Access Key</label>
                    <input
                      type="password"
                      required
                      placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-white"
                      value={awsSecret}
                      onChange={(e) => setAwsSecret(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 text-xs font-medium mb-1.5">Cross-Account IAM Role ARN (Optional)</label>
                    <input
                      type="text"
                      placeholder="arn:aws:iam::123456789012:role/AdvisorAccess"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-white"
                      value={awsRole}
                      onChange={(e) => setAwsRole(e.target.value)}
                    />
                  </div>
                </>
              )}

              {provider === "AZURE" && (
                <div>
                  <label className="block text-slate-300 text-xs font-medium mb-1.5">Azure Active Directory Principal JSON</label>
                  <textarea
                    required
                    rows={6}
                    placeholder={`{\n  "clientId": "...",\n  "clientSecret": "...",\n  "tenantId": "...",\n  "subscriptionId": "..."\n}`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-white font-mono text-xs"
                    value={azureCreds}
                    onChange={(e) => setAzureCreds(e.target.value)}
                  />
                </div>
              )}

              {provider === "GCP" && (
                <div>
                  <label className="block text-slate-300 text-xs font-medium mb-1.5">GCP Service Account Keys JSON</label>
                  <textarea
                    required
                    rows={6}
                    placeholder={`{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key_id": "...",\n  "private_key": "..."\n}`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-white font-mono text-xs"
                    value={gcpCreds}
                    onChange={(e) => setGcpCreds(e.target.value)}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  {submitLoading ? "Adding..." : "Add Subscription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
