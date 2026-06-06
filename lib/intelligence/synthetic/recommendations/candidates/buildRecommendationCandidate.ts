import { stableSnapshotHash } from "../../historical-snapshots";
import {
  SYNTHETIC_RECOMMENDATION_ACTIONABILITY_TYPES,
  SYNTHETIC_RECOMMENDATION_AUDIENCES,
  SYNTHETIC_RECOMMENDATION_CATEGORIES,
  SYNTHETIC_RECOMMENDATION_TYPES,
} from "../constants";
import type { SyntheticRecommendationEvidencePackage } from "../evidence";
import type {
  SyntheticRecommendationActionabilityType,
  SyntheticRecommendationAudience,
  SyntheticRecommendationCategory,
  SyntheticRecommendationConflict,
  SyntheticRecommendationEffort,
  SyntheticRecommendationImpact,
  SyntheticRecommendationLineage,
  SyntheticRecommendationMaterialityStatus,
  SyntheticRecommendationOwnership,
  SyntheticRecommendationType,
} from "../types";

export interface SyntheticRecommendationCandidateFocus {
  focusType: string;
  labels: string[];
}

export interface SyntheticRecommendationCandidateRiskMetadata {
  riskId: string;
  riskCategory: string;
  riskSeverity?: string;
  riskConfidence?: number;
}

export interface BuildRecommendationCandidateInput {
  companyId: string;
  recommendationCategory: SyntheticRecommendationCategory;
  recommendationType: SyntheticRecommendationType;
  audience: SyntheticRecommendationAudience;
  evidencePackage: SyntheticRecommendationEvidencePackage | null;
  actionabilityType?: SyntheticRecommendationActionabilityType;
  materialityStatus?: SyntheticRecommendationMaterialityStatus;
  impact?: Partial<SyntheticRecommendationImpact>;
  effort?: Partial<SyntheticRecommendationEffort>;
  ownership?: SyntheticRecommendationOwnership[];
  dependencies?: {
    dependencyIds: string[];
    dependencyType: string;
    dependencyDescription?: string;
    blockingDependency?: boolean;
    optionalDependency?: boolean;
  }[];
  conflicts?: Partial<SyntheticRecommendationConflict>[];
  riskIndicators?: SyntheticRecommendationCandidateRiskMetadata[];
  workingCapitalIndicators?: string[];
}

export interface SyntheticStructuredRecommendationCandidate {
  recommendationId: string;
  companyId: string;
  recommendationCategory: SyntheticRecommendationCategory;
  recommendationType: SyntheticRecommendationType;
  audience: SyntheticRecommendationAudience;
  actionabilityType: SyntheticRecommendationActionabilityType;
  materialityStatus: SyntheticRecommendationMaterialityStatus;
  evidenceId: string;
  recommendationFocus: SyntheticRecommendationCandidateFocus;
  impactFocus: SyntheticRecommendationCandidateFocus;
  effortFocus: SyntheticRecommendationCandidateFocus;
  ownershipFocus: SyntheticRecommendationCandidateFocus;
  dependencyFocus: SyntheticRecommendationCandidateFocus;
  conflictFocus: SyntheticRecommendationCandidateFocus;
  riskFocus: SyntheticRecommendationCandidateFocus;
  workingCapitalFocus: SyntheticRecommendationCandidateFocus;
  supportingCommentaryIds: string[];
  supportingObservationIds: string[];
  supportingPatternIds: string[];
  supportingMemoryIds: string[];
  supportingSourceReferenceIds: string[];
  supportingDriverIds: string[];
  supportingRiskIds: string[];
  confidenceScore: number;
  confidenceReason: string;
  evidenceStrength: SyntheticRecommendationEvidencePackage["evidenceStrength"];
  dataCompletenessScore: number;
  recommendationConfidence: number;
  lineage: SyntheticRecommendationLineage;
  governanceStatus: SyntheticRecommendationEvidencePackage["governanceStatus"];
  refreshStatus: SyntheticRecommendationEvidencePackage["refreshStatus"];
  recommendationOutcomeStatus: SyntheticRecommendationEvidencePackage["recommendationOutcomeStatus"];
  expectedImpact: SyntheticRecommendationEvidencePackage["expectedImpact"];
  actualImpact: SyntheticRecommendationEvidencePackage["actualImpact"];
  impactVariance: SyntheticRecommendationEvidencePackage["impactVariance"];
  outcomeConfidence: SyntheticRecommendationEvidencePackage["outcomeConfidence"];
  recommendationPortfolioIds: string[];
  portfolioPriority?: string;
  simulationEligible: boolean;
  simulationAssumptions: string[];
  simulationInputs: string[];
  simulationDependencies: string[];
  simulationConstraints: string[];
  impact: Partial<SyntheticRecommendationImpact>;
  effort: Partial<SyntheticRecommendationEffort>;
  ownership: SyntheticRecommendationOwnership[];
  dependencies: BuildRecommendationCandidateInput["dependencies"];
  conflicts: Partial<SyntheticRecommendationConflict>[];
  riskIndicators: SyntheticRecommendationCandidateRiskMetadata[];
  workingCapitalIndicators: string[];
  warnings: string[];
}

