import type { ExtractedFiling } from "../../../../scripts/external-truth/types";

export const US_GAAP_ASC606 = "US_GAAP_ASC606" as const;
export const IFRS_15 = "IFRS_15" as const;
export const IFRS_9 = "IFRS_9" as const;

export type HealthcareRevenueFramework = typeof US_GAAP_ASC606 | typeof IFRS_15 | typeof IFRS_9;

export interface HealthcareRevenueEmitterInput {
  extracted: ExtractedFiling;
  framework: HealthcareRevenueFramework;
}

export const HC_FOOTING_TOLERANCE_USD = 1_000;
export const HC_BAD_DEBT_PCT_REJECT_THRESHOLD = 0.05;
export const HC_BAD_DEBT_PCT_SANITY_THRESHOLD = 0.02;

export const FRAMEWORK_SUBSTITUTE_NOTE_IPC_VS_IFRS =
  "US GAAP ASC 606 implicit price concession at contract inception has no direct IFRS 15 analog; IFRS uses variable consideration constraint (IFRS 15.56–58) plus IFRS 9 ECL post-recognition.";

export function buildUsgaapAsc606EmitterInput(extracted: ExtractedFiling): HealthcareRevenueEmitterInput {
  if (extracted.framework !== "us-gaap") {
    throw new Error(`ASC 606 healthcare emitters require us-gaap framework, got ${extracted.framework}`);
  }
  return { extracted, framework: US_GAAP_ASC606 };
}

export function buildIfrs15EmitterInput(extracted: ExtractedFiling): HealthcareRevenueEmitterInput {
  if (extracted.framework !== "ifrs") {
    throw new Error(`IFRS 15 healthcare emitters require ifrs framework, got ${extracted.framework}`);
  }
  return { extracted, framework: IFRS_15 };
}

export function buildIfrs9EmitterInput(extracted: ExtractedFiling): HealthcareRevenueEmitterInput {
  if (extracted.framework !== "ifrs") {
    throw new Error(`IFRS 9 healthcare emitters require ifrs framework, got ${extracted.framework}`);
  }
  return { extracted, framework: IFRS_9 };
}

export function hasPayorMixAsc606Input(extracted: ExtractedFiling): boolean {
  return Boolean(extracted.healthcare_revenue?.asc606?.payor_mix);
}

export function hasIpcAsc606Input(extracted: ExtractedFiling): boolean {
  return Boolean(extracted.healthcare_revenue?.asc606?.implicit_price_concession);
}

export function hasAllowanceAsc606Input(extracted: ExtractedFiling): boolean {
  return Boolean(extracted.healthcare_revenue?.asc606?.allowance_rollforward);
}

export function hasAnyAsc606RevenueInput(extracted: ExtractedFiling): boolean {
  return hasPayorMixAsc606Input(extracted) || hasIpcAsc606Input(extracted) || hasAllowanceAsc606Input(extracted);
}

export function hasPayorMixIfrsInput(extracted: ExtractedFiling): boolean {
  return Boolean(extracted.healthcare_revenue?.ifrs?.payor_mix);
}

export function hasReceivablesEclInput(extracted: ExtractedFiling): boolean {
  return Boolean(extracted.healthcare_revenue?.ifrs?.receivables_ecl);
}

export function hasAnyIfrsRevenueInput(extracted: ExtractedFiling): boolean {
  return hasPayorMixIfrsInput(extracted) || hasReceivablesEclInput(extracted);
}

const REQUIRED_US_PAYOR_CLASSES = new Set([
  "medicare_traditional",
  "medicare_advantage",
  "medicaid",
  "self_pay",
]);

export function assertRequiredUsPayorClasses(payors: Array<{ class: string }>): void {
  const present = new Set(payors.map((p) => p.class));
  for (const required of REQUIRED_US_PAYOR_CLASSES) {
    if (!present.has(required)) {
      throw new Error(`missing required payor class: ${required}`);
    }
  }
}

export const US_PAYOR_FORBIDDEN_IN_IFRS = [
  "medicare",
  "medicaid",
  "managed care",
  "self-pay",
  "self pay",
] as const;
