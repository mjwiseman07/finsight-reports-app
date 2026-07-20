"use client";

import { useState } from "react";

type Row = {
  pbc_request_id: string;
  request_number: string;
  request_description: string;
  tie_out_kind: string | null;
  tie_out_kind_confidence: number | null;
  tie_out_kind_classifier: string | null;
  tie_out_state: string;
  pbc_status: string;
};

type Policy = {
  policy_mode: string;
  auto_reconcile_max_dollar: number;
  auto_reconcile_max_percent: number;
  kickout_min_dollar: number;
  kickout_min_percent: number;
  authoritative_comparison: string;
} | null;

/** Status pills kept as slate/amber/emerald (AR internal surface — paste OK). */
const PILL_STYLES: Record<string, string> = {
  no_tolerance_policy: "bg-slate-100 text-slate-700 ring-slate-200",
  not_yet_classified: "bg-amber-50 text-amber-800 ring-amber-200",
  requires_manual_review: "bg-orange-50 text-orange-800 ring-orange-200",
  classified: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

export function TieOutSummaryClient({
  engagementId,
  rows: initialRows,
  policy,
  canWrite,
}: {
  engagementId: string;
  rows: Row[];
  policy: Policy;
  canWrite: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [busy, setBusy] = useState<null | "classify" | "policy">(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    const resp = await fetch(`/api/audit-ready/${engagementId}/tie-out-summary`);
    if (resp.ok) {
      const data = await resp.json();
      setRows(data.rows || []);
    }
  }

  async function runClassify() {
    setBusy("classify");
    setErr(null);
    setMsg(null);
    try {
      const resp = await fetch(`/api/audit-ready/${engagementId}/tie-out-classify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ useLLMFallback: true }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "classify_failed");
      setMsg(
        `Classified ${data.classified} rows (${data.llm_used} via Bedrock). ${data.unclassified_after_llm} still need manual review.`,
      );
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "unknown");
    } finally {
      setBusy(null);
    }
  }

  async function setPolicyMode(mode: "aggressive" | "standard" | "conservative") {
    setBusy("policy");
    setErr(null);
    setMsg(null);
    try {
      const resp = await fetch(`/api/audit-ready/${engagementId}/tie-out-policy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ policy_mode: mode }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "policy_save_failed");
      setMsg(`Tolerance policy set to ${mode}.`);
      window.location.reload();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "unknown");
    } finally {
      setBusy(null);
    }
  }

  const stateCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.tie_out_state] = (acc[r.tie_out_state] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mt-2 space-y-5">
      <section className="rounded-lg border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-5">
        <h2 className="text-sm font-semibold text-[#ECEBE7]">Tolerance policy</h2>
        {policy ? (
          <div className="mt-2 text-sm text-[#A29E93]">
            <div className="font-medium capitalize text-[#ECEBE7]">
              {policy.policy_mode}
            </div>
            <ul className="mt-1 list-disc pl-5 text-xs text-[#7A7974]">
              <li>
                Auto-reconcile when variance ≤ $
                {Number(policy.auto_reconcile_max_dollar).toFixed(2)} AND ≤{" "}
                {(Number(policy.auto_reconcile_max_percent) * 100).toFixed(2)}%
              </li>
              <li>
                Kickout when variance ≥ $
                {Number(policy.kickout_min_dollar).toFixed(2)} OR ≥{" "}
                {(Number(policy.kickout_min_percent) * 100).toFixed(2)}%
              </li>
              <li>
                Comparison:{" "}
                {String(policy.authoritative_comparison).replace(/_/g, " ")}
              </li>
            </ul>
          </div>
        ) : (
          <div className="mt-2 text-sm text-[#A29E93]">No policy set yet.</div>
        )}
        {canWrite && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(["aggressive", "standard", "conservative"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPolicyMode(m)}
                disabled={busy !== null}
                className="rounded-lg border border-[#C9A961]/30 bg-[#1A1A1C] px-3 py-1.5 text-xs font-medium capitalize text-[#ECEBE7] hover:bg-[#1A1A1C]/80 disabled:opacity-50"
              >
                Set {m}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[#ECEBE7]">PBC lines</h2>
            <div className="mt-1 text-xs text-[#7A7974]">
              Total {rows.length}. State counts:{" "}
              {Object.entries(stateCounts).map(([k, v]) => (
                <span key={k} className="mr-3 font-medium text-[#A29E93]">
                  {k}: {v}
                </span>
              ))}
            </div>
          </div>
          {canWrite && (
            <button
              type="button"
              onClick={runClassify}
              disabled={busy !== null}
              className="rounded-lg border border-[#C9A961]/40 bg-[#C9A961] px-3 py-1.5 text-xs font-semibold text-[#111112] hover:bg-[#DFC084] disabled:opacity-50"
            >
              {busy === "classify" ? "Classifying…" : "Classify tie-out kinds"}
            </button>
          )}
        </div>
        {msg && (
          <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-2 text-xs text-emerald-200">
            {msg}
          </div>
        )}
        {err && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 p-2 text-xs text-red-200">
            {err}
          </div>
        )}
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-xs text-[#A29E93]">
            <tr>
              <th className="py-2">#</th>
              <th className="py-2">Description</th>
              <th className="py-2">Kind</th>
              <th className="py-2">Confidence</th>
              <th className="py-2">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#C9A961]/10">
            {rows.map((r) => (
              <tr key={r.pbc_request_id}>
                <td className="py-2 font-mono text-xs text-[#A29E93]">
                  {r.request_number}
                </td>
                <td className="py-2 text-[#ECEBE7]">{r.request_description}</td>
                <td className="py-2 font-mono text-xs text-[#A29E93]">
                  {r.tie_out_kind || "—"}
                </td>
                <td className="py-2 text-xs tabular-nums text-[#7A7974]">
                  {r.tie_out_kind_confidence != null
                    ? Number(r.tie_out_kind_confidence).toFixed(2)
                    : "—"}
                </td>
                <td className="py-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      PILL_STYLES[r.tie_out_state] ||
                      "bg-slate-100 text-slate-700 ring-slate-200"
                    }`}
                  >
                    {String(r.tie_out_state).replace(/_/g, " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
