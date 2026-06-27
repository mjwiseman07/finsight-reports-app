import type { SixVariance } from "../types";

export function decomposeSixVariance(input: {
  actualPrice: number;
  standardPrice: number;
  actualQty: number;
  standardQty: number;
  actualRate: number;
  standardRate: number;
  actualHours: number;
  standardHours: number;
  actualOverhead: number;
  budgetedOverhead: number;
  appliedOverhead: number;
  overheadMethod?: "TWO_VARIANCE" | "FOUR_VARIANCE";
  mixYieldThresholdPct?: number;
}): SixVariance {
  const ppv = (input.actualPrice - input.standardPrice) * input.actualQty;
  const muv = (input.actualQty - input.standardQty) * input.standardPrice;
  const lrv = (input.actualRate - input.standardRate) * input.actualHours;
  const lev = (input.actualHours - input.standardHours) * input.standardRate;
  const osv = input.actualOverhead - input.budgetedOverhead;
  const ovv = input.budgetedOverhead - input.appliedOverhead;

  return {
    ppv,
    muv,
    lrv,
    lev,
    osv,
    ovv,
    overheadMethod: input.overheadMethod ?? "FOUR_VARIANCE",
    mixYieldReportingThresholdPct: input.mixYieldThresholdPct ?? 2,
  };
}

export function totalVariance(v: SixVariance): number {
  return v.ppv + v.muv + v.lrv + v.lev + v.osv + v.ovv + (v.mixVariance ?? 0) + (v.yieldVariance ?? 0);
}
