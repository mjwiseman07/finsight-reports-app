import { buildSignalCandidate } from "./buildSignalCandidate";
import type { SyntheticSignalCandidateInput } from "./types";

type DomainSignalInput = Omit<SyntheticSignalCandidateInput, "signalType" | "direction">;

export function buildBenchmarkOutperformanceSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "benchmark_outperformance", direction: "increase" });
}

export function buildBenchmarkUnderperformanceSignal(input: DomainSignalInput) {
  return buildSignalCandidate({ ...input, signalType: "benchmark_underperformance", direction: "decrease" });
}
