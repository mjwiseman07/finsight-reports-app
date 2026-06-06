import { stableSnapshotHash } from "../../historical-snapshots";
import {
  SYNTHETIC_RECOMMENDATION_AUDIENCES,
  SYNTHETIC_RECOMMENDATION_CATEGORIES,
  SYNTHETIC_RECOMMENDATION_TYPES,
} from "../constants";
import type {
  SyntheticRecommendationAudience,
  SyntheticRecommendationCategory,
  SyntheticRecommendationEvidenceStrength,
  SyntheticRecommendationGovernanceStatus,
  SyntheticRecommendationLineage,
  SyntheticRecommendationMaterialityStatus,
  SyntheticRecommendationOutcomeStatus,
  SyntheticRecommendationRefreshStatus,
  SyntheticRecommendationType,
} from "../types";

export interface SyntheticRecommendationCommentaryReference {
  commentaryId: string;
  commentaryCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticRecommendationObservationReference {
  observationId: string;
  observationType?: string;
  sourceModule: "fte_analytics" | "flux_analysis" | "future_operational_intelligence";
  sourceReferenceIds: string[];
}

export interface SyntheticRecommendationPatternReference {
  patternId: string;
  patternType?: string;
  sourceModule: "fte_analytics" | "flux_analysis" | "future_operational_intelligence";
  sourceReferenceIds: string[];
}

export interface SyntheticRecommendationMemoryReference {
  memoryId: string;
  memoryKey?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticRecommendationSourceReference {
  sourceId: string;
  sourceType:
    | "company_memory"
    | "commentary"
    | "fte_observation"
    | "fte_pattern"
    | "flux_observation"
    | "flux_pattern"
    | "risk_signal"
    | "benchmark"
    | "regulatory_context";
  sourceSystem: string;
  sourceRecordId?: string;
  sourcePeriod?: string;
  tenantId?: string;
}

export interface SyntheticRecommendationDriverReference {
  driverReferenceId: string;
  driverCategory: string;
  sourceReferenceIds: string[];
}

export interface SyntheticRecommendationRiskReference {
  riskId: string;
  riskCategory: string;
  sourceReferenceIds: string[];
}

export interface SyntheticRecommendationEvidencePackage {
  evidenceId: string;
  companyId: string;
  recommendationCategory: SyntheticRecommendationCategory;
  recommendationType: SyntheticRecommendationType;
  audience: SyntheticRecommendationAudience;
  commentaryReferences: SyntheticRecommendationCommentaryReference[];
  observationReferences: SyntheticRecommendationObservationReference[];
  patternReferences: SyntheticRecommendationPatternReference[];
  memoryReferences: SyntheticRecommendationMemoryReference[];
  sourceReferences: SyntheticRecommendationSourceReference[];
  driverReferences: SyntheticRecommendationDriverReference[];
  riskReferences: SyntheticRecommendationRiskReference[];
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
  lineage: SyntheticRecommendationLineage;
  governanceStatus: SyntheticRecommendationGovernanceStatus;
  refreshStatus: SyntheticRecommendationRefreshStatus;
  missingDataFlags: string[];
  recommendationOutcomeStatus?: SyntheticRecommendationOutcomeStatus;
  expectedImpact?: number;
  actualImpact?: number;
  impactVariance?: number;
  outcomeConfidence?: number;
  recommendationPortfolioIds: string[];
  portfolioPriority?: string;
  simulationEligible: boolean;
  simulationAssumptions: string[];
  simulationInputs: string[];
}

export interface BuildRecommendationEvidenceInput {
  companyId: string;
  recommendationCategory: SyntheticRecommendationCategory;
  recommendationType: SyntheticRecommendationType;
  audience: SyntheticRecommendationAudience;
  commentaryReferences?: SyntheticRecommendationCommentaryReference[];
  observationReferences?: SyntheticRecommendationObservationReference[];
  patternReferences?: SyntheticRecommendationPatternReference[];
  memoryReferences?: SyntheticRecommendationMemoryReference[];
  sourceReferences?: SyntheticRecommendationSourceReference[];
  driverReferences?: SyntheticRecommendationDriverReference[];
  riskReferences?: SyntheticRecommendationRiskReference[];
  confidenceScore: number;
  confidenceReason: string;
  evidenceStrength: SyntheticRecommendationEvidenceStrength;
  dataCompletenessScore: number;
  recommendationConfidence: number;
  materialityStatus: SyntheticRecommendationMaterialityStatus;
  lineage: SyntheticRecommendationLineage;
  governanceStatus: SyntheticRecommendationGovernanceStatus;
  refreshStatus: SyntheticRecommendationRefreshStatus;
  missingDataFlags?: string[];
  recommendationOutcomeStatus?: SyntheticRecommendationOutcomeStatus;
  expectedImpact?: number;
  actualImpact?: number;
  impactVariance?: number;
  outcomeConfidence?: number;
  recommendationPortfolioIds?: string[];
  portfolioPriority?: string;
  simulationEligible?: boolean;
  simulationAssumptions?: string[];
  simulationInputs?: string[];
}

export interface BuildRecommendationEvidenceResult {
  evidencePackage: SyntheticRecommendationEvidencePackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function getCommentaryIds(input: BuildRecommendationEvidenceInput): string[] {
  return uniqueSorted((input.commentaryReferences ?? []).map((reference) => reference.commentaryId));
}

function getObservationIds(input: BuildRecommendationEvidenceInput): string[] {
  return uniqueSorted((input.observationReferences ?? []).map((reference) => reference.observationId));
}

function getPatternIds(input: BuildRecommendationEvidenceInput): string[] {
  return uniqueSorted((input.patternReferences ?? []).map((reference) => reference.patternId));
}

function getMemoryIds(input: BuildRecommendationEvidenceInput): string[] {
  return uniqueSorted((input.memoryReferences ?? []).map((reference) => reference.memoryId));
}

function getSourceReferenceIds(input: BuildRecommendationEvidenceInput): string[] {
  return uniqueSorted((input.sourceReferences ?? []).map((reference) => reference.sourceId));
}

function getDriverIds(input: BuildRecommendationEvidenceInput): string[] {
  return uniqueSorted((input.driverReferences ?? []).map((reference) => reference.driverReferenceId));
}

function getRiskIds(input: BuildRecommendationEvidenceInput): string[] {
  return uniqueSorted((input.riskReferences ?? []).map((reference) => reference.riskId));
}

function hasSupportingEvidence(input: BuildRecommendationEvidenceInput): boolean {
  return (
    getCommentaryIds(input).length > 0 ||
    getObservationIds(input).length > 0 ||
    getPatternIds(input).length > 0 ||
    getMemoryIds(input).length > 0 ||
    getSourceReferenceIds(input).length > 0 ||
    getDriverIds(input).length > 0 ||
    getRiskIds(input).length > 0
  );
}

function buildEvidenceId(input: BuildRecommendationEvidenceInput): string {
  return `recommendation-evidence:${stableSnapshotHash({
    companyId: input.companyId,
    recommendationCategory: input.recommendationCategory,
    recommendationType: input.recommendationType,
    audience: input.audience,
    commentaryIds: getCommentaryIds(input),
    observationIds: getObservationIds(input),
    patternIds: getPatternIds(input),
    memoryIds: getMemoryIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    driverIds: getDriverIds(input),
    riskIds: getRiskIds(input),
  })}`;
}

function validateInput(input: BuildRecommendationEvidenceInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!SYNTHETIC_RECOMMENDATION_CATEGORIES.includes(input.recommendationCategory)) {
    warnings.push("recommendationCategory is not supported.");
  }
  if (!SYNTHETIC_RECOMMENDATION_TYPES.includes(input.recommendationType)) {
    warnings.push("recommendationType is not supported.");
  }
  if (!SYNTHETIC_RECOMMENDATION_AUDIENCES.includes(input.audience)) {
    warnings.push("audience is not supported.");
  }
  if (!hasSupportingEvidence(input)) {
    warnings.push("at least one supporting commentary, observation, pattern, memory, source, driver, or risk reference is required.");
  }
  if (typeof input.confidenceScore !== "number" || Number.isNaN(input.confidenceScore)) {
    warnings.push("confidenceScore must be a number.");
  }
  if (!hasValue(input.confidenceReason)) warnings.push("confidenceReason is required.");
  if (typeof input.dataCompletenessScore !== "number" || Number.isNaN(input.dataCompletenessScore)) {
    warnings.push("dataCompletenessScore must be a number.");
  }
  if (
    typeof input.recommendationConfidence !== "number" ||
    Number.isNaN(input.recommendationConfidence)
  ) {
    warnings.push("recommendationConfidence must be a number.");
  }
  if (!input.lineage) warnings.push("lineage is required.");
  if (!hasValue(input.governanceStatus)) warnings.push("governanceStatus is required.");
  if (!hasValue(input.refreshStatus)) warnings.push("refreshStatus is required.");

