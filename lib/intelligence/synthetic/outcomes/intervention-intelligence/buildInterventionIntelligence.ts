import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticAdoptionIntelligence } from "../adoption-intelligence";
import type { SyntheticCapabilityIntelligence } from "../capability-intelligence";
import type { SyntheticControllerMemory } from "../controller-memory";
import type { SyntheticDecisionMemory } from "../decision-memory";
import type { SyntheticForecastMemory } from "../forecast-memory";
import type { SyntheticLearningConfidence } from "../learning-confidence";
import type { SyntheticLearningSurface } from "../learning-surfaces";
import type { SyntheticOutcomeLearningPackage } from "../learning";
import type { SyntheticPortfolioMemory } from "../portfolio-memory";
import type { SyntheticRecommendationMemory } from "../recommendation-memory";
import type { SyntheticScenarioMemory } from "../scenario-memory";
import type { SyntheticTimeSavingsIntelligence } from "../time-savings-intelligence";
import type {
  SyntheticOutcomeConfidenceMetadata,
  SyntheticOutcomeGovernanceMetadata,
  SyntheticOutcomeLearningCompatibility,
  SyntheticOutcomeMemoryCompatibility,
  SyntheticOutcomeTrustMetadata,
} from "../types";

export interface SyntheticInterventionCategoryMetadata {
  interventionCategoryReferenceIds: string[];
  interventionCategoryEvidenceIds: string[];
  interventionCategoryReviewRequired: boolean;
}

export interface SyntheticInterventionSuccessMetadata {
  interventionSuccessReferenceIds: string[];
  interventionSuccessEvidenceIds: string[];
  interventionSuccessReviewRequired: boolean;
}

export interface SyntheticInterventionFailureMetadata {
  interventionFailureReferenceIds: string[];
  interventionFailureEvidenceIds: string[];
  interventionFailureReviewRequired: boolean;
}

export interface SyntheticInterventionEffectivenessMetadata {
  interventionEffectivenessReferenceIds: string[];
  interventionEffectivenessEvidenceIds: string[];
  interventionEffectivenessReviewRequired: boolean;
}

export interface SyntheticInterventionRecurrenceMetadata {
  interventionRecurrenceReferenceIds: string[];
  interventionRecurrenceEvidenceIds: string[];
  interventionRecurrenceReviewRequired: boolean;
}

export interface SyntheticInterventionTimeSavingsCompatibilityMetadata {
  timeSavingsCompatibilityReferenceIds: string[];
  timeSavingsCompatibilityEvidenceIds: string[];
  timeSavingsCompatibilityReviewRequired: boolean;
}

export interface SyntheticInterventionCapabilityCompatibilityMetadata {
  capabilityCompatibilityReferenceIds: string[];
  capabilityCompatibilityEvidenceIds: string[];
  capabilityCompatibilityReviewRequired: boolean;
}

export interface SyntheticInterventionAdoptionCompatibilityMetadata {
  adoptionCompatibilityReferenceIds: string[];
  adoptionCompatibilityEvidenceIds: string[];
  adoptionCompatibilityReviewRequired: boolean;
}

export interface BuildInterventionIntelligenceInput {
  interventionIntelligenceKey: string;
  interventionReferenceIds: string[];
  problemReferenceIds: string[];
  outcomeLearningPackages?: SyntheticOutcomeLearningPackage[];
  decisionMemories?: SyntheticDecisionMemory[];
  forecastMemories?: SyntheticForecastMemory[];
  scenarioMemories?: SyntheticScenarioMemory[];
  controllerMemories?: SyntheticControllerMemory[];
  portfolioMemories?: SyntheticPortfolioMemory[];
  recommendationMemories?: SyntheticRecommendationMemory[];
  learningConfidencePackages?: SyntheticLearningConfidence[];
  learningSurfaces?: SyntheticLearningSurface[];
  capabilityIntelligencePackages?: SyntheticCapabilityIntelligence[];
  adoptionIntelligencePackages?: SyntheticAdoptionIntelligence[];
  timeSavingsIntelligencePackages?: SyntheticTimeSavingsIntelligence[];
  interventionCategoryMetadata?: SyntheticInterventionCategoryMetadata;
  interventionSuccessMetadata?: SyntheticInterventionSuccessMetadata;
  interventionFailureMetadata?: SyntheticInterventionFailureMetadata;
  interventionEffectivenessMetadata?: SyntheticInterventionEffectivenessMetadata;
  interventionRecurrenceMetadata?: SyntheticInterventionRecurrenceMetadata;
  timeSavingsCompatibilityMetadata?: SyntheticInterventionTimeSavingsCompatibilityMetadata;
  capabilityCompatibilityMetadata?: SyntheticInterventionCapabilityCompatibilityMetadata;
  adoptionCompatibilityMetadata?: SyntheticInterventionAdoptionCompatibilityMetadata;
}

