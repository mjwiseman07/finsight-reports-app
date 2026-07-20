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
  last_tie_out_run_id: string | null;
  last_tie_out_status: string | null;
  last_tie_out_at: string | null;
};

type Policy = {
  policy_mode: string;
  auto_reconcile_max_dollar: number;
  auto_reconcile_max_percent: number;
  kickout_min_dollar: number;
  kickout_min_percent: number;
  authoritative_comparison: string;
} | null;

type RunOutcome = {
  ok?: boolean;
  kind?: string;
  runId?: string;
  totalsStatus?: string;
  itemCount?: number;
  reason?: string;
  code?: string;
  error?: string;
};

/** Status pills kept as slate/amber/emerald (AR internal surface — paste OK). */
const PILL_STYLES: Record<string, string> = {
  // shipped in TIEOUT-1:
  no_tolerance_policy: "bg-slate-100 text-slate-700 ring-slate-200",
  not_yet_classified: "bg-amber-50 text-amber-800 ring-amber-200",
  requires_manual_review: "bg-orange-50 text-orange-800 ring-orange-200",
  classified: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  // NEW in TIEOUT-2:
  ready_to_run: "bg-sky-50 text-sky-800 ring-sky-200",
  tied_out: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  auto_reconciled: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  needs_review: "bg-amber-50 text-amber-800 ring-amber-200",
  kicked_out: "bg-rose-50 text-rose-800 ring-rose-200",
  failed: "bg-rose-50 text-rose-900 ring-rose-300",
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
  const [runOpen, setRunOpen] = useState<{
    pbcId: string;
    requestNumber: string;
    tieOutKind: string | null;
  } | null>(null);
  const [runBusy, setRunBusy] = useState(false);
  const [runErr, setRunErr] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<RunOutcome | null>(null);

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
      const resp = await fetch(
        `/api/audit-ready/${engagementId}/tie-out-classify`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ useLLMFallback: true }),
        },
      );
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

  async function setPolicyMode(
    mode: "aggressive" | "standard" | "conservative",
  ) {
    setBusy("policy");
    setErr(null);
    setMsg(null);
    try {
      const resp = await fetch(
        `/api/audit-ready/${engagementId}/tie-out-policy`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ policy_mode: mode }),
        },
      );
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

  async function triggerRun(
    pbcId: string,
    asOfDate: string,
    accountId: string,
    tieOutKind: string | null,
  ) {
    setRunBusy(true);
    setRunErr(null);
    setRunResult(null);
    try {
      const body: Record<string, unknown> = {
        pbc_request_id: pbcId,
        as_of_date: asOfDate,
      };
      if (tieOutKind === "ar_aging" && accountId) {
        body.ar_account_id = accountId;
      } else if (tieOutKind === "ap_aging" && accountId) {
        body.ap_account_id = accountId;
      } else if (tieOutKind === "inventory" && accountId) {
        body.inventory_account_id = accountId;
      }
      const resp = await fetch(
        `/api/audit-ready/${engagementId}/tie-out/run`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = (await resp.json()) as RunOutcome;
      if (!resp.ok || data.ok === false) {
        setRunErr(data.reason || data.error || "run_failed");
      } else {
        setRunResult(data);
        await refresh();
      }
    } catch (e: unknown) {
      setRunErr(e instanceof Error ? e.message : "unknown");
    } finally {
      setRunBusy(false);
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
              <th className="py-2">Last run</th>
              <th className="py-2">Actions</th>
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
                <td className="py-2 text-xs text-[#7A7974]">
                  {r.last_tie_out_status
                    ? String(r.last_tie_out_status).replace(/_/g, " ")
                    : "—"}
                </td>
                <td className="py-2">
                  {r.tie_out_state === "ready_to_run" ||
                  r.tie_out_state === "needs_review" ||
                  r.tie_out_state === "failed" ||
                  r.tie_out_state === "kicked_out" ? (
                    canWrite ? (
                      <button
                        type="button"
                        onClick={() =>
                          setRunOpen({
                            pbcId: r.pbc_request_id,
                            requestNumber: r.request_number,
                            tieOutKind: r.tie_out_kind,
                          })
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        disabled={runBusy}
                      >
                        Run
                      </button>
                    ) : (
                      "—"
                    )
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {runOpen && (
        <RunModal
          engagementId={engagementId}
          pbcId={runOpen.pbcId}
          requestNumber={runOpen.requestNumber}
          tieOutKind={runOpen.tieOutKind}
          onClose={() => {
            setRunOpen(null);
            setRunErr(null);
            setRunResult(null);
          }}
          onSubmit={(asOf, acct) =>
            triggerRun(runOpen.pbcId, asOf, acct, runOpen.tieOutKind)
          }
          busy={runBusy}
          err={runErr}
          result={runResult}
        />
      )}
    </div>
  );
}

function RunModal({
  engagementId: _engagementId,
  pbcId: _pbcId,
  requestNumber,
  tieOutKind,
  onClose,
  onSubmit,
  busy,
  err,
  result,
}: {
  engagementId: string;
  pbcId: string;
  requestNumber: string;
  tieOutKind: string | null;
  onClose: () => void;
  onSubmit: (asOfDate: string, accountId: string) => void | Promise<void>;
  busy: boolean;
  err: string | null;
  result: RunOutcome | null;
}) {
  const [asOf, setAsOf] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [acct, setAcct] = useState<string>("");
  const accountLabel =
    tieOutKind === "ap_aging"
      ? "QBO AP account ID"
      : tieOutKind === "inventory"
        ? "QBO Inventory account ID"
        : tieOutKind === "ar_aging"
          ? "QBO AR account ID"
          : null;
  const showAccountInput =
    tieOutKind === "ar_aging" ||
    tieOutKind === "ap_aging" ||
    tieOutKind === "inventory";
  const showGrniNote = tieOutKind === "grni";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            Run tie-out — {requestNumber}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800"
          >
            ×
          </button>
        </div>
        {!result ? (
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="block text-xs font-medium text-slate-700">
                Period end (as-of)
              </span>
              <input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </label>
            {showAccountInput && accountLabel && (
              <label className="block">
                <span className="block text-xs font-medium text-slate-700">
                  {accountLabel}{" "}
                  <span className="text-slate-500">
                    (optional — falls back to PBC source hint / engagement
                    binding)
                  </span>
                </span>
                <input
                  type="text"
                  value={acct}
                  onChange={(e) => setAcct(e.target.value)}
                  placeholder="e.g. 84"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono"
                />
              </label>
            )}
            {showGrniNote && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                GRNI clearing account is resolved from engagement settings
                (`grni_clearing_qbo_account_id`). No account ID input required.
              </div>
            )}
            {err && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                {err}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onSubmit(asOf, acct)}
                disabled={busy}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {busy ? "Running…" : "Run tie-out"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2 text-sm">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
              Tie-out completed — {result.itemCount} items, totals status{" "}
              <strong>{result.totalsStatus}</strong>.
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
