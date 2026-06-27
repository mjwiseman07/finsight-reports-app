import type { USGAAPInventory } from "../types";

export function applyLifoLcm(
  inventory: USGAAPInventory,
  cost: number,
  marketValue: number,
): { carryingValue: number; writeDown: number } {
  if (inventory.method !== "LIFO" || !inventory.lcmApplies) {
    throw new Error("LIFO LCM carve-out applies only to LIFO inventory.");
  }
  const carryingValue = Math.min(cost, marketValue);
  return { carryingValue, writeDown: Math.max(0, cost - carryingValue) };
}

export function refreshLifoReserveQuarterly(
  reserveAmount: number,
  asOf: Date,
): { reserveAmount: number; cadence: "QUARTERLY"; asOfDate: Date } {
  return { reserveAmount, cadence: "QUARTERLY", asOfDate: asOf };
}
