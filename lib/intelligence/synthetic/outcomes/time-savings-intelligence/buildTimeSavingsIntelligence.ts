import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticAdoptionIntelligence } from "../adoption-intelligence";
import type { SyntheticCapabilityIntelligence } from "../capability-intelligence";
import type { SyntheticControllerMemory } from "../controller-memory";
import type { SyntheticDecisionMemory } from "../decision-memory";
import type { SyntheticForecastMemory } from "../forecast-memory";
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

export interface SyntheticEstimatedTimeSavingsMetadata {
  estimatedTimeSavingsReferenceIds: string[];
  estimatedTimeSavingsEvidenceIds: string[];
  estimatedTimeSavingsReviewRequired: boolean;
}

export interface SyntheticObservedTimeSavingsMetadata {
  observedTimeSavingsReferenceIds: string[];
  observedTimeSavingsEvidenceIds: string[];
  observedTimeSavingsReviewRequired: boolean;
}

export interface SyntheticRoleBasedTimeSavingsMetadata {
  roleTimeSavingsReferenceIds: string[];
  roleTimeSavingsEvidenceIds: string[];
  roleTimeSavingsReviewRequired: boolean;
}

export interface SyntheticCompanyTimeSavingsMetadata {
  companyTimeSavingsReferenceIds: string[];
  companyTimeSavingsEvidenceIds: string[];
  companyTimeSavingsReviewRequired: boolean;
}

export interface SyntheticFirmTimeSavingsMetadata {
  firmTimeSavingsReferenceIds: string[];
  firmTimeSavingsEvidenceIds: string[];
  firmTimeSavingsReviewRequired: boolean;
}

export interface SyntheticControllerTimeSavingsMetadata {
  controllerTimeSavingsReferenceIds: string[];
  controllerTimeSavingsEvidenceIds: string[];
  controllerTimeSavingsReviewRequired: boolean;
}

export interface SyntheticPortfolioTimeSavingsMetadata {
  portfolioTimeSavingsReferenceIds: string[];
  portfolioTimeSavingsEvidenceIds: string[];
  portfolioTimeSavingsReviewRequired: boolean;
}

export interface SyntheticBriefingTimeSavingsMetadata {
  briefingTimeSavingsReferenceIds: string[];
  briefingTimeSavingsEvidenceIds: string[];
  briefingTimeSavingsReviewRequired: boolean;
}

export interface SyntheticCapabilityTimeSavingsMetadata {
  capabilityTimeSavingsReferenceIds: string[];
  capabilityTimeSavingsEvidenceIds: string[];
  capabilityTimeSavingsReviewRequired: boolean;
}

export interface BuildTimeSavingsIntelligenceInput {
  timeSavingsIntelligenceKey: string;
  timeSavingsReferenceIds: string[];
  capabilityIntelligencePackages?: SyntheticCapabilityIntelligence[];
  adoptionIntelligencePackages?: SyntheticAdoptionIntelligence[];
  outcomeLearningPackages?: SyntheticOutcomeLearningPackage[];
  decisionMemories?: SyntheticDecisionMemory[];
  forecastMemories?: SyntheticForecastMemory[];
  scenarioMemories?: SyntheticScenarioMemory[];
  controllerMemories?: SyntheticControllerMemory[];
  portfolioMemories?: SyntheticPortfolioMemory[];
  recommendationMemories?: SyntheticRecommendationMemory[];
  estimatedTimeSavingsMetadata?: SyntheticEstimatedTimeSavingsMetadata;
  observedTimeSavingsMetadata?: SyntheticObservedTimeSavingsMetadata;
  roleBasedTimeSavingsMetadata?: SyntheticRoleBasedTimeSavingsMetadata;
  companyTimeSavingsMetadata?: SyntheticCompanyTimeSavingsMetadata;
  firmTimeSavingsMetadata?: SyntheticFirmTimeSavingsMetadata;
  controllerTimeSavingsMetadata?: SyntheticControllerTimeSavingsMetadata;
  portfolioTimeSavingsMetadata?: SyntheticPortfolioTimeSavingsMetadata;
  briefingTimeSavingsMetadata?: SyntheticBriefingTimeSavingsMetadata;
  capabilityTimeSavingsMetadata?: SyntheticCapabilityTimeSavingsMetadata;
}