export interface SyntheticInterventionIntelligence {
  interventionIntelligenceId: string;
  interventionIntelligenceKey: string;
  interventionReferenceIds: string[];
  problemReferenceIds: string[];
  outcomeReferenceIds: string[];
  learningPackageReferenceIds: string[];
  memoryPackageIds: string[];
  confidencePackageIds: string[];
  learningSurfaceIds: string[];
  capabilityIntelligenceIds: string[];
  adoptionIntelligenceIds: string[];
  timeSavingsIntelligenceIds: string[];
  evidenceReferenceIds: string[];
  trustMetadata: SyntheticOutcomeTrustMetadata[];
  confidenceMetadata: SyntheticOutcomeConfidenceMetadata[];
  governanceMetadata: SyntheticOutcomeGovernanceMetadata[];
  memoryCompatibilityMetadata: SyntheticOutcomeMemoryCompatibility[];
  learningCompatibilityMetadata: SyntheticOutcomeLearningCompatibility[];
  interventionCategoryMetadata?: SyntheticInterventionCategoryMetadata;
  interventionSuccessMetadata?: SyntheticInterventionSuccessMetadata;
  interventionFailureMetadata?: SyntheticInterventionFailureMetadata;
  interventionEffectivenessMetadata?: SyntheticInterventionEffectivenessMetadata;
  interventionRecurrenceMetadata?: SyntheticInterventionRecurrenceMetadata;
  timeSavingsCompatibilityMetadata?: SyntheticInterventionTimeSavingsCompatibilityMetadata;
  capabilityCompatibilityMetadata?: SyntheticInterventionCapabilityCompatibilityMetadata;
  adoptionCompatibilityMetadata?: SyntheticInterventionAdoptionCompatibilityMetadata;
  outcomeLearningPackages: SyntheticOutcomeLearningPackage[];
  decisionMemories: SyntheticDecisionMemory[];
  forecastMemories: SyntheticForecastMemory[];
  scenarioMemories: SyntheticScenarioMemory[];
  controllerMemories: SyntheticControllerMemory[];
  portfolioMemories: SyntheticPortfolioMemory[];
  recommendationMemories: SyntheticRecommendationMemory[];
  learningConfidencePackages: SyntheticLearningConfidence[];
  learningSurfaces: SyntheticLearningSurface[];
  capabilityIntelligencePackages: SyntheticCapabilityIntelligence[];
  adoptionIntelligencePackages: SyntheticAdoptionIntelligence[];
  timeSavingsIntelligencePackages: SyntheticTimeSavingsIntelligence[];
  warnings: string[];
}

