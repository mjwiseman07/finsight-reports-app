import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticControllerMemory } from "../controller-memory";
import type { SyntheticDecisionMemory } from "../decision-memory";
import type { SyntheticForecastMemory } from "../forecast-memory";
import type { SyntheticLearningConfidence } from "../learning-confidence";
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

export type SyntheticLearningSurfacePatternCategory =
  | "historical_success_pattern"
  | "historical_failure_pattern"
  | "recurring_issue"
  | "recurring_success"
  | "memory_adjusted_expectation"
  | "outcome_adjusted_context"
  | "learned_recommendation_context"
  | "learned_forecast_context"
  | "learned_scenario_context";

export type SyntheticLearningSurfaceCompatibilityTarget =
  | "executive_summary"
  | "decision_queue"
  | "watchlist"
  | "briefing"
  | "pulse";

export interface SyntheticLearningSurfacePatternMetadata {
  patternCategory: SyntheticLearningSurfacePatternCategory;
  patternReferenceIds: string[];
  patternEvidenceIds: string[];
  patternReviewRequired: boolean;
}

export interface SyntheticLearningSurfaceExplainabilityMetadata {
  explainabilityReferenceIds: string[];
  explainabilityEvidenceIds: string[];
  explainabilityReviewRequired: boolean;
}

export interface SyntheticLearningSurfaceCompatibilityMetadata {
  compatibilityTargets: SyntheticLearningSurfaceCompatibilityTarget[];
  compatibilityReferenceIds: string[];
  compatibilityEvidenceIds: string[];
  compatibilityReviewRequired: boolean;
}

export interface BuildLearningSurfaceInput {
  learningSurfaceKey: string;
  outcomeLearningPackages?: SyntheticOutcomeLearningPackage[];
  decisionMemories?: SyntheticDecisionMemory[];
  forecastMemories?: SyntheticForecastMemory[];
  scenarioMemories?: SyntheticScenarioMemory[];
  controllerMemories?: SyntheticControllerMemory[];
  portfolioMemories?: SyntheticPortfolioMemory[];
  recommendationMemories?: SyntheticRecommendationMemory[];
  learningConfidencePackages?: SyntheticLearningConfidence[];
  historicalSuccessPatternMetadata?: SyntheticLearningSurfacePatternMetadata;
  historicalFailurePatternMetadata?: SyntheticLearningSurfacePatternMetadata;
  recurringIssueMetadata?: SyntheticLearningSurfacePatternMetadata;
  recurringSuccessMetadata?: SyntheticLearningSurfacePatternMetadata;
  memoryAdjustedExpectationMetadata?: SyntheticLearningSurfacePatternMetadata;
  outcomeAdjustedContextMetadata?: SyntheticLearningSurfacePatternMetadata;
  learnedRecommendationContextMetadata?: SyntheticLearningSurfacePatternMetadata;
  learnedForecastContextMetadata?: SyntheticLearningSurfacePatternMetadata;
  learnedScenarioContextMetadata?: SyntheticLearningSurfacePatternMetadata;
  explainabilityMetadata?: SyntheticLearningSurfaceExplainabilityMetadata;
  compatibilityMetadata?: SyntheticLearningSurfaceCompatibilityMetadata;
}

