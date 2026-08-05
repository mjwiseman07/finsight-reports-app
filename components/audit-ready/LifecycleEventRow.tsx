"use client";

import { useEffect, useRef, useState } from "react";
import type { LifecycleEvent } from "./LifecycleEvidenceDrawer";
import { AnchorVerifyBadge } from "./AnchorVerifyBadge";

const KIND_LABELS: Record<string, string> = {
  "pilot.lifecycle.created": "Created",
  "pilot.lifecycle.transition": "Transition",
  "pilot.lifecycle.assertion.evidence-attached": "Evidence attached",
  "pilot.lifecycle.drift-detected": "Drift detected",
  "pilot.lifecycle.auto-reconciled": "Auto-reconciled",
  "pilot.lifecycle.escalated": "Escalated",
  "pilot.lifecycle.recurred": "Recurred",
};

/**
 * IntersectionObserver-based visibility hook.
 *
 * Per Block_9_2_UX_Research.md §1.1 + §1.3:
 * - We activate anchor verification only when the row is visible.
 * - The observer is per-row (cheap; browsers optimize this well); the
 *   expensive work is gated behind anchor-verify-queue.ts's p-limit(4).
 * - rootMargin 200px = kick off verify slightly before the row is on
 *   screen, so the badge is already resolved when the user's eye
 *   arrives (smooths the "verifying…" → "anchored" transition without
 *   burning CPU on far-off rows).
 */
function useOnScreen(ref: React.RefObject<HTMLElement | null>): boolean {
  // Guard: IO isn't available in some test envs; treat as always-visible
  // to avoid breaking jsdom-based tests. Initialized here (not in the
  // effect) so we don't call setState synchronously inside useEffect
  // (react-hooks/set-state-in-effect).
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            // Once we've triggered verification we do NOT need to keep
            // observing — the queue caches results and we render the same
            // component tree either way.
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}

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

  const rowRef = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(rowRef);

  return (
    <div
      ref={rowRef}
      className="flex w-full items-start gap-4 rounded-md border border-[#C9A961]/20 bg-[#1A1A1C] px-4 py-3 text-left"
    >
      {/* Left cluster — clickable to open drawer. We move the row's clickable
          surface OFF the outermost div so the anchor-badge "for auditors"
          expander doesn't propagate to the drawer. */}
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 items-center gap-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A961]/60 rounded-md hover:bg-[#1F1F22] transition-colors"
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
      </button>

      {/* Right cluster — badges + hash preview. Not inside the button, so
          the anchor-badge's "for auditors" expander works without opening
          the drawer. */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        {/* Existing Block 5 chain-verified pill — different meaning from the
            anchor badge. Both must remain visible. */}
        {verified ? (
          <span
            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300"
            title="Row hash matches the prev/row chain — hash chain integrity check (Block 5)."
          >
            ✓ chain
          </span>
        ) : (
          <span
            className="rounded-full border border-red-500/60 bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300"
            title={reason ?? "chain-check failed"}
            role="alert"
          >
            ✗ {reason ?? "chain broken"}
          </span>
        )}
        {/* Block 9.2 — anchor verification badge. Activated by IntersectionObserver. */}
        <AnchorVerifyBadge chainSeq={event.chain_seq} active={onScreen} />
        <div className="font-mono text-[10px] text-[#A29E93]">
          {hashPreview}…
        </div>
      </div>
    </div>
  );
}
