"use client";

import { useMemo, useState } from "react";
import type { TopCandidateSummary } from "@/lib/cash-app/review-queue-types";
import { DEFAULT_FALLBACK_CURRENCY, formatMoney } from "@/lib/format/money";

interface Props {
  reviewItemId: string;
  candidates: TopCandidateSummary[];
  /** Phase MC-2d.1: tenant fallback currency when candidates carry none. */
  homeCurrency?: string;
  onClose: () => void;
  onResolved: () => void;
}

const TOLERANCE = 0.01;

export function SplitAllocationModal({
  reviewItemId,
  candidates,
  homeCurrency,
  onClose,
  onResolved,
}: Props) {
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phase MC-2d.1: resolve the active currency for this modal.
  // Precedence: the first candidate's currency (typically all candidates for
  // one review item share a currency — QBO/Xero don't split payments across
  // currencies), then the tenant home currency prop, then USD fallback.
  const currency = useMemo(
    () =>
      candidates.find((c) => c.currency)?.currency ||
      homeCurrency ||
      DEFAULT_FALLBACK_CURRENCY,
    [candidates, homeCurrency],
  );

  const money2 = (amount: number) =>
    formatMoney(amount, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalTarget = candidates.reduce((sum, c) => sum + c.invoiceAmount, 0);
  const runningTotal = useMemo(
    () => Object.values(allocations).reduce((sum, v) => sum + (parseFloat(v) || 0), 0),
    [allocations],
  );
  const withinTolerance = Math.abs(runningTotal - totalTarget) <= TOLERANCE;

  const handleSubmit = async () => {
    if (!withinTolerance) {
      setError(
        `Allocations must sum to ${money2(totalTarget)} (currently ${money2(runningTotal)})`,
      );
      return;
    }
    const splitAllocations = candidates
      .map((c) => ({ invoiceId: c.invoiceId, amount: parseFloat(allocations[c.invoiceId] ?? "0") }))
      .filter((a) => a.amount > 0);
    if (splitAllocations.length < 2) {
      setError("Split requires at least two invoices with a non-zero allocation.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ar/cash-app/review-items/${reviewItemId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "split", splitAllocations }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(payload.error ?? `Request failed with status ${res.status}`);
      }
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to split payment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="split-modal-heading"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-lg bg-slate-900 p-6 shadow-xl border border-white/10">
        <h2 id="split-modal-heading" className="text-lg font-semibold text-slate-100">
          Split Payment Across Invoices
        </h2>

        {error && (
          <div
            role="alert"
            className="mt-3 rounded-md border border-red-400/40 bg-red-950/40 p-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {candidates.map((c) => {
            // Phase MC-2d.1: each candidate uses its own currency label if
            // set, falling back to the modal-level currency.
            const rowCurrency = c.currency || currency;
            return (
              <div key={c.invoiceId}>
                <label
                  htmlFor={`alloc-${c.invoiceId}`}
                  className="block text-sm font-medium text-slate-300"
                >
                  {c.invoiceNumber} — {c.customerName} (invoice{" "}
                  {formatMoney(c.invoiceAmount, rowCurrency, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  )
                </label>
                <input
                  id={`alloc-${c.invoiceId}`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={allocations[c.invoiceId] ?? ""}
                  onChange={(e) =>
                    setAllocations((prev) => ({ ...prev, [c.invoiceId]: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-white/20 bg-slate-950 p-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                />
              </div>
            );
          })}
        </div>

        <p
          className={`mt-3 text-sm ${withinTolerance ? "text-emerald-400" : "text-amber-400"}`}
          role="status"
        >
          Running total: {money2(runningTotal)} of {money2(totalTarget)}{" "}
          {withinTolerance ? "(matches)" : `(must match within ${money2(TOLERANCE)})`}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || !withinTolerance}
            className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Confirm Split"}
          </button>
        </div>
      </div>
    </div>
  );
}
