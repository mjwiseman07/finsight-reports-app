import type { Inventory } from "../types";

export function applyObsolescenceWriteDown(
  inventory: Inventory,
  cost: number,
  obsolescenceAmount: number,
): { carryingValue: number; writeDown: number; reversalPermitted: boolean } {
  const carryingValue = Math.max(0, cost - obsolescenceAmount);
  if (inventory.basis === "US_GAAP") {
    return { carryingValue, writeDown: cost - carryingValue, reversalPermitted: false };
  }
  return { carryingValue, writeDown: cost - carryingValue, reversalPermitted: true };
}

export function applyNrvReversal(
  inventory: Inventory,
  priorWriteDown: number,
  recoveredNrv: number,
  currentCost: number,
): number {
  if (inventory.basis === "US_GAAP") {
    throw new Error("US_GAAP prohibits inventory write-up (ASC 330-10-35-2).");
  }
  if (!inventory.nrvWriteUpReversalPermitted) {
    throw new Error("IFRS NRV reversal not permitted on this inventory profile.");
  }
  const maxReversal = Math.min(priorWriteDown, Math.max(0, recoveredNrv - currentCost));
  return maxReversal;
}