export interface SyntheticTimeSavingsIntelligence {
  timeSavingsIntelligenceId: string;
  timeSavingsIntelligenceKey: string;
  timeSavingsReferenceIds: string[];
  capabilityIntelligenceIds: string[];
  adoptionIntelligenceIds: string[];
  outcomeLearningPackageIds: string[];
  memoryPackageIds: string[];
  capabilityReferenceIds: string[];
  adoptionReferenceIds: string[];
  outcomeReferenceIds: string[];
  evidenceReferenceIds: string[];
  trustMetadata: SyntheticOutcomeTrustMetadata[];
  confidenceMetadata: SyntheticOutcomeConfidenceMetadata[];
  governanceMetadata: SyntheticOutcomeGovernanceMetadata[];
  memoryCompatibilityMetadata: SyntheticOutcomeMemoryCompatibility[];
  learningCompatibilityMetadata: SyntheticOutcomeLearningCompatibility[];
  estimatedTimeSavingsMetadata?: SyntheticEstimatedTimeSavingsMetadata;
  observedTimeSavingsMetadata?: SyntheticObservedTimeSavingsMetadata;
  roleBasedTimeSavingsMetadata?: SyntheticRoleBasedTimeSavingsMetadata;
  companyTimeSavingsMetadata?: SyntheticCompanyTimeSavingsMetadata;
  firmTimeSavingsMetadata?: SyntheticFirmTimeSavingsMetadata;
  controllerTimeSavingsMetadata?: SyntheticControllerTimeSavingsMetadata;
  portfolioTimeSavingsMetadata?: SyntheticPortfolioTimeSavingsMetadata;
  briefingTimeSavingsMetadata?: SyntheticBriefingTimeSavingsMetadata;
  capabilityTimeSavingsMetadata?: SyntheticCapabilityTimeSavingsMetadata;
  capabilityIntelligencePackages: SyntheticCapabilityIntelligence[];
  adoptionIntelligencePackages: SyntheticAdoptionIntelligence[];
  outcomeLearningPackages: SyntheticOutcomeLearningPackage[];
  decisionMemories: SyntheticDecisionMemory[];
  forecastMemories: SyntheticForecastMemory[];
  scenarioMemories: SyntheticScenarioMemory[];
  controllerMemories: SyntheticControllerMemory[];
  portfolioMemories: SyntheticPortfolioMemory[];
  recommendationMemories: SyntheticRecommendationMemory[];
  warnings: string[];
}

