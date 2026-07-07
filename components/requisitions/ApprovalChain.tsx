"use client";

import { useState } from "react";

interface Step {
  id: string;
  order_index: number;
  approver_user_id: string;
  status: string;
  acted_at: string | null;
  comment: string | null;
}

interface Props {
  requisitionId: string;
  chainId: string | null;
  steps: Step[];
  currentUserId: string;
  onChange?: () => void;
}

export default function ApprovalChain({
  requisitionId: _requisitionId,
  chainId,
  steps,
  currentUserId,
  onChange,
}: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(
    stepId: string,
    verb: "approve" | "reject" | "delegate",
    payload: Record<string, unknown>,
  ) {
    setPending(stepId);
    setError(null);
    try {
      const res = await fetch(`/api/requisitions/approval-steps/${stepId}/${verb}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message ?? `HTTP ${res.status}`);
      }
      onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="border border-neutral-200 rounded-lg bg-white p-4">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-neutral-900">Approval chain</h3>
        <span className="text-xs text-neutral-500">
          {chainId ? `Chain ${chainId.slice(0, 8)}` : "No chain yet"}
        </span>
      </header>
      {steps.length === 0 && (
        <p className="text-sm text-neutral-500">No approval steps assigned.</p>
      )}
      <ol className="space-y-2">
        {steps.map((s) => {
          const isMine = s.approver_user_id === currentUserId && s.status === "pending";
          return (
            <li
              key={s.id}
              className="flex items-center justify-between p-3 border border-neutral-200 rounded-md"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-neutral-900">
                  Step {s.order_index + 1}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  Approver {s.approver_user_id.slice(0, 8)} · Status {s.status}
                  {s.acted_at ? ` · ${new Date(s.acted_at).toLocaleString()}` : ""}
                </div>
                {s.comment && (
                  <div className="text-xs text-neutral-600 mt-1 italic">&quot;{s.comment}&quot;</div>
                )}
              </div>
              {isMine && (
                <div className="flex gap-2 ml-3">
                  <button
                    disabled={pending === s.id}
                    onClick={() => act(s.id, "approve", {})}
                    className="text-xs px-3 py-1.5 rounded-md bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    disabled={pending === s.id}
                    onClick={() => {
                      const reason = window.prompt("Reject reason:");
                      if (reason) act(s.id, "reject", { reason });
                    }}
                    className="text-xs px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    disabled={pending === s.id}
                    onClick={() => {
                      const to = window.prompt("Delegate to user_id:");
                      if (to) act(s.id, "delegate", { to_user_id: to });
                    }}
                    className="text-xs px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    Delegate
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {error && (
        <div className="mt-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
    </section>
  );
}
