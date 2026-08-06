"use client";

import type { ChainStatus } from "@/lib/platform-integrity/types";
import { platformIntegrityCopy } from "@/lib/platform-integrity/copy";

export function ChainStatusBadge({ chain }: { chain: ChainStatus }) {
  const intact = chain.chain_intact;
  const copy = platformIntegrityCopy.chain;

  // Positive/primary = brand gold. Caution = page amber #DFC084.
  // TODO(brand-tokens): promote hexes to shared CSS custom properties.
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
    ? copy.intactLabel
    : chain.chain_gap_count === 1
      ? copy.gapLabelSingular
      : copy.gapLabelPlural(chain.chain_gap_count);

  return (
    <div
      title={
        intact
          ? copy.intactDescription
          : chain.latest_event_at
            ? `${copy.gapDescription} Latest event: ${new Date(chain.latest_event_at).toLocaleString()}`
            : copy.gapDescription
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
