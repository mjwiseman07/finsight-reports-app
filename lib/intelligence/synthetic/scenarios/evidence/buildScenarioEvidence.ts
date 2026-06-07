import { stableSnapshotHash } from "../../historical-snapshots";
import {
  SYNTHETIC_SCENARIO_CATEGORIES,
  SYNTHETIC_SCENARIO_EVIDENCE_STRENGTHS,
  SYNTHETIC_SCENARIO_GRANULARITY_LEVELS,
  SYNTHETIC_SCENARIO_HORIZONS,
  SYNTHETIC_SCENARIO_METHODOLOGIES,
  SYNTHETIC_SCENARIO_TYPES,
} from "../constants";
import type {
  SyntheticScenarioCategory,
  SyntheticScenarioEvidenceStrength,
  SyntheticScenarioGranularity,
  SyntheticScenarioHorizon,
  SyntheticScenarioLineage,
  SyntheticScenarioMethodologyType,
  SyntheticScenarioType,
} from "../types";

export type SyntheticScenarioGovernanceStatus =
  | "candidate"
  | "under_review"
  | "approved"
  | "rejected"
  | "retired";

export type SyntheticScenarioRefreshStatus =
  | "current"
  | "stale"
  | "needs_review"
  | "needs_reprocessing"
  | "superseded_by_new_data"
  | "superseded_by_new_rule";

