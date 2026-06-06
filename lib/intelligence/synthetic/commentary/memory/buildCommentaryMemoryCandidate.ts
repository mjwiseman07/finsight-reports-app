import { stableSnapshotHash } from "../../historical-snapshots";
import type {
  SyntheticStructuredCommentaryCandidate,
} from "../candidates";
import type {
  SyntheticCashConversionCycleIndicator,
  SyntheticCommentaryAudience,
  SyntheticCommentaryBusinessModel,
  SyntheticCommentaryCategory,
  SyntheticCommentaryDomain,
  SyntheticCommentaryEvidenceStrength,
  SyntheticCommentaryGovernanceStatus,
  SyntheticCommentaryLineage,
  SyntheticCommentaryMaterialityStatus,
  SyntheticCommentaryMemoryAlignmentStatus,
  SyntheticCommentaryNarrativeHorizon,
  SyntheticCommentaryRefreshStatus,
  SyntheticCommentaryRiskIndicator,
  SyntheticLiquidityIndicator,
  SyntheticWorkingCapitalIndicator,
} from "../types";

export type SyntheticCommentaryMemoryKey =
  | "executive_business_condition"
  | "revenue_condition"
  | "expense_condition"
  | "payroll_condition"
  | "workforce_condition"
  | "balance_sheet_condition"
  | "cash_flow_condition"
  | "operational_condition"
  | "healthcare_condition"
  | "manufacturing_condition";

export interface SyntheticCommentaryMemoryCandidate {
  candidateId: string;
  companyId: string;
  commentaryId: string;
  commentaryCategory: SyntheticCommentaryCategory;
  audience: SyntheticCommentaryAudience;
  memoryKey: SyntheticCommentaryMemoryKey;
  evidenceId: string;
  supportingObservationIds: string[];
  supportingPatternIds: string[];
  supportingMemoryIds: string[];
  supportingSourceReferenceIds: string[];
  driverReferenceIds: string[];
  confidenceScore: number;
  confidenceReason: string;
  evidenceStrength: SyntheticCommentaryEvidenceStrength;
  dataCompletenessScore: number;
  evidencePriorityRank: number;
  evidencePriorityReason: string;
  materialityStatus: SyntheticCommentaryMaterialityStatus;
  memoryAlignmentStatus: SyntheticCommentaryMemoryAlignmentStatus;
  narrativeDriftDetected: boolean;
  historicalPatternConflict: boolean;
  governanceStatus: SyntheticCommentaryGovernanceStatus;
  refreshStatus: SyntheticCommentaryRefreshStatus;
  narrativeHorizon: SyntheticCommentaryNarrativeHorizon;
  riskIndicators: SyntheticCommentaryRiskIndicator[];
  workingCapitalIndicators: SyntheticWorkingCapitalIndicator[];
  cashConversionCycleIndicators: SyntheticCashConversionCycleIndicator[];
  liquidityIndicators: SyntheticLiquidityIndicator[];
  domains: SyntheticCommentaryDomain[];
  businessModels: SyntheticCommentaryBusinessModel[];
  lineage: SyntheticCommentaryLineage;
}

export interface BuildCommentaryMemoryCandidateInput {
  companyId: string;
  candidate: SyntheticStructuredCommentaryCandidate | null;
}

export interface BuildCommentaryMemoryCandidateResult {
  candidate: SyntheticCommentaryMemoryCandidate | null;
  skipped: boolean;
  warnings: string[];
}

export const COMMENTARY_CATEGORY_MEMORY_KEY_MAP: Record<
  SyntheticCommentaryCategory,
  SyntheticCommentaryMemoryKey
