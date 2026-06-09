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

export interface SyntheticPortfolioClientServiceRiskMetadata {
  clientServiceRiskReferenceIds: string[];
  clientServiceRiskEvidenceIds: string[];
  clientServiceRiskReviewRequired: boolean;
}

export interface SyntheticPortfolioCloseReadinessMetadata {
  closeReadinessReferenceIds: string[];
  closeReadinessEvidenceIds: string[];
  closeReadinessReviewRequired: boolean;
}

export interface SyntheticPortfolioRiskMetadata {
  portfolioRiskReferenceIds: string[];
  portfolioRiskEvidenceIds: string[];
  portfolioRiskReviewRequired: boolean;
}

export interface SyntheticPortfolioClientOpportunityMetadata {
  clientOpportunityReferenceIds: string[];
  clientOpportunityEvidenceIds: string[];
  clientOpportunityReviewRequired: boolean;
}

export interface SyntheticPortfolioRecurringIssueMetadata {
  recurringIssueReferenceIds: string[];
  recurringIssueEvidenceIds: string[];
  recurringIssueReviewRequired: boolean;
}

export interface SyntheticPortfolioInterventionHistoryMetadata {
  interventionHistoryReferenceIds: string[];
  interventionHistoryEvidenceIds: string[];
  interventionHistoryReviewRequired: boolean;
}

export interface BuildPortfolioMemoryInput {
  outcomeLearningPackage: SyntheticOutcomeLearningPackage | null;
  portfolioReferenceIds?: string[];
  clientReferenceIds?: string[];
  clientServiceRiskMetadata?: SyntheticPortfolioClientServiceRiskMetadata;
  closeReadinessMetadata?: SyntheticPortfolioCloseReadinessMetadata;
  portfolioRiskMetadata?: SyntheticPortfolioRiskMetadata;
  clientOpportunityMetadata?: SyntheticPortfolioClientOpportunityMetadata;
  recurringIssueMetadata?: SyntheticPortfolioRecurringIssueMetadata;
  interventionHistoryMetadata?: SyntheticPortfolioInterventionHistoryMetadata;
}

export interface SyntheticPortfolioMemory {
  portfolioMemoryId: string;
  outcomeLearningPackageId: string;
  outcomeEvidencePackageId: string;
  outcomeCandidateId: string;
  outcomeId: string;
  companyId: string;
  portfolioReferenceIds: string[];
  clientReferenceIds: string[];
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
  clientServiceRiskMetadata?: SyntheticPortfolioClientServiceRiskMetadata;
  closeReadinessMetadata?: SyntheticPortfolioCloseReadinessMetadata;
  portfolioRiskMetadata?: SyntheticPortfolioRiskMetadata;
  clientOpportunityMetadata?: SyntheticPortfolioClientOpportunityMetadata;
  recurringIssueMetadata?: SyntheticPortfolioRecurringIssueMetadata;
  interventionHistoryMetadata?: SyntheticPortfolioInterventionHistoryMetadata;
  outcomeLearningPackage: SyntheticOutcomeLearningPackage;
  warnings: string[];
}

export interface BuildPortfolioMemoryResult {
  portfolioMemory: SyntheticPortfolioMemory | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function getPortfolioReferenceIds(input: BuildPortfolioMemoryInput): string[] {
  return uniqueStable([
    ...(input.portfolioReferenceIds ?? []),
    ...(input.outcomeLearningPackage?.outcomeEvidencePackage.outcomeCandidate.metadata.relatedPortfolioItemIds ?? []),
  ]);
}

function getClientReferenceIds(input: BuildPortfolioMemoryInput): string[] {
  return uniqueStable([
    ...(input.clientReferenceIds ?? []),
    ...(input.outcomeLearningPackage?.outcomeEvidencePackage.outcomeCandidate.outcomeContract.scope.clientId
      ? [input.outcomeLearningPackage.outcomeEvidencePackage.outcomeCandidate.outcomeContract.scope.clientId]
      : []),
  ]);
}

function buildPortfolioMemoryId(input: BuildPortfolioMemoryInput): string {
  const outcomeLearningPackage = input.outcomeLearningPackage;

  return `synthetic-portfolio-memory:${stableSnapshotHash({
    outcomeLearningPackageId: outcomeLearningPackage?.outcomeLearningPackageId ?? null,
    outcomeEvidencePackageId: outcomeLearningPackage?.outcomeEvidencePackageId ?? null,
    outcomeCandidateId: outcomeLearningPackage?.outcomeCandidateId ?? null,
    outcomeId: outcomeLearningPackage?.outcomeId ?? null,
    companyId: outcomeLearningPackage?.companyId ?? null,
    outcomeCategory: outcomeLearningPackage?.outcomeCategory ?? null,
    outcomeType: outcomeLearningPackage?.outcomeType ?? null,
    outcomeStatus: outcomeLearningPackage?.outcomeStatus ?? null,
    portfolioReferenceIds: getPortfolioReferenceIds(input),
    clientReferenceIds: getClientReferenceIds(input),
    evidenceReferenceIds: outcomeLearningPackage?.evidenceReferenceIds ?? [],
    clientServiceRiskReferenceIds: input.clientServiceRiskMetadata?.clientServiceRiskReferenceIds ?? [],
    closeReadinessReferenceIds: input.closeReadinessMetadata?.closeReadinessReferenceIds ?? [],
    portfolioRiskReferenceIds: input.portfolioRiskMetadata?.portfolioRiskReferenceIds ?? [],
    clientOpportunityReferenceIds: input.clientOpportunityMetadata?.clientOpportunityReferenceIds ?? [],
    recurringIssueReferenceIds: input.recurringIssueMetadata?.recurringIssueReferenceIds ?? [],
    interventionHistoryReferenceIds: input.interventionHistoryMetadata?.interventionHistoryReferenceIds ?? [],
  })}`;
}

function validateInput(input: BuildPortfolioMemoryInput): string[] {
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
  if (getPortfolioReferenceIds(input).length === 0) warnings.push("portfolioReferenceIds must include at least one value.");
  if (getClientReferenceIds(input).length === 0) warnings.push("clientReferenceIds must include at least one value.");

  return warnings;
}

export function buildPortfolioMemory(input: BuildPortfolioMemoryInput): BuildPortfolioMemoryResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.outcomeLearningPackage) {
    return {
      portfolioMemory: null,
      skipped: true,
      warnings,
    };
  }

  const outcomeLearningPackage = input.outcomeLearningPackage;

  return {
    portfolioMemory: {
      portfolioMemoryId: buildPortfolioMemoryId(input),
      outcomeLearningPackageId: outcomeLearningPackage.outcomeLearningPackageId,
      outcomeEvidencePackageId: outcomeLearningPackage.outcomeEvidencePackageId,
      outcomeCandidateId: outcomeLearningPackage.outcomeCandidateId,
      outcomeId: outcomeLearningPackage.outcomeId,
      companyId: outcomeLearningPackage.companyId,
      portfolioReferenceIds: getPortfolioReferenceIds(input),
      clientReferenceIds: getClientReferenceIds(input),
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
      clientServiceRiskMetadata: input.clientServiceRiskMetadata,
      closeReadinessMetadata: input.closeReadinessMetadata,
      portfolioRiskMetadata: input.portfolioRiskMetadata,
      clientOpportunityMetadata: input.clientOpportunityMetadata,
      recurringIssueMetadata: input.recurringIssueMetadata,
      interventionHistoryMetadata: input.interventionHistoryMetadata,
      outcomeLearningPackage,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
