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
        <div className="rounded-[2rem] border border-[#C9A961]/25 bg-[#1A1A1C] p-8 shadow-2xl shadow-black/40">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C9A961]">Briefing History</p>
          <h1 className="mt-4 text-5xl font-black tracking-[-0.055em] text-[#ECEBE7]">Audit every generated briefing.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#A29E93]">
            Review generated, approved, sent, failed, skipped, and regenerated briefings across the client portfolio.
          </p>
        </div>

        {isLoading && <div className="mt-6"><EmptyBriefingState message="Loading briefing history..." /></div>}
        {error && <div className="mt-6 rounded-3xl border border-[#B85C5C]/40 bg-[#B85C5C]/10 p-5 text-sm font-bold text-[#F0BFBF]">{error}</div>}

        {!isLoading && !error && (
          <section className="mt-8 rounded-[2rem] border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-6">
            <div className="overflow-x-auto rounded-3xl border border-[#C9A961]/20">
              <table className="min-w-[920px] w-full text-left text-sm">
                <thead className="bg-[#111112] text-xs uppercase tracking-[0.12em] text-[#7A7974]">
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
                <tbody className="divide-y divide-[#C9A961]/15">
                  {briefings.map((briefing) => (
                    <tr key={briefing.id} className="bg-[#1A1A1C]/60">
                      <td className="px-4 py-4 font-black text-[#ECEBE7]">{briefing.clientName || briefing.clientId}</td>
                      <td className="px-4 py-4 text-[#A29E93]">{briefing.periodStart} to {briefing.periodEnd}</td>
                      <td className="px-4 py-4 text-[#A29E93]">{formatDate(briefing.generatedAt)}</td>
                      <td className="px-4 py-4 text-[#A29E93]">{briefing.sentAt ? formatDate(briefing.sentAt) : "Not sent"}</td>
                      <td className="px-4 py-4"><StatusBadge status={briefing.status} /></td>
                      <td className="px-4 py-4"><RiskBadge risk={briefing.riskLevel} /></td>
                      <td className="px-4 py-4 text-[#A29E93]">{briefing.missingReports.length ? briefing.missingReports.join(", ") : "None"}</td>
                      <td className="px-4 py-4">
                        <Link href={`/client-briefings/preview?briefing_id=${briefing.id}`} className="rounded-xl border border-[#C9A961]/25 px-3 py-2 text-xs font-black text-[#ECEBE7] hover:border-[#C9A961]/50">
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
