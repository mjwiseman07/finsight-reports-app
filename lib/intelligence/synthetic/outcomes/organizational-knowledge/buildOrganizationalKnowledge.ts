import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticAdoptionIntelligence } from "../adoption-intelligence";
import type { SyntheticCapabilityIntelligence } from "../capability-intelligence";
import type { SyntheticControllerMemory } from "../controller-memory";
import type { SyntheticDecisionMemory } from "../decision-memory";
import type { SyntheticForecastMemory } from "../forecast-memory";
import type { SyntheticInterventionIntelligence } from "../intervention-intelligence";
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
  SyntheticOutcomeScope,
  SyntheticOutcomeTrustMetadata,
} from "../types";

export interface SyntheticKnowledgeAccumulationMetadata {
  knowledgeAccumulationReferenceIds: string[];
  knowledgeAccumulationEvidenceIds: string[];
  knowledgeAccumulationReviewRequired: boolean;
}

export interface SyntheticKnowledgeRetentionMetadata {
  knowledgeRetentionReferenceIds: string[];
  knowledgeRetentionEvidenceIds: string[];
  knowledgeRetentionReviewRequired: boolean;
}

export interface SyntheticKnowledgeRelevanceMetadata {
  knowledgeRelevanceReferenceIds: string[];
  knowledgeRelevanceEvidenceIds: string[];
  knowledgeRelevanceReviewRequired: boolean;
}

export interface SyntheticKnowledgeExpirationMetadata {
  knowledgeExpirationReferenceIds: string[];
  knowledgeExpirationEvidenceIds: string[];
  knowledgeExpirationReviewRequired: boolean;
}

export interface SyntheticKnowledgeConfidenceMetadata {
  knowledgeConfidenceReferenceIds: string[];
  knowledgeConfidenceEvidenceIds: string[];
  knowledgeConfidenceReviewRequired: boolean;
}

export interface SyntheticKnowledgeExplainabilityMetadata {
  knowledgeExplainabilityReferenceIds: string[];
  knowledgeExplainabilityEvidenceIds: string[];
  knowledgeExplainabilityReviewRequired: boolean;
}

export interface SyntheticKnowledgeAuditabilityMetadata {
  knowledgeAuditabilityReferenceIds: string[];
  knowledgeAuditabilityEvidenceIds: string[];
  knowledgeAuditabilityReviewRequired: boolean;
}

export interface SyntheticKnowledgeCustomerIsolationMetadata {
  customerIsolationRequired: boolean;
  customerIsolationBoundaryIds: string[];
  customerIsolationEvidenceIds: string[];
  customerIsolationReviewRequired: boolean;
}

export interface SyntheticKnowledgeFirmIsolationMetadata {
  firmIsolationRequired: boolean;
  firmIsolationBoundaryIds: string[];
  firmIsolationEvidenceIds: string[];
  firmIsolationReviewRequired: boolean;
}

export interface SyntheticKnowledgeClientIsolationMetadata {
  clientIsolationRequired: boolean;
  clientIsolationBoundaryIds: string[];
  clientIsolationEvidenceIds: string[];
  clientIsolationReviewRequired: boolean;
}

export interface BuildOrganizationalKnowledgeInput {
  organizationalKnowledgeKey: string;
  knowledgeReferenceIds: string[];
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
  interventionIntelligencePackages?: SyntheticInterventionIntelligence[];
  knowledgeAccumulationMetadata?: SyntheticKnowledgeAccumulationMetadata;
  knowledgeRetentionMetadata?: SyntheticKnowledgeRetentionMetadata;
  knowledgeRelevanceMetadata?: SyntheticKnowledgeRelevanceMetadata;
  knowledgeExpirationMetadata?: SyntheticKnowledgeExpirationMetadata;
  knowledgeConfidenceMetadata?: SyntheticKnowledgeConfidenceMetadata;
  knowledgeExplainabilityMetadata?: SyntheticKnowledgeExplainabilityMetadata;
  knowledgeAuditabilityMetadata?: SyntheticKnowledgeAuditabilityMetadata;
  customerIsolationMetadata?: SyntheticKnowledgeCustomerIsolationMetadata;
  firmIsolationMetadata?: SyntheticKnowledgeFirmIsolationMetadata;
  clientIsolationMetadata?: SyntheticKnowledgeClientIsolationMetadata;
}

