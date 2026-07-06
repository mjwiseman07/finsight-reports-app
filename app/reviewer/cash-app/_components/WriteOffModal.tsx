"use client";

import { useEffect, useState } from "react";

interface Props {
  reviewItemId: string;
  maxAmount: number;
  onClose: () => void;
  onResolved: () => void;
}

interface GlAccountOption {
  id: string;
  name: string;
}

export function WriteOffModal({ reviewItemId, maxAmount, onClose, onResolved }: Props) {
  const [amount, setAmount] = useState(maxAmount ? maxAmount.toFixed(2) : "");
  const [glAccountId, setGlAccountId] = useState("");
  const [glAccounts, setGlAccounts] = useState<GlAccountOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem("supabase_access_token") ?? "";
    fetch("/api/reviewer/qbo-accounts", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : { accounts: [] }))
      .then((data: { accounts?: GlAccountOption[] }) => setGlAccounts(data.accounts ?? []))
      .catch(() => setGlAccounts([]));
  }, []);

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError("Enter a write-off amount greater than zero.");
      return;
    }
    if (!glAccountId) {
      setError("Select a GL account for the write-off.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const token = window.localStorage.getItem("supabase_access_token") ?? "";
      const res = await fetch(`/api/ar/cash-app/review-items/${reviewItemId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: "write_off", amount: parsed, glAccountId }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(payload.error ?? `Request failed with status ${res.status}`);
      }
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record write-off");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="write-off-modal-heading"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-slate-900 p-6 shadow-xl border border-white/10">
        <h2 id="write-off-modal-heading" className="text-lg font-semibold text-slate-100">
          Write Off Short-Pay
        </h2>

        {error && (
          <div
            role="alert"
            className="mt-3 rounded-md border border-red-400/40 bg-red-950/40 p-3 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        <div className="mt-4">
          <label htmlFor="write-off-amount" className="block text-sm font-medium text-slate-300">
            Amount to write off
          </label>
          <input
            id="write-off-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/20 bg-slate-950 p-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          />
        </div>

        <div className="mt-4">
          <label htmlFor="write-off-gl-account" className="block text-sm font-medium text-slate-300">
            GL Account
          </label>
          <select
            id="write-off-gl-account"
            value={glAccountId}
            onChange={(e) => setGlAccountId(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/20 bg-slate-950 p-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <option value="">Select an account…</option>
            {glAccounts.map((acct) => (
              <option key={acct.id} value={acct.id}>
                {acct.name}
              </option>
            ))}
          </select>
        </div>

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
            disabled={busy}
            className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Confirm Write-Off"}
          </button>
        </div>
      </div>
    </div>
  );
}
