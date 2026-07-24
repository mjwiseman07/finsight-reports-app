"use client";

import { useEffect, useRef } from "react";
import type {
  BsSummaryLine,
  BsTransaction,
} from "@/lib/audit-ready/tie-out/bs-recon-lines";

type Props = {
  open: boolean;
  onClose: () => void;
  line: BsSummaryLine | null;
  periodEnd: string;
  transactions: BsTransaction[];
  subledgerSourceUrl: string | null;
  loading: boolean;
  error: string | null;
};

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

/** Status pills — AR internal convention (paste-OK). */
const STATUS_STYLES: Record<string, string> = {
  tie: "bg-emerald-50 text-emerald-800 border-emerald-200",
  auto_reconcile: "bg-sky-50 text-sky-800 border-sky-200",
  review: "bg-amber-50 text-amber-800 border-amber-200",
  kickout: "bg-amber-100 text-amber-900 border-amber-400 font-semibold",
  failed: "bg-red-50 text-red-800 border-red-200",
};

export function AccountDrilldown({
  open,
  onClose,
  line,
  periodEnd,
  transactions,
  subledgerSourceUrl,
  loading,
  error,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [open]);

  if (!open || !line) return null;

  const variance = line.tie_variance_cents;
  const varianceClass =
    variance === 0 ? "text-emerald-700" : "text-red-700";

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drilldown-title"
    >
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div className="absolute inset-y-0 right-0 flex h-full w-full max-w-[450px] flex-col bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2
                id="drilldown-title"
                className="truncate text-lg font-semibold text-slate-900"
              >
                {line.qbo_account_name}
              </h2>
              <div className="mt-0.5 text-xs text-slate-600">
                {line.qbo_account_type ?? "—"} · {line.classification} · As of{" "}
                {formatDate(periodEnd)}
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <KpiCard
              label="Ending Balance (from GL detail)"
              value={formatCurrency(line.ending_balance_cents)}
            />
            <KpiCard
              label="GL Ending Balance (from Trial Balance)"
              value={formatCurrency(line.gl_ending_balance_cents)}
            />
            <KpiCard
              label="Variance"
              value={formatCurrency(variance)}
              valueClass={varianceClass}
            />
          </div>

          <div className="mb-4">
            <span
              className={`inline-block rounded border px-2 py-1 text-xs ${
                STATUS_STYLES[line.totals_status] ||
                "bg-slate-50 text-slate-700 border-slate-200"
              }`}
            >
              Status: {line.totals_status}
            </span>
          </div>

          {line.error_message && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <div className="font-semibold">
                {line.error_code ?? "Error"}
              </div>
              <div className="mt-1">{line.error_message}</div>
            </div>
          )}

          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            Activity
          </h3>

          {loading && (
            <div className="rounded border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
              Loading transactions…
            </div>
          )}

          {error && !loading && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              Failed to load transactions: {error}
            </div>
          )}

          {!loading && !error && transactions.length === 0 && (
            <div className="rounded border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
              No activity for this account through the as-of date.
            </div>
          )}

          {!loading && !error && transactions.length > 0 && (
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Date</th>
                    <th className="px-2 py-1.5 text-left">Type</th>
                    <th className="px-2 py-1.5 text-left">Doc #</th>
                    <th className="px-2 py-1.5 text-left">Name</th>
                    <th className="px-2 py-1.5 text-left">Memo</th>
                    <th className="px-2 py-1.5 text-right">Debit</th>
                    <th className="px-2 py-1.5 text-right">Credit</th>
                    <th className="px-2 py-1.5 text-right">Running</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, idx) => (
                    <tr
                      key={`${t.ordinal}-${idx}`}
                      className="border-t border-slate-100"
                    >
                      <td className="px-2 py-1.5 text-slate-800">
                        {t.txn_date ?? "—"}
                      </td>
                      <td className="px-2 py-1.5 text-slate-700">
                        {t.txn_type ?? "—"}
                      </td>
                      <td className="px-2 py-1.5 text-slate-700">
                        {t.doc_number ?? "—"}
                      </td>
                      <td
                        className="px-2 py-1.5 text-slate-800"
                        title={t.name ?? undefined}
                      >
                        {t.name ?? "—"}
                      </td>
                      <td
                        className="px-2 py-1.5 text-slate-600"
                        title={t.memo ?? undefined}
                      >
                        {t.memo ?? "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-900">
                        {t.debit_cents ? formatCurrency(t.debit_cents) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-900">
                        {t.credit_cents ? formatCurrency(t.credit_cents) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-800">
                        {formatCurrency(t.running_balance_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-5 py-3">
          {subledgerSourceUrl ? (
            <a
              href={subledgerSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[#C9A961] hover:text-[#DFC084]"
            >
              View in QuickBooks →
            </a>
          ) : (
            <span className="text-xs text-slate-500">
              QuickBooks report URL not available for this run.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={`mt-1 text-sm font-semibold tabular-nums ${valueClass ?? "text-slate-900"}`}
      >
        {value}
      </div>
    </div>
  );
}