export interface BuildInterventionIntelligenceResult {
  interventionIntelligence: SyntheticInterventionIntelligence | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function compactDefined<T>(values: Array<T | undefined>): T[] {
  return values.filter((value): value is T => value !== undefined);
}

function safeArray<T>(values: T[] | undefined): T[] {
  return Array.isArray(values) ? values : [];
}

function getOutcomeLearningPackages(input: BuildInterventionIntelligenceInput): SyntheticOutcomeLearningPackage[] {
  return safeArray(input.outcomeLearningPackages);
}

function getDecisionMemories(input: BuildInterventionIntelligenceInput): SyntheticDecisionMemory[] {
  return safeArray(input.decisionMemories);
}

function getForecastMemories(input: BuildInterventionIntelligenceInput): SyntheticForecastMemory[] {
  return safeArray(input.forecastMemories);
}

function getScenarioMemories(input: BuildInterventionIntelligenceInput): SyntheticScenarioMemory[] {
  return safeArray(input.scenarioMemories);
}

function getControllerMemories(input: BuildInterventionIntelligenceInput): SyntheticControllerMemory[] {
  return safeArray(input.controllerMemories);
}

function getPortfolioMemories(input: BuildInterventionIntelligenceInput): SyntheticPortfolioMemory[] {
  return safeArray(input.portfolioMemories);
}

function getRecommendationMemories(input: BuildInterventionIntelligenceInput): SyntheticRecommendationMemory[] {
  return safeArray(input.recommendationMemories);
}

function getLearningConfidencePackages(input: BuildInterventionIntelligenceInput): SyntheticLearningConfidence[] {
  return safeArray(input.learningConfidencePackages);
}

function getLearningSurfaces(input: BuildInterventionIntelligenceInput): SyntheticLearningSurface[] {
  return safeArray(input.learningSurfaces);
}

function getCapabilityIntelligencePackages(input: BuildInterventionIntelligenceInput): SyntheticCapabilityIntelligence[] {
  return safeArray(input.capabilityIntelligencePackages);
}

function getAdoptionIntelligencePackages(input: BuildInterventionIntelligenceInput): SyntheticAdoptionIntelligence[] {
  return safeArray(input.adoptionIntelligencePackages);
}

function getTimeSavingsIntelligencePackages(input: BuildInterventionIntelligenceInput): SyntheticTimeSavingsIntelligence[] {
  return safeArray(input.timeSavingsIntelligencePackages);
}

function getMemoryPackageIds(input: BuildInterventionIntelligenceInput): string[] {
  return uniqueStable([
    ...getDecisionMemories(input).map((memory) => memory.decisionMemoryId),
    ...getForecastMemories(input).map((memory) => memory.forecastMemoryId),
    ...getScenarioMemories(input).map((memory) => memory.scenarioMemoryId),
    ...getControllerMemories(input).map((memory) => memory.controllerMemoryId),
    ...getPortfolioMemories(input).map((memory) => memory.portfolioMemoryId),
    ...getRecommendationMemories(input).map((memory) => memory.recommendationMemoryId),
    ...getLearningConfidencePackages(input).flatMap((artifact) => artifact.memoryPackageIds),
    ...getLearningSurfaces(input).flatMap((artifact) => artifact.memoryPackageIds),
    ...getTimeSavingsIntelligencePackages(input).flatMap((artifact) => artifact.memoryPackageIds),
  ]);
}

function getInterventionReferenceIds(input: BuildInterventionIntelligenceInput): string[] {
  return uniqueStable([
    ...input.interventionReferenceIds,
    ...getOutcomeLearningPackages(input).flatMap(
      (artifact) => artifact.interventionCompatibilityMetadata?.interventionReferenceIds ?? [],
    ),
  ]);
}

function getOutcomeReferenceIds(input: BuildInterventionIntelligenceInput): string[] {
  return uniqueStable([
    ...getOutcomeLearningPackages(input).map((artifact) => artifact.outcomeId),
    ...getDecisionMemories(input).flatMap((memory) => memory.outcomeReferenceIds),
    ...getForecastMemories(input).flatMap((memory) => memory.outcomeReferenceIds),
    ...getScenarioMemories(input).flatMap((memory) => memory.outcomeReferenceIds),
    ...getControllerMemories(input).flatMap((memory) => memory.outcomeReferenceIds),
    ...getPortfolioMemories(input).flatMap((memory) => memory.outcomeReferenceIds),
    ...getRecommendationMemories(input).flatMap((memory) => memory.outcomeReferenceIds),
    ...getLearningConfidencePackages(input).flatMap((artifact) => artifact.outcomeReferenceIds),
    ...getLearningSurfaces(input).flatMap((artifact) => artifact.outcomeReferenceIds),
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.outcomeReferenceIds),
    ...getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.outcomeReferenceIds),
    ...getTimeSavingsIntelligencePackages(input).flatMap((artifact) => artifact.outcomeReferenceIds),
  ]);
}

