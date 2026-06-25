/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 *
 * K-0 isolation contract — namespace allowlist and import-graph assertions.
 */

/** Industries that FA namespace must never import from */
export const FORBIDDEN_CROSS_INDUSTRY_PATTERNS = [
  /synthetic\/industry\/manufacturing/,
  /synthetic\/industry\/retail/,
  /synthetic\/industry\/healthcare/,
  /synthetic\/industries\//,
] as const;

/** Direct standards-content imports forbidden outside resolver path */
export const FORBIDDEN_DIRECT_STANDARDS_PATTERNS = [
  /standards\/libraries\/us-gaap\/buildGaapTreatment/,
  /standards\/libraries\/full-ifrs\/buildFullIfrsTreatment/,
  /standards\/libraries\/ifrs-for-smes\/buildIfrsForSmesTreatment/,
] as const;

/** Allowed resolver entry points for standards lookups */
export const ALLOWED_STANDARDS_RESOLVER_PATHS = [
  "standards/resolver/resolveTreatmentPure",
  "standards/resolver/shimContextBuilder",
  "standards/resolver/resolveTreatment",
  "standards/treatment-resolver/buildTreatmentResolution",
] as const;

/** Allowed audit emission paths (42.7 framework) */
export const ALLOWED_AUDIT_PATHS = [
  "standards/audit/",
  "fund-accounting/audit/",
] as const;

export function scanSourceForForbiddenImports(source: string): {
  crossIndustry: string[];
  directStandards: string[];
} {
  const crossIndustry = FORBIDDEN_CROSS_INDUSTRY_PATTERNS.filter((p) => p.test(source)).map(String);
  const directStandards = FORBIDDEN_DIRECT_STANDARDS_PATTERNS.filter((p) => p.test(source)).map(String);
  return { crossIndustry, directStandards };
}

export function assertNoCrossIndustryImports(source: string, fileLabel: string): void {
  const { crossIndustry } = scanSourceForForbiddenImports(source);
  if (crossIndustry.length > 0) {
    throw new Error(
      `${fileLabel}: cross-industry import violation — ${crossIndustry.join(", ")}`,
    );
  }
}

export function assertNoDirectStandardsContentImports(source: string, fileLabel: string): void {
  const { directStandards } = scanSourceForForbiddenImports(source);
  if (directStandards.length > 0) {
    throw new Error(
      `${fileLabel}: direct standards-content import — use treatment-resolver — ${directStandards.join(", ")}`,
    );
  }
}