export interface BuildTimeSavingsIntelligenceResult {
  timeSavingsIntelligence: SyntheticTimeSavingsIntelligence | null;
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

function getCapabilityIntelligencePackages(input: BuildTimeSavingsIntelligenceInput): SyntheticCapabilityIntelligence[] {
  return input.capabilityIntelligencePackages ?? [];
}

function getAdoptionIntelligencePackages(input: BuildTimeSavingsIntelligenceInput): SyntheticAdoptionIntelligence[] {
  return input.adoptionIntelligencePackages ?? [];
}

function getOutcomeLearningPackages(input: BuildTimeSavingsIntelligenceInput): SyntheticOutcomeLearningPackage[] {
  return input.outcomeLearningPackages ?? [];
}

function getDecisionMemories(input: BuildTimeSavingsIntelligenceInput): SyntheticDecisionMemory[] {
  return input.decisionMemories ?? [];
}

function getForecastMemories(input: BuildTimeSavingsIntelligenceInput): SyntheticForecastMemory[] {
  return input.forecastMemories ?? [];
}

function getScenarioMemories(input: BuildTimeSavingsIntelligenceInput): SyntheticScenarioMemory[] {
  return input.scenarioMemories ?? [];
}

function getControllerMemories(input: BuildTimeSavingsIntelligenceInput): SyntheticControllerMemory[] {
  return input.controllerMemories ?? [];
}

function getPortfolioMemories(input: BuildTimeSavingsIntelligenceInput): SyntheticPortfolioMemory[] {
  return input.portfolioMemories ?? [];
}

function getRecommendationMemories(input: BuildTimeSavingsIntelligenceInput): SyntheticRecommendationMemory[] {
  return input.recommendationMemories ?? [];
}

function getMemoryPackageIds(input: BuildTimeSavingsIntelligenceInput): string[] {
  return uniqueStable([
    ...getDecisionMemories(input).map((memory) => memory.decisionMemoryId),
    ...getForecastMemories(input).map((memory) => memory.forecastMemoryId),
    ...getScenarioMemories(input).map((memory) => memory.scenarioMemoryId),
    ...getControllerMemories(input).map((memory) => memory.controllerMemoryId),
    ...getPortfolioMemories(input).map((memory) => memory.portfolioMemoryId),
    ...getRecommendationMemories(input).map((memory) => memory.recommendationMemoryId),
  ]);
}

function getCapabilityReferenceIds(input: BuildTimeSavingsIntelligenceInput): string[] {
  return uniqueStable([
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.capabilityReferenceIds),
    ...getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.capabilityReferenceIds),
  ]);
}

function getAdoptionReferenceIds(input: BuildTimeSavingsIntelligenceInput): string[] {
  return uniqueStable(getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.adoptionReferenceIds));
}

function getOutcomeReferenceIds(input: BuildTimeSavingsIntelligenceInput): string[] {
  return uniqueStable([
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.outcomeReferenceIds),
    ...getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.outcomeReferenceIds),
    ...getOutcomeLearningPackages(input).map((artifact) => artifact.outcomeId),
    ...getDecisionMemories(input).flatMap((memory) => memory.outcomeReferenceIds),
    ...getForecastMemories(input).flatMap((memory) => memory.outcomeReferenceIds),
    ...getScenarioMemories(input).flatMap((memory) => memory.outcomeReferenceIds),
    ...getControllerMemories(input).flatMap((memory) => memory.outcomeReferenceIds),
    ...getPortfolioMemories(input).flatMap((memory) => memory.outcomeReferenceIds),
    ...getRecommendationMemories(input).flatMap((memory) => memory.outcomeReferenceIds),
  ]);
}

