import { buildMetricSeries } from "./buildMetricSeries";
import type { SyntheticMetricSeriesBuilderInput } from "./types";

export function buildPayrollSeries(input: Omit<SyntheticMetricSeriesBuilderInput, "metricKey" | "label">) {
  return buildMetricSeries({ ...input, metricKey: "payroll", label: "Payroll" });
}
