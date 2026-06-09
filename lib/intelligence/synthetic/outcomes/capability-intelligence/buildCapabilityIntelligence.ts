import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticControllerMemory } from "../controller-memory";
import type { SyntheticDecisionMemory } from "../decision-memory";
import type { SyntheticForecastMemory } from "../forecast-memory";
import type { SyntheticLearningConfidence } from "../learning-confidence";
import type { SyntheticLearningSurface } from "../learning-surfaces";
import type { SyntheticOutcomeLearningPackage } from "../learning";
import type { SyntheticPortfolioMemory } from "../portfolio-memory";
import type { SyntheticRecommendationMemory } from "../recommendation-memory";
import type { SyntheticScenarioMemory } from "../scenario-memory";
import type {
  SyntheticOutcomeConfidenceMetadata,
  SyntheticOutcomeGovernanceMetadata,
  SyntheticOutcomeLearningCompatibility,
  SyntheticOutcomeMemoryCompatibility,
  SyntheticOutcomeTrustMetadata,
} from "../types";

export type SyntheticCapabilityCategory =
  | "forecasting"
  | "scenario_planning"
  | "controller_intelligence"
  | "cash_intelligence"
  | "portfolio_intelligence"
  | "executive_briefings"
  | "reconciliation_monitoring"
  | "outcome_intelligence";

export interface SyntheticCapabilityAwarenessMetadata {
  capabilityAwarenessReferenceIds: string[];
  capabilityAwarenessEvidenceIds: string[];
  capabilityAwarenessReviewRequired: boolean;
}

export interface SyntheticCapabilityUtilizationMetadata {
  capabilityUtilizationReferenceIds: string[];
  capabilityUtilizationEvidenceIds: string[];
  capabilityUtilizationReviewRequired: boolean;
}

export interface SyntheticCapabilityEffectivenessMetadata {
  capabilityEffectivenessReferenceIds: string[];
  capabilityEffectivenessEvidenceIds: string[];
  capabilityEffectivenessReviewRequired: boolean;
}

export interface SyntheticCapabilityAdoptionMetadata {
  capabilityAdoptionReferenceIds: string[];
  capabilityAdoptionEvidenceIds: string[];
  capabilityAdoptionReviewRequired: boolean;
}

export interface SyntheticCapabilityExpectedValueMetadata {
  expectedValueReferenceIds: string[];
  expectedValueEvidenceIds: string[];
  expectedValueReviewRequired: boolean;
}

export interface SyntheticCapabilityExpectedTimeSavingsMetadata {
  expectedTimeSavingsReferenceIds: string[];
  expectedTimeSavingsEvidenceIds: string[];
  expectedTimeSavingsReviewRequired: boolean;
}

export interface SyntheticCapabilityAdoptionCompatibilityMetadata {
  adoptionCompatibilityReferenceIds: string[];
  adoptionCompatibilityEvidenceIds: string[];
  adoptionCompatibilityReviewRequired: boolean;
}

export interface BuildCapabilityIntelligenceInput {
  capabilityIntelligenceKey: string;
  capabilityCategory: SyntheticCapabilityCategory;
  capabilityReferenceIds: string[];
  outcomeLearningPackages?: SyntheticOutcomeLearningPackage[];
  decisionMemories?: SyntheticDecisionMemory[];
  forecastMemories?: SyntheticForecastMemory[];
  scenarioMemories?: SyntheticScenarioMemory[];
  controllerMemories?: SyntheticControllerMemory[];
  portfolioMemories?: SyntheticPortfolioMemory[];
  recommendationMemories?: SyntheticRecommendationMemory[];
  learningConfidencePackages?: SyntheticLearningConfidence[];
  learningSurfaces?: SyntheticLearningSurface[];
  capabilityAwarenessMetadata?: SyntheticCapabilityAwarenessMetadata;
  capabilityUtilizationMetadata?: SyntheticCapabilityUtilizationMetadata;
  capabilityEffectivenessMetadata?: SyntheticCapabilityEffectivenessMetadata;
  capabilityAdoptionMetadata?: SyntheticCapabilityAdoptionMetadata;
  expectedValueMetadata?: SyntheticCapabilityExpectedValueMetadata;
  expectedTimeSavingsMetadata?: SyntheticCapabilityExpectedTimeSavingsMetadata;
  adoptionCompatibilityMetadata?: SyntheticCapabilityAdoptionCompatibilityMetadata;
}

