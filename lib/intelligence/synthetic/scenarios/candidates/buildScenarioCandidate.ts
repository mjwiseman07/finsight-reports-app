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
  SyntheticScenarioAssumption,
  SyntheticScenarioCategory,
  SyntheticScenarioComparison,
  SyntheticScenarioConstraint,
  SyntheticScenarioDecisionCompatibility,
  SyntheticScenarioDependency,
  SyntheticScenarioDriver,
  SyntheticScenarioEvidenceStrength,
  SyntheticScenarioFeasibility,
  SyntheticScenarioGranularity,
  SyntheticScenarioHorizon,
  SyntheticScenarioImpact,
  SyntheticScenarioIndustryCompatibility,
  SyntheticScenarioInstitutionalMemoryCompatibility,
  SyntheticScenarioLineage,
  SyntheticScenarioMethodology,
  SyntheticScenarioMethodologyType,
  SyntheticScenarioTriggerEventCompatibility,
  SyntheticScenarioType,
  SyntheticScenarioVersion,
} from "../types";
import type {
  SyntheticScenarioEvidencePackage,
  SyntheticScenarioGovernanceStatus,
  SyntheticScenarioRefreshStatus,
} from "../evidence";

export interface SyntheticScenarioCandidateFocus {
  focusType: string;
  labels: string[];
}

export interface BuildScenarioCandidateInput {
  companyId: string;
  scenarioCategory: SyntheticScenarioCategory;
  scenarioType: SyntheticScenarioType;
  scenarioHorizon: SyntheticScenarioHorizon;
  scenarioGranularity: SyntheticScenarioGranularity;
  scenarioMethodology: SyntheticScenarioMethodologyType;
  evidencePackage: SyntheticScenarioEvidencePackage | null;
  assumptions?: SyntheticScenarioAssumption[];
  drivers?: SyntheticScenarioDriver[];
  impacts?: Partial<SyntheticScenarioImpact>;
  constraints?: SyntheticScenarioConstraint[];
  dependencies?: SyntheticScenarioDependency[];
  feasibility?: SyntheticScenarioFeasibility;
  version?: SyntheticScenarioVersion;
  comparison?: SyntheticScenarioComparison;
  methodology?: Partial<SyntheticScenarioMethodology>;
  decisionCompatibility?: SyntheticScenarioDecisionCompatibility;
  industryCompatibility?: SyntheticScenarioIndustryCompatibility;
  triggerEventCompatibility?: SyntheticScenarioTriggerEventCompatibility;
  institutionalMemoryCompatibility?: SyntheticScenarioInstitutionalMemoryCompatibility;
}

export interface SyntheticStructuredScenarioCandidate {
  scenarioId: string;
  companyId: string;
  scenarioCategory: SyntheticScenarioCategory;
  scenarioType: SyntheticScenarioType;
  scenarioHorizon: SyntheticScenarioHorizon;
  scenarioGranularity: SyntheticScenarioGranularity;
  scenarioMethodology: SyntheticScenarioMethodologyType;
  evidenceId: string;
  scenarioFocus: SyntheticScenarioCandidateFocus;
  decisionFocus: SyntheticScenarioCandidateFocus;
  impactFocus: SyntheticScenarioCandidateFocus;
  constraintFocus: SyntheticScenarioCandidateFocus;
  dependencyFocus: SyntheticScenarioCandidateFocus;
  feasibilityFocus: SyntheticScenarioCandidateFocus;
  triggerEventFocus: SyntheticScenarioCandidateFocus;
  institutionalMemoryFocus: SyntheticScenarioCandidateFocus;
  behaviorFocus: SyntheticScenarioCandidateFocus;
  successProbabilityFocus: SyntheticScenarioCandidateFocus;
  capacityFocus: SyntheticScenarioCandidateFocus;
  collisionFocus: SyntheticScenarioCandidateFocus;
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
  decisionId?: string;
  decisionCategory?: string;
  decisionDescription?: string;
  indirectRateIds: string[];
  indirectRateAssumptions: string[];
  changeOrderIds: string[];
  changeOrderAssumptions: string[];
  fundingIds: string[];
  fundingAssumptions: string[];
  volumeAssumptions: string[];
  utilizationAssumptions: string[];
  assumptions: SyntheticScenarioAssumption[];
  drivers: SyntheticScenarioDriver[];
  impacts: Partial<SyntheticScenarioImpact>;
  constraints: SyntheticScenarioConstraint[];
  dependencies: SyntheticScenarioDependency[];
  feasibility?: SyntheticScenarioFeasibility;
  version?: SyntheticScenarioVersion;
  comparison?: SyntheticScenarioComparison;
  methodology?: Partial<SyntheticScenarioMethodology>;
  decisionCompatibility?: SyntheticScenarioDecisionCompatibility;
  industryCompatibility?: SyntheticScenarioIndustryCompatibility;
  triggerEventCompatibility?: SyntheticScenarioTriggerEventCompatibility;
  institutionalMemoryCompatibility?: SyntheticScenarioInstitutionalMemoryCompatibility;
  warnings: string[];
}