export interface SyntheticScenarioMemoryReference {
  memoryId: string;
  memoryKey?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioForecastReference {
  forecastId: string;
  forecastCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioRecommendationReference {
  recommendationId: string;
  recommendationCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioCommentaryReference {
  commentaryId: string;
  commentaryCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioFteObservationReference {
  observationId: string;
  observationType?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioFtePatternReference {
  patternId: string;
  patternType?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioFluxObservationReference {
  observationId: string;
  observationType?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioFluxPatternReference {
  patternId: string;
  patternType?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioRiskReference {
  riskId: string;
  riskCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioSourceReference {
  sourceId: string;
  sourceType:
    | "company_memory"
    | "forecast"
    | "recommendation"
    | "commentary"
    | "fte_observation"
    | "fte_pattern"
    | "flux_observation"
    | "flux_pattern"
    | "risk_signal"
    | "source_reference"
    | "driver_reference"
    | "assumption_reference"
    | "constraint_reference"
    | "dependency_reference"
    | "trigger_event_reference"
    | "historical_outcome"
    | "organizational_behavior";
  sourceSystem: string;
  sourceRecordId?: string;
  sourcePeriod?: string;
  tenantId?: string;
}

export interface SyntheticScenarioDriverReference {
  driverId: string;
  driverCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioAssumptionReference {
  assumptionId: string;
  assumptionCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioConstraintReference {
  constraintId: string;
  constraintCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioDependencyReference {
  dependencyId: string;
  dependencyCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioTriggerEventReference {
  triggerEventId: string;
  triggerEventCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioHistoricalOutcomeReference {
  historicalOutcomeId: string;
  historicalScenarioId?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioOrganizationalBehaviorReference {
  behaviorPatternId: string;
  behaviorPatternCategory?: string;
  sourceReferenceIds: string[];
}

export interface SyntheticScenarioEvidencePriorityItem {
  priorityRank: number;
  evidenceType:
    | "company_memory"
    | "forecast_reference"
    | "recommendation_reference"
    | "commentary_reference"
    | "historical_outcome"
    | "organizational_behavior"
    | "constraint"
    | "dependency"
    | "trigger_event"
    | "risk_signal"
    | "flux_pattern"
    | "fte_pattern"
    | "flux_observation"
    | "fte_observation"
    | "assumption"
    | "driver"
    | "source_reference";
  supportingIds: string[];
}

export interface SyntheticScenarioEvidencePackage {
  evidenceId: string;
  companyId: string;
  scenarioCategory: SyntheticScenarioCategory;
  scenarioType: SyntheticScenarioType;
  scenarioHorizon: SyntheticScenarioHorizon;
  scenarioGranularity: SyntheticScenarioGranularity;
  scenarioMethodology: SyntheticScenarioMethodologyType;
  memoryReferences: SyntheticScenarioMemoryReference[];
  forecastReferences: SyntheticScenarioForecastReference[];
  recommendationReferences: SyntheticScenarioRecommendationReference[];
  commentaryReferences: SyntheticScenarioCommentaryReference[];
  fteObservationReferences: SyntheticScenarioFteObservationReference[];
  ftePatternReferences: SyntheticScenarioFtePatternReference[];
  fluxObservationReferences: SyntheticScenarioFluxObservationReference[];
  fluxPatternReferences: SyntheticScenarioFluxPatternReference[];
  riskReferences: SyntheticScenarioRiskReference[];
  sourceReferences: SyntheticScenarioSourceReference[];
  driverReferences: SyntheticScenarioDriverReference[];
  assumptionReferences: SyntheticScenarioAssumptionReference[];
  constraintReferences: SyntheticScenarioConstraintReference[];
  dependencyReferences: SyntheticScenarioDependencyReference[];
  triggerEventReferences: SyntheticScenarioTriggerEventReference[];
  historicalOutcomeReferences: SyntheticScenarioHistoricalOutcomeReference[];
  organizationalBehaviorReferences: SyntheticScenarioOrganizationalBehaviorReference[];
  supportingMemoryIds: string[];
  supportingForecastIds: string[];
  supportingRecommendationIds: string[];
  supportingCommentaryIds: string[];
  supportingFteObservationIds: string[];
  supportingFtePatternIds: string[];
  supportingFluxObservationIds: string[];
  supportingFluxPatternIds: string[];
  supportingRiskIds: string[];
  supportingSourceReferenceIds: string[];
  supportingDriverIds: string[];
  supportingAssumptionIds: string[];
  supportingConstraintIds: string[];
  supportingDependencyIds: string[];
  supportingTriggerEventIds: string[];
  supportingHistoricalOutcomeIds: string[];
  supportingOrganizationalBehaviorIds: string[];
  evidencePriority: SyntheticScenarioEvidencePriorityItem[];
  confidenceScore: number;
  confidenceReason: string;
  scenarioConfidence?: number;
  evidenceStrength: SyntheticScenarioEvidenceStrength;
  dataCompletenessScore: number;
  assumptionConfidence?: number;
  driverConfidence?: number;
  scenarioRiskScore?: number;
  lineage: SyntheticScenarioLineage;
  governanceStatus: SyntheticScenarioGovernanceStatus;
  refreshStatus: SyntheticScenarioRefreshStatus;
  missingDataFlags: string[];
  feasibilityScore?: number;
  feasibilityReason?: string;
  feasibilityConstraints: string[];
  feasibilityConfidence?: number;
  triggerEventId?: string;
  triggerEventCategory?: string;
  triggerEventProbability?: string;
  historicalScenarioIds: string[];
  historicalOutcomeIds: string[];
  behaviorPatternId?: string;
  behaviorPatternCategory?: string;
  successProbability?: number;
  executionRiskScore?: number;
  organizationalCapacityScore?: number;
  executionBandwidth?: string;
  decisionCollisionIds: string[];
  collisionCategory?: string;
  memoryAdjustedOutcome?: string;
  historicalRealizationRate?: number;
}

export interface BuildScenarioEvidenceInput {
  companyId: string;
  scenarioCategory: SyntheticScenarioCategory;
  scenarioType: SyntheticScenarioType;
  scenarioHorizon: SyntheticScenarioHorizon;
  scenarioGranularity: SyntheticScenarioGranularity;
  scenarioMethodology: SyntheticScenarioMethodologyType;
  memoryReferences?: SyntheticScenarioMemoryReference[];
  forecastReferences?: SyntheticScenarioForecastReference[];
  recommendationReferences?: SyntheticScenarioRecommendationReference[];
  commentaryReferences?: SyntheticScenarioCommentaryReference[];
  fteObservationReferences?: SyntheticScenarioFteObservationReference[];
  ftePatternReferences?: SyntheticScenarioFtePatternReference[];
  fluxObservationReferences?: SyntheticScenarioFluxObservationReference[];
  fluxPatternReferences?: SyntheticScenarioFluxPatternReference[];
  riskReferences?: SyntheticScenarioRiskReference[];
  sourceReferences?: SyntheticScenarioSourceReference[];
  driverReferences?: SyntheticScenarioDriverReference[];
  assumptionReferences?: SyntheticScenarioAssumptionReference[];
  constraintReferences?: SyntheticScenarioConstraintReference[];
  dependencyReferences?: SyntheticScenarioDependencyReference[];
  triggerEventReferences?: SyntheticScenarioTriggerEventReference[];
  historicalOutcomeReferences?: SyntheticScenarioHistoricalOutcomeReference[];
  organizationalBehaviorReferences?: SyntheticScenarioOrganizationalBehaviorReference[];
  confidenceScore: number;
  confidenceReason?: string;
  scenarioConfidence?: number;
  evidenceStrength: SyntheticScenarioEvidenceStrength;
  dataCompletenessScore: number;
  assumptionConfidence?: number;
  driverConfidence?: number;
  scenarioRiskScore?: number;
  lineage: SyntheticScenarioLineage;
  governanceStatus: SyntheticScenarioGovernanceStatus;
  refreshStatus: SyntheticScenarioRefreshStatus;
  missingDataFlags?: string[];
  feasibilityScore?: number;
  feasibilityReason?: string;
  feasibilityConstraints?: string[];
  feasibilityConfidence?: number;
  triggerEventId?: string;
  triggerEventCategory?: string;
  triggerEventProbability?: string;
  historicalScenarioIds?: string[];
  historicalOutcomeIds?: string[];
  behaviorPatternId?: string;
  behaviorPatternCategory?: string;
  successProbability?: number;
  executionRiskScore?: number;
  organizationalCapacityScore?: number;
  executionBandwidth?: string;
  decisionCollisionIds?: string[];
  collisionCategory?: string;
  memoryAdjustedOutcome?: string;
  historicalRealizationRate?: number;
}

export interface BuildScenarioEvidenceResult {
  evidencePackage: SyntheticScenarioEvidencePackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function getMemoryIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.memoryReferences ?? []).map((reference) => reference.memoryId));
}

function getForecastIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.forecastReferences ?? []).map((reference) => reference.forecastId));
}

function getRecommendationIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.recommendationReferences ?? []).map((reference) => reference.recommendationId));
}

function getCommentaryIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.commentaryReferences ?? []).map((reference) => reference.commentaryId));
}

function getFteObservationIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.fteObservationReferences ?? []).map((reference) => reference.observationId));
}

function getFtePatternIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.ftePatternReferences ?? []).map((reference) => reference.patternId));
}

function getFluxObservationIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.fluxObservationReferences ?? []).map((reference) => reference.observationId));
}

function getFluxPatternIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.fluxPatternReferences ?? []).map((reference) => reference.patternId));
}

function getRiskIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.riskReferences ?? []).map((reference) => reference.riskId));
}

function getSourceReferenceIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.sourceReferences ?? []).map((reference) => reference.sourceId));
}

function getDriverIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.driverReferences ?? []).map((reference) => reference.driverId));
}

function getAssumptionIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.assumptionReferences ?? []).map((reference) => reference.assumptionId));
}

function getConstraintIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.constraintReferences ?? []).map((reference) => reference.constraintId));
}

function getDependencyIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.dependencyReferences ?? []).map((reference) => reference.dependencyId));
}

function getTriggerEventIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.triggerEventReferences ?? []).map((reference) => reference.triggerEventId));
}

function getHistoricalOutcomeIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted((input.historicalOutcomeReferences ?? []).map((reference) => reference.historicalOutcomeId));
}

function getHistoricalScenarioIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted([
    ...(input.historicalScenarioIds ?? []),
    ...(input.historicalOutcomeReferences ?? []).map((reference) => reference.historicalScenarioId ?? ""),
  ]);
}

function getOrganizationalBehaviorIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted(
    (input.organizationalBehaviorReferences ?? []).map((reference) => reference.behaviorPatternId),
  );
}

