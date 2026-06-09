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

export interface SyntheticControllerCloseReadinessMetadata {
  closeReadinessReferenceIds: string[];
  closeReadinessEvidenceIds: string[];
  closeReadinessReviewRequired: boolean;
}

export interface SyntheticControllerReconciliationMetadata {
  reconciliationReferenceIds: string[];
  reconciliationEvidenceIds: string[];
  reconciliationReviewRequired: boolean;
}

export interface SyntheticControllerJournalExceptionMetadata {
  journalExceptionReferenceIds: string[];
  journalExceptionEvidenceIds: string[];
  journalExceptionReviewRequired: boolean;
}

export interface SyntheticControllerDeferredRevenueMetadata {
  deferredRevenueReferenceIds: string[];
  deferredRevenueEvidenceIds: string[];
  deferredRevenueReviewRequired: boolean;
}

export interface SyntheticControllerPrepaidMetadata {
  prepaidReferenceIds: string[];
  prepaidEvidenceIds: string[];
  prepaidReviewRequired: boolean;
}

export interface SyntheticControllerFixedAssetMetadata {
  fixedAssetReferenceIds: string[];
  fixedAssetEvidenceIds: string[];
  fixedAssetReviewRequired: boolean;
}

export interface SyntheticControllerAccountingRiskMetadata {
  accountingRiskReferenceIds: string[];
  accountingRiskEvidenceIds: string[];
  accountingRiskReviewRequired: boolean;
}

export interface BuildControllerMemoryInput {
  outcomeLearningPackage: SyntheticOutcomeLearningPackage | null;
  controllerReferenceIds?: string[];
  closeReadinessMetadata?: SyntheticControllerCloseReadinessMetadata;
  reconciliationMetadata?: SyntheticControllerReconciliationMetadata;
  journalExceptionMetadata?: SyntheticControllerJournalExceptionMetadata;
  deferredRevenueMetadata?: SyntheticControllerDeferredRevenueMetadata;
  prepaidMetadata?: SyntheticControllerPrepaidMetadata;
  fixedAssetMetadata?: SyntheticControllerFixedAssetMetadata;
  accountingRiskMetadata?: SyntheticControllerAccountingRiskMetadata;
}

export interface SyntheticControllerMemory {
  controllerMemoryId: string;
  outcomeLearningPackageId: string;
  outcomeEvidencePackageId: string;
  outcomeCandidateId: string;
  outcomeId: string;
  companyId: string;
  controllerReferenceIds: string[];
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
  closeReadinessMetadata?: SyntheticControllerCloseReadinessMetadata;
  reconciliationMetadata?: SyntheticControllerReconciliationMetadata;
  journalExceptionMetadata?: SyntheticControllerJournalExceptionMetadata;
  deferredRevenueMetadata?: SyntheticControllerDeferredRevenueMetadata;
  prepaidMetadata?: SyntheticControllerPrepaidMetadata;
  fixedAssetMetadata?: SyntheticControllerFixedAssetMetadata;
  accountingRiskMetadata?: SyntheticControllerAccountingRiskMetadata;
  outcomeLearningPackage: SyntheticOutcomeLearningPackage;
  warnings: string[];
}

export interface BuildControllerMemoryResult {
  controllerMemory: SyntheticControllerMemory | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function getControllerReferenceIds(input: BuildControllerMemoryInput): string[] {
  return uniqueStable([
    ...(input.controllerReferenceIds ?? []),
    ...(input.outcomeLearningPackage?.outcomeEvidencePackage.outcomeCandidate.metadata.relatedControllerItemIds ?? []),
  ]);
}

function buildControllerMemoryId(input: BuildControllerMemoryInput): string {
  const outcomeLearningPackage = input.outcomeLearningPackage;

  return `synthetic-controller-memory:${stableSnapshotHash({
    outcomeLearningPackageId: outcomeLearningPackage?.outcomeLearningPackageId ?? null,
    outcomeEvidencePackageId: outcomeLearningPackage?.outcomeEvidencePackageId ?? null,
    outcomeCandidateId: outcomeLearningPackage?.outcomeCandidateId ?? null,
    outcomeId: outcomeLearningPackage?.outcomeId ?? null,
    companyId: outcomeLearningPackage?.companyId ?? null,
    outcomeCategory: outcomeLearningPackage?.outcomeCategory ?? null,
    outcomeType: outcomeLearningPackage?.outcomeType ?? null,
    outcomeStatus: outcomeLearningPackage?.outcomeStatus ?? null,
    controllerReferenceIds: getControllerReferenceIds(input),
    evidenceReferenceIds: outcomeLearningPackage?.evidenceReferenceIds ?? [],
    closeReadinessReferenceIds: input.closeReadinessMetadata?.closeReadinessReferenceIds ?? [],
    reconciliationReferenceIds: input.reconciliationMetadata?.reconciliationReferenceIds ?? [],
    journalExceptionReferenceIds: input.journalExceptionMetadata?.journalExceptionReferenceIds ?? [],
    deferredRevenueReferenceIds: input.deferredRevenueMetadata?.deferredRevenueReferenceIds ?? [],
    prepaidReferenceIds: input.prepaidMetadata?.prepaidReferenceIds ?? [],
    fixedAssetReferenceIds: input.fixedAssetMetadata?.fixedAssetReferenceIds ?? [],
    accountingRiskReferenceIds: input.accountingRiskMetadata?.accountingRiskReferenceIds ?? [],
  })}`;
}

function validateInput(input: BuildControllerMemoryInput): string[] {
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
  if (getControllerReferenceIds(input).length === 0) warnings.push("controllerReferenceIds must include at least one value.");

  return warnings;
}

export function buildControllerMemory(input: BuildControllerMemoryInput): BuildControllerMemoryResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.outcomeLearningPackage) {
    return {
      controllerMemory: null,
      skipped: true,
      warnings,
    };
  }

  const outcomeLearningPackage = input.outcomeLearningPackage;

  return {
    controllerMemory: {
      controllerMemoryId: buildControllerMemoryId(input),
      outcomeLearningPackageId: outcomeLearningPackage.outcomeLearningPackageId,
      outcomeEvidencePackageId: outcomeLearningPackage.outcomeEvidencePackageId,
      outcomeCandidateId: outcomeLearningPackage.outcomeCandidateId,
      outcomeId: outcomeLearningPackage.outcomeId,
      companyId: outcomeLearningPackage.companyId,
      controllerReferenceIds: getControllerReferenceIds(input),
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
      closeReadinessMetadata: input.closeReadinessMetadata,
      reconciliationMetadata: input.reconciliationMetadata,
      journalExceptionMetadata: input.journalExceptionMetadata,
      deferredRevenueMetadata: input.deferredRevenueMetadata,
      prepaidMetadata: input.prepaidMetadata,
      fixedAssetMetadata: input.fixedAssetMetadata,
      accountingRiskMetadata: input.accountingRiskMetadata,
      outcomeLearningPackage,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