export interface SyntheticLearningSurface {
  learningSurfaceId: string;
  learningSurfaceKey: string;
  outcomeLearningPackageIds: string[];
  memoryPackageIds: string[];
  confidencePackageIds: string[];
  outcomeReferenceIds: string[];
  learningPackageReferenceIds: string[];
  memoryReferenceIds: string[];
  confidencePackageReferenceIds: string[];
  evidenceReferenceIds: string[];
  trustMetadata: SyntheticOutcomeTrustMetadata[];
  confidenceMetadata: SyntheticOutcomeConfidenceMetadata[];
  governanceMetadata: SyntheticOutcomeGovernanceMetadata[];
  explainabilityMetadata?: SyntheticLearningSurfaceExplainabilityMetadata;
  compatibilityMetadata?: SyntheticLearningSurfaceCompatibilityMetadata;
  memoryCompatibilityMetadata: SyntheticOutcomeMemoryCompatibility[];
  learningCompatibilityMetadata: SyntheticOutcomeLearningCompatibility[];
  historicalSuccessPatternMetadata?: SyntheticLearningSurfacePatternMetadata;
  historicalFailurePatternMetadata?: SyntheticLearningSurfacePatternMetadata;
  recurringIssueMetadata?: SyntheticLearningSurfacePatternMetadata;
  recurringSuccessMetadata?: SyntheticLearningSurfacePatternMetadata;
  memoryAdjustedExpectationMetadata?: SyntheticLearningSurfacePatternMetadata;
  outcomeAdjustedContextMetadata?: SyntheticLearningSurfacePatternMetadata;
  learnedRecommendationContextMetadata?: SyntheticLearningSurfacePatternMetadata;
  learnedForecastContextMetadata?: SyntheticLearningSurfacePatternMetadata;
  learnedScenarioContextMetadata?: SyntheticLearningSurfacePatternMetadata;
  outcomeLearningPackages: SyntheticOutcomeLearningPackage[];
  decisionMemories: SyntheticDecisionMemory[];
  forecastMemories: SyntheticForecastMemory[];
  scenarioMemories: SyntheticScenarioMemory[];
  controllerMemories: SyntheticControllerMemory[];
  portfolioMemories: SyntheticPortfolioMemory[];
  recommendationMemories: SyntheticRecommendationMemory[];
  learningConfidencePackages: SyntheticLearningConfidence[];
  warnings: string[];
}

