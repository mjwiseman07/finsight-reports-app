import type { SyntheticEvidenceMetricValue, SyntheticEvidencePeriodComparison } from "../types/evidence";

function variancePercent(current: number | null, comparison: number | null) {
  if (current === null || comparison === null || comparison === 0) return null;
  return ((current - comparison) / Math.abs(comparison)) * 100;
}

export function buildEvidenceComparison(
  current: SyntheticEvidenceMetricValue,
  comparison?: SyntheticEvidenceMetricValue,
): SyntheticEvidencePeriodComparison {
  const currentValue = current.value;
  const comparisonValue = comparison?.value ?? null;
  return {
    current,
    comparison,
    varianceAmount: currentValue !== null && comparisonValue !== null ? currentValue - comparisonValue : null,
    variancePercent: variancePercent(currentValue, comparisonValue),
  };
}
