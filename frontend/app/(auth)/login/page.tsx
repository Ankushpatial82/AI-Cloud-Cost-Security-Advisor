"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/auth";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setOrganizations = useAuthStore((state) => state.setOrganizations);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  
  // UI Flow State
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      
      if (res.data?.success) {
        const data = res.data.data;
        
        if (data.mfaRequired) {
          setMfaRequired(true);
          setMfaToken(data.mfaToken);
          setLoading(false);
        } else {
          // Normal login success without MFA
          setAuth(data.user, data.organization, data.accessToken);
          
          // Fetch user's organizations safely
          try {
            const orgsRes = await api.get("/orgs");
            if (orgsRes.data?.success) {
              setOrganizations(orgsRes.data.data);
            }
          } catch (orgErr) {
            console.warn("Could not pre-fetch orgs:", orgErr);
          }
          
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/mfa/verify", { code: mfaCode, mfaToken });
      
      if (res.data?.success) {
        const data = res.data.data;
        setAuth(data.user, data.organization, data.accessToken);
        
        const orgsRes = await api.get("/orgs");
        if (orgsRes.data?.success) {
          setOrganizations(orgsRes.data.data);
        }
        
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid MFA code. Please verify and retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Decorative Glow Elements */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-cyan-600/20 blur-3xl" />

      {/* Card Wrapper */}
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 font-bold text-2xl tracking-wide mb-3">
            CA
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            AI Cloud Cost & Security Advisor
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            {mfaRequired ? "Enter your 2FA authentication code" : "Sign in to monitor & protect your infrastructure"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-800/50 rounded-lg text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        {!mfaRequired ? (
          /* Password Authentication Form */
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2" htmlFor="email">
                Work Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Continue"
              )}
            </button>
          </form>
        ) : (
          /* MFA OTP Verification Form */
          <form onSubmit={handleVerifyMFA} className="space-y-5">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2" htmlFor="mfaCode">
                Verification Code
              </label>
              <input
                id="mfaCode"
                type="text"
                required
                maxLength={6}
                pattern="[0-9]*"
                inputMode="numeric"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-center text-2xl tracking-widest transition-colors"
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Verify Code"
              )}
            </button>

            <button
              type="button"
              className="w-full text-slate-400 hover:text-white text-sm text-center transition-colors mt-2"
              onClick={() => {
                setMfaRequired(false);
                setMfaToken("");
              }}
            >
              ← Back to password login
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-slate-800 text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
            Sign up for free
          </Link>
        </div>
      </div>
    </div>
  );
}