export interface SyntheticOrganizationalKnowledge {
  organizationalKnowledgeId: string;
  organizationalKnowledgeKey: string;
  knowledgeReferenceIds: string[];
  outcomeReferenceIds: string[];
  memoryReferenceIds: string[];
  learningReferenceIds: string[];
  learningConfidenceIds: string[];
  learningSurfaceIds: string[];
  capabilityIntelligenceIds: string[];
  adoptionIntelligenceIds: string[];
  timeSavingsIntelligenceIds: string[];
  interventionIntelligenceIds: string[];
  knowledgeEvidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  trustMetadata: SyntheticOutcomeTrustMetadata[];
  confidenceMetadata: SyntheticOutcomeConfidenceMetadata[];
  governanceMetadata: SyntheticOutcomeGovernanceMetadata[];
  outcomeScopeIsolationMetadata: SyntheticOutcomeScope[];
  knowledgeAccumulationMetadata?: SyntheticKnowledgeAccumulationMetadata;
  knowledgeRetentionMetadata?: SyntheticKnowledgeRetentionMetadata;
  knowledgeRelevanceMetadata?: SyntheticKnowledgeRelevanceMetadata;
  knowledgeExpirationMetadata?: SyntheticKnowledgeExpirationMetadata;
  knowledgeConfidenceMetadata?: SyntheticKnowledgeConfidenceMetadata;
  knowledgeExplainabilityMetadata?: SyntheticKnowledgeExplainabilityMetadata;
  knowledgeAuditabilityMetadata?: SyntheticKnowledgeAuditabilityMetadata;
  customerIsolationMetadata?: SyntheticKnowledgeCustomerIsolationMetadata;
  firmIsolationMetadata?: SyntheticKnowledgeFirmIsolationMetadata;
  clientIsolationMetadata?: SyntheticKnowledgeClientIsolationMetadata;
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
  interventionIntelligencePackages: SyntheticInterventionIntelligence[];
  warnings: string[];
}

export interface BuildOrganizationalKnowledgeResult {
  organizationalKnowledge: SyntheticOrganizationalKnowledge | null;
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

function getOutcomeLearningPackages(input: BuildOrganizationalKnowledgeInput): SyntheticOutcomeLearningPackage[] {
  return safeArray(input.outcomeLearningPackages);
}

function getDecisionMemories(input: BuildOrganizationalKnowledgeInput): SyntheticDecisionMemory[] {
  return safeArray(input.decisionMemories);
}

function getForecastMemories(input: BuildOrganizationalKnowledgeInput): SyntheticForecastMemory[] {
  return safeArray(input.forecastMemories);
}

function getScenarioMemories(input: BuildOrganizationalKnowledgeInput): SyntheticScenarioMemory[] {
  return safeArray(input.scenarioMemories);
}

function getControllerMemories(input: BuildOrganizationalKnowledgeInput): SyntheticControllerMemory[] {
  return safeArray(input.controllerMemories);
}

function getPortfolioMemories(input: BuildOrganizationalKnowledgeInput): SyntheticPortfolioMemory[] {
  return safeArray(input.portfolioMemories);
}

function getRecommendationMemories(input: BuildOrganizationalKnowledgeInput): SyntheticRecommendationMemory[] {
  return safeArray(input.recommendationMemories);
}

function getLearningConfidencePackages(input: BuildOrganizationalKnowledgeInput): SyntheticLearningConfidence[] {
  return safeArray(input.learningConfidencePackages);
}

function getLearningSurfaces(input: BuildOrganizationalKnowledgeInput): SyntheticLearningSurface[] {
  return safeArray(input.learningSurfaces);
}

function getCapabilityIntelligencePackages(input: BuildOrganizationalKnowledgeInput): SyntheticCapabilityIntelligence[] {
  return safeArray(input.capabilityIntelligencePackages);
}

function getAdoptionIntelligencePackages(input: BuildOrganizationalKnowledgeInput): SyntheticAdoptionIntelligence[] {
  return safeArray(input.adoptionIntelligencePackages);
}

function getTimeSavingsIntelligencePackages(input: BuildOrganizationalKnowledgeInput): SyntheticTimeSavingsIntelligence[] {
  return safeArray(input.timeSavingsIntelligencePackages);
}

function getInterventionIntelligencePackages(
  input: BuildOrganizationalKnowledgeInput,
): SyntheticInterventionIntelligence[] {
  return safeArray(input.interventionIntelligencePackages);
}

function getMemoryReferenceIds(input: BuildOrganizationalKnowledgeInput): string[] {
  return uniqueStable([
    ...getDecisionMemories(input).map((memory) => memory.decisionMemoryId),
    ...getForecastMemories(input).map((memory) => memory.forecastMemoryId),
    ...getScenarioMemories(input).map((memory) => memory.scenarioMemoryId),
    ...getControllerMemories(input).map((memory) => memory.controllerMemoryId),
    ...getPortfolioMemories(input).map((memory) => memory.portfolioMemoryId),
    ...getRecommendationMemories(input).map((memory) => memory.recommendationMemoryId),
    ...getLearningConfidencePackages(input).flatMap((artifact) => artifact.memoryReferenceIds),
    ...getLearningSurfaces(input).flatMap((artifact) => artifact.memoryReferenceIds),
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.memoryPackageIds),
    ...getTimeSavingsIntelligencePackages(input).flatMap((artifact) => artifact.memoryPackageIds),
    ...getInterventionIntelligencePackages(input).flatMap((artifact) => artifact.memoryPackageIds),
  ]);
}

