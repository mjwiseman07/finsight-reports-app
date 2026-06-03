import { buildSignalCandidate } from "./buildSignalCandidate";
import type { SyntheticSignalCandidateInput } from "./types";

type DomainSignalInput = Omit<SyntheticSignalCandidateInput, "signalType" | "direction">;

export function buildARImprovementSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "ar_improvement", direction: "decrease" });
}

export function buildARCollectionRiskSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "ar_collection_risk", direction: "increase" });
}

export function buildAPImprovementSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "ap_improvement", direction: "decrease" });
}

export function buildAPPressureSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "ap_pressure", direction: "increase" });
}
