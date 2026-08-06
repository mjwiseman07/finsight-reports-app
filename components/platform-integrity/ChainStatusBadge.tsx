"use client";

import type { ChainStatus } from "@/lib/platform-integrity/types";

export function ChainStatusBadge({ chain }: { chain: ChainStatus }) {
  const intact = chain.chain_intact;
  // Intact → success green (semantic). Gap → gold-amber warning on charcoal.
  const color = intact ? "#3BB273" : "#DFC084";
  const bg = intact ? "rgba(59, 178, 115, 0.12)" : "rgba(223, 192, 132, 0.12)";
  const border = intact
    ? "rgba(59, 178, 115, 0.35)"
    : "rgba(223, 192, 132, 0.35)";
  const label = intact
    ? "Chain intact"
    : `Chain gap: ${chain.chain_gap_count} event${
        chain.chain_gap_count === 1 ? "" : "s"
      } unlinked`;

  return (
    <div
      title={
        chain.latest_event_at
          ? `Latest event: ${new Date(chain.latest_event_at).toLocaleString()}`
          : "No lifecycle events recorded yet"
      }
      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
      style={{ backgroundColor: bg, color, border: `1px solid ${border}` }}
    >
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}
