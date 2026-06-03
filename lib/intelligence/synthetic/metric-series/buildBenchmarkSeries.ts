import { buildMetricSeries } from "./buildMetricSeries";
import type { SyntheticMetricSeriesBuilderInput } from "./types";

export function buildBenchmarkSeries(input: Omit<SyntheticMetricSeriesBuilderInput, "metricKey" | "label">) {
  return buildMetricSeries({
    ...input,
    metricKey: "benchmark",
    label: "Benchmark",
    parentMetricIds: input.parentMetricIds || ["industry_profile"],
    sourceMetricIds: input.sourceMetricIds || ["industry_profile"],
  });
}
