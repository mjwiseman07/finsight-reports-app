import { stableSnapshotHash } from "../../historical-snapshots";
import {
  SYNTHETIC_FORECAST_CATEGORIES,
  SYNTHETIC_FORECAST_EVIDENCE_STRENGTHS,
  SYNTHETIC_FORECAST_GRANULARITY_LEVELS,
  SYNTHETIC_FORECAST_HORIZONS,
  SYNTHETIC_FORECAST_METHODOLOGIES,
  SYNTHETIC_FORECAST_SOURCES,
} from "../constants";
import type {
  SyntheticForecastBiasDirection,
  SyntheticForecastCategory,
  SyntheticForecastEvidenceStrength,
  SyntheticForecastGranularityLevel,
  SyntheticForecastHorizon,
  SyntheticForecastLineage,
  SyntheticForecastMethodologyType,
  SyntheticForecastReviewStatus,
  SyntheticForecastApprovalStatus,
  SyntheticForecastSource,
} from "../types";

export type SyntheticForecastGovernanceStatus =
  | "candidate"
  | "under_review"
  | "approved"
  | "rejected"
  | "retired";

export type SyntheticForecastRefreshStatus =
  | "current"
  | "stale"
  | "needs_review"
  | "needs_reprocessing"
  | "superseded_by_new_data"
  | "superseded_by_new_rule";

