import type { RetailPanelContext } from "../types";
import type { RetailKpiId } from "./evaluator";

export type RetailForecastVarianceId =
  | "RTL-FV-01"
  | "RTL-FV-02"
  | "RTL-FV-03"
  | "RTL-FV-04"
  | "RTL-FV-05"
  | "RTL-FV-06"
  | "RTL-FV-07"
  | "RTL-FV-08"
  | "RTL-FV-09"
  | "RTL-FV-10"
  | "RTL-FV-11"
  | "RTL-FV-12"
  | "RTL-FV-13"
  | "RTL-FV-14"
  | "RTL-FV-15"
  | "RTL-FV-16";

export const KPI_TO_FORECAST: Record<RetailKpiId, RetailForecastVarianceId> = {
  "RTL-K-01": "RTL-FV-01",
  "RTL-K-02": "RTL-FV-02",
  "RTL-K-03": "RTL-FV-03",
  "RTL-K-04": "RTL-FV-04",
  "RTL-K-05": "RTL-FV-05",
  "RTL-K-06": "RTL-FV-06",
  "RTL-K-07": "RTL-FV-07",
  "RTL-K-08": "RTL-FV-08",
  "RTL-K-09": "RTL-FV-09",
  "RTL-K-10": "RTL-FV-10",
  "RTL-K-11": "RTL-FV-11",
  "RTL-K-12": "RTL-FV-12",
  "RTL-K-13": "RTL-FV-13",
  "RTL-K-14": "RTL-FV-14",
  "RTL-K-15": "RTL-FV-15",
  "RTL-K-16": "RTL-FV-16",
};

export function computeForecastVariance(
  _ctx: RetailPanelContext,
  kpiId: RetailKpiId,
  realized: number,
  forecast: number,
): { variance: number; variancePct: number; varianceId: RetailForecastVarianceId } {
  const variance = realized - forecast;
  const variancePct = forecast !== 0 ? variance / forecast : 0;
  return { variance, variancePct, varianceId: KPI_TO_FORECAST[kpiId] };
}
