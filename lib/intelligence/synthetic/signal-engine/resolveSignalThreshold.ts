import type { SyntheticIndustryProfile } from "../types/industry-profile";
import type { SyntheticSignalThreshold } from "./types";

const defaultThresholds: Record<string, SyntheticSignalThreshold> = {
  revenue_growth: { value: 10, direction: "increase" },
  revenue_decline: { value: 10, direction: "decrease" },
  revenue_volatility: { value: 15, direction: "absolute" },
  expense_growth: { value: 10, direction: "increase" },
  expense_compression: { value: 10, direction: "decrease" },
  gross_margin_expansion: { value: 5, direction: "increase" },
  gross_margin_compression: { value: 5, direction: "decrease" },
  operating_margin_expansion: { value: 5, direction: "increase" },
  operating_margin_compression: { value: 5, direction: "decrease" },
  cash_improvement: { value: 10, direction: "increase" },
  cash_pressure: { value: 10, direction: "decrease" },
  cash_runway_risk: { value: 15, direction: "decrease" },
  ar_improvement: { value: 10, direction: "decrease" },
  ar_collection_risk: { value: 10, direction: "increase" },
  ap_improvement: { value: 10, direction: "decrease" },
  ap_pressure: { value: 10, direction: "increase" },
  payroll_growth: { value: 10, direction: "increase" },
  payroll_efficiency: { value: 10, direction: "decrease" },
  inventory_build: { value: 10, direction: "increase" },
  inventory_reduction: { value: 10, direction: "decrease" },
  fixed_asset_growth: { value: 10, direction: "increase" },
  fixed_asset_aging: { value: 10, direction: "increase" },
  debt_reduction: { value: 10, direction: "decrease" },
  debt_growth: { value: 10, direction: "increase" },
  customer_concentration: { value: 20, direction: "increase" },
  vendor_concentration: { value: 20, direction: "increase" },
  benchmark_outperformance: { value: 10, direction: "increase" },
  benchmark_underperformance: { value: 10, direction: "decrease" },
};

export function resolveSignalThreshold(signalType: string, industryProfile?: SyntheticIndustryProfile | null): SyntheticSignalThreshold {
  const industryThreshold = industryProfile?.thresholds?.find((threshold) => threshold.thresholdKey === signalType);
  if (industryThreshold) {
    return {
      value: industryThreshold.value,
      direction: industryThreshold.direction || "absolute",
    };
  }
  return defaultThresholds[signalType] || { value: 10, direction: "absolute" };
}
