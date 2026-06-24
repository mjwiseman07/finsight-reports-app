// ============================================================================
// Inputs
// ============================================================================

export type FrameworkCode =
  | "US_GAAP"
  | "IFRS"
  | "IFRS_SME"
  | "FAR_31"
  | "CAS_401_420"
  | "ASC_606"
  | "ASC_842"
  | "ASC_946"
  | "GASB"
  | "FASB_NFP";

export interface OrgFrameworkElection {
  electedFramework: FrameworkCode | null;
  electedAt: string;
  electedBy: string;
  electionScope: "company" | "entity" | "consolidation_group";
  electionEvidenceRef: string;
}

export interface CompanyMemorySnapshotHandle {
  companyId: string;
  asOfPeriodKey: string;
  memoryGroupId: string;
  snapshotDeterminismHash: string;
}

export interface KnowledgePackageHandle {
  packageId: string;
  boundPhase37SnapshotHash: string;
  industry: IndustryHandle;
}

export interface IndustryHandle {
  industryCode:
    | "MANUFACTURING"
    | "RETAIL"
    | "FUND_ACCOUNTING"
    | "CONSTRUCTION"
    | "PROFESSIONAL_SERVICES"
    | "NONPROFIT"
    | "GOVCON_DCAA"
    | "SAAS";
  subIndustryCode: string | null;
}

export interface JurisdictionHandle {
  country: string;
  region: string | null;
}

export interface ResolveTreatmentInput {
  orgElection: OrgFrameworkElection | null;
  companyMemoryHandle: CompanyMemorySnapshotHandle;
  knowledgePackageHandle: KnowledgePackageHandle;
  industry: IndustryHandle;
  jurisdiction: JurisdictionHandle;
  reportingPeriod: {
    periodKey: string;
    fiscalYearEnd: string;
  };
}

// ============================================================================
// Context (output of fetchTreatmentContext; input of resolveTreatmentPure)
// ============================================================================

export interface TreatmentContext {
  input: ResolveTreatmentInput;
  precedenceTable: TreatmentPrecedenceTable;
  historicalAttestedFramework: FrameworkCode | null;
  historicalInferredFramework: FrameworkCode | null;
  historicalInferredConfidence: "attested" | "inferred_high" | "inferred_low" | "unknown";
  contextDeterminismHash: string;
}

// ============================================================================
// Precedence table shape (loaded from treatment-precedence-table.json)
// ============================================================================

export interface TreatmentPrecedenceTable {
  schemaVersion: string;
  generatedBy: "human_curated";
  curatedAt: string;
  rules: TreatmentPrecedenceRule[];
}

export interface TreatmentPrecedenceRule {
  ruleId: string;
  industryFilter: IndustryHandle["industryCode"][] | "ANY";
  jurisdictionFilter: { countries: string[] } | "ANY";
  orgElectionRequired: boolean;
  produces: FrameworkCode;
  precedenceWeight: number;
  citationRef: string;
}

// ============================================================================
// Output
// ============================================================================

export interface TreatmentResolution {
  chosenFramework: FrameworkCode | null;
  applicableBasisRef: string;
  effectiveDate: string;
  treatmentDeterminismHash: string;
  precedenceReasoning: string;
  matchedRules: string[];
  unresolvedConflicts: UnresolvedConflict[];
  generatedAt: string;
}

export interface UnresolvedConflict {
  conflictId: string;
  competingFrameworks: FrameworkCode[];
  reason: string;
  escalationRequired: true;
}

// ============================================================================
// Resolver dependencies (injected I/O)
// ============================================================================

export interface CompanyMemoryReader {
  queryLatestMemoryRecord(params: {
    companyId: string;
    memoryKey: string;
    periodKeyAtOrBefore: string;
  }): Promise<{ framework: FrameworkCode | null; frameworkInferred?: FrameworkCode | null } | null>;
}

export interface PrecedenceTableLoader {
  load(): Promise<TreatmentPrecedenceTable>;
}

export interface TreatmentResolverDeps {
  memoryReader: CompanyMemoryReader;
  precedenceTableLoader: PrecedenceTableLoader;
  clock: () => string;
}
