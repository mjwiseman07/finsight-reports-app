import type { USGAAPRetailInventory, RetailPanelContext } from "../types";

export function computeRimInventory(
  _ctx: RetailPanelContext,
  inventory: USGAAPRetailInventory,
): { costOfInventory: number; markdownAdjustment: number } {
  if (inventory.method !== "RIM") {
    throw new Error(`RIM handler requires method='RIM'; got ${inventory.method}`);
  }
  return { costOfInventory: 0, markdownAdjustment: 0 };
}
