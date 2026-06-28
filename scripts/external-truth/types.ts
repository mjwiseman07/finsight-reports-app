/**
 * Phase G7 — external-truth shared types.
 */
export type ExternalTruthVertical =
  | "saas"
  | "rtl"
  | "hc"
  | "npo"
  | "mfg"
  | "con"
  | "gc"
  | "ps"
  | "fa";

export type ReportingFramework = "us-gaap" | "ifrs" | "ipsas";

export type ValidationTier = "structural" | "numeric" | "narrative";

export type GapSeverity = "low" | "medium" | "high" | "critical";

export type GapClassification =
  | "framework-mismatch"
  | "missing-field"
  | "numeric-drift"
  | "narrative-gap"
  | "comingling-suspect"
  | "fetch-failure"
  | "parse-failure"
  | "missing-router-output"
  | "tolerance-exceeded";

export type TriageDecision =
  | "fix-now"
  | "document-limitation"
  | "defer-to-future"
  | "satisfied"
  | null;

export interface SourceJson {
  schemaVersion: "1.0.0";
  filingId: string;
  vertical: ExternalTruthVertical;
  framework: ReportingFramework;
  formType: string;
  sourceUrl: string;
  fetchedAt: string;
  sha256: string;
  licenseTerms: string;
  synthesized: boolean;
  manualArchive: boolean;
  notes: string;
  originalSha256?: string;
  prunedSha256?: string;
  pruningRule?: string;
  prunedElements?: string[];
}

export interface NumericFact {
  tag: string;
  label: string;
  value: number;
  unit: string;
  periodEnd: string;
}

export interface ExtractedFiling {
  schemaVersion: "1.0.0";
  filingId: string;
  vertical: ExternalTruthVertical;
  framework: ReportingFramework;
  entityName: string;
  cik?: string;
  ticker?: string;
  formType: string;
  fiscalYearEnd?: string;
  inventoryMethod?: string;
  numericFacts: NumericFact[];
  narrativeSnippets: string[];
  rawFrameworkSignals: string[];
  tax_status?: string;
  entity_type?: string;
  form990?: {
    partI: Record<string, number | string>;
    partVIII: Record<string, number>;
    partIX: Record<string, number>;
    partX: Record<string, number>;
  };
  expenses?: {
    by_function?: {
      program: number;
      management_general: number;
      fundraising: number;
    };
    by_nature?: Record<string, number>;
    allocation_basis?: string;
  };
  allocation_methodology?: {
    method: string;
    rationale: string;
  };
  service_costs?: {
    by_program: Record<string, number>;
    allocation_basis: string;
  };
}

export interface ExpectedDisclosureTopic {
  topicIdentifier: string;
  reportingFramework: ReportingFramework;
  disclosureSummaryAuthored: string;
}

export interface RouterSurface {
  status: "present" | "partial" | "missing";
  fields: string[];
}

export interface ExpectedFiling {
  schemaVersion: "1.0.0";
  filingId: string;
  vertical: ExternalTruthVertical;
  framework: ReportingFramework;
  entityName: string;
  topics: ExpectedDisclosureTopic[];
  numericFacts: NumericFact[];
  frameworkBinding: {
    primary: ReportingFramework;
    prohibitsLifo: boolean;
  };
  routerRunAt?: string;
  routerSurfaces?: Record<string, RouterSurface>;
}

export interface GapEntry {
  id: string;
  filingId: string;
  vertical: ExternalTruthVertical;
  framework: ReportingFramework;
  tier: ValidationTier;
  severity: GapSeverity;
  classification: GapClassification;
  message: string;
  observed: string;
  expected: string;
  triage: TriageDecision;
  triageDecisionSha: string | null;
  triageNote: string | null;
  createdAt: string;
  reclassified_in?: string;
  c7a_sub_commit?: string;
  ifrs_citation?: string;
  framework_non_comingling_note?: string;
  closed_in?: string;
  emitter_path?: string | null;
  verification_fixture?: string;
  citation_resolved?: string;
  closure_mechanism?: string;
  scope_precondition?: string;
}

export interface GapRegister {
  version: string;
  schemaVersion: string;
  gaps: GapEntry[];
}

export interface MissingCorpusEntry {
  vertical: ExternalTruthVertical;
  framework: ReportingFramework;
  filingId: string;
  reason: string;
  attemptedAt: string;
}

export interface MissingCorpus {
  version: string;
  missing: MissingCorpusEntry[];
}

export interface ValidationResult {
  filingId: string;
  passed: boolean;
  gaps: GapEntry[];
}

export interface FilingManifestEntry {
  vertical: ExternalTruthVertical;
  framework: ReportingFramework;
  filingId: string;
  ticker?: string;
  cik?: string;
  formType: string;
  manualArchive?: boolean;
  synthesized?: boolean;
  sourceUrl?: string;
  notes?: string;
}
