/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsPHI: true
 *
 * K-0 isolation contract — no cross-industry imports, PHI-safe error templates.
 */

export const FORBIDDEN_CROSS_INDUSTRY_PATTERNS = [
  /synthetic\/industry\/fund-accounting/,
  /synthetic\/industry\/manufacturing/,
  /synthetic\/industry\/retail/,
] as const;

export const FORBIDDEN_DIRECT_STANDARDS_PATTERNS = [
  /standards\/libraries\/us-gaap\/buildGaapTreatment/,
  /standards\/libraries\/full-ifrs\/buildFullIfrsTreatment/,
] as const;

/** PHI patterns that must never appear in error message templates (static analysis) */
export const PHI_ERROR_FORBIDDEN_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN-like
  /\bMRN[:\s]/i,
  /\bpatientName\b/i,
  /\bdateOfBirth\b/i,
] as const;

export function scanSourceForForbiddenImports(source: string): {
  crossIndustry: string[];
  directStandards: string[];
  phiInErrors: string[];
} {
  const crossIndustry = FORBIDDEN_CROSS_INDUSTRY_PATTERNS.filter((p) => p.test(source)).map(String);
  const directStandards = FORBIDDEN_DIRECT_STANDARDS_PATTERNS.filter((p) => p.test(source)).map(String);
  const phiInErrors = PHI_ERROR_FORBIDDEN_PATTERNS.filter((p) => p.test(source)).map(String);
  return { crossIndustry, directStandards, phiInErrors };
}

export function assertNoCrossIndustryImports(source: string, fileLabel: string): void {
  const { crossIndustry } = scanSourceForForbiddenImports(source);
  if (crossIndustry.length > 0) {
    throw new Error(`${fileLabel}: cross-industry import — ${crossIndustry.join(", ")}`);
  }
}
