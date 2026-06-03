import { buildMetricSeries } from "./buildMetricSeries";
import type { SyntheticMetricSeriesBuilderInput } from "./types";

export function buildOperatingMarginSeries(input: Omit<SyntheticMetricSeriesBuilderInput, "metricKey" | "label">) {
  return buildMetricSeries({
    ...input,
    metricKey: "operating_margin",
    label: "Operating Margin",
    parentMetricIds: input.parentMetricIds || ["revenue", "operating_expenses"],
    sourceMetricIds: input.sourceMetricIds || ["revenue", "operating_expenses"],
  });
}
