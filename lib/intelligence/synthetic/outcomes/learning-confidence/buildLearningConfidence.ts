import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticControllerMemory } from "../controller-memory";
import type { SyntheticDecisionMemory } from "../decision-memory";
import type { SyntheticForecastMemory } from "../forecast-memory";
import type { SyntheticOutcomeLearningPackage } from "../learning";
import type { SyntheticPortfolioMemory } from "../portfolio-memory";
import type { SyntheticRecommendationMemory } from "../recommendation-memory";
import type { SyntheticScenarioMemory } from "../scenario-memory";
import type {
  SyntheticOutcomeGovernanceMetadata,
  SyntheticOutcomeLearningCompatibility,
  SyntheticOutcomeMemoryCompatibility,
  SyntheticOutcomeTrustMetadata,
} from "../types";

export interface SyntheticLearningConfidenceConditionMetadata {
  conditionReferenceIds: string[];
  conditionEvidenceIds: string[];
  conditionReviewRequired: boolean;
}

export interface SyntheticLearningConfidenceStabilityRuleMetadata {
  stabilityRuleReferenceIds: string[];
  stabilityRuleEvidenceIds: string[];
  stabilityRuleReviewRequired: boolean;
}

export interface SyntheticLearningConfidenceGovernanceMetadata {
  confidenceGovernanceReferenceIds: string[];
  confidenceGovernanceEvidenceIds: string[];
  confidenceGovernanceReviewRequired: boolean;
}

export interface SyntheticLearningConfidenceExplainabilityMetadata {
  explainabilityReferenceIds: string[];
  explainabilityEvidenceIds: string[];
  explainabilityReviewRequired: boolean;
}

export interface BuildLearningConfidenceInput {
  confidenceContextKey: string;
  outcomeLearningPackages?: SyntheticOutcomeLearningPackage[];
  decisionMemories?: SyntheticDecisionMemory[];
  forecastMemories?: SyntheticForecastMemory[];
  scenarioMemories?: SyntheticScenarioMemory[];
  controllerMemories?: SyntheticControllerMemory[];
  portfolioMemories?: SyntheticPortfolioMemory[];
  recommendationMemories?: SyntheticRecommendationMemory[];
  confidenceIncreaseConditionMetadata?: SyntheticLearningConfidenceConditionMetadata;
  confidenceDecreaseConditionMetadata?: SyntheticLearningConfidenceConditionMetadata;
  confidenceStabilityRuleMetadata?: SyntheticLearningConfidenceStabilityRuleMetadata;
  confidenceGovernanceMetadata?: SyntheticLearningConfidenceGovernanceMetadata;
  confidenceExplainabilityMetadata?: SyntheticLearningConfidenceExplainabilityMetadata;
}

export interface SyntheticLearningConfidence {
  learningConfidenceId: string;
  confidenceContextKey: string;
  outcomeLearningPackageIds: string[];
  memoryPackageIds: string[];
  outcomeReferenceIds: string[];
  learningPackageReferenceIds: string[];
  memoryReferenceIds: string[];
  evidenceReferenceIds: string[];
  confidenceEvidenceReferenceIds: string[];
  trustMetadata: SyntheticOutcomeTrustMetadata[];
  governanceMetadata: SyntheticOutcomeGovernanceMetadata[];
  memoryCompatibilityMetadata: SyntheticOutcomeMemoryCompatibility[];
  learningCompatibilityMetadata: SyntheticOutcomeLearningCompatibility[];
  confidenceIncreaseConditionMetadata?: SyntheticLearningConfidenceConditionMetadata;
  confidenceDecreaseConditionMetadata?: SyntheticLearningConfidenceConditionMetadata;
  confidenceStabilityRuleMetadata?: SyntheticLearningConfidenceStabilityRuleMetadata;
  confidenceGovernanceMetadata?: SyntheticLearningConfidenceGovernanceMetadata;
  confidenceExplainabilityMetadata?: SyntheticLearningConfidenceExplainabilityMetadata;
  outcomeLearningPackages: SyntheticOutcomeLearningPackage[];
  decisionMemories: SyntheticDecisionMemory[];
  forecastMemories: SyntheticForecastMemory[];
  scenarioMemories: SyntheticScenarioMemory[];
  controllerMemories: SyntheticControllerMemory[];
  portfolioMemories: SyntheticPortfolioMemory[];
  recommendationMemories: SyntheticRecommendationMemory[];
  warnings: string[];
}