export interface SyntheticCapabilityIntelligence {
  capabilityIntelligenceId: string;
  capabilityIntelligenceKey: string;
  capabilityCategory: SyntheticCapabilityCategory;
  capabilityReferenceIds: string[];
  outcomeLearningPackageIds: string[];
  memoryPackageIds: string[];
  confidencePackageIds: string[];
  learningSurfaceIds: string[];
  outcomeReferenceIds: string[];
  evidenceReferenceIds: string[];
  trustMetadata: SyntheticOutcomeTrustMetadata[];
  confidenceMetadata: SyntheticOutcomeConfidenceMetadata[];
  governanceMetadata: SyntheticOutcomeGovernanceMetadata[];
  memoryCompatibilityMetadata: SyntheticOutcomeMemoryCompatibility[];
  learningCompatibilityMetadata: SyntheticOutcomeLearningCompatibility[];
  capabilityAwarenessMetadata?: SyntheticCapabilityAwarenessMetadata;
  capabilityUtilizationMetadata?: SyntheticCapabilityUtilizationMetadata;
  capabilityEffectivenessMetadata?: SyntheticCapabilityEffectivenessMetadata;
  capabilityAdoptionMetadata?: SyntheticCapabilityAdoptionMetadata;
  expectedValueMetadata?: SyntheticCapabilityExpectedValueMetadata;
  expectedTimeSavingsMetadata?: SyntheticCapabilityExpectedTimeSavingsMetadata;
  adoptionCompatibilityMetadata?: SyntheticCapabilityAdoptionCompatibilityMetadata;
  outcomeLearningPackages: SyntheticOutcomeLearningPackage[];
  decisionMemories: SyntheticDecisionMemory[];
  forecastMemories: SyntheticForecastMemory[];
  scenarioMemories: SyntheticScenarioMemory[];
  controllerMemories: SyntheticControllerMemory[];
  portfolioMemories: SyntheticPortfolioMemory[];
  recommendationMemories: SyntheticRecommendationMemory[];
  learningConfidencePackages: SyntheticLearningConfidence[];
  learningSurfaces: SyntheticLearningSurface[];
  warnings: string[];
}

export interface BuildCapabilityIntelligenceResult {
  capabilityIntelligence: SyntheticCapabilityIntelligence | null;
  skipped: boolean;
  warnings: string[];
}

