import type { RetailInventory, RetailPanelContext } from "../types";

export function ratchetMarkdownReserve(
  ctx: RetailPanelContext,
  inventory: RetailInventory,
  _seasonAgeWeeks: number,
  _currentMarkdownPct: number,
): { newMarkdownReserve: number } {
  const primary = ctx.subSegment.primary;
  if (primary !== "S" && (inventory.markdownReserve ?? undefined) === undefined) {
    return { newMarkdownReserve: 0 };
  }
  return { newMarkdownReserve: inventory.markdownReserve ?? 0 };
}