export interface BuildLearningConfidenceResult {
  learningConfidence: SyntheticLearningConfidence | null;
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

function getOutcomeLearningPackages(input: BuildLearningConfidenceInput): SyntheticOutcomeLearningPackage[] {
  return input.outcomeLearningPackages ?? [];
}

function getDecisionMemories(input: BuildLearningConfidenceInput): SyntheticDecisionMemory[] {
  return input.decisionMemories ?? [];
}

function getForecastMemories(input: BuildLearningConfidenceInput): SyntheticForecastMemory[] {
  return input.forecastMemories ?? [];
}

function getScenarioMemories(input: BuildLearningConfidenceInput): SyntheticScenarioMemory[] {
  return input.scenarioMemories ?? [];
}

function getControllerMemories(input: BuildLearningConfidenceInput): SyntheticControllerMemory[] {
  return input.controllerMemories ?? [];
}

function getPortfolioMemories(input: BuildLearningConfidenceInput): SyntheticPortfolioMemory[] {
  return input.portfolioMemories ?? [];
}

function getRecommendationMemories(input: BuildLearningConfidenceInput): SyntheticRecommendationMemory[] {
  return input.recommendationMemories ?? [];
}

function getAllMemoryPackages(
  input: BuildLearningConfidenceInput,
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

function getMemoryPackageIds(input: BuildLearningConfidenceInput): string[] {
  return uniqueStable([
    ...getDecisionMemories(input).map((memory) => memory.decisionMemoryId),
    ...getForecastMemories(input).map((memory) => memory.forecastMemoryId),
    ...getScenarioMemories(input).map((memory) => memory.scenarioMemoryId),
    ...getControllerMemories(input).map((memory) => memory.controllerMemoryId),
    ...getPortfolioMemories(input).map((memory) => memory.portfolioMemoryId),
    ...getRecommendationMemories(input).map((memory) => memory.recommendationMemoryId),
  ]);
}

function getOutcomeReferenceIds(input: BuildLearningConfidenceInput): string[] {
  return uniqueStable([
    ...getOutcomeLearningPackages(input).map((outcomeLearningPackage) => outcomeLearningPackage.outcomeId),
    ...getAllMemoryPackages(input).flatMap((memory) => memory.outcomeReferenceIds),
  ]);
}

function getLearningPackageReferenceIds(input: BuildLearningConfidenceInput): string[] {
  return uniqueStable([
    ...getOutcomeLearningPackages(input).map((outcomeLearningPackage) => outcomeLearningPackage.outcomeLearningPackageId),
    ...getAllMemoryPackages(input).map((memory) => memory.outcomeLearningPackageId),
  ]);
}

function getEvidenceReferenceIds(input: BuildLearningConfidenceInput): string[] {
  return uniqueStable([
    ...getOutcomeLearningPackages(input).flatMap((outcomeLearningPackage) => outcomeLearningPackage.evidenceReferenceIds),
    ...getAllMemoryPackages(input).flatMap((memory) => memory.evidenceReferenceIds),
  ]);
}

function getConfidenceEvidenceReferenceIds(input: BuildLearningConfidenceInput): string[] {
  return uniqueStable([
    ...(input.confidenceIncreaseConditionMetadata?.conditionEvidenceIds ?? []),
    ...(input.confidenceDecreaseConditionMetadata?.conditionEvidenceIds ?? []),
    ...(input.confidenceStabilityRuleMetadata?.stabilityRuleEvidenceIds ?? []),
    ...(input.confidenceGovernanceMetadata?.confidenceGovernanceEvidenceIds ?? []),
    ...(input.confidenceExplainabilityMetadata?.explainabilityEvidenceIds ?? []),
  ]);
}

function getTrustMetadata(input: BuildLearningConfidenceInput): SyntheticOutcomeTrustMetadata[] {
  return compactDefined([
    ...getOutcomeLearningPackages(input).map((outcomeLearningPackage) => outcomeLearningPackage.trustMetadata),
    ...getAllMemoryPackages(input).map((memory) => memory.trustMetadata),
  ]);
}

function getGovernanceMetadata(input: BuildLearningConfidenceInput): SyntheticOutcomeGovernanceMetadata[] {
  return compactDefined([
    ...getOutcomeLearningPackages(input).map((outcomeLearningPackage) => outcomeLearningPackage.governanceMetadata),
    ...getAllMemoryPackages(input).map((memory) => memory.governanceMetadata),
  ]);
}

function getMemoryCompatibilityMetadata(input: BuildLearningConfidenceInput): SyntheticOutcomeMemoryCompatibility[] {
  return compactDefined([
    ...getOutcomeLearningPackages(input).map((outcomeLearningPackage) => outcomeLearningPackage.memoryCompatibility),
    ...getAllMemoryPackages(input).map((memory) => memory.memoryCompatibility),
  ]);
}

function getLearningCompatibilityMetadata(input: BuildLearningConfidenceInput): SyntheticOutcomeLearningCompatibility[] {
  return compactDefined([
    ...getOutcomeLearningPackages(input).map((outcomeLearningPackage) => outcomeLearningPackage.learningCompatibility),
    ...getAllMemoryPackages(input).map((memory) => memory.learningCompatibility),
  ]);
}

function getMemoryReferenceIds(input: BuildLearningConfidenceInput): string[] {
  return uniqueStable(getMemoryCompatibilityMetadata(input).flatMap((metadata) => metadata.memoryReferenceIds));
}

function buildLearningConfidenceId(input: BuildLearningConfidenceInput): string {
  return `synthetic-learning-confidence:${stableSnapshotHash({
    confidenceContextKey: input.confidenceContextKey,
    outcomeLearningPackageIds: getOutcomeLearningPackages(input).map((item) => item.outcomeLearningPackageId),
    memoryPackageIds: getMemoryPackageIds(input),
    outcomeReferenceIds: getOutcomeReferenceIds(input),
    learningPackageReferenceIds: getLearningPackageReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    confidenceEvidenceReferenceIds: getConfidenceEvidenceReferenceIds(input),
  })}`;
}

function validateInput(input: BuildLearningConfidenceInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.confidenceContextKey)) warnings.push("confidenceContextKey is required.");
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
  if (warnings.length > 0) return warnings;

