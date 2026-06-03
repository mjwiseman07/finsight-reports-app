import { buildSignalCandidate } from "./buildSignalCandidate";
import type { SyntheticSignalCandidateInput } from "./types";

type DomainSignalInput = Omit<SyntheticSignalCandidateInput, "signalType" | "direction">;

export function buildRevenueGrowthSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "revenue_growth", direction: "increase" });
}

export function buildRevenueDeclineSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "revenue_decline", direction: "decrease" });
}

export function buildRevenueVolatilitySignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "revenue_volatility", direction: "absolute" });
}
