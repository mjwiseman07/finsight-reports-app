"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClientBriefingsChrome, EmptyBriefingState, RiskBadge, StatusBadge } from "../../components/ClientBriefingsChrome";

type BriefingRow = {
  clientId: string;
  clientName: string;
  cadence: string;
  lastBriefingSent: string;
  nextScheduledBriefing: string;
  status: string;
  approvalRequired: boolean;
  missingReports: string[];
  riskLevel: string;
  latestBriefing?: { id: string } | null;
};

type DashboardSummary = {
  clients: number;
  pendingApproval: number;
  highRisk: number;
  missingData: number;
};

const emptySummary: DashboardSummary = {
  clients: 0,
  pendingApproval: 0,
  highRisk: 0,
  missingData: 0,
};

function getAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("supabase_access_token") || "";
}

export default function ClientBriefingsDashboardPage() {
  const [rows, setRows] = useState<BriefingRow[]>([]);
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [riskFilter, setRiskFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState("");

  const loadDashboard = async () => {
    setError("");
    const token = getAuthToken();
    if (!token) {
      setError("Sign in as a firm admin or advisor to view Client Briefings.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/client-briefings/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to load Client Briefings.");
        return;
      }

      setRows(result.rows || []);
      setSummary(result.summary || emptySummary);
    } catch {
      setError("Unable to load Client Briefings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const riskMatches = riskFilter === "All" || row.riskLevel === riskFilter;
        const statusMatches = statusFilter === "All" || row.status === statusFilter;
        return riskMatches && statusMatches;
      }),
    [riskFilter, rows, statusFilter],
  );

  const callAction = async (endpoint: string, body: Record<string, string>, successMessage: string) => {
    const token = getAuthToken();
    setIsWorking(`${endpoint}-${body.client_id || body.briefing_id}`);
    setMessage("");
    setError("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Action failed.");
        return;
      }

      setMessage(successMessage);
      await loadDashboard();
    } catch {
      setError("Action failed.");
    } finally {
      setIsWorking("");
    }
  };

  return (
    <ClientBriefingsChrome active="Dashboard">
      <section className="py-10">
        <div className="rounded-[2rem] border border-blue-300/20 bg-blue-500/10 p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Client Briefings</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.055em] md:text-7xl">
            Every client gets a CFO-style briefing.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            Automate plain-English client updates at the cadence your firm chooses, with advisor review, missing-data notices, risk flags, and client-ready delivery.
          </p>
        </div>

        {isLoading && <EmptyBriefingState message="Loading Client Briefings..." />}
        {error && <div className="mt-6 rounded-3xl border border-red-300/30 bg-red-400/10 p-5 text-sm font-bold text-red-100">{error}</div>}
        {message && <div className="mt-6 rounded-3xl border border-emerald-300/30 bg-emerald-400/10 p-5 text-sm font-bold text-emerald-100">{message}</div>}

        {!isLoading && !error && (
          <>
            <div className="mt-8 grid gap-5 md:grid-cols-4">
              <SummaryCard label="Clients" value={summary.clients} />
              <SummaryCard label="Pending Approval" value={summary.pendingApproval} />
              <SummaryCard label="High Risk" value={summary.highRisk} />
              <SummaryCard label="Missing Data" value={summary.missingData} />
            </div>

            <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-200">Briefing Dashboard</p>
                  <h2 className="mt-2 text-3xl font-black">Cadence, status, risk, approvals, and missing data</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none">
                    {["All", "Low", "Medium", "High"].map((risk) => <option key={risk}>{risk}</option>)}
                  </select>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none">
                    {["All", "Draft", "Pending Approval", "Approved", "Sent", "Failed", "Skipped"].map((status) => <option key={status}>{status}</option>)}
                  </select>
                  <Link href="/client-briefings/settings" className="rounded-2xl bg-[#FF7A1A] px-5 py-3 text-sm font-black text-white">
                    Configure Settings
                  </Link>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10">
                <table className="min-w-[1180px] w-full text-left text-sm">
                  <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Client name</th>
                      <th className="px-4 py-3">Cadence</th>
                      <th className="px-4 py-3">Last sent</th>
                      <th className="px-4 py-3">Next scheduled</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Approval</th>
                      <th className="px-4 py-3">Missing reports</th>
                      <th className="px-4 py-3">Risk</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredRows.map((row) => (
                      <tr key={row.clientId} className="bg-slate-950/35 align-top">
                        <td className="px-4 py-4 font-black text-white">{row.clientName}</td>
                        <td className="px-4 py-4 font-bold text-slate-300">{row.cadence}</td>
                        <td className="px-4 py-4 text-slate-400">{formatDate(row.lastBriefingSent)}</td>
                        <td className="px-4 py-4 text-slate-400">{row.nextScheduledBriefing}</td>
                        <td className="px-4 py-4"><StatusBadge status={row.status} /></td>
                        <td className="px-4 py-4 text-slate-300">{row.approvalRequired ? "Required" : "Auto-send allowed"}</td>
                        <td className="px-4 py-4 text-slate-400">{row.missingReports.length ? row.missingReports.join(", ") : "None"}</td>
                        <td className="px-4 py-4"><RiskBadge risk={row.riskLevel} /></td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/client-briefings/preview?client_id=${row.clientId}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-200">View</Link>
                            <Link href={`/client-briefings/settings?client_id=${row.clientId}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-200">Edit</Link>
                            {row.latestBriefing?.id && (
                              <button disabled={Boolean(isWorking)} onClick={() => callAction("/api/client-briefings/approve", { briefing_id: row.latestBriefing?.id || "" }, "Briefing approved.")} className="rounded-xl border border-blue-300/20 px-3 py-2 text-xs font-black text-blue-100 disabled:opacity-50">Approve</button>
                            )}
                            <button disabled={Boolean(isWorking)} onClick={() => callAction("/api/client-briefings/generate", { client_id: row.clientId }, "Briefing generated.")} className="rounded-xl border border-[#FF7A1A]/30 px-3 py-2 text-xs font-black text-[#FFD0AB] disabled:opacity-50">Regenerate</button>
                            {row.latestBriefing?.id && (
                              <button disabled={Boolean(isWorking)} onClick={() => callAction("/api/client-briefings/send", { briefing_id: row.latestBriefing?.id || "" }, "Briefing marked sent.")} className="rounded-xl border border-emerald-300/20 px-3 py-2 text-xs font-black text-emerald-100 disabled:opacity-50">Send Now</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </section>
    </ClientBriefingsChrome>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-3 text-4xl font-black text-white">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  if (!value || value === "Not sent") return value || "Not sent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}
