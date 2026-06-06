import { stableSnapshotHash } from "../../historical-snapshots";
import type {
  SyntheticRecommendationCandidateRiskMetadata,
  SyntheticStructuredRecommendationCandidate,
} from "../candidates";
import type {
  SyntheticRecommendationAudience,
  SyntheticRecommendationCategory,
  SyntheticRecommendationConflict,
  SyntheticRecommendationEffort,
  SyntheticRecommendationEvidenceStrength,
  SyntheticRecommendationGovernanceStatus,
  SyntheticRecommendationImpact,
  SyntheticRecommendationLineage,
  SyntheticRecommendationMaterialityStatus,
  SyntheticRecommendationOutcomeStatus,
  SyntheticRecommendationOwnership,
  SyntheticRecommendationRefreshStatus,
  SyntheticRecommendationType,
} from "../types";

export type SyntheticRecommendationMemoryKey =
  | "revenue_recommendation"
  | "expense_recommendation"
  | "payroll_recommendation"
  | "workforce_recommendation"
  | "cash_recommendation"
  | "working_capital_recommendation"
  | "inventory_recommendation"
  | "procurement_recommendation"
  | "customer_recommendation"
  | "treasury_recommendation"
  | "tax_recommendation"
  | "healthcare_recommendation"
  | "manufacturing_recommendation"
  | "construction_recommendation"
  | "municipality_recommendation"
  | "strategic_recommendation";

export interface SyntheticRecommendationMemoryCandidate {
  candidateId: string;
  companyId: string;
  recommendationId: string;
  recommendationCategory: SyntheticRecommendationCategory;
  recommendationType: SyntheticRecommendationType;
  audience: SyntheticRecommendationAudience;
  memoryKey: SyntheticRecommendationMemoryKey;
  evidenceId: string;
  supportingCommentaryIds: string[];
  supportingObservationIds: string[];
  supportingPatternIds: string[];
  supportingMemoryIds: string[];
  supportingSourceReferenceIds: string[];
  supportingDriverIds: string[];
  supportingRiskIds: string[];
  confidenceScore: number;
  confidenceReason: string;
  evidenceStrength: SyntheticRecommendationEvidenceStrength;
  dataCompletenessScore: number;
  recommendationConfidence: number;
  materialityStatus: SyntheticRecommendationMaterialityStatus;
  impact: Partial<SyntheticRecommendationImpact>;
  effort: Partial<SyntheticRecommendationEffort>;
  ownership: SyntheticRecommendationOwnership[];
  dependencies: SyntheticStructuredRecommendationCandidate["dependencies"];
  conflicts: Partial<SyntheticRecommendationConflict>[];
  riskIndicators: SyntheticRecommendationCandidateRiskMetadata[];
  recommendationOutcomeStatus: SyntheticRecommendationOutcomeStatus | undefined;
  recommendationFollowed?: boolean;
  recommendationPartiallyFollowed?: boolean;
  recommendationNotFollowed?: boolean;
  expectedImpact: number | undefined;
  actualImpact: number | undefined;
  impactVariance: number | undefined;
  outcomeConfidence: number | undefined;
  recommendationPortfolioIds: string[];
  portfolioPriority: string | undefined;
  simulationEligible: boolean;
  simulationAssumptions: string[];
  simulationInputs: string[];
  simulationDependencies: string[];
  simulationConstraints: string[];
  governanceStatus: SyntheticRecommendationGovernanceStatus;
  refreshStatus: SyntheticRecommendationRefreshStatus;
  lineage: SyntheticRecommendationLineage;
}

export interface BuildRecommendationMemoryCandidateInput {
  companyId: string;
  candidate: SyntheticStructuredRecommendationCandidate | null;
}

export interface BuildRecommendationMemoryCandidateResult {
  candidate: SyntheticRecommendationMemoryCandidate | null;
  skipped: boolean;
  warnings: string[];
}

export const RECOMMENDATION_CATEGORY_MEMORY_KEY_MAP: Record<
  SyntheticRecommendationCategory,
  SyntheticRecommendationMemoryKey
