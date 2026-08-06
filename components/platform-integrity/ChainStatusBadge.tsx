"use client";

import type { ChainStatus } from "@/lib/platform-integrity/types";

export function ChainStatusBadge({ chain }: { chain: ChainStatus }) {
  const intact = chain.chain_intact;

  // Positive/primary = brand gold. Caution = same amber as Chip "judgment_required"
  // / severityDot warn on this surface. Hexes match Chip.tsx exactly — zero net-new.
  // TODO(brand-tokens): promote #C9A961 / #DFC084 to shared CSS custom properties
  // (--brand-gold / warning) once Phase TCP1 W2.5 tokens land in the components layer.
  const style = intact
    ? {
        color: "#C9A961",
        bg: "rgba(201, 169, 97, 0.15)",
        border: "rgba(201, 169, 97, 0.35)",
      }
    : {
        color: "#DFC084",
        bg: "rgba(223, 192, 132, 0.12)",
        border: "rgba(223, 192, 132, 0.35)",
      };

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
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 9999,
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: 9999,
          backgroundColor: style.color,
        }}
      />
      <span>{label}</span>
    </div>
  );
}
