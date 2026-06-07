import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticStructuredScenarioCandidate } from "../candidates";
import type {
  SyntheticScenarioAssumption,
  SyntheticScenarioCategory,
  SyntheticScenarioComparison,
  SyntheticScenarioConstraint,
  SyntheticScenarioDependency,
  SyntheticScenarioDriver,
  SyntheticScenarioEvidenceStrength,
  SyntheticScenarioFeasibility,
  SyntheticScenarioGranularity,
  SyntheticScenarioHorizon,
  SyntheticScenarioImpact,
  SyntheticScenarioInstitutionalMemoryCompatibility,
  SyntheticScenarioLineage,
  SyntheticScenarioMethodologyType,
  SyntheticScenarioTriggerEventCompatibility,
  SyntheticScenarioType,
  SyntheticScenarioVersion,
} from "../types";
import type { SyntheticScenarioGovernanceStatus, SyntheticScenarioRefreshStatus } from "../evidence";

export type SyntheticScenarioMemoryKey =
  | "revenue_scenario"
  | "expense_scenario"
  | "payroll_scenario"
  | "workforce_scenario"
  | "cash_scenario"
  | "working_capital_scenario"
  | "inventory_scenario"
  | "treasury_scenario"
  | "tax_scenario"
  | "healthcare_scenario"
  | "manufacturing_scenario"
  | "construction_scenario"
  | "municipality_scenario"
  | "government_contracting_scenario"
  | "strategic_scenario";

export interface SyntheticScenarioAdvancedMemoryMetadata {
  historicalEffectiveness?: string;
  historicalConstraints?: string[];
  historicalBehaviorPatterns?: string[];
  historicalSuccessRate?: number;
  historicalFailurePatterns?: string[];
  behaviorPatternConfidence?: number;
  behaviorPatternFrequency?: number;
  successProbabilityConfidence?: number;
  successProbabilityReason?: string;
  executionConfidence?: number;
  changeCapacityScore?: number;
  competingInitiatives?: string[];
  initiativeLoad?: number;
  collisionSeverity?: string;
  collisionConfidence?: number;
  memoryAdjustedConfidence?: number;
  memoryAdjustedConstraints?: string[];
  memoryAdjustedProbability?: number;
}

export interface SyntheticScenarioMemoryCandidate {
  candidateId: string;
  companyId: string;
  scenarioId: string;
  scenarioCategory: SyntheticScenarioCategory;
  scenarioType: SyntheticScenarioType;
  scenarioHorizon: SyntheticScenarioHorizon;
  scenarioGranularity: SyntheticScenarioGranularity;
  scenarioMethodology: SyntheticScenarioMethodologyType;
  memoryKey: SyntheticScenarioMemoryKey;
  evidenceId: string;
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
  confidenceScore: number;
  confidenceReason: string;
  scenarioConfidence: number | undefined;
  evidenceStrength: SyntheticScenarioEvidenceStrength;
  dataCompletenessScore: number;
  assumptionConfidence: number | undefined;
  driverConfidence: number | undefined;
  scenarioRiskScore: number | undefined;
  assumptions: SyntheticScenarioAssumption[];
  drivers: SyntheticScenarioDriver[];
  impacts: Partial<SyntheticScenarioImpact>;
  constraints: SyntheticScenarioConstraint[];
  dependencies: SyntheticScenarioDependency[];
  feasibility: SyntheticScenarioFeasibility | undefined;
  version: SyntheticScenarioVersion | undefined;
  comparison: SyntheticScenarioComparison | undefined;
  triggerEventCompatibility: SyntheticScenarioTriggerEventCompatibility | undefined;
  historicalScenarioIds: string[];
  historicalOutcomeIds: string[];
  historicalEffectiveness: string | undefined;
  historicalConstraints: string[];
  historicalBehaviorPatterns: string[];
  historicalSuccessRate: number | undefined;
  historicalFailurePatterns: string[];
  behaviorPatternId: string | undefined;
  behaviorPatternCategory: string | undefined;
  behaviorPatternConfidence: number | undefined;
  behaviorPatternFrequency: number | undefined;
  successProbability: number | undefined;
  successProbabilityConfidence: number | undefined;
  successProbabilityReason: string | undefined;
  executionRiskScore: number | undefined;
  executionConfidence: number | undefined;
  organizationalCapacityScore: number | undefined;
  changeCapacityScore: number | undefined;
  executionBandwidth: string | undefined;
  competingInitiatives: string[];
  initiativeLoad: number | undefined;
  decisionCollisionIds: string[];
  collisionCategory: string | undefined;
  collisionSeverity: string | undefined;
  collisionConfidence: number | undefined;
  memoryAdjustedOutcome: string | undefined;
  historicalRealizationRate: number | undefined;
  memoryAdjustedConfidence: number | undefined;
  memoryAdjustedConstraints: string[];
  memoryAdjustedProbability: number | undefined;
  governanceStatus: SyntheticScenarioGovernanceStatus;
  refreshStatus: SyntheticScenarioRefreshStatus;
  lineage: SyntheticScenarioLineage;
}

