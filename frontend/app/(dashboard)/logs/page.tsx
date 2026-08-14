"use client";

import React, { useState } from "react";
import api from "../../../lib/api";
import {
  Terminal,
  Sparkles,
  RefreshCw,
  FileText,
  AlertTriangle,
  Play
} from "lucide-react";

export default function LogsPage() {
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logs.trim()) return;

    setLoading(true);
    setResults(null);

    try {
      const res = await api.post("/logs/analyze", { logs });
      if (res.data?.success) {
        setResults(res.data.data);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to analyze logs. Check API configs.");
    } finally {
      setLoading(false);
    }
  };

  const loadSampleLogs = () => {
    const sample = `[2026-06-07T15:40:01.200Z] INFO [App] Starting Express Node.js application server...
[2026-06-07T15:40:02.124Z] INFO [DB] Connected to PostgreSQL on port 5432.
[2026-06-07T15:42:15.542Z] WARN [App] Client token refresh request took longer than average (1420ms).
[2026-06-07T15:43:02.110Z] ERROR [DB] Connection timeout pool exceeded at 15:43:02 UTC. Active clients: 20/20.
[2026-06-07T15:43:02.122Z] ERROR [App] Internal server error on request path /api/orgs/123/members. SQL timeout.
[2026-06-07T15:43:05.842Z] WARN [App] Client query took 8400ms: SELECT * FROM audit_logs WHERE organization_id = ...
[2026-06-07T15:43:06.120Z] ERROR [DB] Connection timeout pool exceeded. Cannot checkout client connection.
[2026-06-07T15:44:10.980Z] INFO [Worker] BullMQ queue cloud-discovery initialized.`;
    setLogs(sample);
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">SRE Log Analyzer</h2>
          <p className="text-slate-400 mt-1">Paste container, DB, or server logs to parse faults and generate AI diagnosis summaries</p>
        </div>
        <button
          onClick={loadSampleLogs}
          className="text-xs text-violet-400 hover:text-violet-300 font-semibold border border-dashed border-violet-500/30 hover:border-violet-500 bg-violet-600/5 hover:bg-violet-600/10 px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
        >
          Load Demo Log File
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left Column: Text Area Input */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col min-h-[500px]">
          <h3 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-400" />
            Console Output Log Stream
          </h3>

          <form onSubmit={handleAnalyze} className="flex-grow flex flex-col justify-between">
            <textarea
              required
              rows={16}
              placeholder="Paste raw server/console output lines here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-white font-mono text-xs focus:outline-none focus:border-violet-500 flex-grow"
              value={logs}
              onChange={(e) => setLogs(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading || !logs.trim()}
              className="w-full mt-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                  Running AI Scanner...
                </>
              ) : (
                <>
                  <Play className="w-4.5 h-4.5 fill-current" />
                  Analyze Log Anomaly
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: AI Diagnostics Results */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col justify-between min-h-[500px]">
          <div>
            <h3 className="font-semibold text-lg text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              AI Diagnostics Incident Report
            </h3>
            <p className="text-xs text-slate-500 mb-6">Diagnoses container crash patterns and SQL deadlocks</p>

            {results ? (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase">Lines Parsed</span>
                    <span className="text-lg font-bold text-white mt-1 block">{results.summary.totalLinesParsed}</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase">Warnings</span>
                    <span className="text-lg font-bold text-yellow-500 mt-1 block">{results.summary.warningsFound}</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase">Errors</span>
                    <span className="text-lg font-bold text-red-500 mt-1 block">{results.summary.errorsFound}</span>
                  </div>
                </div>

                {/* AI Text explanation */}
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-lg text-xs leading-relaxed text-slate-300 font-sans overflow-y-auto max-h-[320px] whitespace-pre-line">
                  {results.diagnostics}
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-slate-600 text-sm mt-16">
                <Terminal className="w-10 h-10 mb-2 text-slate-800" />
                No diagnostics compiled. Submit logs to process.
              </div>
            )}
          </div>

          {results?.matchedErrors?.length > 0 && (
            <div className="mt-6 border-t border-slate-800 pt-6">
              <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                First Detected Fault Streams
              </h4>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg space-y-1 max-h-24 overflow-y-auto">
                {results.matchedErrors.map((line: string, idx: number) => (
                  <p key={idx} className="font-mono text-[9px] text-red-400 truncate">{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
