import { buildSignalCandidate } from "./buildSignalCandidate";
import type { SyntheticSignalCandidateInput } from "./types";

type DomainSignalInput = Omit<SyntheticSignalCandidateInput, "signalType" | "direction">;

export function buildCashImprovementSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "cash_improvement", direction: "increase" });
}

export function buildCashPressureSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "cash_pressure", direction: "decrease" });
}

export function buildCashRunwayRiskSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "cash_runway_risk", direction: "decrease" });
}
