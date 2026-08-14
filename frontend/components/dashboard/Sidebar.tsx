"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Cloud,
  DollarSign,
  ShieldCheck,
  Terminal,
  FileSpreadsheet,
  AlertTriangle,
  History,
  LogOut,
  FolderLock
} from "lucide-react";
import { useAuthStore } from "../../store/auth";

const menuItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Cloud Accounts", href: "/accounts", icon: Cloud },
  { name: "Cost Optimizer", href: "/costs", icon: DollarSign },
  { name: "Security Scanner", href: "/security", icon: ShieldCheck },
  { name: "Kubernetes Module", href: "/kubernetes", icon: FolderLock },
  { name: "SRE Log Analyzer", href: "/logs", icon: Terminal },
  { name: "Alert Center", href: "/alerts", icon: AlertTriangle },
  { name: "Billing & Plans", href: "/billing", icon: FileSpreadsheet },
  { name: "Audit Logs", href: "/audit", icon: History },
];

export default function Sidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* Brand Logo */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center font-bold text-white text-xs tracking-wider">
          CA
        </div>
        <div>
          <h1 className="font-bold text-sm text-white tracking-wider">CLOUD ADVISOR</h1>
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Cost & Security</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-violet-600/10 border border-violet-500/20 text-violet-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-violet-400" : "text-slate-400 group-hover:text-white"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-800 flex flex-col gap-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-semibold text-white uppercase text-sm">
            {user?.name?.substring(0, 2) || "US"}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || ""}</p>
          </div>
        </div>
        
        <button
          onClick={() => {
            logout();
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/30 transition-all cursor-pointer"
        >
          <LogOut className="w-4.5 h-4.5" />
          Sign Out Session
        </button>
      </div>
    </aside>
  );
}
