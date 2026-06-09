import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticOutcomeLearningPackage } from "../learning";
import type {
  SyntheticOutcomeCategory,
  SyntheticOutcomeConfidenceMetadata,
  SyntheticOutcomeGovernanceMetadata,
  SyntheticOutcomeLearningCompatibility,
  SyntheticOutcomeMemoryCompatibility,
  SyntheticOutcomeStatus,
  SyntheticOutcomeTrustMetadata,
} from "../types";

export interface SyntheticRecommendationSuccessMetadata {
  recommendationSuccessReferenceIds: string[];
  recommendationSuccessEvidenceIds: string[];
  recommendationSuccessReviewRequired: boolean;
}

export interface SyntheticRecommendationFailureMetadata {
  recommendationFailureReferenceIds: string[];
  recommendationFailureEvidenceIds: string[];
  recommendationFailureReviewRequired: boolean;
}

export interface SyntheticRecommendationEffectivenessMetadata {
  recommendationEffectivenessReferenceIds: string[];
  recommendationEffectivenessEvidenceIds: string[];
  recommendationEffectivenessReviewRequired: boolean;
}

export interface SyntheticRecommendationRecurrenceMetadata {
  recommendationRecurrenceReferenceIds: string[];
  recommendationRecurrenceEvidenceIds: string[];
  recommendationRecurrenceReviewRequired: boolean;
}

export interface SyntheticRecommendationInterventionHistoryMetadata {
  interventionHistoryReferenceIds: string[];
  interventionHistoryEvidenceIds: string[];
  interventionHistoryReviewRequired: boolean;
}

export interface BuildRecommendationMemoryInput {
  outcomeLearningPackage: SyntheticOutcomeLearningPackage | null;
  recommendationReferenceIds?: string[];
  recommendationSuccessMetadata?: SyntheticRecommendationSuccessMetadata;
  recommendationFailureMetadata?: SyntheticRecommendationFailureMetadata;
  recommendationEffectivenessMetadata?: SyntheticRecommendationEffectivenessMetadata;
  recommendationRecurrenceMetadata?: SyntheticRecommendationRecurrenceMetadata;
  interventionHistoryMetadata?: SyntheticRecommendationInterventionHistoryMetadata;
}

export interface SyntheticRecommendationMemory {
  recommendationMemoryId: string;
  outcomeLearningPackageId: string;
  outcomeEvidencePackageId: string;
  outcomeCandidateId: string;
  outcomeId: string;
  companyId: string;
  recommendationReferenceIds: string[];
  outcomeReferenceIds: string[];
  outcomeCategory: SyntheticOutcomeCategory;
  outcomeType: string;
  outcomeStatus: SyntheticOutcomeStatus;
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  trustMetadata?: SyntheticOutcomeTrustMetadata;
  confidenceMetadata?: SyntheticOutcomeConfidenceMetadata;
  governanceMetadata?: SyntheticOutcomeGovernanceMetadata;
  memoryCompatibility?: SyntheticOutcomeMemoryCompatibility;
  learningCompatibility?: SyntheticOutcomeLearningCompatibility;
  recommendationSuccessMetadata?: SyntheticRecommendationSuccessMetadata;
  recommendationFailureMetadata?: SyntheticRecommendationFailureMetadata;
  recommendationEffectivenessMetadata?: SyntheticRecommendationEffectivenessMetadata;
  recommendationRecurrenceMetadata?: SyntheticRecommendationRecurrenceMetadata;
  interventionHistoryMetadata?: SyntheticRecommendationInterventionHistoryMetadata;
  outcomeLearningPackage: SyntheticOutcomeLearningPackage;
  warnings: string[];
}

