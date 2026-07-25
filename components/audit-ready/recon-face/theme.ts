/**
 * Brand tokens for ReconFace — Advisacor charcoal + gold.
 * Section accents are gold-family only (no unrelated hues).
 */
export const RF = {
  bg: "#111112",
  surface: "#1A1A1C",
  gold: "#C9A961",
  goldHover: "#DFC084",
  goldMuted: "rgba(201, 169, 97, 0.3)",
  goldBorder: "rgba(201, 169, 97, 0.2)",
  text: "#ECEBE7",
  muted: "#A29E93",
  faint: "#7A7974",
  /** Harmonious section accents keyed off gold (backup tab headers). */
  sectionAccents: [
    "#C9A961",
    "#DFC084",
    "#A88B4A",
    "#E8D5A3",
    "#8B7340",
  ] as const,
} as const;

export function sectionAccent(index: number): string {
  return RF.sectionAccents[index % RF.sectionAccents.length]!;
}
