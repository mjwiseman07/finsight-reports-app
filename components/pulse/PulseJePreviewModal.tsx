"use client";

import React from "react";
import type { JePreviewPayload, ResolvedAccountCandidate } from "@/lib/pulse-je/types";

type PreviewProps = {
  preview: JePreviewPayload;
  open: boolean;
  onClose: () => void;
  onConfirm: (preview: JePreviewPayload) => void;
  disabled?: boolean;
  submitting?: boolean;
  error?: string | null;
};

export function PulseJePreviewModal({
  preview,
  open,
  onClose,
  onConfirm,
  disabled,
  submitting,
  error,
}: PreviewProps) {
  if (!open) return null;

  const isError = preview.validation.status === "error";
  const isWarning = preview.validation.status === "warning";
  const confirmDisabled = Boolean(disabled || submitting || isError);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pulse-je-preview-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <h2 id="pulse-je-preview-title" className="text-lg font-semibold text-slate-900">
          Review journal entry
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Confirm before posting to QuickBooks. This action is irreversible from Advisacor
          and will appear on the JE list for the period.
        </p>

        <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <div>
            <span className="font-medium">Date:</span> {preview.txn_date_iso}
          </div>
          <div>
            <span className="font-medium">Memo:</span> {preview.memo}
          </div>
          <div>
            <span className="font-medium">Currency:</span> {preview.currency_code}
          </div>
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1">Account</th>
              <th className="py-1 text-right">Debit</th>
              <th className="py-1 text-right">Credit</th>
            </tr>
          </thead>
          <tbody>
            {preview.lines.map((l, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="py-1.5 font-mono text-slate-800">{l.account_name}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {l.side === "Debit"
                    ? l.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : ""}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {l.side === "Credit"
                    ? l.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : ""}
                </td>
              </tr>
            ))}
            <tr className="border-t border-slate-300 font-semibold">
              <td className="py-1.5">Totals</td>
              <td className="py-1.5 text-right tabular-nums">
                {preview.balance_check.total_debits.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {preview.balance_check.total_credits.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          </tbody>
        </table>

        {isError && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <div className="font-semibold">Cannot post — validation errors:</div>
            <ul className="mt-1 list-disc pl-5">
              {preview.validation.messages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        {isWarning && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-semibold">Warnings (review before posting):</div>
            <ul className="mt-1 list-disc pl-5">
              {preview.validation.messages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <div className="font-semibold">Posting failed</div>
            <p className="mt-1">{error}</p>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(disabled || submitting)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(preview)}
            disabled={confirmDisabled}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Confirm and post"}
          </button>
        </div>
      </div>
    </div>
  );
}

type PickerProps = {
  subject: "from" | "to";
  hintPhrase: string;
  candidates: ResolvedAccountCandidate[];
  onPick: (account: ResolvedAccountCandidate) => void;
  onCancel: () => void;
};

export function PulseJeAccountPicker({
  subject,
  hintPhrase,
  candidates,
  onPick,
  onCancel,
}: PickerProps) {
  return (
    <div className="rounded-xl border border-[#C9A961]/30 bg-[#1A1A1C] p-4 text-sm text-[#ECEBE7]">
      <p className="font-semibold text-[#C9A961]">Which {subject} account did you mean?</p>
      <p className="mt-1 text-[#A29E93]">
        Multiple matches for &ldquo;{hintPhrase}&rdquo; — pick one to continue.
      </p>
      <ul className="mt-3 space-y-2">
        {candidates.map((c) => (
          <li key={c.qbo_id}>
            <button
              type="button"
              onClick={() => onPick(c)}
              className="w-full rounded-lg border border-[#C9A961]/20 bg-[#111112] px-3 py-2 text-left font-mono text-xs hover:border-[#C9A961] hover:bg-[#1A1A1C]"
            >
              <span className="block text-[#ECEBE7]">{c.fully_qualified_name}</span>
              <span className="text-[#7A7974]">
                {c.account_type}
                {c.match_kind === "fuzzy" ? ` · score ${c.match_score.toFixed(2)}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onCancel}
        className="mt-3 text-xs text-[#A29E93] underline hover:text-[#ECEBE7]"
      >
        Cancel
      </button>
    </div>
  );
}
