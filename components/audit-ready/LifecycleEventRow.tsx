"use client";

import type { LifecycleEvent } from "./LifecycleEvidenceDrawer";

const KIND_LABELS: Record<string, string> = {
  "pilot.lifecycle.created": "Created",
  "pilot.lifecycle.transition": "Transition",
  "pilot.lifecycle.assertion.evidence-attached": "Evidence attached",
  "pilot.lifecycle.drift-detected": "Drift detected",
  "pilot.lifecycle.auto-reconciled": "Auto-reconciled",
  "pilot.lifecycle.escalated": "Escalated",
  "pilot.lifecycle.recurred": "Recurred",
};

export function LifecycleEventRow({
  event,
  verified,
  reason,
  onOpen,
}: {
  event: LifecycleEvent;
  verified: boolean;
  reason?: string;
  onOpen: () => void;
}) {
  const label = KIND_LABELS[event.event_kind] ?? event.event_kind;
  const hashPreview = event.row_hash.startsWith("sha256:")
    ? event.row_hash.slice(0, 17)
    : event.row_hash.slice(0, 10);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-4 rounded-md border border-[#C9A961]/20 bg-[#1A1A1C] px-4 py-3 text-left hover:border-[#C9A961]/60"
    >
      <div className="w-14 shrink-0 font-mono text-xs text-[#A29E93]">
        #{event.chain_seq}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#ECEBE7]">{label}</span>
          {event.from_status || event.to_status ? (
            <span className="font-mono text-xs text-[#A29E93]">
              {event.from_status ?? "∅"} → {event.to_status ?? "∅"}
            </span>
          ) : null}
        </div>
        <div className="text-xs text-[#A29E93]">
          {new Date(event.event_at).toISOString().replace("T", " ").slice(0, 19)}{" "}
          UTC · {event.actor_kind}/{event.actor_via}
        </div>
      </div>
      <div className="shrink-0">
        {verified ? (
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
            ✓ verified
          </span>
        ) : (
          <span
            className="rounded-full border border-red-500/60 bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300"
            title={reason ?? "chain-check failed"}
          >
            ✗ {reason ?? "chain broken"}
          </span>
        )}
      </div>
      <div className="shrink-0 font-mono text-[10px] text-[#A29E93]">
        {hashPreview}…
      </div>
    </button>
  );
}
