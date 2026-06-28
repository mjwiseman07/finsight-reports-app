import type { ExtractedFiling } from "../../../../scripts/external-truth/types";

export const US_GAAP_ASC842 = "US_GAAP_ASC842" as const;
export const IFRS_16 = "IFRS_16" as const;

export type RetailLeaseFramework = typeof US_GAAP_ASC842 | typeof IFRS_16;

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

export function buildRetailIfrs16LeaseEmitterInput(extracted: ExtractedFiling): RetailLeaseEmitterInput {
  if (extracted.framework !== "ifrs") {
    throw new Error(`Retail IFRS 16 lease emitters require ifrs framework, got ${extracted.framework}`);
  }
  return { extracted, framework: IFRS_16 };
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

export function hasLeaseExpenseBreakdownInput(extracted: ExtractedFiling): boolean {
  return Boolean(extracted.leases?.ifrs16?.expense_breakdown);
}

export function hasLeaseMaturityIfrsInput(extracted: ExtractedFiling): boolean {
  return Boolean(extracted.leases?.ifrs16?.maturity);
}

export function hasRouRollforwardInput(extracted: ExtractedFiling): boolean {
  return Boolean(extracted.leases?.ifrs16?.rou_rollforward);
}

export function hasAnyLeaseIfrs16Input(extracted: ExtractedFiling): boolean {
  return (
    hasLeaseExpenseBreakdownInput(extracted) ||
    hasLeaseMaturityIfrsInput(extracted) ||
    hasRouRollforwardInput(extracted)
  );
}

export const FOOTING_TOLERANCE_UNITS = 1;

export const FRAMEWORK_SUBSTITUTE_NOTE_SHORT_TERM_LOW_VALUE =
  "IFRS 16.53(c) and 16.53(d) require short-term and low-value lease expense disclosed separately; US GAAP ASC 842-20-50-4 collapses short-term only.";