function getLearningReferenceIds(input: BuildOrganizationalKnowledgeInput): string[] {
  return uniqueStable([
    ...getOutcomeLearningPackages(input).map((artifact) => artifact.outcomeLearningPackageId),
    ...getLearningConfidencePackages(input).flatMap((artifact) => artifact.learningPackageReferenceIds),
    ...getLearningSurfaces(input).flatMap((artifact) => artifact.learningPackageReferenceIds),
    ...getCapabilityIntelligencePackages(input).flatMap((artifact) => artifact.outcomeLearningPackageIds),
    ...getTimeSavingsIntelligencePackages(input).flatMap((artifact) => artifact.outcomeLearningPackageIds),
    ...getInterventionIntelligencePackages(input).flatMap((artifact) => artifact.learningPackageReferenceIds),
  ]);
}

function getOutcomeReferenceIds(input: BuildOrganizationalKnowledgeInput): string[] {
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
    ...getInterventionIntelligencePackages(input).flatMap((artifact) => artifact.outcomeReferenceIds),
  ]);
}

function getKnowledgeEvidenceReferenceIds(input: BuildOrganizationalKnowledgeInput): string[] {
  return uniqueStable([
    ...(input.knowledgeAccumulationMetadata?.knowledgeAccumulationEvidenceIds ?? []),
    ...(input.knowledgeRetentionMetadata?.knowledgeRetentionEvidenceIds ?? []),
    ...(input.knowledgeRelevanceMetadata?.knowledgeRelevanceEvidenceIds ?? []),
    ...(input.knowledgeExpirationMetadata?.knowledgeExpirationEvidenceIds ?? []),
    ...(input.knowledgeConfidenceMetadata?.knowledgeConfidenceEvidenceIds ?? []),
    ...(input.knowledgeExplainabilityMetadata?.knowledgeExplainabilityEvidenceIds ?? []),
    ...(input.knowledgeAuditabilityMetadata?.knowledgeAuditabilityEvidenceIds ?? []),
    ...(input.customerIsolationMetadata?.customerIsolationEvidenceIds ?? []),
    ...(input.firmIsolationMetadata?.firmIsolationEvidenceIds ?? []),
    ...(input.clientIsolationMetadata?.clientIsolationEvidenceIds ?? []),
  ]);
}

function getEvidenceReferenceIds(input: BuildOrganizationalKnowledgeInput): string[] {
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
    ...getInterventionIntelligencePackages(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getKnowledgeEvidenceReferenceIds(input),
  ]);
}

function getTrustMetadata(input: BuildOrganizationalKnowledgeInput): SyntheticOutcomeTrustMetadata[] {
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
    ...getInterventionIntelligencePackages(input).flatMap((artifact) => artifact.trustMetadata),
  ];
}

function getConfidenceMetadata(input: BuildOrganizationalKnowledgeInput): SyntheticOutcomeConfidenceMetadata[] {
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
    ...getInterventionIntelligencePackages(input).flatMap((artifact) => artifact.confidenceMetadata),
  ];
}

function getGovernanceMetadata(input: BuildOrganizationalKnowledgeInput): SyntheticOutcomeGovernanceMetadata[] {
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
    ...getInterventionIntelligencePackages(input).flatMap((artifact) => artifact.governanceMetadata),
  ];
}

function getOutcomeScopeIsolationMetadata(input: BuildOrganizationalKnowledgeInput): SyntheticOutcomeScope[] {
  return getOutcomeLearningPackages(input).map(
    (artifact) => artifact.outcomeEvidencePackage.outcomeCandidate.outcomeContract.scope,
  );
}

