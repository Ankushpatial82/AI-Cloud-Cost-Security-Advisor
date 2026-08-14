"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore, Organization } from "../../store/auth";
import api from "../../lib/api";
import { ChevronDown, Plus, ShieldAlert } from "lucide-react";

export default function TopHeader() {
  const activeOrg = useAuthStore((state) => state.organization);
  const organizations = useAuthStore((state) => state.organizations);
  const setActiveOrganization = useAuthStore((state) => state.setActiveOrganization);
  const setOrganizations = useAuthStore((state) => state.setOrganizations);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync organizations list on load
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await api.get("/orgs");
        if (res.data?.success) {
          setOrganizations(res.data.data);
        }
      } catch (err) {
        console.error("Failed to reload org list:", err);
      }
    };
    fetchOrgs();
  }, [setOrganizations]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setLoading(true);
    try {
      const res = await api.post("/orgs", { name: newOrgName });
      if (res.data?.success) {
        const newOrg = res.data.data;
        // Refresh orgs list
        const orgsRes = await api.get("/orgs");
        if (orgsRes.data?.success) {
          setOrganizations(orgsRes.data.data);
        }
        setActiveOrganization(newOrg);
        setShowCreateModal(false);
        setNewOrgName("");
      }
    } catch (err) {
      console.error("Create org failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8 z-20 relative">
      {/* Left: Tenant Switcher */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 text-slate-200 hover:text-white font-semibold text-sm bg-slate-850 px-3.5 py-2 rounded-lg border border-slate-800 cursor-pointer"
        >
          <span>{activeOrg?.name || "Select Organization"}</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-30">
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Switch Organization
            </div>
            
            <div className="max-h-48 overflow-y-auto">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    setActiveOrganization(org);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer flex items-center justify-between ${
                    org.id === activeOrg?.id
                      ? "bg-violet-600/15 text-violet-400 font-medium"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <span className="truncate">{org.name}</span>
                  <span className="text-[10px] uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                    {org.role}
                  </span>
                </button>
              ))}
            </div>

            <div className="border-t border-slate-800 p-2">
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setDropdownOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-md border border-slate-800 border-dashed cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                New Organization
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right: Security alert and status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800 text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Cloud Discovery Active
        </div>
      </div>

      {/* Create Org Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-xl shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Tenant Organization</h3>
            <form onSubmit={handleCreateOrg}>
              <div className="mb-4">
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp Dev"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
