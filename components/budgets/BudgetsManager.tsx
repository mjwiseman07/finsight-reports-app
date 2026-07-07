"use client";

import { useState } from "react";

interface BudgetRow {
  id: string;
  gl_account_code: string;
  gl_account_name: string | null;
  period_year: number;
  period_month: number;
  budget_amount_cents: number;
  currency: string;
  tolerance_pct: number;
}

interface Props {
  firmId: string;
  initialRows: BudgetRow[];
}

export default function BudgetsManager({ firmId: _firmId, initialRows }: Props) {
  const [rows, setRows] = useState<BudgetRow[]>(initialRows);
  const [form, setForm] = useState({
    firm_client_id: "",
    company_id: "",
    engagement_id: "",
    gl_account_code: "",
    gl_account_name: "",
    period_year: new Date().getUTCFullYear(),
    period_month: new Date().getUTCMonth() + 1,
    budget_amount_cents: 0,
    tolerance_pct: 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message ?? `HTTP ${res.status}`);
      }
      const j = await res.json();
      setRows((prev) => [
        {
          id: j.budget_id,
          gl_account_code: form.gl_account_code,
          gl_account_name: form.gl_account_name || null,
          period_year: form.period_year,
          period_month: form.period_month,
          budget_amount_cents: form.budget_amount_cents,
          currency: "USD",
          tolerance_pct: form.tolerance_pct,
        },
        ...prev,
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border border-neutral-200 rounded-lg bg-white p-4">
        <h2 className="text-base font-semibold text-neutral-900 mb-3">Add / update budget</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-1">Firm client id</span>
            <input
              value={form.firm_client_id}
              onChange={(e) => setForm({ ...form, firm_client_id: e.target.value })}
              className="border border-neutral-300 rounded-md px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-1">Company id</span>
            <input
              value={form.company_id}
              onChange={(e) => setForm({ ...form, company_id: e.target.value })}
              className="border border-neutral-300 rounded-md px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-1">Engagement id (optional)</span>
            <input
              value={form.engagement_id}
              onChange={(e) => setForm({ ...form, engagement_id: e.target.value })}
              className="border border-neutral-300 rounded-md px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-1">GL account code</span>
            <input
              value={form.gl_account_code}
              onChange={(e) => setForm({ ...form, gl_account_code: e.target.value })}
              className="border border-neutral-300 rounded-md px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-1">GL account name</span>
            <input
              value={form.gl_account_name}
              onChange={(e) => setForm({ ...form, gl_account_name: e.target.value })}
              className="border border-neutral-300 rounded-md px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-1">Year</span>
            <input
              type="number"
              value={form.period_year}
              onChange={(e) => setForm({ ...form, period_year: Number(e.target.value) })}
              className="border border-neutral-300 rounded-md px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-1">Month (1-12)</span>
            <input
              type="number"
              min={1}
              max={12}
              value={form.period_month}
              onChange={(e) => setForm({ ...form, period_month: Number(e.target.value) })}
              className="border border-neutral-300 rounded-md px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-1">Budget (cents)</span>
            <input
              type="number"
              min={0}
              value={form.budget_amount_cents}
              onChange={(e) => setForm({ ...form, budget_amount_cents: Number(e.target.value) })}
              className="border border-neutral-300 rounded-md px-2 py-1.5"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-neutral-500 mb-1">Tolerance %</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={form.tolerance_pct}
              onChange={(e) => setForm({ ...form, tolerance_pct: Number(e.target.value) })}
              className="border border-neutral-300 rounded-md px-2 py-1.5"
            />
          </label>
        </div>
        <div className="mt-4 flex gap-3 items-center">
          <button
            onClick={submit}
            disabled={busy}
            className="px-4 py-2 rounded-md bg-teal-700 text-white text-sm hover:bg-teal-800 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save budget"}
          </button>
          {error && <span className="text-xs text-rose-700">{error}</span>}
        </div>
      </div>
      <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="text-left px-3 py-2">Period</th>
              <th className="text-left px-3 py-2">GL account</th>
              <th className="text-right px-3 py-2">Budget</th>
              <th className="text-right px-3 py-2">Tolerance</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-neutral-500">
                  No budgets yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100">
                <td className="px-3 py-2 text-neutral-700">
                  {r.period_year}-{String(r.period_month).padStart(2, "0")}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium text-neutral-900">{r.gl_account_code}</div>
                  {r.gl_account_name && (
                    <div className="text-xs text-neutral-500">{r.gl_account_name}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.currency}{" "}
                  {(r.budget_amount_cents / 100).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{r.tolerance_pct.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