> = {
  revenue: "revenue_recommendation",
  expense: "expense_recommendation",
  payroll: "payroll_recommendation",
  workforce: "workforce_recommendation",
  cash: "cash_recommendation",
  working_capital: "working_capital_recommendation",
  inventory: "inventory_recommendation",
  procurement: "procurement_recommendation",
  customer: "customer_recommendation",
  treasury: "treasury_recommendation",
  tax: "tax_recommendation",
  healthcare: "healthcare_recommendation",
  manufacturing: "manufacturing_recommendation",
  construction: "construction_recommendation",
  municipality: "municipality_recommendation",
  strategic: "strategic_recommendation",
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function hasSupportingEvidence(candidate: SyntheticStructuredRecommendationCandidate): boolean {
  return (
    candidate.supportingCommentaryIds.length > 0 ||
    candidate.supportingObservationIds.length > 0 ||
    candidate.supportingPatternIds.length > 0 ||
    candidate.supportingMemoryIds.length > 0 ||
    candidate.supportingSourceReferenceIds.length > 0 ||
    candidate.supportingDriverIds.length > 0 ||
    candidate.supportingRiskIds.length > 0
  );
}

function buildCandidateId(
  input: BuildRecommendationMemoryCandidateInput,
  candidate: SyntheticStructuredRecommendationCandidate,
): string {
  return `recommendation-memory-candidate:${stableSnapshotHash({
    companyId: input.companyId,
    recommendationId: candidate.recommendationId,
    recommendationCategory: candidate.recommendationCategory,
    recommendationType: candidate.recommendationType,
    audience: candidate.audience,
    evidenceId: candidate.evidenceId,
    supportingCommentaryIds: uniqueSorted(candidate.supportingCommentaryIds),
    supportingObservationIds: uniqueSorted(candidate.supportingObservationIds),
    supportingPatternIds: uniqueSorted(candidate.supportingPatternIds),
    supportingMemoryIds: uniqueSorted(candidate.supportingMemoryIds),
    supportingSourceReferenceIds: uniqueSorted(candidate.supportingSourceReferenceIds),
    supportingDriverIds: uniqueSorted(candidate.supportingDriverIds),
    supportingRiskIds: uniqueSorted(candidate.supportingRiskIds),
  })}`;
}

function validateInput(input: BuildRecommendationMemoryCandidateInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!input.candidate) {
    warnings.push("candidate is required.");
    return warnings;
  }
  if (input.candidate.companyId !== input.companyId) {
    warnings.push("candidate companyId must match input companyId.");
  }
  if (!hasValue(input.candidate.recommendationId)) warnings.push("recommendationId is required.");
  if (!hasValue(input.candidate.recommendationCategory)) warnings.push("recommendationCategory is required.");
  if (!hasValue(input.candidate.recommendationType)) warnings.push("recommendationType is required.");
  if (!hasValue(input.candidate.audience)) warnings.push("audience is required.");
  if (!hasValue(input.candidate.evidenceId)) warnings.push("evidenceId is required.");
  if (!hasSupportingEvidence(input.candidate)) warnings.push("supporting evidence references are required.");
  if (!input.candidate.supportingSourceReferenceIds?.length) warnings.push("source references are required.");
  if (!input.candidate.lineage) warnings.push("lineage is required.");
  if (!RECOMMENDATION_CATEGORY_MEMORY_KEY_MAP[input.candidate.recommendationCategory]) {
    warnings.push("recommendationCategory cannot be mapped to a Recommendation memory key.");
  }

  return warnings;
}

export function buildRecommendationMemoryCandidate(
  input: BuildRecommendationMemoryCandidateInput,
): BuildRecommendationMemoryCandidateResult {
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
      recommendationId: candidate.recommendationId,
      recommendationCategory: candidate.recommendationCategory,
      recommendationType: candidate.recommendationType,
      audience: candidate.audience,
      memoryKey: RECOMMENDATION_CATEGORY_MEMORY_KEY_MAP[candidate.recommendationCategory],
      evidenceId: candidate.evidenceId,
      supportingCommentaryIds: candidate.supportingCommentaryIds,
      supportingObservationIds: candidate.supportingObservationIds,
      supportingPatternIds: candidate.supportingPatternIds,
      supportingMemoryIds: candidate.supportingMemoryIds,
      supportingSourceReferenceIds: candidate.supportingSourceReferenceIds,
      supportingDriverIds: candidate.supportingDriverIds,
      supportingRiskIds: candidate.supportingRiskIds,
      confidenceScore: candidate.confidenceScore,
      confidenceReason: candidate.confidenceReason,
      evidenceStrength: candidate.evidenceStrength,
      dataCompletenessScore: candidate.dataCompletenessScore,
      recommendationConfidence: candidate.recommendationConfidence,
      materialityStatus: candidate.materialityStatus,
      impact: candidate.impact,
      effort: candidate.effort,
      ownership: candidate.ownership,
      dependencies: candidate.dependencies,
      conflicts: candidate.conflicts,
      riskIndicators: candidate.riskIndicators,
      recommendationOutcomeStatus: candidate.recommendationOutcomeStatus,
      recommendationFollowed: undefined,
      recommendationPartiallyFollowed: undefined,
      recommendationNotFollowed: undefined,
      expectedImpact: candidate.expectedImpact,
      actualImpact: candidate.actualImpact,
      impactVariance: candidate.impactVariance,
      outcomeConfidence: candidate.outcomeConfidence,
      recommendationPortfolioIds: candidate.recommendationPortfolioIds,
      portfolioPriority: candidate.portfolioPriority,
      simulationEligible: candidate.simulationEligible,
      simulationAssumptions: candidate.simulationAssumptions,
      simulationInputs: candidate.simulationInputs,
      simulationDependencies: candidate.simulationDependencies,
      simulationConstraints: candidate.simulationConstraints,
      governanceStatus: candidate.governanceStatus,
      refreshStatus: candidate.refreshStatus,
      lineage: {
        ...candidate.lineage,
        sourceReferenceIds: uniqueSorted([
          ...candidate.lineage.sourceReferenceIds,
          ...candidate.supportingSourceReferenceIds,
        ]),
        commentaryIds: uniqueSorted([...candidate.lineage.commentaryIds, ...candidate.supportingCommentaryIds]),
        observationIds: uniqueSorted([
          ...candidate.lineage.observationIds,
          ...candidate.supportingObservationIds,
        ]),
        patternIds: uniqueSorted([...candidate.lineage.patternIds, ...candidate.supportingPatternIds]),
        memoryIds: uniqueSorted([...candidate.lineage.memoryIds, ...candidate.supportingMemoryIds]),
        driverReferenceIds: uniqueSorted([
          ...candidate.lineage.driverReferenceIds,
          ...candidate.supportingDriverIds,
        ]),
      },
    },
    skipped: false,
    warnings: [],
  };
}
