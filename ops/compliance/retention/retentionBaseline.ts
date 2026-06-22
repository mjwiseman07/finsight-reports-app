export type RetentionCategory =
  | "hipaa-documentation"
  | "soc2-evidence-logs"
  | "security-incident-logs"
  | "application-system-logs";

export interface RetentionBaselineEntry {
  category: RetentionCategory;
  durationDays: number;
  regulatoryFloor: boolean;
  regulatoryCitation: string | null;
  rationale: string;
  decisionGate: string;
}

export interface RetentionBaselineLookup {
  getBaseline(category: RetentionCategory): RetentionBaselineEntry;
  getHipaaDocumentationFloorDays(): number;
}

export interface RetentionBaselineMarker {
  retentionBaselineId: string;
  retentionBaselineKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
}

const HIPAA_DOCUMENTATION_FLOOR_DAYS = 2191;

const BASELINE_ENTRIES: RetentionBaselineEntry[] = [
  {
    category: "hipaa-documentation",
    durationDays: 2191,
    regulatoryFloor: true,
    regulatoryCitation: "45 CFR 164.316(b)(2)(i)",
    rationale:
      "HIPAA Security Rule documentation retention: 6 years from the date of creation OR the date when last in effect, whichever is later. 6 years × 365.25 days/year = 2191.5 → rounded up to 2191 days. HARD FLOOR — counsel may RAISE, never lowers.",
    decisionGate: "HIPAA counsel (H-7)",
  },
  {
    category: "soc2-evidence-logs",
    durationDays: 730,
    regulatoryFloor: false,
    regulatoryCitation: null,
    rationale:
      "SOC 2 Type II evidence retention: 24 months covers two consecutive observation windows (Q6 window length × 2). Standard SaaS-attest practice; not a regulatory floor but an attestation-window floor. Auditor (Phase 42.6A) may raise to 36 months if window length resolves at 12 months.",
    decisionGate: "CPA auditor (Phase 42.6A)",
  },
  {
    category: "security-incident-logs",
    durationDays: 2191,
    regulatoryFloor: true,
    regulatoryCitation: "45 CFR 164.316(b)(2)(i) (incident response logs are HIPAA documentation per 164.308(a)(6))",
    rationale:
      "Security incident logs aligned with HIPAA 6-year floor (matches HIPAA documentation per FM-1 MAX-of-overlays semantic; simplifies cross-overlay retention for healthcare-overlay tenants). Non-healthcare tenants inherit 2191 days as MAX of baseline + future-vertical floors.",
    decisionGate: "HIPAA counsel (H-7) + CPA auditor (Phase 42.6A)",
  },
  {
    category: "application-system-logs",
    durationDays: 395,
    regulatoryFloor: false,
    regulatoryCitation: null,
    rationale:
      "Application + system logs (non-audit, non-security): 13 months = 12-month observation window + 1-month buffer for window-close to issuance lag. Operationally driven, not regulatorily floored. Counsel may raise for jurisdiction-specific requirements (H-6).",
    decisionGate: "CPA auditor (Phase 42.6A) + counsel (H-6) per jurisdiction",
  },
];

export const RETENTION_BASELINE: ReadonlyArray<RetentionBaselineEntry> = Object.freeze(
  BASELINE_ENTRIES.map((entry) => Object.freeze({ ...entry })),
);

const BASELINE_BY_CATEGORY = new Map<RetentionCategory, RetentionBaselineEntry>(
  RETENTION_BASELINE.map((entry) => [entry.category, entry]),
);

export function getBaseline(category: RetentionCategory): RetentionBaselineEntry {
  const entry = BASELINE_BY_CATEGORY.get(category);
  if (!entry) {
    throw new Error(`unknown_retention_category:${String(category)}`);
  }
  return entry;
}

export function getHipaaDocumentationFloorDays(): number {
  return HIPAA_DOCUMENTATION_FLOOR_DAYS;
}

export const retentionBaselineLookup: RetentionBaselineLookup & RetentionBaselineMarker = {
  getBaseline,
  getHipaaDocumentationFloorDays,
  retentionBaselineId: "retention-baseline:default",
  retentionBaselineKey: "retention-baseline:default",
  containsVerticalComplianceLogic: false,
  executable: false,
};
