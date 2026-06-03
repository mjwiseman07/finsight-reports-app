import type { SyntheticSignalSeverity } from "../types/signal";
import type { SyntheticSignalSeverityInput } from "./types";

export function scoreSignalSeverity(input: SyntheticSignalSeverityInput): SyntheticSignalSeverity | null {
  const variance = input.variancePercent;
  if (variance === null || !Number.isFinite(variance) || input.threshold.value <= 0) return null;
  const directionalVariance =
    input.threshold.direction === "decrease" ? -variance :
      input.threshold.direction === "increase" ? variance :
        Math.abs(variance);
  if (directionalVariance < input.threshold.value) return null;
  const ratio = directionalVariance / input.threshold.value;
  const confidencePenalty = input.confidenceTier === "low" ? 1 : 0;
  if (ratio >= 2.5) return confidencePenalty ? "high" : "critical";
  if (ratio >= 1.5) return confidencePenalty ? "medium" : "high";
  return confidencePenalty ? "low" : "medium";
}
