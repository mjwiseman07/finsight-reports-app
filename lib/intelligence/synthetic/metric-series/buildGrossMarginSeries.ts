import { buildMetricSeries } from "./buildMetricSeries";
import type { SyntheticMetricSeriesBuilderInput } from "./types";

export function buildGrossMarginSeries(input: Omit<SyntheticMetricSeriesBuilderInput, "metricKey" | "label">) {
  return buildMetricSeries({
    ...input,
    metricKey: "gross_margin",
    label: "Gross Margin",
    parentMetricIds: input.parentMetricIds || ["revenue", "cogs"],
    sourceMetricIds: input.sourceMetricIds || ["revenue", "cogs"],
  });
}