function getLearningPackageReferenceIds(input: BuildInterventionIntelligenceInput): string[] {
  return uniqueStable([
    ...getOutcomeLearningPackages(input).map((artifact) => artifact.outcomeLearningPackageId),
    ...getLearningConfidencePackages(input).flatMap((artifact) => artifact.learningPackageReferenceIds),
    ...getLearningSurfaces(input).flatMap((artifact) => artifact.learningPackageReferenceIds),
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.outcomeLearningPackageIds),
    ...getTimeSavingsIntelligencePackages(input).flatMap((artifact) => artifact.outcomeLearningPackageIds),
  ]);
}

function getEvidenceReferenceIds(input: BuildInterventionIntelligenceInput): string[] {
  return uniqueStable([
    ...getOutcomeLearningPackages(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDecisionMemories(input).flatMap((memory) => memory.evidenceReferenceIds),
    ...getForecastMemories(input).flatMap((memory) => memory.evidenceReferenceIds),
    ...getScenarioMemories(input).flatMap((memory) => memory.evidenceReferenceIds),
    ...getControllerMemories(input).flatMap((memory) => memory.evidenceReferenceIds),
    ...getPortfolioMemories(input).flatMap((memory) => memory.evidenceReferenceIds),
    ...getRecommendationMemories(input).flatMap((memory) => memory.evidenceReferenceIds),
    ...getLearningConfidencePackages(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getLearningSurfaces(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getTimeSavingsIntelligencePackages(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...(input.interventionCategoryMetadata?.interventionCategoryEvidenceIds ?? []),
    ...(input.interventionSuccessMetadata?.interventionSuccessEvidenceIds ?? []),
    ...(input.interventionFailureMetadata?.interventionFailureEvidenceIds ?? []),
    ...(input.interventionEffectivenessMetadata?.interventionEffectivenessEvidenceIds ?? []),
    ...(input.interventionRecurrenceMetadata?.interventionRecurrenceEvidenceIds ?? []),
    ...(input.timeSavingsCompatibilityMetadata?.timeSavingsCompatibilityEvidenceIds ?? []),
    ...(input.capabilityCompatibilityMetadata?.capabilityCompatibilityEvidenceIds ?? []),
    ...(input.adoptionCompatibilityMetadata?.adoptionCompatibilityEvidenceIds ?? []),
  ]);
}

function getTrustMetadata(input: BuildInterventionIntelligenceInput): SyntheticOutcomeTrustMetadata[] {
  return [
    ...compactDefined(getOutcomeLearningPackages(input).map((artifact) => artifact.trustMetadata)),
    ...compactDefined(getDecisionMemories(input).map((memory) => memory.trustMetadata)),
    ...compactDefined(getForecastMemories(input).map((memory) => memory.trustMetadata)),
    ...compactDefined(getScenarioMemories(input).map((memory) => memory.trustMetadata)),
    ...compactDefined(getControllerMemories(input).map((memory) => memory.trustMetadata)),
    ...compactDefined(getPortfolioMemories(input).map((memory) => memory.trustMetadata)),
    ...compactDefined(getRecommendationMemories(input).map((memory) => memory.trustMetadata)),
    ...getLearningConfidencePackages(input).flatMap((artifact) => artifact.trustMetadata),
    ...getLearningSurfaces(input).flatMap((artifact) => artifact.trustMetadata),
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.trustMetadata),
    ...getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.trustMetadata),
    ...getTimeSavingsIntelligencePackages(input).flatMap((artifact) => artifact.trustMetadata),
  ];
}

function getConfidenceMetadata(input: BuildInterventionIntelligenceInput): SyntheticOutcomeConfidenceMetadata[] {
  return [
    ...compactDefined(getOutcomeLearningPackages(input).map((artifact) => artifact.confidenceMetadata)),
    ...compactDefined(getDecisionMemories(input).map((memory) => memory.confidenceMetadata)),
    ...compactDefined(getForecastMemories(input).map((memory) => memory.confidenceMetadata)),
    ...compactDefined(getScenarioMemories(input).map((memory) => memory.confidenceMetadata)),
    ...compactDefined(getControllerMemories(input).map((memory) => memory.confidenceMetadata)),
    ...compactDefined(getPortfolioMemories(input).map((memory) => memory.confidenceMetadata)),
    ...compactDefined(getRecommendationMemories(input).map((memory) => memory.confidenceMetadata)),
    ...getLearningSurfaces(input).flatMap((artifact) => artifact.confidenceMetadata),
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.confidenceMetadata),
    ...getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.confidenceMetadata),
    ...getTimeSavingsIntelligencePackages(input).flatMap((artifact) => artifact.confidenceMetadata),
  ];
}

