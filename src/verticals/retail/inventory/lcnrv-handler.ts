import type { RetailInventory, RetailPanelContext } from "../types";

export function applyLcnrvOrLcm(
  _ctx: RetailPanelContext,
  inventory: RetailInventory,
  currentCost: number,
  netRealizableValue: number,
  replacementCost?: number,
): { writeDown: number; ruleApplied: "LCNRV" | "LCM" } {
  if (inventory.basis === "US_GAAP") {
    if (inventory.method === "LIFO" || inventory.method === "RIM") {
      const ceiling = netRealizableValue;
      const floor = netRealizableValue * 0.85;
      const market = Math.min(ceiling, Math.max(floor, replacementCost ?? currentCost));
      return { writeDown: Math.max(0, currentCost - market), ruleApplied: "LCM" };
    }
  }
  return { writeDown: Math.max(0, currentCost - netRealizableValue), ruleApplied: "LCNRV" };
}
