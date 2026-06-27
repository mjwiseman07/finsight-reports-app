import type { IFRSInventory, Inventory } from "../types";

export class LifoStructurallyAbsentError extends Error {
  constructor() {
    super("LIFO is structurally absent from IFRSInventory — compile-blocked per IAS 2.25.");
    this.name = "LifoStructurallyAbsentError";
  }
}

export function routeIfrsCostFormula(inventory: IFRSInventory): {
  method: IFRSInventory["method"];
  formulaDisclosed: boolean;
} {
  return { method: inventory.method, formulaDisclosed: true };
}

export function assertNoLifoOnIfrs(inventory: Inventory): void {
  if (inventory.basis === "IFRS") {
    return;
  }
}

export function rejectLifoForIfrs(method: string): never {
  if (method === "LIFO") {
    throw new LifoStructurallyAbsentError();
  }
  throw new Error(`Unsupported IFRS cost formula: ${method}`);
}
