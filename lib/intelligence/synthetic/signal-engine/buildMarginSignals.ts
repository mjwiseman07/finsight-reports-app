import { buildSignalCandidate } from "./buildSignalCandidate";
import type { SyntheticSignalCandidateInput } from "./types";

type DomainSignalInput = Omit<SyntheticSignalCandidateInput, "signalType" | "direction">;

export function buildGrossMarginExpansionSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "gross_margin_expansion", direction: "increase" });
}

export function buildGrossMarginCompressionSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "gross_margin_compression", direction: "decrease" });
}

export function buildOperatingMarginExpansionSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "operating_margin_expansion", direction: "increase" });
}

export function buildOperatingMarginCompressionSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "operating_margin_compression", direction: "decrease" });
}