export interface BuildLearningSurfaceResult {
  learningSurface: SyntheticLearningSurface | null;
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

function getOutcomeLearningPackages(input: BuildLearningSurfaceInput): SyntheticOutcomeLearningPackage[] {
  return input.outcomeLearningPackages ?? [];
}

function getDecisionMemories(input: BuildLearningSurfaceInput): SyntheticDecisionMemory[] {
  return input.decisionMemories ?? [];
}

function getForecastMemories(input: BuildLearningSurfaceInput): SyntheticForecastMemory[] {
  return input.forecastMemories ?? [];
}

function getScenarioMemories(input: BuildLearningSurfaceInput): SyntheticScenarioMemory[] {
  return input.scenarioMemories ?? [];
}

function getControllerMemories(input: BuildLearningSurfaceInput): SyntheticControllerMemory[] {
  return input.controllerMemories ?? [];
}

function getPortfolioMemories(input: BuildLearningSurfaceInput): SyntheticPortfolioMemory[] {
  return input.portfolioMemories ?? [];
}

function getRecommendationMemories(input: BuildLearningSurfaceInput): SyntheticRecommendationMemory[] {
  return input.recommendationMemories ?? [];
}

function getLearningConfidencePackages(input: BuildLearningSurfaceInput): SyntheticLearningConfidence[] {
  return input.learningConfidencePackages ?? [];
}

function getAllMemoryPackages(
  input: BuildLearningSurfaceInput,
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

function getMemoryPackageIds(input: BuildLearningSurfaceInput): string[] {
  return uniqueStable([
    ...getDecisionMemories(input).map((memory) => memory.decisionMemoryId),
    ...getForecastMemories(input).map((memory) => memory.forecastMemoryId),
    ...getScenarioMemories(input).map((memory) => memory.scenarioMemoryId),
    ...getControllerMemories(input).map((memory) => memory.controllerMemoryId),
    ...getPortfolioMemories(input).map((memory) => memory.portfolioMemoryId),
    ...getRecommendationMemories(input).map((memory) => memory.recommendationMemoryId),
  ]);
}

function getPatternMetadata(input: BuildLearningSurfaceInput): SyntheticLearningSurfacePatternMetadata[] {
  return compactDefined([
    input.historicalSuccessPatternMetadata,
    input.historicalFailurePatternMetadata,
    input.recurringIssueMetadata,
    input.recurringSuccessMetadata,
    input.memoryAdjustedExpectationMetadata,
    input.outcomeAdjustedContextMetadata,
    input.learnedRecommendationContextMetadata,
    input.learnedForecastContextMetadata,
    input.learnedScenarioContextMetadata,
  ]);
}

function getOutcomeReferenceIds(input: BuildLearningSurfaceInput): string[] {
  return uniqueStable([
    ...getOutcomeLearningPackages(input).map((learningPackage) => learningPackage.outcomeId),
    ...getAllMemoryPackages(input).flatMap((memory) => memory.outcomeReferenceIds),
    ...getLearningConfidencePackages(input).flatMap((confidence) => confidence.outcomeReferenceIds),
  ]);
}

function getLearningPackageReferenceIds(input: BuildLearningSurfaceInput): string[] {
  return uniqueStable([
    ...getOutcomeLearningPackages(input).map((learningPackage) => learningPackage.outcomeLearningPackageId),
    ...getAllMemoryPackages(input).map((memory) => memory.outcomeLearningPackageId),
    ...getLearningConfidencePackages(input).flatMap((confidence) => confidence.learningPackageReferenceIds),
  ]);
}

function getMemoryReferenceIds(input: BuildLearningSurfaceInput): string[] {
  return uniqueStable([
    ...getLearningConfidencePackages(input).flatMap((confidence) => confidence.memoryReferenceIds),
    ...getMemoryCompatibilityMetadata(input).flatMap((metadata) => metadata.memoryReferenceIds),
  ]);
}

function getEvidenceReferenceIds(input: BuildLearningSurfaceInput): string[] {
  return uniqueStable([
    ...getOutcomeLearningPackages(input).flatMap((learningPackage) => learningPackage.evidenceReferenceIds),
    ...getAllMemoryPackages(input).flatMap((memory) => memory.evidenceReferenceIds),
    ...getLearningConfidencePackages(input).flatMap((confidence) => confidence.evidenceReferenceIds),
    ...getPatternMetadata(input).flatMap((metadata) => metadata.patternEvidenceIds),
    ...(input.explainabilityMetadata?.explainabilityEvidenceIds ?? []),
    ...(input.compatibilityMetadata?.compatibilityEvidenceIds ?? []),
  ]);
}

function getTrustMetadata(input: BuildLearningSurfaceInput): SyntheticOutcomeTrustMetadata[] {
  return [
    ...compactDefined(getOutcomeLearningPackages(input).map((learningPackage) => learningPackage.trustMetadata)),
    ...compactDefined(getAllMemoryPackages(input).map((memory) => memory.trustMetadata)),
    ...getLearningConfidencePackages(input).flatMap((confidence) => confidence.trustMetadata),
  ];
}

function getConfidenceMetadata(input: BuildLearningSurfaceInput): SyntheticOutcomeConfidenceMetadata[] {
  return [
    ...compactDefined(getOutcomeLearningPackages(input).map((learningPackage) => learningPackage.confidenceMetadata)),
    ...compactDefined(getAllMemoryPackages(input).map((memory) => memory.confidenceMetadata)),
  ];
}

function getGovernanceMetadata(input: BuildLearningSurfaceInput): SyntheticOutcomeGovernanceMetadata[] {
  return [
    ...compactDefined(getOutcomeLearningPackages(input).map((learningPackage) => learningPackage.governanceMetadata)),
    ...compactDefined(getAllMemoryPackages(input).map((memory) => memory.governanceMetadata)),
    ...getLearningConfidencePackages(input).flatMap((confidence) => confidence.governanceMetadata),
  ];
}

function getMemoryCompatibilityMetadata(input: BuildLearningSurfaceInput): SyntheticOutcomeMemoryCompatibility[] {
  return [
    ...compactDefined(getOutcomeLearningPackages(input).map((learningPackage) => learningPackage.memoryCompatibility)),
    ...compactDefined(getAllMemoryPackages(input).map((memory) => memory.memoryCompatibility)),
    ...getLearningConfidencePackages(input).flatMap((confidence) => confidence.memoryCompatibilityMetadata),
  ];
}

function getLearningCompatibilityMetadata(input: BuildLearningSurfaceInput): SyntheticOutcomeLearningCompatibility[] {
  return [
    ...compactDefined(getOutcomeLearningPackages(input).map((learningPackage) => learningPackage.learningCompatibility)),
    ...compactDefined(getAllMemoryPackages(input).map((memory) => memory.learningCompatibility)),
    ...getLearningConfidencePackages(input).flatMap((confidence) => confidence.learningCompatibilityMetadata),
  ];
}

function buildLearningSurfaceId(input: BuildLearningSurfaceInput): string {
  return `synthetic-learning-surface:${stableSnapshotHash({
    learningSurfaceKey: input.learningSurfaceKey,
    outcomeLearningPackageIds: getOutcomeLearningPackages(input).map((item) => item.outcomeLearningPackageId),
    memoryPackageIds: getMemoryPackageIds(input),
    confidencePackageIds: getLearningConfidencePackages(input).map((item) => item.learningConfidenceId),
    outcomeReferenceIds: getOutcomeReferenceIds(input),
    learningPackageReferenceIds: getLearningPackageReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    patternCategories: getPatternMetadata(input).map((metadata) => metadata.patternCategory),
    compatibilityTargets: input.compatibilityMetadata?.compatibilityTargets ?? [],
  })}`;
}

function validateInput(input: BuildLearningSurfaceInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.learningSurfaceKey)) warnings.push("learningSurfaceKey is required.");
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
  if (warnings.length > 0) return warnings;

