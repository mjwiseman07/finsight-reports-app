import type { SyntheticMetricSeriesPoint } from "../types/metric-series";
import type { SyntheticMetricSeriesValueInput } from "./types";

export function buildMetricSeriesPoint(input: SyntheticMetricSeriesValueInput & { evidenceId?: string; calculationTraceId?: string }): SyntheticMetricSeriesPoint {
  return {
    period: input.period,
    value: input.value,
    source: {
      snapshotId: input.snapshotId,
      evidenceId: input.evidenceId,
      sourceSystem: input.sourceSystem,
      sourceReport: input.sourceReport,
    },
    qualityFlags: input.qualityFlags || [],
    evidenceId: input.evidenceId,
    calculationTraceId: input.calculationTraceId,
  };
}