function getGovernanceMetadata(input: BuildInterventionIntelligenceInput): SyntheticOutcomeGovernanceMetadata[] {
  return [
    ...compactDefined(getOutcomeLearningPackages(input).map((artifact) => artifact.governanceMetadata)),
    ...compactDefined(getDecisionMemories(input).map((memory) => memory.governanceMetadata)),
    ...compactDefined(getForecastMemories(input).map((memory) => memory.governanceMetadata)),
    ...compactDefined(getScenarioMemories(input).map((memory) => memory.governanceMetadata)),
    ...compactDefined(getControllerMemories(input).map((memory) => memory.governanceMetadata)),
    ...compactDefined(getPortfolioMemories(input).map((memory) => memory.governanceMetadata)),
    ...compactDefined(getRecommendationMemories(input).map((memory) => memory.governanceMetadata)),
    ...getLearningConfidencePackages(input).flatMap((artifact) => artifact.governanceMetadata),
    ...getLearningSurfaces(input).flatMap((artifact) => artifact.governanceMetadata),
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.governanceMetadata),
    ...getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.governanceMetadata),
    ...getTimeSavingsIntelligencePackages(input).flatMap((artifact) => artifact.governanceMetadata),
  ];
}

function getMemoryCompatibilityMetadata(input: BuildInterventionIntelligenceInput): SyntheticOutcomeMemoryCompatibility[] {
  return [
    ...compactDefined(getOutcomeLearningPackages(input).map((artifact) => artifact.memoryCompatibility)),
    ...compactDefined(getDecisionMemories(input).map((memory) => memory.memoryCompatibility)),
    ...compactDefined(getForecastMemories(input).map((memory) => memory.memoryCompatibility)),
    ...compactDefined(getScenarioMemories(input).map((memory) => memory.memoryCompatibility)),
    ...compactDefined(getControllerMemories(input).map((memory) => memory.memoryCompatibility)),
    ...compactDefined(getPortfolioMemories(input).map((memory) => memory.memoryCompatibility)),
    ...compactDefined(getRecommendationMemories(input).map((memory) => memory.memoryCompatibility)),
    ...getLearningConfidencePackages(input).flatMap((artifact) => artifact.memoryCompatibilityMetadata),
    ...getLearningSurfaces(input).flatMap((artifact) => artifact.memoryCompatibilityMetadata),
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.memoryCompatibilityMetadata),
    ...getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.memoryCompatibilityMetadata),
    ...getTimeSavingsIntelligencePackages(input).flatMap((artifact) => artifact.memoryCompatibilityMetadata),
  ];
}

function getLearningCompatibilityMetadata(input: BuildInterventionIntelligenceInput): SyntheticOutcomeLearningCompatibility[] {
  return [
    ...compactDefined(getOutcomeLearningPackages(input).map((artifact) => artifact.learningCompatibility)),
    ...compactDefined(getDecisionMemories(input).map((memory) => memory.learningCompatibility)),
    ...compactDefined(getForecastMemories(input).map((memory) => memory.learningCompatibility)),
    ...compactDefined(getScenarioMemories(input).map((memory) => memory.learningCompatibility)),
    ...compactDefined(getControllerMemories(input).map((memory) => memory.learningCompatibility)),
    ...compactDefined(getPortfolioMemories(input).map((memory) => memory.learningCompatibility)),
    ...compactDefined(getRecommendationMemories(input).map((memory) => memory.learningCompatibility)),
    ...getLearningConfidencePackages(input).flatMap((artifact) => artifact.learningCompatibilityMetadata),
    ...getLearningSurfaces(input).flatMap((artifact) => artifact.learningCompatibilityMetadata),
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.learningCompatibilityMetadata),
    ...getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.learningCompatibilityMetadata),
    ...getTimeSavingsIntelligencePackages(input).flatMap((artifact) => artifact.learningCompatibilityMetadata),
  ];
}