  return warnings;
}

export function buildRecommendationEvidence(
  input: BuildRecommendationEvidenceInput,
): BuildRecommendationEvidenceResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      evidencePackage: null,
      skipped: true,
      warnings,
    };
  }

  const supportingCommentaryIds = getCommentaryIds(input);
  const supportingObservationIds = getObservationIds(input);
  const supportingPatternIds = getPatternIds(input);
  const supportingMemoryIds = getMemoryIds(input);
  const supportingSourceReferenceIds = getSourceReferenceIds(input);
  const supportingDriverIds = getDriverIds(input);
  const supportingRiskIds = getRiskIds(input);

  return {
    evidencePackage: {
      evidenceId: buildEvidenceId(input),
      companyId: input.companyId,
      recommendationCategory: input.recommendationCategory,
      recommendationType: input.recommendationType,
      audience: input.audience,
      commentaryReferences: input.commentaryReferences ?? [],
      observationReferences: input.observationReferences ?? [],
      patternReferences: input.patternReferences ?? [],
      memoryReferences: input.memoryReferences ?? [],
      sourceReferences: input.sourceReferences ?? [],
      driverReferences: input.driverReferences ?? [],
      riskReferences: input.riskReferences ?? [],
      supportingCommentaryIds,
      supportingObservationIds,
      supportingPatternIds,
      supportingMemoryIds,
      supportingSourceReferenceIds,
      supportingDriverIds,
      supportingRiskIds,
      confidenceScore: input.confidenceScore,
      confidenceReason: input.confidenceReason,
      evidenceStrength: input.evidenceStrength,
      dataCompletenessScore: input.dataCompletenessScore,
      recommendationConfidence: input.recommendationConfidence,
      materialityStatus: input.materialityStatus,
      lineage: {
        ...input.lineage,
        commentaryIds: uniqueSorted([...input.lineage.commentaryIds, ...supportingCommentaryIds]),
        observationIds: uniqueSorted([...input.lineage.observationIds, ...supportingObservationIds]),
        patternIds: uniqueSorted([...input.lineage.patternIds, ...supportingPatternIds]),
        memoryIds: uniqueSorted([...input.lineage.memoryIds, ...supportingMemoryIds]),
        sourceReferenceIds: uniqueSorted([
          ...input.lineage.sourceReferenceIds,
          ...supportingSourceReferenceIds,
        ]),
        driverReferenceIds: uniqueSorted([...input.lineage.driverReferenceIds, ...supportingDriverIds]),
      },
      governanceStatus: input.governanceStatus,
      refreshStatus: input.refreshStatus,
      missingDataFlags: input.missingDataFlags ?? [],
      recommendationOutcomeStatus: input.recommendationOutcomeStatus,
      expectedImpact: input.expectedImpact,
      actualImpact: input.actualImpact,
      impactVariance: input.impactVariance,
      outcomeConfidence: input.outcomeConfidence,
      recommendationPortfolioIds: input.recommendationPortfolioIds ?? [],
      portfolioPriority: input.portfolioPriority,
      simulationEligible: input.simulationEligible ?? false,
      simulationAssumptions: input.simulationAssumptions ?? [],
      simulationInputs: input.simulationInputs ?? [],
    },
    skipped: false,
    warnings: [],
  };
}
