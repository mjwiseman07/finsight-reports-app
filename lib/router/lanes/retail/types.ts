import type { ExtractedFiling } from "../../../../scripts/external-truth/types";

export const US_GAAP_ASC842 = "US_GAAP_ASC842" as const;

export type RetailLeaseFramework = typeof US_GAAP_ASC842;

export interface RetailLeaseEmitterInput {
  extracted: ExtractedFiling;
  framework: RetailLeaseFramework;
}

export function buildRetailLeaseEmitterInput(extracted: ExtractedFiling): RetailLeaseEmitterInput {
  if (extracted.framework !== "us-gaap") {
    throw new Error(`Retail ASC 842 lease emitters require us-gaap framework, got ${extracted.framework}`);
  }
  return { extracted, framework: US_GAAP_ASC842 };
}

export function hasLeaseCostBreakdownInput(extracted: ExtractedFiling): boolean {
  return Boolean(extracted.leases?.asc842?.cost_breakdown);
}

export function hasLeaseWeightedAveragesInput(extracted: ExtractedFiling): boolean {
  return Boolean(extracted.leases?.asc842?.weighted_averages);
}

export function hasLeaseMaturityInput(extracted: ExtractedFiling): boolean {
  return Boolean(extracted.leases?.asc842?.maturity);
}

export function hasAnyLeaseAsc842Input(extracted: ExtractedFiling): boolean {
  return (
    hasLeaseCostBreakdownInput(extracted) ||
    hasLeaseWeightedAveragesInput(extracted) ||
    hasLeaseMaturityInput(extracted)
  );
}

export const FOOTING_TOLERANCE_USD = 1;
