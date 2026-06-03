import type { SyntheticMetricSeriesCoverage } from "../types/metric-series";
import type { SyntheticMetricSeriesBuilderInput } from "./types";

export function resolveMetricSeriesCoverage(input: Pick<SyntheticMetricSeriesBuilderInput, "values" | "snapshotSeries">): SyntheticMetricSeriesCoverage {
  const requestedPeriods = input.snapshotSeries.coverage.requestedMonths;
  const availablePeriods = input.values.filter((value) => value.value !== null).length;
  return {
    requestedPeriods,
    availablePeriods,
    missingPeriods: input.values
      .filter((value) => value.value === null)
      .map((value) => value.period.label || value.period.endDate),
  };
}