  const artifactCount = getOutcomeLearningPackages(input).length + getAllMemoryPackages(input).length;
  if (artifactCount === 0) {
    warnings.push("at least one outcome learning or memory package is required.");
  }
  for (const outcomeLearningPackage of getOutcomeLearningPackages(input)) {
    if (!hasValue(outcomeLearningPackage.outcomeLearningPackageId)) {
      warnings.push("outcomeLearningPackageId is required.");
    }
    if (!hasValue(outcomeLearningPackage.outcomeId)) warnings.push("outcomeId is required.");
  }
  for (const memoryPackage of getAllMemoryPackages(input)) {
    if (!hasValue(memoryPackage.outcomeLearningPackageId)) warnings.push("memory outcomeLearningPackageId is required.");
    if (!hasValue(memoryPackage.outcomeId)) warnings.push("memory outcomeId is required.");
  }

  return warnings;
}

export function buildLearningConfidence(input: BuildLearningConfidenceInput): BuildLearningConfidenceResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      learningConfidence: null,
      skipped: true,
      warnings,
    };
  }

  return {
    learningConfidence: {
      learningConfidenceId: buildLearningConfidenceId(input),
      confidenceContextKey: input.confidenceContextKey,
      outcomeLearningPackageIds: getOutcomeLearningPackages(input).map((item) => item.outcomeLearningPackageId),
      memoryPackageIds: getMemoryPackageIds(input),
      outcomeReferenceIds: getOutcomeReferenceIds(input),
      learningPackageReferenceIds: getLearningPackageReferenceIds(input),
      memoryReferenceIds: getMemoryReferenceIds(input),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      confidenceEvidenceReferenceIds: getConfidenceEvidenceReferenceIds(input),
      trustMetadata: getTrustMetadata(input),
      governanceMetadata: getGovernanceMetadata(input),
      memoryCompatibilityMetadata: getMemoryCompatibilityMetadata(input),
      learningCompatibilityMetadata: getLearningCompatibilityMetadata(input),
      confidenceIncreaseConditionMetadata: input.confidenceIncreaseConditionMetadata,
      confidenceDecreaseConditionMetadata: input.confidenceDecreaseConditionMetadata,
      confidenceStabilityRuleMetadata: input.confidenceStabilityRuleMetadata,
      confidenceGovernanceMetadata: input.confidenceGovernanceMetadata,
      confidenceExplainabilityMetadata: input.confidenceExplainabilityMetadata,
      outcomeLearningPackages: getOutcomeLearningPackages(input),
      decisionMemories: getDecisionMemories(input),
      forecastMemories: getForecastMemories(input),
      scenarioMemories: getScenarioMemories(input),
      controllerMemories: getControllerMemories(input),
      portfolioMemories: getPortfolioMemories(input),
      recommendationMemories: getRecommendationMemories(input),
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
