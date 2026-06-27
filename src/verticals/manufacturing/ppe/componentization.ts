import type { IFRSPpe } from "../types";

export function decomposeComponents(
  ppe: IFRSPpe,
  components: Array<{ name: string; cost: number }>,
  totalCost: number,
): Array<{ name: string; cost: number; significant: boolean }> {
  return components.map((c) => ({
    ...c,
    significant: c.cost / totalCost >= ppe.componentMinThresholdPct / 100,
  }));
}

export function defaultComponentThresholdPct(): number {
  return 10;
}
