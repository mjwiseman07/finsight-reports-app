import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticOutcomeEvidencePackage } from "../evidence";
import type {
  SyntheticOutcomeCategory,
  SyntheticOutcomeConfidenceMetadata,
  SyntheticOutcomeGovernanceMetadata,
  SyntheticOutcomeLearningCompatibility,
  SyntheticOutcomeMemoryCompatibility,
  SyntheticOutcomeStatus,
  SyntheticOutcomeTrustMetadata,
} from "../types";

export interface SyntheticOutcomeInterventionCompatibilityMetadata {
  interventionReferenceIds: string[];
  interventionEvidenceIds: string[];
  interventionOutcomeRelationshipIds: string[];
  interventionReviewRequired: boolean;
}

export interface SyntheticOutcomeRecommendationCompatibilityMetadata {
  recommendationReferenceIds: string[];
  recommendationEvidenceIds: string[];
  recommendationOutcomeRelationshipIds: string[];
  recommendationReviewRequired: boolean;
}

export interface SyntheticOutcomeToMemoryEligibilityMetadata {
  memoryEligible: boolean;
  memoryEligibilityReason?: string;
  memoryEligibilityEvidenceIds: string[];
  memoryEligibilityReviewRequired: boolean;
}

export interface SyntheticOutcomeToKnowledgeEligibilityMetadata {
  knowledgeEligible: boolean;
  knowledgeEligibilityReason?: string;
  knowledgeEligibilityEvidenceIds: string[];
  knowledgeEligibilityReviewRequired: boolean;
}

export interface BuildOutcomeLearningInput {
  outcomeEvidencePackage: SyntheticOutcomeEvidencePackage | null;
  interventionCompatibilityMetadata?: SyntheticOutcomeInterventionCompatibilityMetadata;
  recommendationCompatibilityMetadata?: SyntheticOutcomeRecommendationCompatibilityMetadata;
  outcomeToMemoryEligibilityMetadata?: SyntheticOutcomeToMemoryEligibilityMetadata;
  outcomeToKnowledgeEligibilityMetadata?: SyntheticOutcomeToKnowledgeEligibilityMetadata;
}

export interface SyntheticOutcomeLearningPackage {
  outcomeLearningPackageId: string;
  outcomeEvidencePackageId: string;
  outcomeCandidateId: string;
  outcomeId: string;
  companyId: string;
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
  interventionCompatibilityMetadata?: SyntheticOutcomeInterventionCompatibilityMetadata;
  recommendationCompatibilityMetadata?: SyntheticOutcomeRecommendationCompatibilityMetadata;
  outcomeToMemoryEligibilityMetadata?: SyntheticOutcomeToMemoryEligibilityMetadata;
  outcomeToKnowledgeEligibilityMetadata?: SyntheticOutcomeToKnowledgeEligibilityMetadata;
  outcomeEvidencePackage: SyntheticOutcomeEvidencePackage;
  warnings: string[];
}