export interface BuildScenarioMemoryCandidateInput {
  companyId: string;
  candidate: SyntheticStructuredScenarioCandidate | null;
}

export interface BuildScenarioMemoryCandidateResult {
  candidate: SyntheticScenarioMemoryCandidate | null;
  skipped: boolean;
  warnings: string[];
}

export const SCENARIO_CATEGORY_MEMORY_KEY_MAP: Record<SyntheticScenarioCategory, SyntheticScenarioMemoryKey> = {
  revenue: "revenue_scenario",
  expense: "expense_scenario",
  payroll: "payroll_scenario",
  workforce: "workforce_scenario",
  cash: "cash_scenario",
  working_capital: "working_capital_scenario",
  inventory: "inventory_scenario",
  treasury: "treasury_scenario",
  tax: "tax_scenario",
  healthcare: "healthcare_scenario",
  manufacturing: "manufacturing_scenario",
  construction: "construction_scenario",
  municipality: "municipality_scenario",
  government_contracting: "government_contracting_scenario",
  strategic: "strategic_scenario",
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function getAdvancedMemoryMetadata(candidate: SyntheticStructuredScenarioCandidate): SyntheticScenarioAdvancedMemoryMetadata {
  return (candidate.institutionalMemoryCompatibility ?? {}) as SyntheticScenarioInstitutionalMemoryCompatibility &
    SyntheticScenarioAdvancedMemoryMetadata;
}

function hasSupportingEvidence(candidate: SyntheticStructuredScenarioCandidate): boolean {
  return (
    candidate.supportingMemoryIds.length > 0 ||
    candidate.supportingForecastIds.length > 0 ||
    candidate.supportingRecommendationIds.length > 0 ||
    candidate.supportingCommentaryIds.length > 0 ||
    candidate.supportingFteObservationIds.length > 0 ||
    candidate.supportingFtePatternIds.length > 0 ||
    candidate.supportingFluxObservationIds.length > 0 ||
    candidate.supportingFluxPatternIds.length > 0 ||
    candidate.supportingRiskIds.length > 0 ||
    candidate.supportingSourceReferenceIds.length > 0 ||
    candidate.supportingDriverIds.length > 0 ||
    candidate.supportingAssumptionIds.length > 0 ||
    candidate.supportingConstraintIds.length > 0 ||
    candidate.supportingDependencyIds.length > 0 ||
    candidate.supportingTriggerEventIds.length > 0 ||
    candidate.supportingHistoricalOutcomeIds.length > 0 ||
    candidate.supportingOrganizationalBehaviorIds.length > 0
  );
}

function getAllSupportingReferenceIds(candidate: SyntheticStructuredScenarioCandidate): string[] {
  return uniqueSorted([
    ...candidate.supportingMemoryIds,
    ...candidate.supportingForecastIds,
    ...candidate.supportingRecommendationIds,
    ...candidate.supportingCommentaryIds,
    ...candidate.supportingFteObservationIds,
    ...candidate.supportingFtePatternIds,
    ...candidate.supportingFluxObservationIds,
    ...candidate.supportingFluxPatternIds,
    ...candidate.supportingRiskIds,
    ...candidate.supportingSourceReferenceIds,
    ...candidate.supportingDriverIds,
    ...candidate.supportingAssumptionIds,
    ...candidate.supportingConstraintIds,
    ...candidate.supportingDependencyIds,
    ...candidate.supportingTriggerEventIds,
    ...candidate.supportingHistoricalOutcomeIds,
    ...candidate.supportingOrganizationalBehaviorIds,
  ]);
}

function buildCandidateId(
  input: BuildScenarioMemoryCandidateInput,
  candidate: SyntheticStructuredScenarioCandidate,
): string {
  return `scenario-memory-candidate:${stableSnapshotHash({
    companyId: input.companyId,
    scenarioId: candidate.scenarioId,
    scenarioCategory: candidate.scenarioCategory,
    scenarioType: candidate.scenarioType,
    scenarioMethodology: candidate.scenarioMethodology,
    scenarioGranularity: candidate.scenarioGranularity,
    evidenceId: candidate.evidenceId,
    supportingReferenceIds: getAllSupportingReferenceIds(candidate),
  })}`;
}

function validateInput(input: BuildScenarioMemoryCandidateInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!input.candidate) {
    warnings.push("candidate is required.");
    return warnings;
  }
  if (input.candidate.companyId !== input.companyId) {
    warnings.push("candidate companyId must match input companyId.");
  }
  if (!hasValue(input.candidate.scenarioId)) warnings.push("scenarioId is required.");
  if (!hasValue(input.candidate.scenarioCategory)) warnings.push("scenarioCategory is required.");
  if (!hasValue(input.candidate.scenarioType)) warnings.push("scenarioType is required.");
  if (!hasValue(input.candidate.scenarioHorizon)) warnings.push("scenarioHorizon is required.");
  if (!hasValue(input.candidate.scenarioGranularity)) warnings.push("scenarioGranularity is required.");
  if (!hasValue(input.candidate.scenarioMethodology)) warnings.push("scenarioMethodology is required.");
  if (!hasValue(input.candidate.evidenceId)) warnings.push("evidenceId is required.");
  if (!hasSupportingEvidence(input.candidate)) warnings.push("supporting evidence references are required.");
  if (!input.candidate.supportingSourceReferenceIds?.length) warnings.push("source references are required.");
  if (!input.candidate.lineage) warnings.push("lineage is required.");
  if (!SCENARIO_CATEGORY_MEMORY_KEY_MAP[input.candidate.scenarioCategory]) {
    warnings.push("scenarioCategory cannot be mapped to a Scenario memory key.");
  }

  return warnings;
}