export interface SyntheticForecastMemoryReference {
  memoryId: string;
  memoryKey?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticForecastFteObservationReference {
  observationId: string;
  observationType?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticForecastFtePatternReference {
  patternId: string;
  patternType?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticForecastFluxObservationReference {
  observationId: string;
  observationType?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticForecastFluxPatternReference {
  patternId: string;
  patternType?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticForecastCommentaryReference {
  commentaryId: string;
  commentaryCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticForecastRecommendationReference {
  recommendationId: string;
  recommendationCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticForecastRecommendationOutcomeReference {
  recommendationOutcomeId: string;
  recommendationId?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticForecastRiskReference {
  riskId: string;
  riskCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticForecastSourceReference {
  sourceId: string;
  sourceType:
    | "company_memory"
    | "fte_observation"
    | "fte_pattern"
    | "flux_observation"
    | "flux_pattern"
    | "commentary"
    | "recommendation"
    | "recommendation_outcome"
    | "risk_signal"
    | "source_reference"
    | "driver_reference"
    | "assumption_reference";
  sourceSystem: string;
  sourceRecordId?: string;
  sourcePeriod?: string;
  tenantId?: string;
}

export interface SyntheticForecastDriverReference {
  driverId: string;
  driverCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticForecastAssumptionReference {
  assumptionId: string;
  assumptionCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticForecastEvidencePriorityItem {
  priorityRank: number;
  evidenceType:
    | "company_memory"
    | "commentary_candidate"
    | "recommendation_candidate"
    | "recommendation_outcome"
    | "flux_pattern"
    | "fte_pattern"
    | "flux_observation"
    | "fte_observation"
    | "risk_signal"
    | "source_reference"
    | "assumption"
    | "driver";
  supportingIds: string[];
}

export interface SyntheticForecastEvidencePackage {
  evidenceId: string;
  companyId: string;
  forecastCategory: SyntheticForecastCategory;
  forecastHorizon: SyntheticForecastHorizon;
  forecastMethodology: SyntheticForecastMethodologyType;
  forecastGranularity: SyntheticForecastGranularityLevel;
  forecastSource: SyntheticForecastSource;
  memoryReferences: SyntheticForecastMemoryReference[];
  fteObservationReferences: SyntheticForecastFteObservationReference[];
  ftePatternReferences: SyntheticForecastFtePatternReference[];
  fluxObservationReferences: SyntheticForecastFluxObservationReference[];
  fluxPatternReferences: SyntheticForecastFluxPatternReference[];
  commentaryReferences: SyntheticForecastCommentaryReference[];
  recommendationReferences: SyntheticForecastRecommendationReference[];
  recommendationOutcomeReferences: SyntheticForecastRecommendationOutcomeReference[];
  riskReferences: SyntheticForecastRiskReference[];
  sourceReferences: SyntheticForecastSourceReference[];
  driverReferences: SyntheticForecastDriverReference[];
  assumptionReferences: SyntheticForecastAssumptionReference[];
  supportingMemoryIds: string[];
  supportingFteObservationIds: string[];
  supportingFtePatternIds: string[];
  supportingFluxObservationIds: string[];
  supportingFluxPatternIds: string[];
  supportingCommentaryIds: string[];
  supportingRecommendationIds: string[];
  supportingRecommendationOutcomeIds: string[];
  supportingRiskIds: string[];
  supportingSourceReferenceIds: string[];
  supportingDriverIds: string[];
  supportingAssumptionIds: string[];
  evidencePriority: SyntheticForecastEvidencePriorityItem[];
  confidenceScore: number;
  confidenceReason: string;
  forecastConfidence?: number;
  evidenceStrength: SyntheticForecastEvidenceStrength;
  dataCompletenessScore: number;
  historicalStabilityScore?: number;
  forecastRiskScore?: number;
  lineage: SyntheticForecastLineage;
  governanceStatus: SyntheticForecastGovernanceStatus;
  refreshStatus: SyntheticForecastRefreshStatus;
  missingDataFlags: string[];
  forecastAccuracyScore?: number;
  forecastReliabilityScore?: number;
  forecastVersion?: string;
  forecastConsensus?: string;
  sensitivityScore?: number;
  forecastBiasDirection?: SyntheticForecastBiasDirection;
  seasonalityFactor?: number;
  macroeconomicIndicatorIds: string[];
  forecastReviewStatus?: SyntheticForecastReviewStatus;
  forecastApprovalStatus?: SyntheticForecastApprovalStatus;
  forecastSourceLevel?: SyntheticForecastGranularityLevel;
  forecastRollupLevel?: SyntheticForecastGranularityLevel;
  forecastLineage: string[];
  methodologyId?: string;
  methodologyCategory?: SyntheticForecastMethodologyType;
  methodologyConfidence?: number;
  methodologyReason?: string;
  methodologyLineage: string[];
}

export interface BuildForecastEvidenceInput {
  companyId: string;
  forecastCategory: SyntheticForecastCategory;
  forecastHorizon: SyntheticForecastHorizon;
  forecastMethodology: SyntheticForecastMethodologyType;
  forecastGranularity: SyntheticForecastGranularityLevel;
  forecastSource: SyntheticForecastSource;
  memoryReferences?: SyntheticForecastMemoryReference[];
  fteObservationReferences?: SyntheticForecastFteObservationReference[];
  ftePatternReferences?: SyntheticForecastFtePatternReference[];
  fluxObservationReferences?: SyntheticForecastFluxObservationReference[];
  fluxPatternReferences?: SyntheticForecastFluxPatternReference[];
  commentaryReferences?: SyntheticForecastCommentaryReference[];
  recommendationReferences?: SyntheticForecastRecommendationReference[];
  recommendationOutcomeReferences?: SyntheticForecastRecommendationOutcomeReference[];
  riskReferences?: SyntheticForecastRiskReference[];
  sourceReferences?: SyntheticForecastSourceReference[];
  driverReferences?: SyntheticForecastDriverReference[];
  assumptionReferences?: SyntheticForecastAssumptionReference[];
  confidenceScore: number;
  confidenceReason?: string;
  forecastConfidence?: number;
  evidenceStrength: SyntheticForecastEvidenceStrength;
  dataCompletenessScore: number;
  historicalStabilityScore?: number;
  forecastRiskScore?: number;
  lineage: SyntheticForecastLineage;
  governanceStatus: SyntheticForecastGovernanceStatus;
  refreshStatus: SyntheticForecastRefreshStatus;
  missingDataFlags?: string[];
  forecastAccuracyScore?: number;
  forecastReliabilityScore?: number;
  forecastVersion?: string;
  forecastConsensus?: string;
  sensitivityScore?: number;
  forecastBiasDirection?: SyntheticForecastBiasDirection;
  seasonalityFactor?: number;
  macroeconomicIndicatorIds?: string[];
  forecastReviewStatus?: SyntheticForecastReviewStatus;
  forecastApprovalStatus?: SyntheticForecastApprovalStatus;
  forecastSourceLevel?: SyntheticForecastGranularityLevel;
  forecastRollupLevel?: SyntheticForecastGranularityLevel;
  forecastLineage?: string[];
  methodologyId?: string;
  methodologyCategory?: SyntheticForecastMethodologyType;
  methodologyConfidence?: number;
  methodologyReason?: string;
  methodologyLineage?: string[];
}

export interface BuildForecastEvidenceResult {
  evidencePackage: SyntheticForecastEvidencePackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function getMemoryIds(input: BuildForecastEvidenceInput): string[] {
  return uniqueSorted((input.memoryReferences ?? []).map((reference) => reference.memoryId));
}

function getFteObservationIds(input: BuildForecastEvidenceInput): string[] {
  return uniqueSorted((input.fteObservationReferences ?? []).map((reference) => reference.observationId));
}

function getFtePatternIds(input: BuildForecastEvidenceInput): string[] {
  return uniqueSorted((input.ftePatternReferences ?? []).map((reference) => reference.patternId));
}

function getFluxObservationIds(input: BuildForecastEvidenceInput): string[] {
  return uniqueSorted((input.fluxObservationReferences ?? []).map((reference) => reference.observationId));
}

function getFluxPatternIds(input: BuildForecastEvidenceInput): string[] {
  return uniqueSorted((input.fluxPatternReferences ?? []).map((reference) => reference.patternId));
}

function getCommentaryIds(input: BuildForecastEvidenceInput): string[] {
  return uniqueSorted((input.commentaryReferences ?? []).map((reference) => reference.commentaryId));
}

function getRecommendationIds(input: BuildForecastEvidenceInput): string[] {
  return uniqueSorted((input.recommendationReferences ?? []).map((reference) => reference.recommendationId));
}

function getRecommendationOutcomeIds(input: BuildForecastEvidenceInput): string[] {
  return uniqueSorted(
    (input.recommendationOutcomeReferences ?? []).map((reference) => reference.recommendationOutcomeId),
  );
}

function getRiskIds(input: BuildForecastEvidenceInput): string[] {
  return uniqueSorted((input.riskReferences ?? []).map((reference) => reference.riskId));
}

function getSourceReferenceIds(input: BuildForecastEvidenceInput): string[] {
  return uniqueSorted((input.sourceReferences ?? []).map((reference) => reference.sourceId));
}

function getDriverIds(input: BuildForecastEvidenceInput): string[] {
  return uniqueSorted((input.driverReferences ?? []).map((reference) => reference.driverId));
}

function getAssumptionIds(input: BuildForecastEvidenceInput): string[] {
  return uniqueSorted((input.assumptionReferences ?? []).map((reference) => reference.assumptionId));
}

function getAllSupportingReferenceIds(input: BuildForecastEvidenceInput): string[] {
  return uniqueSorted([
    ...getMemoryIds(input),
    ...getFteObservationIds(input),
    ...getFtePatternIds(input),
    ...getFluxObservationIds(input),
    ...getFluxPatternIds(input),
    ...getCommentaryIds(input),
    ...getRecommendationIds(input),
    ...getRecommendationOutcomeIds(input),
    ...getRiskIds(input),
    ...getSourceReferenceIds(input),
    ...getDriverIds(input),
    ...getAssumptionIds(input),
  ]);
}

function buildEvidenceId(input: BuildForecastEvidenceInput): string {
  return `forecast-evidence:${stableSnapshotHash({
    companyId: input.companyId,
    forecastCategory: input.forecastCategory,
    forecastHorizon: input.forecastHorizon,
    forecastMethodology: input.forecastMethodology,
    forecastGranularity: input.forecastGranularity,
    forecastSource: input.forecastSource,
    supportingReferenceIds: getAllSupportingReferenceIds(input),
  })}`;
}

function buildEvidencePriority(input: BuildForecastEvidenceInput): SyntheticForecastEvidencePriorityItem[] {
  return [
    { priorityRank: 1, evidenceType: "company_memory", supportingIds: getMemoryIds(input) },
    { priorityRank: 2, evidenceType: "commentary_candidate", supportingIds: getCommentaryIds(input) },
    { priorityRank: 3, evidenceType: "recommendation_candidate", supportingIds: getRecommendationIds(input) },
    { priorityRank: 4, evidenceType: "recommendation_outcome", supportingIds: getRecommendationOutcomeIds(input) },
    { priorityRank: 5, evidenceType: "flux_pattern", supportingIds: getFluxPatternIds(input) },
    { priorityRank: 6, evidenceType: "fte_pattern", supportingIds: getFtePatternIds(input) },
    { priorityRank: 7, evidenceType: "flux_observation", supportingIds: getFluxObservationIds(input) },
    { priorityRank: 8, evidenceType: "fte_observation", supportingIds: getFteObservationIds(input) },
    { priorityRank: 9, evidenceType: "risk_signal", supportingIds: getRiskIds(input) },
    { priorityRank: 10, evidenceType: "source_reference", supportingIds: getSourceReferenceIds(input) },
    { priorityRank: 11, evidenceType: "assumption", supportingIds: getAssumptionIds(input) },
    { priorityRank: 12, evidenceType: "driver", supportingIds: getDriverIds(input) },
  ];
}

function validateInput(input: BuildForecastEvidenceInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!SYNTHETIC_FORECAST_CATEGORIES.includes(input.forecastCategory)) {
    warnings.push("forecastCategory is not supported.");
  }
  if (!SYNTHETIC_FORECAST_HORIZONS.includes(input.forecastHorizon)) {
    warnings.push("forecastHorizon is not supported.");
  }
  if (!SYNTHETIC_FORECAST_METHODOLOGIES.includes(input.forecastMethodology)) {
    warnings.push("forecastMethodology is not supported.");
  }
  if (!SYNTHETIC_FORECAST_GRANULARITY_LEVELS.includes(input.forecastGranularity)) {
    warnings.push("forecastGranularity is not supported.");
  }
  if (!SYNTHETIC_FORECAST_SOURCES.includes(input.forecastSource)) {
    warnings.push("forecastSource is not supported.");
  }
  if (getAllSupportingReferenceIds(input).length === 0) {
    warnings.push("at least one supporting reference ID is required.");
  }
  if (typeof input.confidenceScore !== "number" || Number.isNaN(input.confidenceScore)) {
    warnings.push("confidenceScore must be a number.");
  }
  if (!SYNTHETIC_FORECAST_EVIDENCE_STRENGTHS.includes(input.evidenceStrength)) {
    warnings.push("evidenceStrength is not supported.");
  }
  if (typeof input.dataCompletenessScore !== "number" || Number.isNaN(input.dataCompletenessScore)) {
    warnings.push("dataCompletenessScore must be a number.");
  }
  if (!input.lineage) warnings.push("lineage is required.");
  if (!hasValue(input.governanceStatus)) warnings.push("governanceStatus is required.");
  if (!hasValue(input.refreshStatus)) warnings.push("refreshStatus is required.");

  return warnings;
}

export function buildForecastEvidence(input: BuildForecastEvidenceInput): BuildForecastEvidenceResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      evidencePackage: null,
      skipped: true,
      warnings,
    };
  }

  const supportingMemoryIds = getMemoryIds(input);
  const supportingFteObservationIds = getFteObservationIds(input);
  const supportingFtePatternIds = getFtePatternIds(input);
  const supportingFluxObservationIds = getFluxObservationIds(input);
  const supportingFluxPatternIds = getFluxPatternIds(input);
  const supportingCommentaryIds = getCommentaryIds(input);
  const supportingRecommendationIds = getRecommendationIds(input);
  const supportingRecommendationOutcomeIds = getRecommendationOutcomeIds(input);
  const supportingRiskIds = getRiskIds(input);
  const supportingSourceReferenceIds = getSourceReferenceIds(input);
  const supportingDriverIds = getDriverIds(input);
  const supportingAssumptionIds = getAssumptionIds(input);

  return {
    evidencePackage: {
      evidenceId: buildEvidenceId(input),
      companyId: input.companyId,
      forecastCategory: input.forecastCategory,
      forecastHorizon: input.forecastHorizon,
      forecastMethodology: input.forecastMethodology,
      forecastGranularity: input.forecastGranularity,
      forecastSource: input.forecastSource,
      memoryReferences: input.memoryReferences ?? [],
      fteObservationReferences: input.fteObservationReferences ?? [],
      ftePatternReferences: input.ftePatternReferences ?? [],
      fluxObservationReferences: input.fluxObservationReferences ?? [],
      fluxPatternReferences: input.fluxPatternReferences ?? [],
      commentaryReferences: input.commentaryReferences ?? [],
      recommendationReferences: input.recommendationReferences ?? [],
      recommendationOutcomeReferences: input.recommendationOutcomeReferences ?? [],
      riskReferences: input.riskReferences ?? [],
      sourceReferences: input.sourceReferences ?? [],
      driverReferences: input.driverReferences ?? [],
      assumptionReferences: input.assumptionReferences ?? [],
      supportingMemoryIds,
      supportingFteObservationIds,
      supportingFtePatternIds,
      supportingFluxObservationIds,
      supportingFluxPatternIds,
      supportingCommentaryIds,
      supportingRecommendationIds,
      supportingRecommendationOutcomeIds,
      supportingRiskIds,
      supportingSourceReferenceIds,
      supportingDriverIds,
      supportingAssumptionIds,
      evidencePriority: buildEvidencePriority(input),
      confidenceScore: input.confidenceScore,
      confidenceReason: input.confidenceReason ?? "",
      forecastConfidence: input.forecastConfidence,
      evidenceStrength: input.evidenceStrength,
      dataCompletenessScore: input.dataCompletenessScore,
      historicalStabilityScore: input.historicalStabilityScore,
      forecastRiskScore: input.forecastRiskScore,
      lineage: {
        ...input.lineage,
        sourceReferenceIds: uniqueSorted([...input.lineage.sourceReferenceIds, ...supportingSourceReferenceIds]),
        assumptionIds: uniqueSorted([...input.lineage.assumptionIds, ...supportingAssumptionIds]),
        driverIds: uniqueSorted([...input.lineage.driverIds, ...supportingDriverIds]),
        recommendationIds: uniqueSorted([...input.lineage.recommendationIds, ...supportingRecommendationIds]),
        riskIds: uniqueSorted([...input.lineage.riskIds, ...supportingRiskIds]),
      },
      governanceStatus: input.governanceStatus,
      refreshStatus: input.refreshStatus,
      missingDataFlags: input.missingDataFlags ?? [],
      forecastAccuracyScore: input.forecastAccuracyScore,
      forecastReliabilityScore: input.forecastReliabilityScore,
      forecastVersion: input.forecastVersion,
      forecastConsensus: input.forecastConsensus,
      sensitivityScore: input.sensitivityScore,
      forecastBiasDirection: input.forecastBiasDirection,
      seasonalityFactor: input.seasonalityFactor,
      macroeconomicIndicatorIds: input.macroeconomicIndicatorIds ?? [],
      forecastReviewStatus: input.forecastReviewStatus,
      forecastApprovalStatus: input.forecastApprovalStatus,
      forecastSourceLevel: input.forecastSourceLevel,
      forecastRollupLevel: input.forecastRollupLevel,
      forecastLineage: input.forecastLineage ?? [],
      methodologyId: input.methodologyId,
      methodologyCategory: input.methodologyCategory,
      methodologyConfidence: input.methodologyConfidence,
      methodologyReason: input.methodologyReason,
      methodologyLineage: input.methodologyLineage ?? [],
    },
    skipped: false,
    warnings: [],
  };
}
