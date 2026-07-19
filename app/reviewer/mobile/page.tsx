"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Item {
  id: string;
  materiality_bucket: "low" | "medium" | "high";
  je_draft_total_debit_cents: number;
  rule_reason_code: string;
  requires_mfa_step_up: boolean;
}

function authHeaders(): HeadersInit {
  const token = window.localStorage.getItem("supabase_access_token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function MobileReviewQueue() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [mfaNeeded, setMfaNeeded] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch("/api/reviewer/pending/default", {
      cache: "no-store",
      headers: authHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
      setError("");
    } else {
      setError(`load_failed_${res.status}`);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id: string, verb: "approve" | "reject") => {
    setBusy(id);
    setError("");
    const res = await fetch(`/api/reviewer/items/${id}/${verb}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        decision: verb === "approve" ? "approved" : "rejected",
        decision_reason_code: verb === "approve" ? "mobile_approved" : "mobile_rejected",
      }),
    });
    if (res.status === 401) {
      const j = await res.json().catch(() => ({}));
      if (j.error === "mfa_step_up_required") setMfaNeeded(id);
    } else if (res.status === 403) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "forbidden");
    } else if (res.ok) {
      setMfaNeeded(null);
      await load();
    } else {
      setError(`action_failed_${res.status}`);
    }
    setBusy(null);
  };

  return (
    <div className="mx-auto max-w-md p-4 text-slate-100">
      <h1 className="mb-4 text-xl font-semibold">Approvals</h1>
      {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}
      {items.length === 0 && !error ? (
        <p className="text-sm text-slate-400">Nothing to review.</p>
      ) : null}
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.id} className="rounded-2xl border border-white/10 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <div className="font-medium">{it.rule_reason_code}</div>
                <div className="text-xs text-slate-400">
                  ${(it.je_draft_total_debit_cents / 100).toLocaleString()} ·{" "}
                  {it.materiality_bucket}
                </div>
              </div>
              {it.requires_mfa_step_up ? (
                <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-200">
                  MFA
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy === it.id}
                onClick={() => act(it.id, "reject")}
                className="flex-1 rounded-md border border-white/20 py-2 text-sm"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={busy === it.id}
                onClick={() => act(it.id, "approve")}
                className="flex-1 rounded-md bg-teal-800 py-2 text-sm"
              >
                Approve
              </button>
            </div>
            {mfaNeeded === it.id ? (
              <div className="mt-3 rounded-md bg-amber-500/10 p-3 text-xs text-amber-100">
                Fresh MFA required for this materiality tier.{" "}
                <Link href="/dashboard" className="underline">
                  Open Security &amp; 2FA
                </Link>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
