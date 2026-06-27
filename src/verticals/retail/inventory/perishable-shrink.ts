import type { RetailInventory, RetailPanelContext } from "../types";

export function applyPerishableShrink(
  ctx: RetailPanelContext,
  _inventory: RetailInventory,
  spoilageThisPeriod: number,
): { shrinkReserveDelta: number; warned: boolean } {
  const primary = ctx.subSegment.primary;
  const secondary = ctx.subSegment.secondary;
  const allowed =
    primary === "G" || secondary === "G" || primary === "S" || secondary === "S";
  if (!allowed) {
    return { shrinkReserveDelta: spoilageThisPeriod, warned: true };
  }
  return { shrinkReserveDelta: spoilageThisPeriod, warned: false };
}
