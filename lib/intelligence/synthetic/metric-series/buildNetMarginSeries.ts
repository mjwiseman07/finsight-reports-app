import { buildMetricSeries } from "./buildMetricSeries";
import type { SyntheticMetricSeriesBuilderInput } from "./types";

export function buildNetMarginSeries(input: Omit<SyntheticMetricSeriesBuilderInput, "metricKey" | "label">) {
  return buildMetricSeries({
    ...input,
    metricKey: "net_margin",
    label: "Net Margin",
    parentMetricIds: input.parentMetricIds || ["revenue", "net_income"],
    sourceMetricIds: input.sourceMetricIds || ["revenue", "net_income"],
  });
}