  const artifactCount =
    getOutcomeLearningPackages(input).length + getAllMemoryPackages(input).length + getLearningConfidencePackages(input).length;
  if (artifactCount === 0) {
    warnings.push("at least one learning, memory, or confidence package is required.");
  }
  for (const learningPackage of getOutcomeLearningPackages(input)) {
    if (!hasValue(learningPackage.outcomeLearningPackageId)) warnings.push("outcomeLearningPackageId is required.");
    if (!hasValue(learningPackage.outcomeId)) warnings.push("outcomeId is required.");
  }
  for (const memory of getAllMemoryPackages(input)) {
    if (!hasValue(memory.outcomeLearningPackageId)) warnings.push("memory outcomeLearningPackageId is required.");
    if (!hasValue(memory.outcomeId)) warnings.push("memory outcomeId is required.");
  }
  for (const confidence of getLearningConfidencePackages(input)) {
    if (!hasValue(confidence.learningConfidenceId)) warnings.push("learningConfidenceId is required.");
  }

  return warnings;
}

export function buildLearningSurface(input: BuildLearningSurfaceInput): BuildLearningSurfaceResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      learningSurface: null,
      skipped: true,
      warnings,
    };
  }

  return {
    learningSurface: {
      learningSurfaceId: buildLearningSurfaceId(input),
      learningSurfaceKey: input.learningSurfaceKey,
      outcomeLearningPackageIds: getOutcomeLearningPackages(input).map((item) => item.outcomeLearningPackageId),
      memoryPackageIds: getMemoryPackageIds(input),
      confidencePackageIds: getLearningConfidencePackages(input).map((item) => item.learningConfidenceId),
      outcomeReferenceIds: getOutcomeReferenceIds(input),
      learningPackageReferenceIds: getLearningPackageReferenceIds(input),
      memoryReferenceIds: getMemoryReferenceIds(input),
      confidencePackageReferenceIds: getLearningConfidencePackages(input).map((item) => item.learningConfidenceId),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      trustMetadata: getTrustMetadata(input),
      confidenceMetadata: getConfidenceMetadata(input),
      governanceMetadata: getGovernanceMetadata(input),
      explainabilityMetadata: input.explainabilityMetadata,
      compatibilityMetadata: input.compatibilityMetadata,
      memoryCompatibilityMetadata: getMemoryCompatibilityMetadata(input),
      learningCompatibilityMetadata: getLearningCompatibilityMetadata(input),
      historicalSuccessPatternMetadata: input.historicalSuccessPatternMetadata,
      historicalFailurePatternMetadata: input.historicalFailurePatternMetadata,
      recurringIssueMetadata: input.recurringIssueMetadata,
      recurringSuccessMetadata: input.recurringSuccessMetadata,
      memoryAdjustedExpectationMetadata: input.memoryAdjustedExpectationMetadata,
      outcomeAdjustedContextMetadata: input.outcomeAdjustedContextMetadata,
      learnedRecommendationContextMetadata: input.learnedRecommendationContextMetadata,
      learnedForecastContextMetadata: input.learnedForecastContextMetadata,
      learnedScenarioContextMetadata: input.learnedScenarioContextMetadata,
      outcomeLearningPackages: getOutcomeLearningPackages(input),
      decisionMemories: getDecisionMemories(input),
      forecastMemories: getForecastMemories(input),
      scenarioMemories: getScenarioMemories(input),
      controllerMemories: getControllerMemories(input),
      portfolioMemories: getPortfolioMemories(input),
      recommendationMemories: getRecommendationMemories(input),
      learningConfidencePackages: getLearningConfidencePackages(input),
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
