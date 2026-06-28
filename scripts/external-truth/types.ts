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
  contract_revenue?: {
    contract_asset?: { current: number; noncurrent?: number };
    contract_liability?: { current: number; noncurrent?: number };
    deferred_revenue_rollforward?: {
      beginning_balance: number;
      revenue_deferred: number;
      revenue_recognized: number;
      ending_balance: number;
    };
    revenue_by_category?: Record<string, number>;
    cost_to_obtain?: { capitalized: number; amortization: number };
    transaction_price_allocation?: Array<{ obligation: string; amount: number }>;
    remaining_performance_obligation?: { total: number; within_twelve_months: number };
    variable_consideration?: { constrained_amount: number; constraint_rationale: string };
    principal_or_agent?: "principal" | "agent";
  };
  receivables?: {
    billed: number;
    unbilled: number;
  };
  contract_assets?: {
    opening: number;
    closing: number;
  };
  engagement?: {
    classification: "principal" | "agent";
    indicators: string[];
  };
  revenue?: {
    by_fee_structure: Record<string, number>;
  };
  inventory?: {
    cost_formula?: "FIFO" | "weighted_average" | "LIFO";
    carrying_amounts?: Record<string, number>;
  };
  govcon?: {
    contracts?: {
      by_type: Record<string, number>;
    };
    customer_concentration?: {
      us_government_pct: number;
    };
    cas_coverage?: {
      applicable_standards: string[];
      coverage_type: "full" | "modified" | "exempt";
    };
    backlog?: {
      funded: number;
      unfunded: number;
      option_years?: number;
      horizon_years?: number[];
    };
    unallowable_costs?: {
      identified_categories: string[];
      exclusion_methodology: string;
    };
    indirect_rates?: {
      fringe: number;
      overhead: number;
      ga: number;
      true_up_methodology: string;
    };
  };
  construction?: {
    output_measure?: {
      method: "cost-to-cost" | "units-of-delivery" | "milestones";
      unit_definition?: string;
      unit_progress?: number;
      milestones_defined?: string[];
      milestones_achieved?: string[];
    };
    post_completion?: {
      warranty_obligation: string;
      retainage_balance: number;
      adjustment_history: string;
    };
    contract_balances?: {
      contract_assets: number;
      contract_liabilities: number;
    };
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
  framework_violation_handling?: string;
  framework_substitute_note?: string;
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