> = {
  executive: "executive_business_condition",
  revenue: "revenue_condition",
  expense: "expense_condition",
  payroll: "payroll_condition",
  workforce: "workforce_condition",
  balance_sheet: "balance_sheet_condition",
  cash_flow: "cash_flow_condition",
  operational: "operational_condition",
  healthcare: "healthcare_condition",
  manufacturing: "manufacturing_condition",
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function hasSupportingEvidence(candidate: SyntheticStructuredCommentaryCandidate): boolean {
  return (
    candidate.supportingObservationIds.length > 0 ||
    candidate.supportingPatternIds.length > 0 ||
    candidate.supportingMemoryIds.length > 0 ||
    candidate.supportingSourceReferenceIds.length > 0 ||
    candidate.driverReferenceIds.length > 0
  );
}

function buildCandidateId(
  input: BuildCommentaryMemoryCandidateInput,
  candidate: SyntheticStructuredCommentaryCandidate,
): string {
  return `commentary-memory-candidate:${stableSnapshotHash({
    companyId: input.companyId,
    commentaryId: candidate.commentaryId,
    commentaryCategory: candidate.commentaryCategory,
    audience: candidate.audience,
    evidenceId: candidate.evidenceId,
    supportingObservationIds: uniqueSorted(candidate.supportingObservationIds),
    supportingPatternIds: uniqueSorted(candidate.supportingPatternIds),
    supportingMemoryIds: uniqueSorted(candidate.supportingMemoryIds),
    supportingSourceReferenceIds: uniqueSorted(candidate.supportingSourceReferenceIds),
    driverReferenceIds: uniqueSorted(candidate.driverReferenceIds),
  })}`;
}

function validateInput(input: BuildCommentaryMemoryCandidateInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!input.candidate) {
    warnings.push("candidate is required.");
    return warnings;
  }
  if (input.candidate.companyId !== input.companyId) {
    warnings.push("candidate companyId must match input companyId.");
  }
  if (!hasValue(input.candidate.commentaryId)) warnings.push("commentaryId is required.");
  if (!hasValue(input.candidate.commentaryCategory)) warnings.push("commentaryCategory is required.");
  if (!hasValue(input.candidate.audience)) warnings.push("audience is required.");
  if (!hasValue(input.candidate.evidenceId)) warnings.push("evidenceId is required.");
  if (!hasSupportingEvidence(input.candidate)) warnings.push("supporting evidence references are required.");
  if (!input.candidate.supportingSourceReferenceIds?.length) {
    warnings.push("source references are required.");
  }
  if (!input.candidate.lineage) warnings.push("lineage is required.");
  if (!COMMENTARY_CATEGORY_MEMORY_KEY_MAP[input.candidate.commentaryCategory]) {
    warnings.push("commentaryCategory cannot be mapped to a Commentary memory key.");
  }

  return warnings;
}

export function buildCommentaryMemoryCandidate(
  input: BuildCommentaryMemoryCandidateInput,
): BuildCommentaryMemoryCandidateResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.candidate) {
    return {
      candidate: null,
      skipped: true,
      warnings,
    };
  }

  const candidate = input.candidate;

  return {
    candidate: {
      candidateId: buildCandidateId(input, candidate),
      companyId: input.companyId,
      commentaryId: candidate.commentaryId,
      commentaryCategory: candidate.commentaryCategory,
      audience: candidate.audience,
      memoryKey: COMMENTARY_CATEGORY_MEMORY_KEY_MAP[candidate.commentaryCategory],
      evidenceId: candidate.evidenceId,
      supportingObservationIds: candidate.supportingObservationIds,
      supportingPatternIds: candidate.supportingPatternIds,
      supportingMemoryIds: candidate.supportingMemoryIds,
      supportingSourceReferenceIds: candidate.supportingSourceReferenceIds,
      driverReferenceIds: candidate.driverReferenceIds,
      confidenceScore: candidate.confidenceScore,
      confidenceReason: candidate.confidenceReason,
      evidenceStrength: candidate.evidenceStrength,
      dataCompletenessScore: candidate.dataCompletenessScore,
      evidencePriorityRank: candidate.evidencePriorityRank,
      evidencePriorityReason: candidate.evidencePriorityReason,
      materialityStatus: candidate.materialityStatus,
      memoryAlignmentStatus: candidate.memoryAlignmentStatus,
      narrativeDriftDetected: candidate.narrativeDriftDetected,
      historicalPatternConflict: candidate.historicalPatternConflict,
      governanceStatus: candidate.governanceStatus,
      refreshStatus: candidate.refreshStatus,
      narrativeHorizon: candidate.narrativeHorizon,
      riskIndicators: candidate.riskIndicators,
      workingCapitalIndicators: candidate.workingCapitalIndicators,
      cashConversionCycleIndicators: candidate.cashConversionCycleIndicators,
      liquidityIndicators: candidate.liquidityIndicators,
      domains: candidate.domains,
      businessModels: candidate.businessModels,
      lineage: {
        ...candidate.lineage,
        sourceReferenceIds: uniqueSorted([
          ...candidate.lineage.sourceReferenceIds,
          ...candidate.supportingSourceReferenceIds,
        ]),
        observationIds: uniqueSorted([
          ...candidate.lineage.observationIds,
          ...candidate.supportingObservationIds,
        ]),
        patternIds: uniqueSorted([...candidate.lineage.patternIds, ...candidate.supportingPatternIds]),
        memoryIds: uniqueSorted([...candidate.lineage.memoryIds, ...candidate.supportingMemoryIds]),
        driverReferenceIds: uniqueSorted([
          ...candidate.lineage.driverReferenceIds,
          ...candidate.driverReferenceIds,
        ]),
      },
    },
    skipped: false,
    warnings: [],
  };
}
