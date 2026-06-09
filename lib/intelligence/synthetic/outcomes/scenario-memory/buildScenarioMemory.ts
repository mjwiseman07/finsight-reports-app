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

export interface SyntheticScenarioRealizationMetadata {
  scenarioRealizationReferenceIds: string[];
  scenarioRealizationEvidenceIds: string[];
  scenarioRealizationReviewRequired: boolean;
}

export interface SyntheticScenarioAssumptionMetadata {
  scenarioAssumptionReferenceIds: string[];
  scenarioAssumptionEvidenceIds: string[];
  scenarioAssumptionReviewRequired: boolean;
}

export interface SyntheticScenarioVarianceMetadata {
  scenarioVarianceReferenceIds: string[];
  scenarioVarianceEvidenceIds: string[];
  scenarioVarianceReviewRequired: boolean;
}

export interface SyntheticScenarioConfidenceMovementMetadata {
  scenarioConfidenceMovementReferenceIds: string[];
  scenarioConfidenceMovementEvidenceIds: string[];
  scenarioConfidenceMovementReviewRequired: boolean;
}

export interface BuildScenarioMemoryInput {
  outcomeLearningPackage: SyntheticOutcomeLearningPackage | null;
  scenarioReferenceIds?: string[];
  scenarioRealizationMetadata?: SyntheticScenarioRealizationMetadata;
  scenarioAssumptionMetadata?: SyntheticScenarioAssumptionMetadata;
  scenarioVarianceMetadata?: SyntheticScenarioVarianceMetadata;
  scenarioConfidenceMovementMetadata?: SyntheticScenarioConfidenceMovementMetadata;
}

export interface SyntheticScenarioMemory {
  scenarioMemoryId: string;
  outcomeLearningPackageId: string;
  outcomeEvidencePackageId: string;
  outcomeCandidateId: string;
  outcomeId: string;
  companyId: string;
  scenarioReferenceIds: string[];
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
  scenarioRealizationMetadata?: SyntheticScenarioRealizationMetadata;
  scenarioAssumptionMetadata?: SyntheticScenarioAssumptionMetadata;
  scenarioVarianceMetadata?: SyntheticScenarioVarianceMetadata;
  scenarioConfidenceMovementMetadata?: SyntheticScenarioConfidenceMovementMetadata;
  outcomeLearningPackage: SyntheticOutcomeLearningPackage;
  warnings: string[];
}

export interface BuildScenarioMemoryResult {
  scenarioMemory: SyntheticScenarioMemory | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function getScenarioReferenceIds(input: BuildScenarioMemoryInput): string[] {
  return uniqueStable([
    ...(input.scenarioReferenceIds ?? []),
    ...(input.outcomeLearningPackage?.outcomeEvidencePackage.outcomeCandidate.metadata.relatedScenarioIds ?? []),
  ]);
}

function buildScenarioMemoryId(input: BuildScenarioMemoryInput): string {
  const outcomeLearningPackage = input.outcomeLearningPackage;

  return `synthetic-scenario-memory:${stableSnapshotHash({
    outcomeLearningPackageId: outcomeLearningPackage?.outcomeLearningPackageId ?? null,
    outcomeEvidencePackageId: outcomeLearningPackage?.outcomeEvidencePackageId ?? null,
    outcomeCandidateId: outcomeLearningPackage?.outcomeCandidateId ?? null,
    outcomeId: outcomeLearningPackage?.outcomeId ?? null,
    companyId: outcomeLearningPackage?.companyId ?? null,
    outcomeCategory: outcomeLearningPackage?.outcomeCategory ?? null,
    outcomeType: outcomeLearningPackage?.outcomeType ?? null,
    outcomeStatus: outcomeLearningPackage?.outcomeStatus ?? null,
    scenarioReferenceIds: getScenarioReferenceIds(input),
    evidenceReferenceIds: outcomeLearningPackage?.evidenceReferenceIds ?? [],
    scenarioRealizationReferenceIds: input.scenarioRealizationMetadata?.scenarioRealizationReferenceIds ?? [],
    scenarioAssumptionReferenceIds: input.scenarioAssumptionMetadata?.scenarioAssumptionReferenceIds ?? [],
    scenarioVarianceReferenceIds: input.scenarioVarianceMetadata?.scenarioVarianceReferenceIds ?? [],
    scenarioConfidenceMovementReferenceIds:
      input.scenarioConfidenceMovementMetadata?.scenarioConfidenceMovementReferenceIds ?? [],
  })}`;
}

function validateInput(input: BuildScenarioMemoryInput): string[] {
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
  if (getScenarioReferenceIds(input).length === 0) warnings.push("scenarioReferenceIds must include at least one value.");

  return warnings;
}

export function buildScenarioMemory(input: BuildScenarioMemoryInput): BuildScenarioMemoryResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.outcomeLearningPackage) {
    return {
      scenarioMemory: null,
      skipped: true,
      warnings,
    };
  }

  const outcomeLearningPackage = input.outcomeLearningPackage;

  return {
    scenarioMemory: {
      scenarioMemoryId: buildScenarioMemoryId(input),
      outcomeLearningPackageId: outcomeLearningPackage.outcomeLearningPackageId,
      outcomeEvidencePackageId: outcomeLearningPackage.outcomeEvidencePackageId,
      outcomeCandidateId: outcomeLearningPackage.outcomeCandidateId,
      outcomeId: outcomeLearningPackage.outcomeId,
      companyId: outcomeLearningPackage.companyId,
      scenarioReferenceIds: getScenarioReferenceIds(input),
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
      scenarioRealizationMetadata: input.scenarioRealizationMetadata,
      scenarioAssumptionMetadata: input.scenarioAssumptionMetadata,
      scenarioVarianceMetadata: input.scenarioVarianceMetadata,
      scenarioConfidenceMovementMetadata: input.scenarioConfidenceMovementMetadata,
      outcomeLearningPackage,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
