import type { SixVariance } from "../types";

export function computeMixYieldVariances(
  variance: SixVariance,
  standardMixCost: number,
  actualMixCost: number,
  standardYieldCost: number,
  actualYieldCost: number,
): SixVariance {
  const mixVariance = actualMixCost - standardMixCost;
  const yieldVariance = actualYieldCost - standardYieldCost;
  const threshold = standardMixCost * (variance.mixYieldReportingThresholdPct / 100);

  return {
    ...variance,
    mixVariance: Math.abs(mixVariance) >= threshold ? mixVariance : undefined,
    yieldVariance: Math.abs(yieldVariance) >= threshold ? yieldVariance : undefined,
  };
}
