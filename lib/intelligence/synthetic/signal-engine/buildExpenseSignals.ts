import { buildSignalCandidate } from "./buildSignalCandidate";
import type { SyntheticSignalCandidateInput } from "./types";

type DomainSignalInput = Omit<SyntheticSignalCandidateInput, "signalType" | "direction">;

export function buildExpenseGrowthSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "expense_growth", direction: "increase" });
}

export function buildExpenseCompressionSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "expense_compression", direction: "decrease" });
}