function buildInterventionIntelligenceId(input: BuildInterventionIntelligenceInput): string {
  return `synthetic-intervention-intelligence:${stableSnapshotHash({
    interventionIntelligenceKey: input.interventionIntelligenceKey,
    interventionReferenceIds: getInterventionReferenceIds(input),
    problemReferenceIds: input.problemReferenceIds,
    outcomeReferenceIds: getOutcomeReferenceIds(input),
    learningPackageReferenceIds: getLearningPackageReferenceIds(input),
    memoryPackageIds: getMemoryPackageIds(input),
    confidencePackageIds: getLearningConfidencePackages(input).map((artifact) => artifact.learningConfidenceId),
    learningSurfaceIds: getLearningSurfaces(input).map((artifact) => artifact.learningSurfaceId),
    capabilityIntelligenceIds: getCapabilityIntelligencePackages(input).map((artifact) => artifact.capabilityIntelligenceId),
    adoptionIntelligenceIds: getAdoptionIntelligencePackages(input).map((artifact) => artifact.adoptionIntelligenceId),
    timeSavingsIntelligenceIds: getTimeSavingsIntelligencePackages(input).map(
      (artifact) => artifact.timeSavingsIntelligenceId,
    ),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    interventionCategoryReferenceIds: input.interventionCategoryMetadata?.interventionCategoryReferenceIds ?? [],
    interventionSuccessReferenceIds: input.interventionSuccessMetadata?.interventionSuccessReferenceIds ?? [],
    interventionFailureReferenceIds: input.interventionFailureMetadata?.interventionFailureReferenceIds ?? [],
    interventionEffectivenessReferenceIds:
      input.interventionEffectivenessMetadata?.interventionEffectivenessReferenceIds ?? [],
    interventionRecurrenceReferenceIds: input.interventionRecurrenceMetadata?.interventionRecurrenceReferenceIds ?? [],
    timeSavingsCompatibilityReferenceIds:
      input.timeSavingsCompatibilityMetadata?.timeSavingsCompatibilityReferenceIds ?? [],
    capabilityCompatibilityReferenceIds: input.capabilityCompatibilityMetadata?.capabilityCompatibilityReferenceIds ?? [],
    adoptionCompatibilityReferenceIds: input.adoptionCompatibilityMetadata?.adoptionCompatibilityReferenceIds ?? [],
  })}`;
}

function validateArrayField(value: unknown, fieldName: string, warnings: string[]): void {
  if (value !== undefined && !Array.isArray(value)) warnings.push(`${fieldName} must be an array.`);
}

function validateInput(input: BuildInterventionIntelligenceInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.interventionIntelligenceKey)) warnings.push("interventionIntelligenceKey is required.");
  if (!Array.isArray(input.interventionReferenceIds) || input.interventionReferenceIds.length === 0) {
    warnings.push("interventionReferenceIds must include at least one value.");
  }
  if (!Array.isArray(input.problemReferenceIds) || input.problemReferenceIds.length === 0) {
    warnings.push("problemReferenceIds must include at least one value.");
  }

  validateArrayField(input.outcomeLearningPackages, "outcomeLearningPackages", warnings);
  validateArrayField(input.decisionMemories, "decisionMemories", warnings);
  validateArrayField(input.forecastMemories, "forecastMemories", warnings);
  validateArrayField(input.scenarioMemories, "scenarioMemories", warnings);
  validateArrayField(input.controllerMemories, "controllerMemories", warnings);
  validateArrayField(input.portfolioMemories, "portfolioMemories", warnings);
  validateArrayField(input.recommendationMemories, "recommendationMemories", warnings);
  validateArrayField(input.learningConfidencePackages, "learningConfidencePackages", warnings);
  validateArrayField(input.learningSurfaces, "learningSurfaces", warnings);
  validateArrayField(input.capabilityIntelligencePackages, "capabilityIntelligencePackages", warnings);
  validateArrayField(input.adoptionIntelligencePackages, "adoptionIntelligencePackages", warnings);
  validateArrayField(input.timeSavingsIntelligencePackages, "timeSavingsIntelligencePackages", warnings);

  for (const artifact of getOutcomeLearningPackages(input)) {
    if (!hasValue(artifact.outcomeLearningPackageId)) warnings.push("outcomeLearningPackageId is required.");
  }
  for (const artifact of getLearningConfidencePackages(input)) {
    if (!hasValue(artifact.learningConfidenceId)) warnings.push("learningConfidenceId is required.");
  }
  for (const artifact of getLearningSurfaces(input)) {
    if (!hasValue(artifact.learningSurfaceId)) warnings.push("learningSurfaceId is required.");
  }
  for (const artifact of getCapabilityIntelligencePackages(input)) {
    if (!hasValue(artifact.capabilityIntelligenceId)) warnings.push("capabilityIntelligenceId is required.");
  }
  for (const artifact of getAdoptionIntelligencePackages(input)) {
    if (!hasValue(artifact.adoptionIntelligenceId)) warnings.push("adoptionIntelligenceId is required.");
  }
  for (const artifact of getTimeSavingsIntelligencePackages(input)) {
    if (!hasValue(artifact.timeSavingsIntelligenceId)) warnings.push("timeSavingsIntelligenceId is required.");
  }

  return warnings;
}

