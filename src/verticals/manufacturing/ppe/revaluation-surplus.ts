import type { IFRSPpe } from "../types";

export function applyRevaluationSurplus(
  ppe: IFRSPpe,
  fairValue: number,
  carryingAmount: number,
): { surplus: number; frequency: NonNullable<IFRSPpe["revaluationFrequency"]> } {
  if (ppe.costModel !== "REVALUATION") {
    throw new Error("Revaluation surplus requires IFRS REVALUATION cost model.");
  }
  const surplus = Math.max(0, fairValue - carryingAmount);
  return {
    surplus,
    frequency: ppe.revaluationFrequency ?? "TRIENNIAL",
  };
}

export function blockUsGaapRevaluation(basis: string): void {
  if (basis === "US_GAAP") {
    throw new Error("Revaluation surplus is structurally blocked under US_GAAP.");
  }
}
