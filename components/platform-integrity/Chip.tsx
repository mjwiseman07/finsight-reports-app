"use client";

import type { ChipDescriptor } from "@/lib/platform-integrity/labels";

/**
 * Chip tones mapped to charcoal + gold brand tokens.
 * Descriptor.tone keys stay teal|amber|neutral|gray (planning-doc vocabulary);
 * visual map uses gold for positive, amber for judgment, ivory/faint for rest.
 */
const TONE_STYLES: Record<
  ChipDescriptor["tone"],
  { bg: string; fg: string; border: string }
> = {
  teal: {
    bg: "rgba(201, 169, 97, 0.15)",
    fg: "#C9A961",
    border: "rgba(201, 169, 97, 0.35)",
  },
  amber: {
    bg: "rgba(223, 192, 132, 0.12)",
    fg: "#DFC084",
    border: "rgba(223, 192, 132, 0.35)",
  },
  neutral: {
    bg: "rgba(26, 26, 28, 0.8)",
    fg: "#ECEBE7",
    border: "rgba(201, 169, 97, 0.25)",
  },
  gray: {
    bg: "rgba(26, 26, 28, 0.6)",
    fg: "#7A7974",
    border: "rgba(201, 169, 97, 0.15)",
  },
};

export function Chip({
  descriptor,
  size = "md",
  title,
}: {
  descriptor: ChipDescriptor;
  size?: "sm" | "md";
  title?: string;
}) {
  const style = TONE_STYLES[descriptor.tone];
  const pad = size === "sm" ? "2px 8px" : "4px 12px";
  const fontSize = size === "sm" ? "11px" : "12px";
  return (
    <span
      title={title ?? descriptor.full_text}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: pad,
        borderRadius: "9999px",
        fontSize,
        fontWeight: 500,
        backgroundColor: style.bg,
        color: style.fg,
        border: `1px solid ${style.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {descriptor.label}
    </span>
  );
}