export function buildScenarioMemoryCandidate(
  input: BuildScenarioMemoryCandidateInput,
): BuildScenarioMemoryCandidateResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.candidate) {
    return {
      candidate: null,
      skipped: true,
      warnings,
    };
  }

  const candidate = input.candidate;
  const advancedMemoryMetadata = getAdvancedMemoryMetadata(candidate);

  return {
    candidate: {
      candidateId: buildCandidateId(input, candidate),
      companyId: input.companyId,
      scenarioId: candidate.scenarioId,
      scenarioCategory: candidate.scenarioCategory,
      scenarioType: candidate.scenarioType,
      scenarioHorizon: candidate.scenarioHorizon,
      scenarioGranularity: candidate.scenarioGranularity,
      scenarioMethodology: candidate.scenarioMethodology,
      memoryKey: SCENARIO_CATEGORY_MEMORY_KEY_MAP[candidate.scenarioCategory],
      evidenceId: candidate.evidenceId,
      supportingMemoryIds: candidate.supportingMemoryIds,
      supportingForecastIds: candidate.supportingForecastIds,
      supportingRecommendationIds: candidate.supportingRecommendationIds,
      supportingCommentaryIds: candidate.supportingCommentaryIds,
      supportingFteObservationIds: candidate.supportingFteObservationIds,
      supportingFtePatternIds: candidate.supportingFtePatternIds,
      supportingFluxObservationIds: candidate.supportingFluxObservationIds,
      supportingFluxPatternIds: candidate.supportingFluxPatternIds,
      supportingRiskIds: candidate.supportingRiskIds,
      supportingSourceReferenceIds: candidate.supportingSourceReferenceIds,
      supportingDriverIds: candidate.supportingDriverIds,
      supportingAssumptionIds: candidate.supportingAssumptionIds,
      supportingConstraintIds: candidate.supportingConstraintIds,
      supportingDependencyIds: candidate.supportingDependencyIds,
      supportingTriggerEventIds: candidate.supportingTriggerEventIds,
      supportingHistoricalOutcomeIds: candidate.supportingHistoricalOutcomeIds,
      supportingOrganizationalBehaviorIds: candidate.supportingOrganizationalBehaviorIds,
      confidenceScore: candidate.confidenceScore,
      confidenceReason: candidate.confidenceReason,
      scenarioConfidence: candidate.scenarioConfidence,
      evidenceStrength: candidate.evidenceStrength,
      dataCompletenessScore: candidate.dataCompletenessScore,
      assumptionConfidence: candidate.assumptionConfidence,
      driverConfidence: candidate.driverConfidence,
      scenarioRiskScore: candidate.scenarioRiskScore,
      assumptions: candidate.assumptions,
      drivers: candidate.drivers,
      impacts: candidate.impacts,
      constraints: candidate.constraints,
      dependencies: candidate.dependencies,
      feasibility: candidate.feasibility,
      version: candidate.version,
      comparison: candidate.comparison,
      triggerEventCompatibility: candidate.triggerEventCompatibility,
      historicalScenarioIds: candidate.historicalScenarioIds,
      historicalOutcomeIds: candidate.historicalOutcomeIds,
      historicalEffectiveness: advancedMemoryMetadata.historicalEffectiveness,
      historicalConstraints: advancedMemoryMetadata.historicalConstraints ?? [],
      historicalBehaviorPatterns: advancedMemoryMetadata.historicalBehaviorPatterns ?? [],
      historicalSuccessRate: advancedMemoryMetadata.historicalSuccessRate,
      historicalFailurePatterns: advancedMemoryMetadata.historicalFailurePatterns ?? [],
      behaviorPatternId: candidate.behaviorPatternId,
      behaviorPatternCategory: candidate.behaviorPatternCategory,
      behaviorPatternConfidence: advancedMemoryMetadata.behaviorPatternConfidence,
      behaviorPatternFrequency: advancedMemoryMetadata.behaviorPatternFrequency,
      successProbability: candidate.successProbability,
      successProbabilityConfidence: advancedMemoryMetadata.successProbabilityConfidence,
      successProbabilityReason: advancedMemoryMetadata.successProbabilityReason,
      executionRiskScore: candidate.executionRiskScore,
      executionConfidence: advancedMemoryMetadata.executionConfidence,
      organizationalCapacityScore: candidate.organizationalCapacityScore,
      changeCapacityScore: advancedMemoryMetadata.changeCapacityScore,
      executionBandwidth: candidate.executionBandwidth,
      competingInitiatives: advancedMemoryMetadata.competingInitiatives ?? [],
      initiativeLoad: advancedMemoryMetadata.initiativeLoad,
      decisionCollisionIds: candidate.decisionCollisionIds,
      collisionCategory: candidate.collisionCategory,
      collisionSeverity: advancedMemoryMetadata.collisionSeverity,
      collisionConfidence: advancedMemoryMetadata.collisionConfidence,
      memoryAdjustedOutcome: candidate.memoryAdjustedOutcome,
      historicalRealizationRate: candidate.historicalRealizationRate,
      memoryAdjustedConfidence: advancedMemoryMetadata.memoryAdjustedConfidence,
      memoryAdjustedConstraints: advancedMemoryMetadata.memoryAdjustedConstraints ?? [],
      memoryAdjustedProbability: advancedMemoryMetadata.memoryAdjustedProbability,
      governanceStatus: candidate.governanceStatus,
      refreshStatus: candidate.refreshStatus,
      lineage: {
        ...candidate.lineage,
        sourceReferenceIds: uniqueSorted([
          ...candidate.lineage.sourceReferenceIds,
          ...candidate.supportingSourceReferenceIds,
        ]),
        forecastIds: uniqueSorted([...candidate.lineage.forecastIds, ...candidate.supportingForecastIds]),
        recommendationIds: uniqueSorted([
          ...candidate.lineage.recommendationIds,
          ...candidate.supportingRecommendationIds,
        ]),
        commentaryIds: uniqueSorted([...candidate.lineage.commentaryIds, ...candidate.supportingCommentaryIds]),
        memoryIds: uniqueSorted([...candidate.lineage.memoryIds, ...candidate.supportingMemoryIds]),
        assumptionIds: uniqueSorted([...candidate.lineage.assumptionIds, ...candidate.supportingAssumptionIds]),
        driverIds: uniqueSorted([...candidate.lineage.driverIds, ...candidate.supportingDriverIds]),
        riskIds: uniqueSorted([...candidate.lineage.riskIds, ...candidate.supportingRiskIds]),
        constraintIds: uniqueSorted([...candidate.lineage.constraintIds, ...candidate.supportingConstraintIds]),
        dependencyIds: uniqueSorted([...candidate.lineage.dependencyIds, ...candidate.supportingDependencyIds]),
      },
    },
    skipped: false,
    warnings: [],
  };
}