function getEvidenceReferenceIds(input: BuildTimeSavingsIntelligenceInput): string[] {
  return uniqueStable([
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getOutcomeLearningPackages(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDecisionMemories(input).flatMap((memory) => memory.evidenceReferenceIds),
    ...getForecastMemories(input).flatMap((memory) => memory.evidenceReferenceIds),
    ...getScenarioMemories(input).flatMap((memory) => memory.evidenceReferenceIds),
    ...getControllerMemories(input).flatMap((memory) => memory.evidenceReferenceIds),
    ...getPortfolioMemories(input).flatMap((memory) => memory.evidenceReferenceIds),
    ...getRecommendationMemories(input).flatMap((memory) => memory.evidenceReferenceIds),
    ...(input.estimatedTimeSavingsMetadata?.estimatedTimeSavingsEvidenceIds ?? []),
    ...(input.observedTimeSavingsMetadata?.observedTimeSavingsEvidenceIds ?? []),
    ...(input.roleBasedTimeSavingsMetadata?.roleTimeSavingsEvidenceIds ?? []),
    ...(input.companyTimeSavingsMetadata?.companyTimeSavingsEvidenceIds ?? []),
    ...(input.firmTimeSavingsMetadata?.firmTimeSavingsEvidenceIds ?? []),
    ...(input.controllerTimeSavingsMetadata?.controllerTimeSavingsEvidenceIds ?? []),
    ...(input.portfolioTimeSavingsMetadata?.portfolioTimeSavingsEvidenceIds ?? []),
    ...(input.briefingTimeSavingsMetadata?.briefingTimeSavingsEvidenceIds ?? []),
    ...(input.capabilityTimeSavingsMetadata?.capabilityTimeSavingsEvidenceIds ?? []),
  ]);
}

function getTrustMetadata(input: BuildTimeSavingsIntelligenceInput): SyntheticOutcomeTrustMetadata[] {
  return [
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.trustMetadata),
    ...getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.trustMetadata),
    ...compactDefined(getOutcomeLearningPackages(input).map((artifact) => artifact.trustMetadata)),
    ...compactDefined(getDecisionMemories(input).map((memory) => memory.trustMetadata)),
    ...compactDefined(getForecastMemories(input).map((memory) => memory.trustMetadata)),
    ...compactDefined(getScenarioMemories(input).map((memory) => memory.trustMetadata)),
    ...compactDefined(getControllerMemories(input).map((memory) => memory.trustMetadata)),
    ...compactDefined(getPortfolioMemories(input).map((memory) => memory.trustMetadata)),
    ...compactDefined(getRecommendationMemories(input).map((memory) => memory.trustMetadata)),
  ];
}

function getConfidenceMetadata(input: BuildTimeSavingsIntelligenceInput): SyntheticOutcomeConfidenceMetadata[] {
  return [
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.confidenceMetadata),
    ...getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.confidenceMetadata),
    ...compactDefined(getOutcomeLearningPackages(input).map((artifact) => artifact.confidenceMetadata)),
    ...compactDefined(getDecisionMemories(input).map((memory) => memory.confidenceMetadata)),
    ...compactDefined(getForecastMemories(input).map((memory) => memory.confidenceMetadata)),
    ...compactDefined(getScenarioMemories(input).map((memory) => memory.confidenceMetadata)),
    ...compactDefined(getControllerMemories(input).map((memory) => memory.confidenceMetadata)),
    ...compactDefined(getPortfolioMemories(input).map((memory) => memory.confidenceMetadata)),
    ...compactDefined(getRecommendationMemories(input).map((memory) => memory.confidenceMetadata)),
  ];
}

function getGovernanceMetadata(input: BuildTimeSavingsIntelligenceInput): SyntheticOutcomeGovernanceMetadata[] {
  return [
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.governanceMetadata),
    ...getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.governanceMetadata),
    ...compactDefined(getOutcomeLearningPackages(input).map((artifact) => artifact.governanceMetadata)),
    ...compactDefined(getDecisionMemories(input).map((memory) => memory.governanceMetadata)),
    ...compactDefined(getForecastMemories(input).map((memory) => memory.governanceMetadata)),
    ...compactDefined(getScenarioMemories(input).map((memory) => memory.governanceMetadata)),
    ...compactDefined(getControllerMemories(input).map((memory) => memory.governanceMetadata)),
    ...compactDefined(getPortfolioMemories(input).map((memory) => memory.governanceMetadata)),
    ...compactDefined(getRecommendationMemories(input).map((memory) => memory.governanceMetadata)),
  ];
}

function getMemoryCompatibilityMetadata(input: BuildTimeSavingsIntelligenceInput): SyntheticOutcomeMemoryCompatibility[] {
  return [
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.memoryCompatibilityMetadata),
    ...getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.memoryCompatibilityMetadata),
    ...compactDefined(getOutcomeLearningPackages(input).map((artifact) => artifact.memoryCompatibility)),
    ...compactDefined(getDecisionMemories(input).map((memory) => memory.memoryCompatibility)),
    ...compactDefined(getForecastMemories(input).map((memory) => memory.memoryCompatibility)),
    ...compactDefined(getScenarioMemories(input).map((memory) => memory.memoryCompatibility)),
    ...compactDefined(getControllerMemories(input).map((memory) => memory.memoryCompatibility)),
    ...compactDefined(getPortfolioMemories(input).map((memory) => memory.memoryCompatibility)),
    ...compactDefined(getRecommendationMemories(input).map((memory) => memory.memoryCompatibility)),
  ];
}

