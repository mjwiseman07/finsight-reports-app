import { buildSignalCandidate } from "./buildSignalCandidate";
import type { SyntheticSignalCandidateInput } from "./types";

type DomainSignalInput = Omit<SyntheticSignalCandidateInput, "signalType" | "direction">;

export function buildPayrollGrowthSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "payroll_growth", direction: "increase" });
}

export function buildPayrollEfficiencySignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "payroll_efficiency", direction: "decrease" });
}

export function buildInventoryBuildSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "inventory_build", direction: "increase" });
}

export function buildInventoryReductionSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "inventory_reduction", direction: "decrease" });
}

export function buildFixedAssetGrowthSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "fixed_asset_growth", direction: "increase" });
}

export function buildFixedAssetAgingSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "fixed_asset_aging", direction: "increase" });
}

export function buildDebtReductionSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "debt_reduction", direction: "decrease" });
}

export function buildDebtGrowthSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "debt_growth", direction: "increase" });
}