export interface BuildScenarioCandidateResult {
  candidate: SyntheticStructuredScenarioCandidate | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function hasSupportingEvidence(evidencePackage: SyntheticScenarioEvidencePackage): boolean {
  return (
    evidencePackage.supportingMemoryIds.length > 0 ||
    evidencePackage.supportingForecastIds.length > 0 ||
    evidencePackage.supportingRecommendationIds.length > 0 ||
    evidencePackage.supportingCommentaryIds.length > 0 ||
    evidencePackage.supportingFteObservationIds.length > 0 ||
    evidencePackage.supportingFtePatternIds.length > 0 ||
    evidencePackage.supportingFluxObservationIds.length > 0 ||
    evidencePackage.supportingFluxPatternIds.length > 0 ||
    evidencePackage.supportingRiskIds.length > 0 ||
    evidencePackage.supportingSourceReferenceIds.length > 0 ||
    evidencePackage.supportingDriverIds.length > 0 ||
    evidencePackage.supportingAssumptionIds.length > 0 ||
    evidencePackage.supportingConstraintIds.length > 0 ||
    evidencePackage.supportingDependencyIds.length > 0 ||
    evidencePackage.supportingTriggerEventIds.length > 0 ||
    evidencePackage.supportingHistoricalOutcomeIds.length > 0 ||
    evidencePackage.supportingOrganizationalBehaviorIds.length > 0
  );
}

function buildScenarioId(input: BuildScenarioCandidateInput): string {
  return `scenario-candidate:${stableSnapshotHash({
    companyId: input.companyId,
    scenarioCategory: input.scenarioCategory,
    scenarioType: input.scenarioType,
    scenarioHorizon: input.scenarioHorizon,
    scenarioGranularity: input.scenarioGranularity,
    scenarioMethodology: input.scenarioMethodology,
    evidenceId: input.evidencePackage?.evidenceId ?? null,
    supportingMemoryIds: input.evidencePackage?.supportingMemoryIds ?? [],
    supportingForecastIds: input.evidencePackage?.supportingForecastIds ?? [],
    supportingRecommendationIds: input.evidencePackage?.supportingRecommendationIds ?? [],
    supportingCommentaryIds: input.evidencePackage?.supportingCommentaryIds ?? [],
    supportingFteObservationIds: input.evidencePackage?.supportingFteObservationIds ?? [],
    supportingFtePatternIds: input.evidencePackage?.supportingFtePatternIds ?? [],
    supportingFluxObservationIds: input.evidencePackage?.supportingFluxObservationIds ?? [],
    supportingFluxPatternIds: input.evidencePackage?.supportingFluxPatternIds ?? [],
    supportingRiskIds: input.evidencePackage?.supportingRiskIds ?? [],
    supportingSourceReferenceIds: input.evidencePackage?.supportingSourceReferenceIds ?? [],
    supportingDriverIds: input.evidencePackage?.supportingDriverIds ?? [],
    supportingAssumptionIds: input.evidencePackage?.supportingAssumptionIds ?? [],
    supportingConstraintIds: input.evidencePackage?.supportingConstraintIds ?? [],
    supportingDependencyIds: input.evidencePackage?.supportingDependencyIds ?? [],
    supportingTriggerEventIds: input.evidencePackage?.supportingTriggerEventIds ?? [],
  })}`;
}

function buildFocus(focusType: string, labels: string[]): SyntheticScenarioCandidateFocus {
  return {
    focusType,
    labels: uniqueSorted(labels),
  };
}

function validateInput(input: BuildScenarioCandidateInput): string[] {
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
  if (!input.evidencePackage) {
    warnings.push("evidencePackage is required.");
    return warnings;
  }
  if (input.evidencePackage.companyId !== input.companyId) {
    warnings.push("evidence package companyId must match input companyId.");
  }
  if (input.evidencePackage.scenarioCategory !== input.scenarioCategory) {
    warnings.push("evidence package scenarioCategory must match input scenarioCategory.");
  }
  if (input.evidencePackage.scenarioType !== input.scenarioType) {
    warnings.push("evidence package scenarioType must match input scenarioType.");
  }
  if (input.evidencePackage.scenarioHorizon !== input.scenarioHorizon) {
    warnings.push("evidence package scenarioHorizon must match input scenarioHorizon.");
  }
  if (input.evidencePackage.scenarioGranularity !== input.scenarioGranularity) {
    warnings.push("evidence package scenarioGranularity must match input scenarioGranularity.");
  }
  if (input.evidencePackage.scenarioMethodology !== input.scenarioMethodology) {
    warnings.push("evidence package scenarioMethodology must match input scenarioMethodology.");
  }
  if (!hasSupportingEvidence(input.evidencePackage)) {
    warnings.push("at least one supporting evidence ID is required.");
  }
  if (
    typeof input.evidencePackage.confidenceScore !== "number" ||
    Number.isNaN(input.evidencePackage.confidenceScore)
  ) {
    warnings.push("confidenceScore must be present.");
  }
  if (!SYNTHETIC_SCENARIO_EVIDENCE_STRENGTHS.includes(input.evidencePackage.evidenceStrength)) {
    warnings.push("evidenceStrength is required.");
  }
  if (
    typeof input.evidencePackage.dataCompletenessScore !== "number" ||
    Number.isNaN(input.evidencePackage.dataCompletenessScore)
  ) {
    warnings.push("dataCompletenessScore must be present.");
  }
  if (!input.evidencePackage.lineage) {
    warnings.push("lineage is required.");
  }

  return warnings;
}

export function buildScenarioCandidate(input: BuildScenarioCandidateInput): BuildScenarioCandidateResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.evidencePackage) {
    return {
      candidate: null,
      skipped: true,
      warnings,
    };
  }

  const evidencePackage = input.evidencePackage;
  const assumptions = input.assumptions ?? [];
  const drivers = input.drivers ?? [];
  const impacts = input.impacts ?? {};
  const constraints = input.constraints ?? [];
  const dependencies = input.dependencies ?? [];
  const feasibility = input.feasibility;
  const version = input.version;
  const comparison = input.comparison;
  const methodology = input.methodology;
  const decisionCompatibility = input.decisionCompatibility;
  const industryCompatibility = input.industryCompatibility;
  const triggerEventCompatibility = input.triggerEventCompatibility;
  const institutionalMemoryCompatibility = input.institutionalMemoryCompatibility;

  return {
    candidate: {
      scenarioId: buildScenarioId(input),
      companyId: input.companyId,
      scenarioCategory: input.scenarioCategory,
      scenarioType: input.scenarioType,
      scenarioHorizon: input.scenarioHorizon,
      scenarioGranularity: input.scenarioGranularity,
      scenarioMethodology: input.scenarioMethodology,
      evidenceId: evidencePackage.evidenceId,
      scenarioFocus: buildFocus("scenario_metadata", [
        input.scenarioCategory,
        input.scenarioType,
        input.scenarioHorizon,
        input.scenarioGranularity,
        input.scenarioMethodology,
      ]),
      decisionFocus: buildFocus("decision_metadata", [
        decisionCompatibility?.decisionId ?? "",
        decisionCompatibility?.decisionCategory ?? "",
        decisionCompatibility?.decisionDescription ?? "",
      ]),
      impactFocus: buildFocus("impact_metadata", Object.keys(impacts)),
      constraintFocus: buildFocus(
        "constraint_metadata",
        constraints.flatMap((constraint) => [
          constraint.constraintId,
          constraint.constraintCategory,
          constraint.constraintSeverity,
        ]),
      ),
      dependencyFocus: buildFocus(
        "dependency_metadata",
        dependencies.flatMap((dependency) => [
          dependency.dependencyId,
          dependency.dependencyCategory,
          dependency.dependencyStatus,
        ]),
      ),
      feasibilityFocus: buildFocus("feasibility_metadata", [
        feasibility?.feasibilityReason ?? evidencePackage.feasibilityReason ?? "",
        ...(feasibility?.feasibilityConstraints ?? evidencePackage.feasibilityConstraints),
      ]),
      triggerEventFocus: buildFocus("trigger_event_metadata", [
        triggerEventCompatibility?.triggerEventId ?? evidencePackage.triggerEventId ?? "",
        triggerEventCompatibility?.triggerEventCategory ?? evidencePackage.triggerEventCategory ?? "",
        triggerEventCompatibility?.triggerEventProbability ?? evidencePackage.triggerEventProbability ?? "",
      ]),
      institutionalMemoryFocus: buildFocus("institutional_memory_metadata", [
        ...(institutionalMemoryCompatibility?.historicalScenarioIds ?? evidencePackage.historicalScenarioIds),
        ...(institutionalMemoryCompatibility?.historicalOutcomeIds ?? evidencePackage.historicalOutcomeIds),
      ]),
      behaviorFocus: buildFocus("organizational_behavior_metadata", [
        institutionalMemoryCompatibility?.behaviorPatternId ?? evidencePackage.behaviorPatternId ?? "",
        institutionalMemoryCompatibility?.behaviorPatternCategory ?? evidencePackage.behaviorPatternCategory ?? "",
      ]),
      successProbabilityFocus: buildFocus("success_probability_metadata", [
        institutionalMemoryCompatibility?.successProbability !== undefined ||
        evidencePackage.successProbability !== undefined
          ? "success_probability"
          : "",
        institutionalMemoryCompatibility?.executionRiskScore !== undefined ||
        evidencePackage.executionRiskScore !== undefined
          ? "execution_risk_score"
          : "",
      ]),
      capacityFocus: buildFocus("organizational_capacity_metadata", [
        institutionalMemoryCompatibility?.organizationalCapacityScore !== undefined ||
        evidencePackage.organizationalCapacityScore !== undefined
          ? "organizational_capacity_score"
          : "",
        institutionalMemoryCompatibility?.executionBandwidth ?? evidencePackage.executionBandwidth ?? "",
      ]),
      collisionFocus: buildFocus("decision_collision_metadata", [
        ...(institutionalMemoryCompatibility?.decisionCollisionIds ?? evidencePackage.decisionCollisionIds),
        institutionalMemoryCompatibility?.collisionCategory ?? evidencePackage.collisionCategory ?? "",
      ]),
      supportingMemoryIds: evidencePackage.supportingMemoryIds,
      supportingForecastIds: evidencePackage.supportingForecastIds,
      supportingRecommendationIds: evidencePackage.supportingRecommendationIds,
      supportingCommentaryIds: evidencePackage.supportingCommentaryIds,
      supportingFteObservationIds: evidencePackage.supportingFteObservationIds,
      supportingFtePatternIds: evidencePackage.supportingFtePatternIds,
      supportingFluxObservationIds: evidencePackage.supportingFluxObservationIds,
      supportingFluxPatternIds: evidencePackage.supportingFluxPatternIds,
      supportingRiskIds: evidencePackage.supportingRiskIds,
      supportingSourceReferenceIds: evidencePackage.supportingSourceReferenceIds,
      supportingDriverIds: evidencePackage.supportingDriverIds,
      supportingAssumptionIds: evidencePackage.supportingAssumptionIds,
      supportingConstraintIds: evidencePackage.supportingConstraintIds,
      supportingDependencyIds: evidencePackage.supportingDependencyIds,
      supportingTriggerEventIds: evidencePackage.supportingTriggerEventIds,
      supportingHistoricalOutcomeIds: evidencePackage.supportingHistoricalOutcomeIds,
      supportingOrganizationalBehaviorIds: evidencePackage.supportingOrganizationalBehaviorIds,
      confidenceScore: evidencePackage.confidenceScore,
      confidenceReason: evidencePackage.confidenceReason,
      scenarioConfidence: evidencePackage.scenarioConfidence,
      evidenceStrength: evidencePackage.evidenceStrength,
      dataCompletenessScore: evidencePackage.dataCompletenessScore,
      assumptionConfidence: evidencePackage.assumptionConfidence,
      driverConfidence: evidencePackage.driverConfidence,
      scenarioRiskScore: evidencePackage.scenarioRiskScore,
      lineage: evidencePackage.lineage,
      governanceStatus: evidencePackage.governanceStatus,
      refreshStatus: evidencePackage.refreshStatus,
      missingDataFlags: evidencePackage.missingDataFlags,
      feasibilityScore: feasibility?.feasibilityScore ?? evidencePackage.feasibilityScore,
      feasibilityReason: feasibility?.feasibilityReason ?? evidencePackage.feasibilityReason,
      feasibilityConstraints: feasibility?.feasibilityConstraints ?? evidencePackage.feasibilityConstraints,
      feasibilityConfidence: feasibility?.feasibilityConfidence ?? evidencePackage.feasibilityConfidence,
      triggerEventId: triggerEventCompatibility?.triggerEventId ?? evidencePackage.triggerEventId,
      triggerEventCategory: triggerEventCompatibility?.triggerEventCategory ?? evidencePackage.triggerEventCategory,
      triggerEventProbability:
        triggerEventCompatibility?.triggerEventProbability ?? evidencePackage.triggerEventProbability,
      historicalScenarioIds:
        institutionalMemoryCompatibility?.historicalScenarioIds ?? evidencePackage.historicalScenarioIds,
      historicalOutcomeIds:
        institutionalMemoryCompatibility?.historicalOutcomeIds ?? evidencePackage.historicalOutcomeIds,
      behaviorPatternId: institutionalMemoryCompatibility?.behaviorPatternId ?? evidencePackage.behaviorPatternId,
      behaviorPatternCategory:
        institutionalMemoryCompatibility?.behaviorPatternCategory ?? evidencePackage.behaviorPatternCategory,
      successProbability:
        institutionalMemoryCompatibility?.successProbability ?? evidencePackage.successProbability,
      executionRiskScore:
        institutionalMemoryCompatibility?.executionRiskScore ?? evidencePackage.executionRiskScore,
      organizationalCapacityScore:
        institutionalMemoryCompatibility?.organizationalCapacityScore ??
        evidencePackage.organizationalCapacityScore,
      executionBandwidth:
        institutionalMemoryCompatibility?.executionBandwidth ?? evidencePackage.executionBandwidth,
      decisionCollisionIds:
        institutionalMemoryCompatibility?.decisionCollisionIds ?? evidencePackage.decisionCollisionIds,
      collisionCategory: institutionalMemoryCompatibility?.collisionCategory ?? evidencePackage.collisionCategory,
      memoryAdjustedOutcome:
        institutionalMemoryCompatibility?.memoryAdjustedOutcome ?? evidencePackage.memoryAdjustedOutcome,
      historicalRealizationRate:
        institutionalMemoryCompatibility?.historicalRealizationRate ?? evidencePackage.historicalRealizationRate,
      decisionId: decisionCompatibility?.decisionId,
      decisionCategory: decisionCompatibility?.decisionCategory,
      decisionDescription: decisionCompatibility?.decisionDescription,
      indirectRateIds: industryCompatibility?.indirectRateIds ?? [],
      indirectRateAssumptions: industryCompatibility?.indirectRateAssumptions ?? [],
      changeOrderIds: industryCompatibility?.changeOrderIds ?? [],
      changeOrderAssumptions: industryCompatibility?.changeOrderAssumptions ?? [],
      fundingIds: industryCompatibility?.fundingIds ?? [],
      fundingAssumptions: industryCompatibility?.fundingAssumptions ?? [],
      volumeAssumptions: industryCompatibility?.volumeAssumptions ?? [],
      utilizationAssumptions: industryCompatibility?.utilizationAssumptions ?? [],
      assumptions,
      drivers,
      impacts,
      constraints,
      dependencies,
      feasibility,
      version,
      comparison,
      methodology,
      decisionCompatibility,
      industryCompatibility,
      triggerEventCompatibility,
      institutionalMemoryCompatibility,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