export interface BuildRecommendationMemoryResult {
  recommendationMemory: SyntheticRecommendationMemory | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function getRecommendationReferenceIds(input: BuildRecommendationMemoryInput): string[] {
  return uniqueStable([
    ...(input.recommendationReferenceIds ?? []),
    ...(input.outcomeLearningPackage?.outcomeEvidencePackage.outcomeCandidate.metadata.relatedRecommendationIds ?? []),
    ...(input.outcomeLearningPackage?.recommendationCompatibilityMetadata?.recommendationReferenceIds ?? []),
  ]);
}

function buildRecommendationMemoryId(input: BuildRecommendationMemoryInput): string {
  const outcomeLearningPackage = input.outcomeLearningPackage;

  return `synthetic-recommendation-memory:${stableSnapshotHash({
    outcomeLearningPackageId: outcomeLearningPackage?.outcomeLearningPackageId ?? null,
    outcomeEvidencePackageId: outcomeLearningPackage?.outcomeEvidencePackageId ?? null,
    outcomeCandidateId: outcomeLearningPackage?.outcomeCandidateId ?? null,
    outcomeId: outcomeLearningPackage?.outcomeId ?? null,
    companyId: outcomeLearningPackage?.companyId ?? null,
    outcomeCategory: outcomeLearningPackage?.outcomeCategory ?? null,
    outcomeType: outcomeLearningPackage?.outcomeType ?? null,
    outcomeStatus: outcomeLearningPackage?.outcomeStatus ?? null,
    recommendationReferenceIds: getRecommendationReferenceIds(input),
    evidenceReferenceIds: outcomeLearningPackage?.evidenceReferenceIds ?? [],
    recommendationSuccessReferenceIds: input.recommendationSuccessMetadata?.recommendationSuccessReferenceIds ?? [],
    recommendationFailureReferenceIds: input.recommendationFailureMetadata?.recommendationFailureReferenceIds ?? [],
    recommendationEffectivenessReferenceIds:
      input.recommendationEffectivenessMetadata?.recommendationEffectivenessReferenceIds ?? [],
    recommendationRecurrenceReferenceIds:
      input.recommendationRecurrenceMetadata?.recommendationRecurrenceReferenceIds ?? [],
    interventionHistoryReferenceIds: input.interventionHistoryMetadata?.interventionHistoryReferenceIds ?? [],
  })}`;
}

function validateInput(input: BuildRecommendationMemoryInput): string[] {
  const warnings: string[] = [];
  const outcomeLearningPackage = input.outcomeLearningPackage;

  if (!outcomeLearningPackage) {
    warnings.push("outcomeLearningPackage is required.");
    return warnings;
  }

  if (!hasValue(outcomeLearningPackage.outcomeLearningPackageId)) {
    warnings.push("outcomeLearningPackageId is required.");
  }
  if (!hasValue(outcomeLearningPackage.outcomeEvidencePackageId)) {
    warnings.push("outcomeEvidencePackageId is required.");
  }
  if (!hasValue(outcomeLearningPackage.outcomeCandidateId)) warnings.push("outcomeCandidateId is required.");
  if (!hasValue(outcomeLearningPackage.outcomeId)) warnings.push("outcomeId is required.");
  if (!hasValue(outcomeLearningPackage.companyId)) warnings.push("companyId is required.");
  if (!hasValue(outcomeLearningPackage.outcomeCategory)) warnings.push("outcomeCategory is required.");
  if (!hasValue(outcomeLearningPackage.outcomeType)) warnings.push("outcomeType is required.");
  if (!hasValue(outcomeLearningPackage.outcomeStatus)) warnings.push("outcomeStatus is required.");
  if (getRecommendationReferenceIds(input).length === 0) {
    warnings.push("recommendationReferenceIds must include at least one value.");
  }

  return warnings;
}

export function buildRecommendationMemory(
  input: BuildRecommendationMemoryInput,
): BuildRecommendationMemoryResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.outcomeLearningPackage) {
    return {
      recommendationMemory: null,
      skipped: true,
      warnings,
    };
  }

  const outcomeLearningPackage = input.outcomeLearningPackage;

  return {
    recommendationMemory: {
      recommendationMemoryId: buildRecommendationMemoryId(input),
      outcomeLearningPackageId: outcomeLearningPackage.outcomeLearningPackageId,
      outcomeEvidencePackageId: outcomeLearningPackage.outcomeEvidencePackageId,
      outcomeCandidateId: outcomeLearningPackage.outcomeCandidateId,
      outcomeId: outcomeLearningPackage.outcomeId,
      companyId: outcomeLearningPackage.companyId,
      recommendationReferenceIds: getRecommendationReferenceIds(input),
      outcomeReferenceIds: [outcomeLearningPackage.outcomeId],
      outcomeCategory: outcomeLearningPackage.outcomeCategory,
      outcomeType: outcomeLearningPackage.outcomeType,
      outcomeStatus: outcomeLearningPackage.outcomeStatus,
      evidenceReferenceIds: outcomeLearningPackage.evidenceReferenceIds,
      sourceReferenceIds: outcomeLearningPackage.sourceReferenceIds,
      lineageReferenceIds: outcomeLearningPackage.lineageReferenceIds,
      trustMetadata: outcomeLearningPackage.trustMetadata,
      confidenceMetadata: outcomeLearningPackage.confidenceMetadata,
      governanceMetadata: outcomeLearningPackage.governanceMetadata,
      memoryCompatibility: outcomeLearningPackage.memoryCompatibility,
      learningCompatibility: outcomeLearningPackage.learningCompatibility,
      recommendationSuccessMetadata: input.recommendationSuccessMetadata,
      recommendationFailureMetadata: input.recommendationFailureMetadata,
      recommendationEffectivenessMetadata: input.recommendationEffectivenessMetadata,
      recommendationRecurrenceMetadata: input.recommendationRecurrenceMetadata,
      interventionHistoryMetadata: input.interventionHistoryMetadata,
      outcomeLearningPackage,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
