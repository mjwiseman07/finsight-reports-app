/**
 * Vertical registry for 42.7F Wiring Verifier matrix.
 * Mirrors D0.verticalWaveStatus from src/registry/d0.ts (W2 sealed: 9 of 9).
 */
export type VerifierVertical =
  | "healthcare"
  | "manufacturing"
  | "fund-accounting"
  | "govcon"
  | "construction"
  | "professional-services"
  | "saas"
  | "nonprofit"
  | "retail";

export const VERIFIER_VERTICALS: ReadonlyArray<VerifierVertical> = [
  "healthcare",
  "manufacturing",
  "fund-accounting",
  "govcon",
  "construction",
  "professional-services",
  "saas",
  "nonprofit",
  "retail",
] as const;

export const LEGACY_VERIFIER_VERTICALS: ReadonlyArray<VerifierVertical> = [
  "healthcare",
  "manufacturing",
  "fund-accounting",
] as const;

export const EXTENDED_VERIFIER_VERTICALS: ReadonlyArray<VerifierVertical> = [
  "govcon",
  "construction",
  "professional-services",
  "saas",
  "nonprofit",
  "retail",
] as const;

export const VERIFIER_VERTICAL_TO_D0: Record<
  VerifierVertical,
  "HC" | "MFG" | "FA" | "GC" | "CON" | "PS" | "SAAS" | "NPO" | "RTL"
> = {
  healthcare: "HC",
  manufacturing: "MFG",
  "fund-accounting": "FA",
  govcon: "GC",
  construction: "CON",
  "professional-services": "PS",
  saas: "SAAS",
  nonprofit: "NPO",
  retail: "RTL",
};

export const VERIFIER_AUDIT_CHANNELS = [
  "revenue-recognition",
  "journal-entry-prep",
  "reconciliation",
  "variance-analysis",
  "close-management",
  "financial-statements",
  "audit-support",
  "fund-accounting-audit",
  "dcaa-audit",
  "construction-contract-audit",
  "restricted-net-asset-audit",
  "manufacturing-cost-audit",
] as const;

export type VerifierAuditChannel = (typeof VERIFIER_AUDIT_CHANNELS)[number];

/** Cases appended per extended vertical (VC-5a mechanical extension). */
export const EXTENDED_CASES_PER_VERTICAL = 16 as const;