function getAllSupportingReferenceIds(input: BuildScenarioEvidenceInput): string[] {
  return uniqueSorted([
    ...getMemoryIds(input),
    ...getForecastIds(input),
    ...getRecommendationIds(input),
    ...getCommentaryIds(input),
    ...getFteObservationIds(input),
    ...getFtePatternIds(input),
    ...getFluxObservationIds(input),
    ...getFluxPatternIds(input),
    ...getRiskIds(input),
    ...getSourceReferenceIds(input),
    ...getDriverIds(input),
    ...getAssumptionIds(input),
    ...getConstraintIds(input),
    ...getDependencyIds(input),
    ...getTriggerEventIds(input),
    ...getHistoricalOutcomeIds(input),
    ...getOrganizationalBehaviorIds(input),
  ]);
}

function buildEvidenceId(input: BuildScenarioEvidenceInput): string {
  return `scenario-evidence:${stableSnapshotHash({
    companyId: input.companyId,
    scenarioCategory: input.scenarioCategory,
    scenarioType: input.scenarioType,
    scenarioHorizon: input.scenarioHorizon,
    scenarioGranularity: input.scenarioGranularity,
    scenarioMethodology: input.scenarioMethodology,
    supportingReferenceIds: getAllSupportingReferenceIds(input),
  })}`;
}

function buildEvidencePriority(input: BuildScenarioEvidenceInput): SyntheticScenarioEvidencePriorityItem[] {
  return [
    { priorityRank: 1, evidenceType: "company_memory", supportingIds: getMemoryIds(input) },
    { priorityRank: 2, evidenceType: "forecast_reference", supportingIds: getForecastIds(input) },
    { priorityRank: 3, evidenceType: "recommendation_reference", supportingIds: getRecommendationIds(input) },
    { priorityRank: 4, evidenceType: "commentary_reference", supportingIds: getCommentaryIds(input) },
    { priorityRank: 5, evidenceType: "historical_outcome", supportingIds: getHistoricalOutcomeIds(input) },
    { priorityRank: 6, evidenceType: "organizational_behavior", supportingIds: getOrganizationalBehaviorIds(input) },
    { priorityRank: 7, evidenceType: "constraint", supportingIds: getConstraintIds(input) },
    { priorityRank: 8, evidenceType: "dependency", supportingIds: getDependencyIds(input) },
    { priorityRank: 9, evidenceType: "trigger_event", supportingIds: getTriggerEventIds(input) },
    { priorityRank: 10, evidenceType: "risk_signal", supportingIds: getRiskIds(input) },
    { priorityRank: 11, evidenceType: "flux_pattern", supportingIds: getFluxPatternIds(input) },
    { priorityRank: 12, evidenceType: "fte_pattern", supportingIds: getFtePatternIds(input) },
    { priorityRank: 13, evidenceType: "flux_observation", supportingIds: getFluxObservationIds(input) },
    { priorityRank: 14, evidenceType: "fte_observation", supportingIds: getFteObservationIds(input) },
    { priorityRank: 15, evidenceType: "assumption", supportingIds: getAssumptionIds(input) },
    { priorityRank: 16, evidenceType: "driver", supportingIds: getDriverIds(input) },
    { priorityRank: 17, evidenceType: "source_reference", supportingIds: getSourceReferenceIds(input) },
  ];
}

function validateInput(input: BuildScenarioEvidenceInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!SYNTHETIC_SCENARIO_CATEGORIES.includes(input.scenarioCategory)) {
    warnings.push("scenarioCategory is not supported.");
  }
  if (!SYNTHETIC_SCENARIO_TYPES.includes(input.scenarioType)) {
    warnings.push("scenarioType is not supported.");
  }
  if (!SYNTHETIC_SCENARIO_HORIZONS.includes(input.scenarioHorizon)) {
    warnings.push("scenarioHorizon is not supported.");
  }
  if (!SYNTHETIC_SCENARIO_GRANULARITY_LEVELS.includes(input.scenarioGranularity)) {
    warnings.push("scenarioGranularity is not supported.");
  }
  if (!SYNTHETIC_SCENARIO_METHODOLOGIES.includes(input.scenarioMethodology)) {
    warnings.push("scenarioMethodology is not supported.");
  }
  if (getAllSupportingReferenceIds(input).length === 0) {
    warnings.push("at least one supporting reference ID is required.");
  }
  if (typeof input.confidenceScore !== "number" || Number.isNaN(input.confidenceScore)) {
    warnings.push("confidenceScore must be a number.");
  }
  if (!SYNTHETIC_SCENARIO_EVIDENCE_STRENGTHS.includes(input.evidenceStrength)) {
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

export function buildScenarioEvidence(input: BuildScenarioEvidenceInput): BuildScenarioEvidenceResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      evidencePackage: null,
      skipped: true,
      warnings,
    };
  }

  const supportingMemoryIds = getMemoryIds(input);
  const supportingForecastIds = getForecastIds(input);
  const supportingRecommendationIds = getRecommendationIds(input);
  const supportingCommentaryIds = getCommentaryIds(input);
  const supportingFteObservationIds = getFteObservationIds(input);
  const supportingFtePatternIds = getFtePatternIds(input);
  const supportingFluxObservationIds = getFluxObservationIds(input);
  const supportingFluxPatternIds = getFluxPatternIds(input);
  const supportingRiskIds = getRiskIds(input);
  const supportingSourceReferenceIds = getSourceReferenceIds(input);
  const supportingDriverIds = getDriverIds(input);
  const supportingAssumptionIds = getAssumptionIds(input);
  const supportingConstraintIds = getConstraintIds(input);
  const supportingDependencyIds = getDependencyIds(input);
  const supportingTriggerEventIds = getTriggerEventIds(input);
  const supportingHistoricalOutcomeIds = getHistoricalOutcomeIds(input);
  const supportingOrganizationalBehaviorIds = getOrganizationalBehaviorIds(input);

  return {
    evidencePackage: {
      evidenceId: buildEvidenceId(input),
      companyId: input.companyId,
      scenarioCategory: input.scenarioCategory,
      scenarioType: input.scenarioType,
      scenarioHorizon: input.scenarioHorizon,
      scenarioGranularity: input.scenarioGranularity,
      scenarioMethodology: input.scenarioMethodology,
      memoryReferences: input.memoryReferences ?? [],
      forecastReferences: input.forecastReferences ?? [],
      recommendationReferences: input.recommendationReferences ?? [],
      commentaryReferences: input.commentaryReferences ?? [],
      fteObservationReferences: input.fteObservationReferences ?? [],
      ftePatternReferences: input.ftePatternReferences ?? [],
      fluxObservationReferences: input.fluxObservationReferences ?? [],
      fluxPatternReferences: input.fluxPatternReferences ?? [],
      riskReferences: input.riskReferences ?? [],
      sourceReferences: input.sourceReferences ?? [],
      driverReferences: input.driverReferences ?? [],
      assumptionReferences: input.assumptionReferences ?? [],
      constraintReferences: input.constraintReferences ?? [],
      dependencyReferences: input.dependencyReferences ?? [],
      triggerEventReferences: input.triggerEventReferences ?? [],
      historicalOutcomeReferences: input.historicalOutcomeReferences ?? [],
      organizationalBehaviorReferences: input.organizationalBehaviorReferences ?? [],
      supportingMemoryIds,
      supportingForecastIds,
      supportingRecommendationIds,
      supportingCommentaryIds,
      supportingFteObservationIds,
      supportingFtePatternIds,
      supportingFluxObservationIds,
      supportingFluxPatternIds,
      supportingRiskIds,
      supportingSourceReferenceIds,
      supportingDriverIds,
      supportingAssumptionIds,
      supportingConstraintIds,
      supportingDependencyIds,
      supportingTriggerEventIds,
      supportingHistoricalOutcomeIds,
      supportingOrganizationalBehaviorIds,
      evidencePriority: buildEvidencePriority(input),
      confidenceScore: input.confidenceScore,
      confidenceReason: input.confidenceReason ?? "",
      scenarioConfidence: input.scenarioConfidence,
      evidenceStrength: input.evidenceStrength,
      dataCompletenessScore: input.dataCompletenessScore,
      assumptionConfidence: input.assumptionConfidence,
      driverConfidence: input.driverConfidence,
      scenarioRiskScore: input.scenarioRiskScore,
      lineage: {
        ...input.lineage,
        sourceReferenceIds: uniqueSorted([...input.lineage.sourceReferenceIds, ...supportingSourceReferenceIds]),
        forecastIds: uniqueSorted([...input.lineage.forecastIds, ...supportingForecastIds]),
        recommendationIds: uniqueSorted([...input.lineage.recommendationIds, ...supportingRecommendationIds]),
        commentaryIds: uniqueSorted([...input.lineage.commentaryIds, ...supportingCommentaryIds]),
        memoryIds: uniqueSorted([...input.lineage.memoryIds, ...supportingMemoryIds]),
        assumptionIds: uniqueSorted([...input.lineage.assumptionIds, ...supportingAssumptionIds]),
        driverIds: uniqueSorted([...input.lineage.driverIds, ...supportingDriverIds]),
        riskIds: uniqueSorted([...input.lineage.riskIds, ...supportingRiskIds]),
        constraintIds: uniqueSorted([...input.lineage.constraintIds, ...supportingConstraintIds]),
        dependencyIds: uniqueSorted([...input.lineage.dependencyIds, ...supportingDependencyIds]),
      },
      governanceStatus: input.governanceStatus,
      refreshStatus: input.refreshStatus,
      missingDataFlags: input.missingDataFlags ?? [],
      feasibilityScore: input.feasibilityScore,
      feasibilityReason: input.feasibilityReason,
      feasibilityConstraints: input.feasibilityConstraints ?? [],
      feasibilityConfidence: input.feasibilityConfidence,
      triggerEventId: input.triggerEventId,
      triggerEventCategory: input.triggerEventCategory,
      triggerEventProbability: input.triggerEventProbability,
      historicalScenarioIds: getHistoricalScenarioIds(input),
      historicalOutcomeIds: uniqueSorted([...(input.historicalOutcomeIds ?? []), ...supportingHistoricalOutcomeIds]),
      behaviorPatternId: input.behaviorPatternId,
      behaviorPatternCategory: input.behaviorPatternCategory,
      successProbability: input.successProbability,
      executionRiskScore: input.executionRiskScore,
      organizationalCapacityScore: input.organizationalCapacityScore,
      executionBandwidth: input.executionBandwidth,
      decisionCollisionIds: input.decisionCollisionIds ?? [],
      collisionCategory: input.collisionCategory,
      memoryAdjustedOutcome: input.memoryAdjustedOutcome,
      historicalRealizationRate: input.historicalRealizationRate,
    },
    skipped: false,
    warnings: [],
  };
}
