"use client";

import { useState } from "react";
import type { ReviewItemRow } from "@/lib/cash-app/review-queue-types";
import { DEFAULT_FALLBACK_CURRENCY, formatMoney } from "@/lib/format/money";
import { SplitAllocationModal } from "./SplitAllocationModal";
import { WriteOffModal } from "./WriteOffModal";

interface Props {
  item: ReviewItemRow;
  onClose: () => void;
  onResolved: (id: string) => void;
}

async function postResolve(id: string, body: unknown) {
  const res = await fetch(`/api/ar/cash-app/review-items/${id}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(payload.error ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

export function ReviewItemDetailModal({ item, onClose, onResolved }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSplit, setShowSplit] = useState(false);
  const [showWriteOff, setShowWriteOff] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);

  const score = item.ar_cash_app_match_scores?.[0];

  const handleAccept = async (invoiceId: string, matchedAmount: number) => {
    setBusy(true);
    setError(null);
    try {
      await postResolve(item.id, { action: "accept", invoiceId, matchedAmount });
      onResolved(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept match");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (rejectReason.trim().length === 0) {
      setError("Please provide a reason for rejecting.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await postResolve(item.id, { action: "reject", reason: rejectReason });
      onResolved(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject item");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-item-modal-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-slate-900 p-6 shadow-xl border border-white/10">
        <div className="flex items-start justify-between">
          <h2 id="review-item-modal-heading" className="text-lg font-semibold text-slate-100">
            Review Payment {item.payment_id}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1 text-slate-400 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            &times;
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-400/40 bg-red-950/40 p-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        {score && (
          <section
            aria-labelledby="llm-reasoning-heading"
            className="mt-4 rounded-md border border-teal-500/30 bg-teal-950/30 p-4"
          >
            <h3 id="llm-reasoning-heading" className="text-sm font-semibold text-teal-200">
              LLM Reasoning ({score.llm_tier_used ?? "not invoked"})
            </h3>
            <p className="mt-1 text-sm text-teal-100">
              {score.llm_reasoning_excerpt ?? "No LLM candidate reached this payment."}
            </p>
            <p className="mt-2 text-xs text-teal-300">
              Aggregate feature score: {Math.round(score.aggregate_feature_score * 100)}% · Final
              confidence:{" "}
              {score.final_confidence != null
                ? `${Math.round(score.final_confidence * 100)}%`
                : "n/a"}
              {score.escalated_to_toptier ? " · Escalated to Sonnet 5" : ""}
            </p>
          </section>
        )}

        <section aria-labelledby="candidates-heading" className="mt-4">
          <h3 id="candidates-heading" className="text-sm font-semibold text-slate-100">
            Candidate Invoices
          </h3>
          <table className="mt-2 w-full text-left text-sm text-slate-200">
            <caption className="sr-only">Feature score breakdown per candidate invoice</caption>
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase text-slate-500">
                <th scope="col" className="py-2 pr-2">
                  Invoice
                </th>
                <th scope="col" className="py-2 pr-2">
                  Customer
                </th>
                <th scope="col" className="py-2 pr-2">
                  Amount
                </th>
                <th scope="col" className="py-2 pr-2">
                  Fuzzy
                </th>
                <th scope="col" className="py-2 pr-2">
                  Amount Tol.
                </th>
                <th scope="col" className="py-2 pr-2">
                  Date Prox.
                </th>
                <th scope="col" className="py-2 pr-2">
                  Historical
                </th>
                <th scope="col" className="py-2 pr-2">
                  Global
                </th>
                <th scope="col" className="py-2 pr-2">
                  Aggregate
                </th>
                <th scope="col" className="py-2">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {item.top_candidates.map((c) => (
                <tr key={c.invoiceId} className="border-b border-white/5">
                  <td className="py-2 pr-2">{c.invoiceNumber}</td>
                  <td className="py-2 pr-2">{c.customerName}</td>
                  <td className="py-2 pr-2">
                    {formatMoney(c.invoiceAmount, c.currency || item.home_currency || DEFAULT_FALLBACK_CURRENCY, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-2 pr-2">{Math.round(c.fuzzyPayerNameScore * 100)}%</td>
                  <td className="py-2 pr-2">{Math.round(c.amountToleranceScore * 100)}%</td>
                  <td className="py-2 pr-2">{Math.round(c.dateProximityScore * 100)}%</td>
                  <td className="py-2 pr-2">
                    {Math.round(c.historicalPayerBehaviorScore * 100)}%
                  </td>
                  <td className="py-2 pr-2">{Math.round(c.globalPatternScore * 100)}%</td>
                  <td className="py-2 pr-2 font-medium">
                    {Math.round(c.aggregateFeatureScore * 100)}%
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAccept(c.invoiceId, c.invoiceAmount)}
                      className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Accept
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-labelledby="actions-heading" className="mt-6 border-t border-white/10 pt-4">
          <h3 id="actions-heading" className="text-sm font-semibold text-slate-100">
            Other Actions
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowRejectPrompt((v) => !v)}
              disabled={busy}
              className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/5 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => setShowWriteOff(true)}
              disabled={busy}
              className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/5 disabled:opacity-50"
            >
              Write Off (Short-Pay)
            </button>
            <button
              type="button"
              onClick={() => setShowSplit(true)}
              disabled={busy}
              className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/5 disabled:opacity-50"
            >
              Split Across Invoices
            </button>
          </div>

          {showRejectPrompt && (
            <div className="mt-3">
              <label htmlFor="reject-reason" className="block text-sm font-medium text-slate-300">
                Reason for rejecting
              </label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-white/20 bg-slate-950 p-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              />
              <button
                type="button"
                onClick={handleReject}
                disabled={busy}
                className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          )}
        </section>
      </div>

      {showWriteOff && (
        <WriteOffModal
          reviewItemId={item.id}
          maxAmount={item.top_candidates[0]?.invoiceAmount ?? 0}
          onClose={() => setShowWriteOff(false)}
          onResolved={() => onResolved(item.id)}
        />
      )}
      {showSplit && (
        <SplitAllocationModal
          reviewItemId={item.id}
          candidates={item.top_candidates}
          homeCurrency={item.home_currency}
          onClose={() => setShowSplit(false)}
          onResolved={() => onResolved(item.id)}
        />
      )}
    </div>
  );
}
