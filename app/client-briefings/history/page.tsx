"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClientBriefingsChrome, EmptyBriefingState, RiskBadge, StatusBadge } from "../../../components/ClientBriefingsChrome";

type Briefing = {
  id: string;
  clientId: string;
  clientName?: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  riskLevel: string;
  missingReports: string[];
  generatedAt: string;
  sentAt: string;
};

function getAuthToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("supabase_access_token") || "";
}

export default function ClientBriefingHistoryPage() {
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      const token = getAuthToken();
      if (!token) {
        setError("Sign in as a firm admin or advisor to view briefing history.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/client-briefings/history", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || "Unable to load briefing history.");
          return;
        }

        setBriefings(result.briefings || []);
      } catch {
        setError("Unable to load briefing history.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadHistory();
  }, []);

  return (
    <ClientBriefingsChrome active="Briefing History">
      <section className="py-10">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#FFB36F]">Briefing History</p>
          <h1 className="mt-4 text-5xl font-black tracking-[-0.055em]">Audit every generated briefing.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            Review generated, approved, sent, failed, skipped, and regenerated briefings across the client portfolio.
          </p>
        </div>

        {isLoading && <EmptyBriefingState message="Loading briefing history..." />}
        {error && <div className="mt-6 rounded-3xl border border-red-300/30 bg-red-400/10 p-5 text-sm font-bold text-red-100">{error}</div>}

        {!isLoading && !error && (
          <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="overflow-x-auto rounded-3xl border border-white/10">
              <table className="min-w-[920px] w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Generated</th>
                    <th className="px-4 py-3">Sent</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Risk</th>
                    <th className="px-4 py-3">Missing data</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {briefings.map((briefing) => (
                    <tr key={briefing.id} className="bg-slate-950/35">
                      <td className="px-4 py-4 font-black text-white">{briefing.clientName || briefing.clientId}</td>
                      <td className="px-4 py-4 text-slate-300">{briefing.periodStart} to {briefing.periodEnd}</td>
                      <td className="px-4 py-4 text-slate-400">{formatDate(briefing.generatedAt)}</td>
                      <td className="px-4 py-4 text-slate-400">{briefing.sentAt ? formatDate(briefing.sentAt) : "Not sent"}</td>
                      <td className="px-4 py-4"><StatusBadge status={briefing.status} /></td>
                      <td className="px-4 py-4"><RiskBadge risk={briefing.riskLevel} /></td>
                      <td className="px-4 py-4 text-slate-400">{briefing.missingReports.length ? briefing.missingReports.join(", ") : "None"}</td>
                      <td className="px-4 py-4">
                        <Link href={`/client-briefings/preview?briefing_id=${briefing.id}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-200">
                          Preview
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </section>
    </ClientBriefingsChrome>
  );
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