const CAPABILITY_CATEGORIES: SyntheticCapabilityCategory[] = [
  "forecasting",
  "scenario_planning",
  "controller_intelligence",
  "cash_intelligence",
  "portfolio_intelligence",
  "executive_briefings",
  "reconciliation_monitoring",
  "outcome_intelligence",
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function compactDefined<T>(values: Array<T | undefined>): T[] {
  return values.filter((value): value is T => value !== undefined);
}

function getOutcomeLearningPackages(input: BuildCapabilityIntelligenceInput): SyntheticOutcomeLearningPackage[] {
  return input.outcomeLearningPackages ?? [];
}

function getDecisionMemories(input: BuildCapabilityIntelligenceInput): SyntheticDecisionMemory[] {
  return input.decisionMemories ?? [];
}

function getForecastMemories(input: BuildCapabilityIntelligenceInput): SyntheticForecastMemory[] {
  return input.forecastMemories ?? [];
}

function getScenarioMemories(input: BuildCapabilityIntelligenceInput): SyntheticScenarioMemory[] {
  return input.scenarioMemories ?? [];
}

function getControllerMemories(input: BuildCapabilityIntelligenceInput): SyntheticControllerMemory[] {
  return input.controllerMemories ?? [];
}

function getPortfolioMemories(input: BuildCapabilityIntelligenceInput): SyntheticPortfolioMemory[] {
  return input.portfolioMemories ?? [];
}

function getRecommendationMemories(input: BuildCapabilityIntelligenceInput): SyntheticRecommendationMemory[] {
  return input.recommendationMemories ?? [];
}

function getLearningConfidencePackages(input: BuildCapabilityIntelligenceInput): SyntheticLearningConfidence[] {
  return input.learningConfidencePackages ?? [];
}

function getLearningSurfaces(input: BuildCapabilityIntelligenceInput): SyntheticLearningSurface[] {
  return input.learningSurfaces ?? [];
}

function getAllMemoryPackages(
  input: BuildCapabilityIntelligenceInput,
): Array<
  | SyntheticDecisionMemory
  | SyntheticForecastMemory
  | SyntheticScenarioMemory
  | SyntheticControllerMemory
  | SyntheticPortfolioMemory
  | SyntheticRecommendationMemory
> {
  return [
    ...getDecisionMemories(input),
    ...getForecastMemories(input),
    ...getScenarioMemories(input),
    ...getControllerMemories(input),
    ...getPortfolioMemories(input),
    ...getRecommendationMemories(input),
  ];
}

function getMemoryPackageIds(input: BuildCapabilityIntelligenceInput): string[] {
  return uniqueStable([
    ...getDecisionMemories(input).map((memory) => memory.decisionMemoryId),
    ...getForecastMemories(input).map((memory) => memory.forecastMemoryId),
    ...getScenarioMemories(input).map((memory) => memory.scenarioMemoryId),
    ...getControllerMemories(input).map((memory) => memory.controllerMemoryId),
    ...getPortfolioMemories(input).map((memory) => memory.portfolioMemoryId),
    ...getRecommendationMemories(input).map((memory) => memory.recommendationMemoryId),
  ]);
}

function getOutcomeReferenceIds(input: BuildCapabilityIntelligenceInput): string[] {
  return uniqueStable([
    ...getOutcomeLearningPackages(input).map((learningPackage) => learningPackage.outcomeId),
    ...getAllMemoryPackages(input).flatMap((memory) => memory.outcomeReferenceIds),
    ...getLearningConfidencePackages(input).flatMap((confidence) => confidence.outcomeReferenceIds),
    ...getLearningSurfaces(input).flatMap((surface) => surface.outcomeReferenceIds),
  ]);
}

function getEvidenceReferenceIds(input: BuildCapabilityIntelligenceInput): string[] {
  return uniqueStable([
    ...getOutcomeLearningPackages(input).flatMap((learningPackage) => learningPackage.evidenceReferenceIds),
    ...getAllMemoryPackages(input).flatMap((memory) => memory.evidenceReferenceIds),
    ...getLearningConfidencePackages(input).flatMap((confidence) => confidence.evidenceReferenceIds),
    ...getLearningSurfaces(input).flatMap((surface) => surface.evidenceReferenceIds),
    ...(input.capabilityAwarenessMetadata?.capabilityAwarenessEvidenceIds ?? []),
    ...(input.capabilityUtilizationMetadata?.capabilityUtilizationEvidenceIds ?? []),
    ...(input.capabilityEffectivenessMetadata?.capabilityEffectivenessEvidenceIds ?? []),
    ...(input.capabilityAdoptionMetadata?.capabilityAdoptionEvidenceIds ?? []),
    ...(input.expectedValueMetadata?.expectedValueEvidenceIds ?? []),
    ...(input.expectedTimeSavingsMetadata?.expectedTimeSavingsEvidenceIds ?? []),
    ...(input.adoptionCompatibilityMetadata?.adoptionCompatibilityEvidenceIds ?? []),
  ]);
}

function getTrustMetadata(input: BuildCapabilityIntelligenceInput): SyntheticOutcomeTrustMetadata[] {
  return [
    ...compactDefined(getOutcomeLearningPackages(input).map((learningPackage) => learningPackage.trustMetadata)),
    ...compactDefined(getAllMemoryPackages(input).map((memory) => memory.trustMetadata)),
    ...getLearningConfidencePackages(input).flatMap((confidence) => confidence.trustMetadata),
    ...getLearningSurfaces(input).flatMap((surface) => surface.trustMetadata),
  ];
}

function getConfidenceMetadata(input: BuildCapabilityIntelligenceInput): SyntheticOutcomeConfidenceMetadata[] {
  return [
    ...compactDefined(getOutcomeLearningPackages(input).map((learningPackage) => learningPackage.confidenceMetadata)),
    ...compactDefined(getAllMemoryPackages(input).map((memory) => memory.confidenceMetadata)),
    ...getLearningSurfaces(input).flatMap((surface) => surface.confidenceMetadata),
  ];
}

function getGovernanceMetadata(input: BuildCapabilityIntelligenceInput): SyntheticOutcomeGovernanceMetadata[] {
  return [
    ...compactDefined(getOutcomeLearningPackages(input).map((learningPackage) => learningPackage.governanceMetadata)),
    ...compactDefined(getAllMemoryPackages(input).map((memory) => memory.governanceMetadata)),
    ...getLearningConfidencePackages(input).flatMap((confidence) => confidence.governanceMetadata),
    ...getLearningSurfaces(input).flatMap((surface) => surface.governanceMetadata),
  ];
}

function getMemoryCompatibilityMetadata(input: BuildCapabilityIntelligenceInput): SyntheticOutcomeMemoryCompatibility[] {
  return [
    ...compactDefined(getOutcomeLearningPackages(input).map((learningPackage) => learningPackage.memoryCompatibility)),
    ...compactDefined(getAllMemoryPackages(input).map((memory) => memory.memoryCompatibility)),
    ...getLearningConfidencePackages(input).flatMap((confidence) => confidence.memoryCompatibilityMetadata),
    ...getLearningSurfaces(input).flatMap((surface) => surface.memoryCompatibilityMetadata),
  ];
}

function getLearningCompatibilityMetadata(input: BuildCapabilityIntelligenceInput): SyntheticOutcomeLearningCompatibility[] {
  return [
    ...compactDefined(getOutcomeLearningPackages(input).map((learningPackage) => learningPackage.learningCompatibility)),
    ...compactDefined(getAllMemoryPackages(input).map((memory) => memory.learningCompatibility)),
    ...getLearningConfidencePackages(input).flatMap((confidence) => confidence.learningCompatibilityMetadata),
    ...getLearningSurfaces(input).flatMap((surface) => surface.learningCompatibilityMetadata),
  ];
}

function buildCapabilityIntelligenceId(input: BuildCapabilityIntelligenceInput): string {
  return `synthetic-capability-intelligence:${stableSnapshotHash({
    capabilityIntelligenceKey: input.capabilityIntelligenceKey,
    capabilityCategory: input.capabilityCategory,
    capabilityReferenceIds: input.capabilityReferenceIds,
    outcomeLearningPackageIds: getOutcomeLearningPackages(input).map((item) => item.outcomeLearningPackageId),
    memoryPackageIds: getMemoryPackageIds(input),
    confidencePackageIds: getLearningConfidencePackages(input).map((item) => item.learningConfidenceId),
    learningSurfaceIds: getLearningSurfaces(input).map((item) => item.learningSurfaceId),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
  })}`;
}

function validateInput(input: BuildCapabilityIntelligenceInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.capabilityIntelligenceKey)) warnings.push("capabilityIntelligenceKey is required.");
  if (!CAPABILITY_CATEGORIES.includes(input.capabilityCategory)) warnings.push("capabilityCategory is not supported.");
  if (!Array.isArray(input.capabilityReferenceIds) || input.capabilityReferenceIds.length === 0) {
    warnings.push("capabilityReferenceIds must include at least one value.");
  }
  if (input.outcomeLearningPackages !== undefined && !Array.isArray(input.outcomeLearningPackages)) {
    warnings.push("outcomeLearningPackages must be an array.");
  }
  if (input.decisionMemories !== undefined && !Array.isArray(input.decisionMemories)) {
    warnings.push("decisionMemories must be an array.");
  }
  if (input.forecastMemories !== undefined && !Array.isArray(input.forecastMemories)) {
    warnings.push("forecastMemories must be an array.");
  }
  if (input.scenarioMemories !== undefined && !Array.isArray(input.scenarioMemories)) {
    warnings.push("scenarioMemories must be an array.");
  }
  if (input.controllerMemories !== undefined && !Array.isArray(input.controllerMemories)) {
    warnings.push("controllerMemories must be an array.");
  }
  if (input.portfolioMemories !== undefined && !Array.isArray(input.portfolioMemories)) {
    warnings.push("portfolioMemories must be an array.");
  }
  if (input.recommendationMemories !== undefined && !Array.isArray(input.recommendationMemories)) {
    warnings.push("recommendationMemories must be an array.");
  }
  if (input.learningConfidencePackages !== undefined && !Array.isArray(input.learningConfidencePackages)) {
    warnings.push("learningConfidencePackages must be an array.");
  }
  if (input.learningSurfaces !== undefined && !Array.isArray(input.learningSurfaces)) {
    warnings.push("learningSurfaces must be an array.");
  }

  return warnings;
}