function buildOrganizationalKnowledgeId(input: BuildOrganizationalKnowledgeInput): string {
  return `synthetic-organizational-knowledge:${stableSnapshotHash({
    organizationalKnowledgeKey: input.organizationalKnowledgeKey,
    knowledgeReferenceIds: input.knowledgeReferenceIds,
    outcomeReferenceIds: getOutcomeReferenceIds(input),
    memoryReferenceIds: getMemoryReferenceIds(input),
    learningReferenceIds: getLearningReferenceIds(input),
    learningConfidenceIds: getLearningConfidencePackages(input).map((artifact) => artifact.learningConfidenceId),
    learningSurfaceIds: getLearningSurfaces(input).map((artifact) => artifact.learningSurfaceId),
    capabilityIntelligenceIds: getCapabilityIntelligencePackages(input).map((artifact) => artifact.capabilityIntelligenceId),
    adoptionIntelligenceIds: getAdoptionIntelligencePackages(input).map((artifact) => artifact.adoptionIntelligenceId),
    timeSavingsIntelligenceIds: getTimeSavingsIntelligencePackages(input).map(
      (artifact) => artifact.timeSavingsIntelligenceId,
    ),
    interventionIntelligenceIds: getInterventionIntelligencePackages(input).map(
      (artifact) => artifact.interventionIntelligenceId,
    ),
    knowledgeEvidenceReferenceIds: getKnowledgeEvidenceReferenceIds(input),
    customerIsolationBoundaryIds: input.customerIsolationMetadata?.customerIsolationBoundaryIds ?? [],
    firmIsolationBoundaryIds: input.firmIsolationMetadata?.firmIsolationBoundaryIds ?? [],
    clientIsolationBoundaryIds: input.clientIsolationMetadata?.clientIsolationBoundaryIds ?? [],
  })}`;
}

function validateArrayField(value: unknown, fieldName: string, warnings: string[]): void {
  if (value !== undefined && !Array.isArray(value)) warnings.push(`${fieldName} must be an array.`);
}

function validateInput(input: BuildOrganizationalKnowledgeInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.organizationalKnowledgeKey)) warnings.push("organizationalKnowledgeKey is required.");
  if (!Array.isArray(input.knowledgeReferenceIds) || input.knowledgeReferenceIds.length === 0) {
    warnings.push("knowledgeReferenceIds must include at least one value.");
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
  validateArrayField(input.interventionIntelligencePackages, "interventionIntelligencePackages", warnings);

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
  for (const artifact of getInterventionIntelligencePackages(input)) {
    if (!hasValue(artifact.interventionIntelligenceId)) warnings.push("interventionIntelligenceId is required.");
  }

  return warnings;
}

export function buildOrganizationalKnowledge(
  input: BuildOrganizationalKnowledgeInput,
): BuildOrganizationalKnowledgeResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      organizationalKnowledge: null,
      skipped: true,
      warnings,
    };
  }

  return {
    organizationalKnowledge: {
      organizationalKnowledgeId: buildOrganizationalKnowledgeId(input),
      organizationalKnowledgeKey: input.organizationalKnowledgeKey,
      knowledgeReferenceIds: input.knowledgeReferenceIds,
      outcomeReferenceIds: getOutcomeReferenceIds(input),
      memoryReferenceIds: getMemoryReferenceIds(input),
      learningReferenceIds: getLearningReferenceIds(input),
      learningConfidenceIds: getLearningConfidencePackages(input).map((artifact) => artifact.learningConfidenceId),
      learningSurfaceIds: getLearningSurfaces(input).map((artifact) => artifact.learningSurfaceId),
      capabilityIntelligenceIds: getCapabilityIntelligencePackages(input).map((artifact) => artifact.capabilityIntelligenceId),
      adoptionIntelligenceIds: getAdoptionIntelligencePackages(input).map((artifact) => artifact.adoptionIntelligenceId),
      timeSavingsIntelligenceIds: getTimeSavingsIntelligencePackages(input).map(
        (artifact) => artifact.timeSavingsIntelligenceId,
      ),
      interventionIntelligenceIds: getInterventionIntelligencePackages(input).map(
        (artifact) => artifact.interventionIntelligenceId,
      ),
      knowledgeEvidenceReferenceIds: getKnowledgeEvidenceReferenceIds(input),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      trustMetadata: getTrustMetadata(input),
      confidenceMetadata: getConfidenceMetadata(input),
      governanceMetadata: getGovernanceMetadata(input),
      outcomeScopeIsolationMetadata: getOutcomeScopeIsolationMetadata(input),
      knowledgeAccumulationMetadata: input.knowledgeAccumulationMetadata,
      knowledgeRetentionMetadata: input.knowledgeRetentionMetadata,
      knowledgeRelevanceMetadata: input.knowledgeRelevanceMetadata,
      knowledgeExpirationMetadata: input.knowledgeExpirationMetadata,
      knowledgeConfidenceMetadata: input.knowledgeConfidenceMetadata,
      knowledgeExplainabilityMetadata: input.knowledgeExplainabilityMetadata,
      knowledgeAuditabilityMetadata: input.knowledgeAuditabilityMetadata,
      customerIsolationMetadata: input.customerIsolationMetadata,
      firmIsolationMetadata: input.firmIsolationMetadata,
      clientIsolationMetadata: input.clientIsolationMetadata,
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
      interventionIntelligencePackages: getInterventionIntelligencePackages(input),
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