export interface BuildOutcomeLearningResult {
  outcomeLearningPackage: SyntheticOutcomeLearningPackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function buildOutcomeLearningPackageId(input: BuildOutcomeLearningInput): string {
  const outcomeEvidencePackage = input.outcomeEvidencePackage;

  return `synthetic-outcome-learning:${stableSnapshotHash({
    outcomeEvidencePackageId: outcomeEvidencePackage?.outcomeEvidencePackageId ?? null,
    outcomeCandidateId: outcomeEvidencePackage?.outcomeCandidateId ?? null,
    outcomeId: outcomeEvidencePackage?.outcomeId ?? null,
    companyId: outcomeEvidencePackage?.companyId ?? null,
    outcomeCategory: outcomeEvidencePackage?.outcomeCategory ?? null,
    outcomeType: outcomeEvidencePackage?.outcomeType ?? null,
    outcomeStatus: outcomeEvidencePackage?.outcomeStatus ?? null,
    evidenceReferenceIds: outcomeEvidencePackage?.evidenceReferenceIds ?? [],
    sourceReferenceIds: outcomeEvidencePackage?.sourceReferenceIds ?? [],
    lineageReferenceIds: outcomeEvidencePackage?.lineageReferenceIds ?? [],
    memoryReferenceIds: outcomeEvidencePackage?.memoryCompatibility?.memoryReferenceIds ?? [],
    learningReferenceIds: outcomeEvidencePackage?.learningCompatibility?.learningReferenceIds ?? [],
    interventionReferenceIds: input.interventionCompatibilityMetadata?.interventionReferenceIds ?? [],
    recommendationReferenceIds: input.recommendationCompatibilityMetadata?.recommendationReferenceIds ?? [],
    memoryEligibilityEvidenceIds: input.outcomeToMemoryEligibilityMetadata?.memoryEligibilityEvidenceIds ?? [],
    knowledgeEligibilityEvidenceIds: input.outcomeToKnowledgeEligibilityMetadata?.knowledgeEligibilityEvidenceIds ?? [],
  })}`;
}

function validateInput(input: BuildOutcomeLearningInput): string[] {
  const warnings: string[] = [];
  const outcomeEvidencePackage = input.outcomeEvidencePackage;

  if (!outcomeEvidencePackage) {
    warnings.push("outcomeEvidencePackage is required.");
    return warnings;
  }

  if (!hasValue(outcomeEvidencePackage.outcomeEvidencePackageId)) {
    warnings.push("outcomeEvidencePackageId is required.");
  }
  if (!hasValue(outcomeEvidencePackage.outcomeCandidateId)) warnings.push("outcomeCandidateId is required.");
  if (!hasValue(outcomeEvidencePackage.outcomeId)) warnings.push("outcomeId is required.");
  if (!hasValue(outcomeEvidencePackage.companyId)) warnings.push("companyId is required.");
  if (!hasValue(outcomeEvidencePackage.outcomeCategory)) warnings.push("outcomeCategory is required.");
  if (!hasValue(outcomeEvidencePackage.outcomeType)) warnings.push("outcomeType is required.");
  if (!hasValue(outcomeEvidencePackage.outcomeStatus)) warnings.push("outcomeStatus is required.");
  if (!Array.isArray(outcomeEvidencePackage.evidenceReferenceIds)) {
    warnings.push("evidenceReferenceIds must be an array.");
  }
  if (!Array.isArray(outcomeEvidencePackage.sourceReferenceIds)) {
    warnings.push("sourceReferenceIds must be an array.");
  }
  if (!Array.isArray(outcomeEvidencePackage.lineageReferenceIds)) {
    warnings.push("lineageReferenceIds must be an array.");
  }

  return warnings;
}

export function buildOutcomeLearning(input: BuildOutcomeLearningInput): BuildOutcomeLearningResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.outcomeEvidencePackage) {
    return {
      outcomeLearningPackage: null,
      skipped: true,
      warnings,
    };
  }

  const outcomeEvidencePackage = input.outcomeEvidencePackage;

  return {
    outcomeLearningPackage: {
      outcomeLearningPackageId: buildOutcomeLearningPackageId(input),
      outcomeEvidencePackageId: outcomeEvidencePackage.outcomeEvidencePackageId,
      outcomeCandidateId: outcomeEvidencePackage.outcomeCandidateId,
      outcomeId: outcomeEvidencePackage.outcomeId,
      companyId: outcomeEvidencePackage.companyId,
      outcomeCategory: outcomeEvidencePackage.outcomeCategory,
      outcomeType: outcomeEvidencePackage.outcomeType,
      outcomeStatus: outcomeEvidencePackage.outcomeStatus,
      evidenceReferenceIds: outcomeEvidencePackage.evidenceReferenceIds,
      sourceReferenceIds: outcomeEvidencePackage.sourceReferenceIds,
      lineageReferenceIds: outcomeEvidencePackage.lineageReferenceIds,
      trustMetadata: outcomeEvidencePackage.trustMetadata,
      confidenceMetadata: outcomeEvidencePackage.confidenceMetadata,
      governanceMetadata: outcomeEvidencePackage.governanceMetadata,
      memoryCompatibility: outcomeEvidencePackage.memoryCompatibility,
      learningCompatibility: outcomeEvidencePackage.learningCompatibility,
      interventionCompatibilityMetadata: input.interventionCompatibilityMetadata,
      recommendationCompatibilityMetadata: input.recommendationCompatibilityMetadata,
      outcomeToMemoryEligibilityMetadata: input.outcomeToMemoryEligibilityMetadata,
      outcomeToKnowledgeEligibilityMetadata: input.outcomeToKnowledgeEligibilityMetadata,
      outcomeEvidencePackage,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