export interface BuildRecommendationCandidateResult {
  candidate: SyntheticStructuredRecommendationCandidate | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function hasSupportingEvidence(evidencePackage: SyntheticRecommendationEvidencePackage): boolean {
  return (
    evidencePackage.supportingCommentaryIds.length > 0 ||
    evidencePackage.supportingObservationIds.length > 0 ||
    evidencePackage.supportingPatternIds.length > 0 ||
    evidencePackage.supportingMemoryIds.length > 0 ||
    evidencePackage.supportingSourceReferenceIds.length > 0 ||
    evidencePackage.supportingDriverIds.length > 0 ||
    evidencePackage.supportingRiskIds.length > 0
  );
}

function buildRecommendationId(input: BuildRecommendationCandidateInput): string {
  return `recommendation-candidate:${stableSnapshotHash({
    companyId: input.companyId,
    recommendationCategory: input.recommendationCategory,
    recommendationType: input.recommendationType,
    audience: input.audience,
    evidenceId: input.evidencePackage?.evidenceId ?? null,
    supportingCommentaryIds: input.evidencePackage?.supportingCommentaryIds ?? [],
    supportingObservationIds: input.evidencePackage?.supportingObservationIds ?? [],
    supportingPatternIds: input.evidencePackage?.supportingPatternIds ?? [],
    supportingMemoryIds: input.evidencePackage?.supportingMemoryIds ?? [],
    supportingSourceReferenceIds: input.evidencePackage?.supportingSourceReferenceIds ?? [],
    supportingDriverIds: input.evidencePackage?.supportingDriverIds ?? [],
    supportingRiskIds: input.evidencePackage?.supportingRiskIds ?? [],
  })}`;
}

function buildFocus(focusType: string, labels: string[]): SyntheticRecommendationCandidateFocus {
  return {
    focusType,
    labels: uniqueSorted(labels),
  };
}

function validateInput(input: BuildRecommendationCandidateInput): string[] {
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
  if (
    input.actionabilityType !== undefined &&
    !SYNTHETIC_RECOMMENDATION_ACTIONABILITY_TYPES.includes(input.actionabilityType)
  ) {
    warnings.push("actionabilityType is not supported.");
  }
  if (!input.evidencePackage) {
    warnings.push("evidencePackage is required.");
    return warnings;
  }
  if (input.evidencePackage.companyId !== input.companyId) {
    warnings.push("evidence package companyId must match input companyId.");
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
  if (!hasValue(input.evidencePackage.evidenceStrength)) {
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

export function buildRecommendationCandidate(
  input: BuildRecommendationCandidateInput,
): BuildRecommendationCandidateResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.evidencePackage) {
    return {
      candidate: null,
      skipped: true,
      warnings,
    };
  }

  const evidencePackage = input.evidencePackage;
  const actionabilityType = input.actionabilityType ?? "review_recommendation";
  const materialityStatus = input.materialityStatus ?? evidencePackage.materialityStatus;
  const riskIndicators = input.riskIndicators ?? [];
  const workingCapitalIndicators = input.workingCapitalIndicators ?? [];
  const dependencies = input.dependencies ?? [];
  const conflicts = input.conflicts ?? [];
  const ownership = input.ownership ?? [];

  return {
    candidate: {
      recommendationId: buildRecommendationId(input),
      companyId: input.companyId,
      recommendationCategory: input.recommendationCategory,
      recommendationType: input.recommendationType,
      audience: input.audience,
      actionabilityType,
      materialityStatus,
      evidenceId: evidencePackage.evidenceId,
      recommendationFocus: buildFocus("recommendation_metadata", [
        input.recommendationCategory,
        input.recommendationType,
        input.audience,
        actionabilityType,
      ]),
      impactFocus: buildFocus("impact_metadata", Object.keys(input.impact ?? {})),
      effortFocus: buildFocus("effort_metadata", Object.keys(input.effort ?? {})),
      ownershipFocus: buildFocus(
        "ownership_metadata",
        ownership.map((owner) => owner.ownershipType),
      ),
      dependencyFocus: buildFocus(
        "dependency_metadata",
        dependencies.flatMap((dependency) => [dependency.dependencyType, ...dependency.dependencyIds]),
      ),
      conflictFocus: buildFocus(
        "conflict_metadata",
        conflicts.flatMap((conflict) => [
          conflict.conflictType ?? "",
          conflict.conflictSeverity ?? "",
          ...(conflict.conflictingRecommendationIds ?? []),
        ]),
      ),
      riskFocus: buildFocus(
        "risk_metadata",
        riskIndicators.map((riskIndicator) => riskIndicator.riskCategory),
      ),
      workingCapitalFocus: buildFocus("working_capital_metadata", workingCapitalIndicators),
      supportingCommentaryIds: evidencePackage.supportingCommentaryIds,
      supportingObservationIds: evidencePackage.supportingObservationIds,
      supportingPatternIds: evidencePackage.supportingPatternIds,
      supportingMemoryIds: evidencePackage.supportingMemoryIds,
      supportingSourceReferenceIds: evidencePackage.supportingSourceReferenceIds,
      supportingDriverIds: evidencePackage.supportingDriverIds,
      supportingRiskIds: evidencePackage.supportingRiskIds,
      confidenceScore: evidencePackage.confidenceScore,
      confidenceReason: evidencePackage.confidenceReason,
      evidenceStrength: evidencePackage.evidenceStrength,
      dataCompletenessScore: evidencePackage.dataCompletenessScore,
      recommendationConfidence: evidencePackage.recommendationConfidence,
      lineage: evidencePackage.lineage,
      governanceStatus: evidencePackage.governanceStatus,
      refreshStatus: evidencePackage.refreshStatus,
      recommendationOutcomeStatus: evidencePackage.recommendationOutcomeStatus,
      expectedImpact: evidencePackage.expectedImpact,
      actualImpact: evidencePackage.actualImpact,
      impactVariance: evidencePackage.impactVariance,
      outcomeConfidence: evidencePackage.outcomeConfidence,
      recommendationPortfolioIds: evidencePackage.recommendationPortfolioIds,
      portfolioPriority: evidencePackage.portfolioPriority,
      simulationEligible: evidencePackage.simulationEligible,
      simulationAssumptions: evidencePackage.simulationAssumptions,
      simulationInputs: evidencePackage.simulationInputs,
      simulationDependencies: [],
      simulationConstraints: [],
      impact: input.impact ?? {},
      effort: input.effort ?? {},
      ownership,
      dependencies,
      conflicts,
      riskIndicators,
      workingCapitalIndicators,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