function getLearningCompatibilityMetadata(input: BuildTimeSavingsIntelligenceInput): SyntheticOutcomeLearningCompatibility[] {
  return [
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.learningCompatibilityMetadata),
    ...getAdoptionIntelligencePackages(input).flatMap((artifact) => artifact.learningCompatibilityMetadata),
    ...compactDefined(getOutcomeLearningPackages(input).map((artifact) => artifact.learningCompatibility)),
    ...compactDefined(getDecisionMemories(input).map((memory) => memory.learningCompatibility)),
    ...compactDefined(getForecastMemories(input).map((memory) => memory.learningCompatibility)),
    ...compactDefined(getScenarioMemories(input).map((memory) => memory.learningCompatibility)),
    ...compactDefined(getControllerMemories(input).map((memory) => memory.learningCompatibility)),
    ...compactDefined(getPortfolioMemories(input).map((memory) => memory.learningCompatibility)),
    ...compactDefined(getRecommendationMemories(input).map((memory) => memory.learningCompatibility)),
  ];
}

function buildTimeSavingsIntelligenceId(input: BuildTimeSavingsIntelligenceInput): string {
  return `synthetic-time-savings-intelligence:${stableSnapshotHash({
    timeSavingsIntelligenceKey: input.timeSavingsIntelligenceKey,
    timeSavingsReferenceIds: input.timeSavingsReferenceIds,
    capabilityIntelligenceIds: getCapabilityIntelligencePackages(input).map((artifact) => artifact.capabilityIntelligenceId),
    adoptionIntelligenceIds: getAdoptionIntelligencePackages(input).map((artifact) => artifact.adoptionIntelligenceId),
    outcomeLearningPackageIds: getOutcomeLearningPackages(input).map((artifact) => artifact.outcomeLearningPackageId),
    memoryPackageIds: getMemoryPackageIds(input),
    capabilityReferenceIds: getCapabilityReferenceIds(input),
    adoptionReferenceIds: getAdoptionReferenceIds(input),
    outcomeReferenceIds: getOutcomeReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    estimatedTimeSavingsReferenceIds: input.estimatedTimeSavingsMetadata?.estimatedTimeSavingsReferenceIds ?? [],
    observedTimeSavingsReferenceIds: input.observedTimeSavingsMetadata?.observedTimeSavingsReferenceIds ?? [],
    roleTimeSavingsReferenceIds: input.roleBasedTimeSavingsMetadata?.roleTimeSavingsReferenceIds ?? [],
    companyTimeSavingsReferenceIds: input.companyTimeSavingsMetadata?.companyTimeSavingsReferenceIds ?? [],
    firmTimeSavingsReferenceIds: input.firmTimeSavingsMetadata?.firmTimeSavingsReferenceIds ?? [],
    controllerTimeSavingsReferenceIds: input.controllerTimeSavingsMetadata?.controllerTimeSavingsReferenceIds ?? [],
    portfolioTimeSavingsReferenceIds: input.portfolioTimeSavingsMetadata?.portfolioTimeSavingsReferenceIds ?? [],
    briefingTimeSavingsReferenceIds: input.briefingTimeSavingsMetadata?.briefingTimeSavingsReferenceIds ?? [],
    capabilityTimeSavingsReferenceIds: input.capabilityTimeSavingsMetadata?.capabilityTimeSavingsReferenceIds ?? [],
  })}`;
}

