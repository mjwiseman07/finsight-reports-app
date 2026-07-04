"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { CloseAssertionCoverageRow } from "@/lib/pre-close/assertions-coverage-types";
import { ACCOUNT_CATEGORIES, ASSERTION_IDS } from "@/lib/pre-close/assertions-types";

interface CoverageResponse {
  close_period_id: string;
  firm_client_id: string;
  rows: CloseAssertionCoverageRow[];
}

function statusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "tested":
      return {
        label: "Tested",
        className: "bg-emerald-600/20 text-emerald-300 border-emerald-500/40",
      };
    case "partial":
      return {
        label: "Partial",
        className: "bg-amber-600/20 text-amber-300 border-amber-500/40",
      };
    case "gap":
      return { label: "Gap", className: "bg-rose-600/20 text-rose-300 border-rose-500/40" };
    case "not_applicable":
    default:
      return { label: "N/A", className: "bg-slate-600/20 text-slate-400 border-slate-500/40" };
  }
}

export default function AssertionCoveragePage() {
  const params = useParams();
  const closePeriodId = String(params?.id ?? "");
  const [data, setData] = useState<CoverageResponse | null>(null);
  const [error, setError] = useState("");
  const [isWriter, setIsWriter] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  const load = useCallback(async () => {
    const token = window.localStorage.getItem("supabase_access_token") || "";
    const [coverageRes, meRes] = await Promise.all([
      fetch(`/api/reviewer/close-periods/${closePeriodId}/assertion-coverage`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/reviewer/me", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const body = await coverageRes.json();
    if (!coverageRes.ok) {
      setError(body.error || "load_failed");
      return;
    }
    setData(body);
    const me = await meRes.json();
    setIsWriter((me.writerFirmIds ?? []).length > 0);
  }, [closePeriodId]);

  useEffect(() => {
    load();
  }, [load]);

  async function recompute() {
    setRecomputing(true);
    try {
      const token = window.localStorage.getItem("supabase_access_token") || "";
      const res = await fetch(
        `/api/reviewer/close-periods/${closePeriodId}/assertion-coverage/recompute`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "recompute_failed");
      } else {
        await load();
      }
    } finally {
      setRecomputing(false);
    }
  }

  async function handleDownloadPdf() {
    const token = window.localStorage.getItem("supabase_access_token");
    if (!token) {
      alert("Not authenticated");
      return;
    }
    const res = await fetch(
      `/api/reviewer/close-periods/${closePeriodId}/assertion-coverage/pdf`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(`Download failed: ${err.error || res.statusText}`);
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assertion-coverage-${closePeriodId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  const grid = useMemo(() => {
    if (!data) return null;
    const byPair = new Map<string, CloseAssertionCoverageRow>();
    for (const r of data.rows) {
      byPair.set(`${r.account_category}::${r.assertion_id}`, r);
    }
    return byPair;
  }, [data]);

  if (error) return <p className="text-rose-300">{error}</p>;
  if (!data) return <p className="text-slate-400">Loading coverage…</p>;

  const totals = data.rows.reduce(
    (acc, r) => {
      acc[r.coverage_status] = (acc[r.coverage_status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Assertion Coverage</h1>
          <p className="text-sm text-slate-400">Close period {closePeriodId.slice(0, 8)}…</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isWriter && (
            <button
              type="button"
              onClick={recompute}
              disabled={recomputing}
              className="rounded-md border border-emerald-500/40 bg-emerald-600/20 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-600/30 disabled:opacity-50"
            >
              {recomputing ? "Recomputing…" : "Recompute coverage"}
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Download Coverage Statement PDF
          </button>
        </div>
      </div>
      <div className="flex gap-3 text-xs">
        <span className="rounded border border-emerald-500/40 bg-emerald-600/20 px-2 py-1 text-emerald-300">
          Tested: {totals.tested ?? 0}
        </span>
        <span className="rounded border border-amber-500/40 bg-amber-600/20 px-2 py-1 text-amber-300">
          Partial: {totals.partial ?? 0}
        </span>
        <span className="rounded border border-rose-500/40 bg-rose-600/20 px-2 py-1 text-rose-300">
          Gap: {totals.gap ?? 0}
        </span>
        <span className="rounded border border-slate-500/40 bg-slate-600/20 px-2 py-1 text-slate-400">
          N/A: {totals.not_applicable ?? 0}
        </span>
      </div>
      <div className="overflow-x-auto rounded border border-slate-700">
        <table className="min-w-full text-xs text-slate-200">
          <thead className="bg-slate-800/60 text-slate-400">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-800/80 px-3 py-2 text-left">
                Account category
              </th>
              {ASSERTION_IDS.map((a) => (
                <th key={a} className="px-2 py-2 text-left">
                  {a.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ACCOUNT_CATEGORIES.map((cat) => (
              <tr key={cat} className="border-t border-slate-700/60">
                <td className="sticky left-0 z-10 bg-slate-900/80 px-3 py-2 font-medium text-slate-300">
                  {cat.replace(/_/g, " ")}
                </td>
                {ASSERTION_IDS.map((a) => {
                  const cell = grid?.get(`${cat}::${a}`);
                  const badge = statusBadge(cell?.coverage_status ?? "not_applicable");
                  return (
                    <td key={a} className="px-2 py-2 align-top">
                      <div
                        className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] ${badge.className}`}
                        title={
                          cell
                            ? [
                                `status: ${cell.coverage_status}`,
                                `strength: ${cell.evidence_strength}`,
                                cell.gap_root_cause_code
                                  ? `root: ${cell.gap_root_cause_code}`
                                  : null,
                                cell.gap_recommendation ? `rec: ${cell.gap_recommendation}` : null,
                              ]
                                .filter(Boolean)
                                .join("\n")
                            : "no coverage row"
                        }
                      >
                        {badge.label}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
