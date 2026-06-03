import type { SyntheticConfidenceFactor } from "../types/confidence";
import type { SyntheticHistoricalSnapshotSeries } from "../types/historical-snapshot";

export function scoreHistoryCoverage(series: Pick<SyntheticHistoricalSnapshotSeries, "coverage">): SyntheticConfidenceFactor[] {
  const months = Number(series.coverage.availableMonths || 0);
  if (months >= 60) {
    return [{ code: "history_60_months", label: "History Coverage", impact: "positive", factorContribution: 0.3 }];
  }
  if (months >= 36) {
    return [{ code: "history_36_months", label: "History Coverage", impact: "positive", factorContribution: 0.28 }];
  }
  if (months >= 24) {
    return [{ code: "history_24_months", label: "History Coverage", impact: "positive", factorContribution: 0.25 }];
  }
  if (months >= 12) {
    return [{ code: "history_12_months_available", label: "History Coverage", impact: "positive", factorContribution: 0.18 }];
  }
  return [{ code: "history_under_12_months", label: "History Coverage", impact: "negative", factorContribution: -0.2 }];
}
