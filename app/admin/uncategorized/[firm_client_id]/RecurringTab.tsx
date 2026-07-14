"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { focusRing } from "../../../../components/site-ui";

type GateDecision = { action: "dispatch" } | { action: "hold"; reason: string };

type FireReviewRow = {
  fire_id: string;
  template_id: string;
  template_name: string;
  cadence: string;
  fire_date: string;
  period_index: number;
  amount: number;
  amount_override: number | null;
  status: string;
  gate_decision: GateDecision;
  created_at: string;
};

const DECISION_STYLES: Record<string, { bg: string; label: string }> = {
  dispatch: { bg: "#6DAA45", label: "Auto-eligible" },
  cash_basis_client: { bg: "#7A7974", label: "Cash-basis hold" },
  client_auto_post_disabled: { bg: "#7A7974", label: "Client disabled" },
  template_auto_post_off: { bg: "#7A7974", label: "Template manual" },
  template_not_active: { bg: "#BB653B", label: "Template inactive" },
  fire_not_proposed: { bg: "#B85C5C", label: "Not eligible" },
};

function pillFor(decision: GateDecision) {
  const key = decision.action === "dispatch" ? "dispatch" : decision.reason;
  return DECISION_STYLES[key] ?? { bg: "#7A7974", label: "Hold" };
}

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function RecurringTab({ firmClientId }: { firmClientId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<FireReviewRow[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("supabase_access_token") || "";
  }, []);

  const loadFires = useCallback(async () => {
    if (!token) {
      router.replace(`/signin?next=/admin/uncategorized/${firmClientId}`);
      return;
    }
    setError("");
    setIsLoading(true);
    const response = await fetch(
      `/api/recurring/fires?firm_client_id=${encodeURIComponent(firmClientId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "Failed to load fires.");
      setIsLoading(false);
      return;
    }
    setRows(result.rows || []);
    setIsLoading(false);
  }, [firmClientId, router, token]);

  useEffect(() => {
    void loadFires();
  }, [loadFires]);

  async function postNow(fireId: string) {
    if (!token) return;
    const response = await fetch(`/api/recurring/fires/${fireId}/post`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "Post failed.");
      return;
    }
    setToast(`Fire ${result.final_fire_status ?? "processed"}.`);
    await loadFires();
  }

  async function skip(fireId: string) {
    if (!token) return;
    const reason = window.prompt("Skip reason:");
    if (!reason) return;
    const response = await fetch(`/api/recurring/fires/${fireId}/skip`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ skip_reason: reason }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "Skip failed.");
      return;
    }
    setToast("Fire skipped.");
    await loadFires();
  }

  async function reject(fireId: string) {
    if (!token) return;
    const reason = window.prompt("Reject reason:");
    if (!reason) return;
    const response = await fetch(`/api/recurring/fires/${fireId}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reject_reason: reason }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "Reject failed.");
      return;
    }
    setToast("Fire rejected.");
    await loadFires();
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-[#B85C5C]/40 bg-[#B85C5C]/10 px-4 py-3 text-sm text-[#F0BFBF]">
          {error}
        </div>
      )}
      {toast && (
        <div className="mb-4 rounded-xl border border-[#6DAA45]/40 bg-[#6DAA45]/10 px-4 py-3 text-sm text-[#B5E28A]">
          {toast}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#C9A961]/20 bg-[#1A1A1C]/85">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#C9A961]/20 text-xs uppercase tracking-wide text-[#A29E93]">
            <tr>
              <th className="px-4 py-3">Decision</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Cadence</th>
              <th className="px-4 py-3">Fire Date</th>
              <th className="px-4 py-3">Period #</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#A29E93]">
                  Loading fires…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#A29E93]">
                  No proposed recurring fires. Fires appear here after the daily scheduler runs.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const pill = pillFor(r.gate_decision);
                return (
                  <tr key={r.fire_id} className="border-t border-[#C9A961]/10 text-[#ECEBE7]">
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-[#111112]"
                        style={{ backgroundColor: pill.bg }}
                      >
                        {pill.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.template_name}</td>
                    <td className="px-4 py-3">{r.cadence}</td>
                    <td className="px-4 py-3">{r.fire_date}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[#A29E93]">{r.period_index}</td>
                    <td className="px-4 py-3">
                      <span>{formatUsd(r.amount)}</span>
                      {r.amount_override !== null && (
                        <span
                          className="ml-2 inline-flex rounded-full bg-[#C9A961]/20 px-2 py-0.5 text-[10px] font-semibold text-[#DFC084]"
                          title={`Advisory override: ${formatUsd(r.amount_override)}`}
                        >
                          override
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void postNow(r.fire_id)}
                          className={`rounded-full bg-[#6DAA45]/20 px-2.5 py-1 text-xs font-semibold text-[#B5E28A] hover:bg-[#6DAA45]/30 ${focusRing()}`}
                        >
                          Post now
                        </button>
                        <button
                          type="button"
                          onClick={() => void skip(r.fire_id)}
                          className={`rounded-full bg-[#C9A961]/10 px-2.5 py-1 text-xs font-semibold text-[#ECEBE7] hover:bg-[#C9A961]/20 ${focusRing()}`}
                        >
                          Skip
                        </button>
                        <button
                          type="button"
                          onClick={() => void reject(r.fire_id)}
                          className={`rounded-full bg-[#B85C5C]/20 px-2.5 py-1 text-xs font-semibold text-[#F0BFBF] hover:bg-[#B85C5C]/30 ${focusRing()}`}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