export function buildInterventionIntelligence(
  input: BuildInterventionIntelligenceInput,
): BuildInterventionIntelligenceResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      interventionIntelligence: null,
      skipped: true,
      warnings,
    };
  }

  return {
    interventionIntelligence: {
      interventionIntelligenceId: buildInterventionIntelligenceId(input),
      interventionIntelligenceKey: input.interventionIntelligenceKey,
      interventionReferenceIds: getInterventionReferenceIds(input),
      problemReferenceIds: input.problemReferenceIds,
      outcomeReferenceIds: getOutcomeReferenceIds(input),
      learningPackageReferenceIds: getLearningPackageReferenceIds(input),
      memoryPackageIds: getMemoryPackageIds(input),
      confidencePackageIds: getLearningConfidencePackages(input).map((artifact) => artifact.learningConfidenceId),
      learningSurfaceIds: getLearningSurfaces(input).map((artifact) => artifact.learningSurfaceId),
      capabilityIntelligenceIds: getCapabilityIntelligencePackages(input).map((artifact) => artifact.capabilityIntelligenceId),
      adoptionIntelligenceIds: getAdoptionIntelligencePackages(input).map((artifact) => artifact.adoptionIntelligenceId),
      timeSavingsIntelligenceIds: getTimeSavingsIntelligencePackages(input).map(
        (artifact) => artifact.timeSavingsIntelligenceId,
      ),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      trustMetadata: getTrustMetadata(input),
      confidenceMetadata: getConfidenceMetadata(input),
      governanceMetadata: getGovernanceMetadata(input),
      memoryCompatibilityMetadata: getMemoryCompatibilityMetadata(input),
      learningCompatibilityMetadata: getLearningCompatibilityMetadata(input),
      interventionCategoryMetadata: input.interventionCategoryMetadata,
      interventionSuccessMetadata: input.interventionSuccessMetadata,
      interventionFailureMetadata: input.interventionFailureMetadata,
      interventionEffectivenessMetadata: input.interventionEffectivenessMetadata,
      interventionRecurrenceMetadata: input.interventionRecurrenceMetadata,
      timeSavingsCompatibilityMetadata: input.timeSavingsCompatibilityMetadata,
      capabilityCompatibilityMetadata: input.capabilityCompatibilityMetadata,
      adoptionCompatibilityMetadata: input.adoptionCompatibilityMetadata,
      outcomeLearningPackages: getOutcomeLearningPackages(input),
      decisionMemories: getDecisionMemories(input),
      forecastMemories: getForecastMemories(input),
      scenarioMemories: getScenarioMemories(input),
      controllerMemories: getControllerMemories(input),
      portfolioMemories: getPortfolioMemories(input),
      recommendationMemories: getRecommendationMemories(input),
      learningConfidencePackages: getLearningConfidencePackages(input),
      learningSurfaces: getLearningSurfaces(input),
      capabilityIntelligencePackages: getCapabilityIntelligencePackages(input),
      adoptionIntelligencePackages: getAdoptionIntelligencePackages(input),
      timeSavingsIntelligencePackages: getTimeSavingsIntelligencePackages(input),
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
