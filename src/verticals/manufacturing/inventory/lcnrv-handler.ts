import type { Inventory, InventoryEvaluationGranularity, USGAAPInventory } from "../types";

export function applyLcnrv(
  inventory: USGAAPInventory,
  cost: number,
  netRealizableValue: number,
  granularity: InventoryEvaluationGranularity = "ITEM",
): { carryingValue: number; writeDown: number; granularity: InventoryEvaluationGranularity } {
  if (!inventory.lcnrvApplies || inventory.method === "LIFO") {
    throw new Error("LCNRV applies only to FIFO/Avg/SpecificID under US_GAAP (Q-A1=A).");
  }
  const carryingValue = Math.min(cost, netRealizableValue);
  return {
    carryingValue,
    writeDown: Math.max(0, cost - carryingValue),
    granularity,
  };
}

export function supportsLcnrv(inventory: Inventory): boolean {
  return inventory.basis === "US_GAAP" && inventory.lcnrvApplies && inventory.method !== "LIFO";
}
