"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { focusRing, headingFont } from "@/components/site-ui";

interface ReportRow {
  je_attempt_id: string;
  posted_at: string | null;
  materiality_bucket: string | null;
  rule_reason_code: string | null;
  qbo_je_id: string | null;
  approved_by_user_id: string | null;
  backup_packet_id: string | null;
  evidence_line_count: number | null;
}

function authHeaders(): HeadersInit {
  const token = window.localStorage.getItem("supabase_access_token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function PostedJesInner() {
  const search = useSearchParams();
  const engagementId = search?.get("engagement_id") || "";
  const [from, setFrom] = useState(() => {
    const d = new Date();
    return `${d.getUTCFullYear()}-01-01`;
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => {
    if (!engagementId) return null;
    const p = new URLSearchParams({ engagement_id: engagementId });
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p.toString();
  }, [engagementId, from, to]);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/client/posted-je-report?${query}`, {
        cache: "no-store",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error || `http_${res.status}`);
        setRows([]);
      } else {
        setRows(data.entries ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!engagementId) {
    return (
      <main className="mx-auto max-w-4xl p-6 text-[#ECEBE7]">
        <p className="text-sm text-[#A29E93]">
          Provide <code>engagement_id</code> in the URL to load the posted JE report.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 text-[#ECEBE7]">
      <div>
        <h1 className={`${headingFont} text-2xl font-semibold`}>Posted journal entries</h1>
        <p className="mt-1 text-sm text-[#A29E93]">
          Audit-ready list of posted JEs with materiality, approver, and backup packets.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-[#A29E93]">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={`${focusRing()} rounded-md border border-[#C9A961]/30 bg-[#1A1A1C] px-2 py-1`}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[#A29E93]">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={`${focusRing()} rounded-md border border-[#C9A961]/30 bg-[#1A1A1C] px-2 py-1`}
          />
        </label>
        <Link href="/dashboard" className={`${focusRing()} text-sm text-[#C9A961] underline`}>
          Back to dashboard
        </Link>
      </div>

      {loading ? <p className="text-sm text-[#A29E93]">Loading…</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-[#C9A961]/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#1A1A1C] text-[#A29E93]">
            <tr>
              <th className="px-3 py-2">Posted</th>
              <th className="px-3 py-2">Materiality</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">QBO JE</th>
              <th className="px-3 py-2">Approver</th>
              <th className="px-3 py-2">Evidence</th>
              <th className="px-3 py-2">Packet</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.je_attempt_id} className="border-t border-[#C9A961]/15">
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.posted_at ? new Date(r.posted_at).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2">{r.materiality_bucket ?? "—"}</td>
                <td className="px-3 py-2">{r.rule_reason_code ?? "—"}</td>
                <td className="px-3 py-2">{r.qbo_je_id ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.approved_by_user_id ? `${r.approved_by_user_id.slice(0, 8)}…` : "—"}
                </td>
                <td className="px-3 py-2">{r.evidence_line_count ?? 0}</td>
                <td className="px-3 py-2">
                  {r.backup_packet_id ? (
                    <a
                      href={`/api/client/posted-je-report/${r.je_attempt_id}/packet`}
                      className={`${focusRing()} text-[#C9A961] underline`}
                    >
                      Download
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-[#A29E93]">
                  No posted JEs in this range.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default function PostedJesPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl p-6 text-sm text-[#A29E93]">Loading report…</main>
      }
    >
      <PostedJesInner />
    </Suspense>
  );
}
