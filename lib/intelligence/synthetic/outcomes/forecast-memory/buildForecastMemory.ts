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

export interface SyntheticForecastAccuracyMetadata {
  forecastAccuracyReferenceIds: string[];
  forecastAccuracyEvidenceIds: string[];
  forecastAccuracyReviewRequired: boolean;
}

export interface SyntheticForecastDriftMetadata {
  forecastDriftReferenceIds: string[];
  forecastDriftEvidenceIds: string[];
  forecastDriftReviewRequired: boolean;
}

export interface SyntheticForecastAssumptionMetadata {
  forecastAssumptionReferenceIds: string[];
  forecastAssumptionEvidenceIds: string[];
  forecastAssumptionReviewRequired: boolean;
}

export interface SyntheticForecastConfidenceMovementMetadata {
  forecastConfidenceMovementReferenceIds: string[];
  forecastConfidenceMovementEvidenceIds: string[];
  forecastConfidenceMovementReviewRequired: boolean;
}

export interface BuildForecastMemoryInput {
  outcomeLearningPackage: SyntheticOutcomeLearningPackage | null;
  forecastReferenceIds?: string[];
  forecastAccuracyMetadata?: SyntheticForecastAccuracyMetadata;
  forecastDriftMetadata?: SyntheticForecastDriftMetadata;
  forecastAssumptionMetadata?: SyntheticForecastAssumptionMetadata;
  forecastConfidenceMovementMetadata?: SyntheticForecastConfidenceMovementMetadata;
}

export interface SyntheticForecastMemory {
  forecastMemoryId: string;
  outcomeLearningPackageId: string;
  outcomeEvidencePackageId: string;
  outcomeCandidateId: string;
  outcomeId: string;
  companyId: string;
  forecastReferenceIds: string[];
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
  forecastAccuracyMetadata?: SyntheticForecastAccuracyMetadata;
  forecastDriftMetadata?: SyntheticForecastDriftMetadata;
  forecastAssumptionMetadata?: SyntheticForecastAssumptionMetadata;
  forecastConfidenceMovementMetadata?: SyntheticForecastConfidenceMovementMetadata;
  outcomeLearningPackage: SyntheticOutcomeLearningPackage;
  warnings: string[];
}

export interface BuildForecastMemoryResult {
  forecastMemory: SyntheticForecastMemory | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function getForecastReferenceIds(input: BuildForecastMemoryInput): string[] {
  return uniqueStable([
    ...(input.forecastReferenceIds ?? []),
    ...(input.outcomeLearningPackage?.outcomeEvidencePackage.outcomeCandidate.metadata.relatedForecastIds ?? []),
  ]);
}

function buildForecastMemoryId(input: BuildForecastMemoryInput): string {
  const outcomeLearningPackage = input.outcomeLearningPackage;

  return `synthetic-forecast-memory:${stableSnapshotHash({
    outcomeLearningPackageId: outcomeLearningPackage?.outcomeLearningPackageId ?? null,
    outcomeEvidencePackageId: outcomeLearningPackage?.outcomeEvidencePackageId ?? null,
    outcomeCandidateId: outcomeLearningPackage?.outcomeCandidateId ?? null,
    outcomeId: outcomeLearningPackage?.outcomeId ?? null,
    companyId: outcomeLearningPackage?.companyId ?? null,
    outcomeCategory: outcomeLearningPackage?.outcomeCategory ?? null,
    outcomeType: outcomeLearningPackage?.outcomeType ?? null,
    outcomeStatus: outcomeLearningPackage?.outcomeStatus ?? null,
    forecastReferenceIds: getForecastReferenceIds(input),
    evidenceReferenceIds: outcomeLearningPackage?.evidenceReferenceIds ?? [],
    forecastAccuracyReferenceIds: input.forecastAccuracyMetadata?.forecastAccuracyReferenceIds ?? [],
    forecastDriftReferenceIds: input.forecastDriftMetadata?.forecastDriftReferenceIds ?? [],
    forecastAssumptionReferenceIds: input.forecastAssumptionMetadata?.forecastAssumptionReferenceIds ?? [],
    forecastConfidenceMovementReferenceIds:
      input.forecastConfidenceMovementMetadata?.forecastConfidenceMovementReferenceIds ?? [],
  })}`;
}

function validateInput(input: BuildForecastMemoryInput): string[] {
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
  if (getForecastReferenceIds(input).length === 0) warnings.push("forecastReferenceIds must include at least one value.");

  return warnings;
}

export function buildForecastMemory(input: BuildForecastMemoryInput): BuildForecastMemoryResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.outcomeLearningPackage) {
    return {
      forecastMemory: null,
      skipped: true,
      warnings,
    };
  }

  const outcomeLearningPackage = input.outcomeLearningPackage;

  return {
    forecastMemory: {
      forecastMemoryId: buildForecastMemoryId(input),
      outcomeLearningPackageId: outcomeLearningPackage.outcomeLearningPackageId,
      outcomeEvidencePackageId: outcomeLearningPackage.outcomeEvidencePackageId,
      outcomeCandidateId: outcomeLearningPackage.outcomeCandidateId,
      outcomeId: outcomeLearningPackage.outcomeId,
      companyId: outcomeLearningPackage.companyId,
      forecastReferenceIds: getForecastReferenceIds(input),
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
      forecastAccuracyMetadata: input.forecastAccuracyMetadata,
      forecastDriftMetadata: input.forecastDriftMetadata,
      forecastAssumptionMetadata: input.forecastAssumptionMetadata,
      forecastConfidenceMovementMetadata: input.forecastConfidenceMovementMetadata,
      outcomeLearningPackage,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