export function buildCapabilityIntelligence(
  input: BuildCapabilityIntelligenceInput,
): BuildCapabilityIntelligenceResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      capabilityIntelligence: null,
      skipped: true,
      warnings,
    };
  }

  return {
    capabilityIntelligence: {
      capabilityIntelligenceId: buildCapabilityIntelligenceId(input),
      capabilityIntelligenceKey: input.capabilityIntelligenceKey,
      capabilityCategory: input.capabilityCategory,
      capabilityReferenceIds: input.capabilityReferenceIds,
      outcomeLearningPackageIds: getOutcomeLearningPackages(input).map((item) => item.outcomeLearningPackageId),
      memoryPackageIds: getMemoryPackageIds(input),
      confidencePackageIds: getLearningConfidencePackages(input).map((item) => item.learningConfidenceId),
      learningSurfaceIds: getLearningSurfaces(input).map((item) => item.learningSurfaceId),
      outcomeReferenceIds: getOutcomeReferenceIds(input),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      trustMetadata: getTrustMetadata(input),
      confidenceMetadata: getConfidenceMetadata(input),
      governanceMetadata: getGovernanceMetadata(input),
      memoryCompatibilityMetadata: getMemoryCompatibilityMetadata(input),
      learningCompatibilityMetadata: getLearningCompatibilityMetadata(input),
      capabilityAwarenessMetadata: input.capabilityAwarenessMetadata,
      capabilityUtilizationMetadata: input.capabilityUtilizationMetadata,
      capabilityEffectivenessMetadata: input.capabilityEffectivenessMetadata,
      capabilityAdoptionMetadata: input.capabilityAdoptionMetadata,
      expectedValueMetadata: input.expectedValueMetadata,
      expectedTimeSavingsMetadata: input.expectedTimeSavingsMetadata,
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
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
