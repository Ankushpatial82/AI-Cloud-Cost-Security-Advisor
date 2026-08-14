"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/auth";
import Sidebar from "../../components/dashboard/Sidebar";
import TopHeader from "../../components/dashboard/TopHeader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const initialize = useAuthStore((state) => state.initialize);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    initialize();
    setCheckingAuth(false);
  }, [initialize]);

  useEffect(() => {
    if (!checkingAuth && !isAuthenticated) {
      router.push("/login");
    }
  }, [checkingAuth, isAuthenticated, router]);

  if (checkingAuth || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <span className="w-12 h-12 border-4 border-violet-600/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">Verifying session authority...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Panel Content */}
      <div className="flex-grow flex flex-col min-w-0">
        {/* Organization Switcher & Status Bar */}
        <TopHeader />

        {/* Dynamic Page Views */}
        <main className="flex-grow overflow-y-auto p-8 bg-slate-950/40">
          {children}
        </main>
      </div>
    </div>
  );
}
