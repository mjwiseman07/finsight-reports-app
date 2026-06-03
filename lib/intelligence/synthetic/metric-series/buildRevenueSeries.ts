import { buildMetricSeries } from "./buildMetricSeries";
import type { SyntheticMetricSeriesBuilderInput } from "./types";

export function buildRevenueSeries(input: Omit<SyntheticMetricSeriesBuilderInput, "metricKey" | "label">) {
  return buildMetricSeries({ ...input, metricKey: "revenue", label: "Revenue" });
}
