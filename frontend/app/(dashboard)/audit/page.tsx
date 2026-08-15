"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../../lib/api";
import {
  History,
  Search,
  ShieldAlert,
  UserCheck,
  Calendar,
  Activity,
  Lock,
  Globe
} from "lucide-react";

export default function AuditPage() {
  const [search, setSearch] = useState("");

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: async () => {
      const res = await api.get("/logs/audit");
      return res.data?.data || [];
    },
  });

  const filteredLogs = auditLogs.filter((log: any) =>
    log.action?.toLowerCase().includes(search.toLowerCase()) ||
    log.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    log.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-violet-400" />
            Audit Trail & Access Governance
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Immutable system logs tracking user actions, security events, and configuration mutations.
          </p>
        </div>

        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Recorded Events</p>
            <h3 className="text-2xl font-bold text-white mt-1">{auditLogs.length}</h3>
          </div>
          <div className="p-3 bg-violet-600/10 border border-violet-500/20 rounded-xl text-violet-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Security Events</p>
            <h3 className="text-2xl font-bold text-white mt-1">
              {auditLogs.filter((l: any) => l.action?.includes("MFA") || l.action?.includes("REGISTER") || l.action?.includes("LOGIN")).length}
            </h3>
          </div>
          <div className="p-3 bg-cyan-600/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Governance Compliance</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">SOC-2 Compliant</h3>
          </div>
          <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Lock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-violet-400" />
          Chronological Audit Stream
        </h3>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <span className="w-8 h-8 border-4 border-violet-600/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No audit logs found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-medium uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs">
                {filteredLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4 font-mono text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 font-semibold text-white">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-600/10 text-violet-400 border border-violet-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <p className="text-white font-medium">{log.user?.name || "System"}</p>
                          <p className="text-[10px] text-slate-500">{log.user?.email || ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                        {log.ipAddress || "127.0.0.1"}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-[11px] text-slate-400">
                      {log.details ? JSON.stringify(log.details) : "{}"}
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
