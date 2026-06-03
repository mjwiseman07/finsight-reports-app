import { buildMetricSeries } from "./buildMetricSeries";
import type { SyntheticMetricSeriesBuilderInput } from "./types";

export function buildAPSeries(input: Omit<SyntheticMetricSeriesBuilderInput, "metricKey" | "label">) {
  return buildMetricSeries({ ...input, metricKey: "accounts_payable", label: "Accounts Payable" });
}