function validateInput(input: BuildTimeSavingsIntelligenceInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.timeSavingsIntelligenceKey)) warnings.push("timeSavingsIntelligenceKey is required.");
  if (!Array.isArray(input.timeSavingsReferenceIds) || input.timeSavingsReferenceIds.length === 0) {
    warnings.push("timeSavingsReferenceIds must include at least one value.");
  }
  if (input.capabilityIntelligencePackages !== undefined && !Array.isArray(input.capabilityIntelligencePackages)) {
    warnings.push("capabilityIntelligencePackages must be an array.");
  }
  if (input.adoptionIntelligencePackages !== undefined && !Array.isArray(input.adoptionIntelligencePackages)) {
    warnings.push("adoptionIntelligencePackages must be an array.");
  }
  if (input.outcomeLearningPackages !== undefined && !Array.isArray(input.outcomeLearningPackages)) {
    warnings.push("outcomeLearningPackages must be an array.");
  }

  for (const artifact of getCapabilityIntelligencePackages(input)) {
    if (!hasValue(artifact.capabilityIntelligenceId)) warnings.push("capabilityIntelligenceId is required.");
  }
  for (const artifact of getAdoptionIntelligencePackages(input)) {
    if (!hasValue(artifact.adoptionIntelligenceId)) warnings.push("adoptionIntelligenceId is required.");
  }
  for (const artifact of getOutcomeLearningPackages(input)) {
    if (!hasValue(artifact.outcomeLearningPackageId)) warnings.push("outcomeLearningPackageId is required.");
  }

  return warnings;
}

export function buildTimeSavingsIntelligence(
  input: BuildTimeSavingsIntelligenceInput,
): BuildTimeSavingsIntelligenceResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      timeSavingsIntelligence: null,
      skipped: true,
      warnings,
    };
  }

  return {
    timeSavingsIntelligence: {
      timeSavingsIntelligenceId: buildTimeSavingsIntelligenceId(input),
      timeSavingsIntelligenceKey: input.timeSavingsIntelligenceKey,
      timeSavingsReferenceIds: input.timeSavingsReferenceIds,
      capabilityIntelligenceIds: getCapabilityIntelligencePackages(input).map((artifact) => artifact.capabilityIntelligenceId),
      adoptionIntelligenceIds: getAdoptionIntelligencePackages(input).map((artifact) => artifact.adoptionIntelligenceId),
      outcomeLearningPackageIds: getOutcomeLearningPackages(input).map((artifact) => artifact.outcomeLearningPackageId),
      memoryPackageIds: getMemoryPackageIds(input),
      capabilityReferenceIds: getCapabilityReferenceIds(input),
      adoptionReferenceIds: getAdoptionReferenceIds(input),
      outcomeReferenceIds: getOutcomeReferenceIds(input),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      trustMetadata: getTrustMetadata(input),
      confidenceMetadata: getConfidenceMetadata(input),
      governanceMetadata: getGovernanceMetadata(input),
      memoryCompatibilityMetadata: getMemoryCompatibilityMetadata(input),
      learningCompatibilityMetadata: getLearningCompatibilityMetadata(input),
      estimatedTimeSavingsMetadata: input.estimatedTimeSavingsMetadata,
      observedTimeSavingsMetadata: input.observedTimeSavingsMetadata,
      roleBasedTimeSavingsMetadata: input.roleBasedTimeSavingsMetadata,
      companyTimeSavingsMetadata: input.companyTimeSavingsMetadata,
      firmTimeSavingsMetadata: input.firmTimeSavingsMetadata,
      controllerTimeSavingsMetadata: input.controllerTimeSavingsMetadata,
      portfolioTimeSavingsMetadata: input.portfolioTimeSavingsMetadata,
      briefingTimeSavingsMetadata: input.briefingTimeSavingsMetadata,
      capabilityTimeSavingsMetadata: input.capabilityTimeSavingsMetadata,
      capabilityIntelligencePackages: getCapabilityIntelligencePackages(input),
      adoptionIntelligencePackages: getAdoptionIntelligencePackages(input),
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
