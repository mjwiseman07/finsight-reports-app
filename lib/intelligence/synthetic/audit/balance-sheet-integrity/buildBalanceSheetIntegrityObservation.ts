import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticAuditBriefing } from "../briefings";
import type { SyntheticAuditCandidate } from "../candidates";
import type { SyntheticAuditConfidence } from "../confidence";
import type { SyntheticAuditEvidencePackage } from "../evidence";
import type {
  SyntheticFinancialStatementRelationshipObservation,
} from "../financial-statement-relationships";
import type { SyntheticAuditFinding } from "../findings";
import type {
  SyntheticAuditCategory,
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditContract,
  SyntheticAuditEvidenceReferences,
  SyntheticAuditExceptionMetadata,
  SyntheticAuditFindingMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditLearningCompatibility,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditMemoryCompatibility,
  SyntheticAuditObservationMetadata,
  SyntheticAuditPackageCompatibility,
  SyntheticAuditPersonaCompatibility,
  SyntheticAuditRiskMetadata,
  SyntheticAuditScope,
  SyntheticAuditSurfaceCompatibility,
  SyntheticAuditTrustMetadata,
} from "../types";
import type { SyntheticBankActivityObservation } from "../bank-activity";
import type { SyntheticCashApplicationObservation } from "../cash-application";
import type { SyntheticInventoryIntelligenceObservation } from "../inventory-intelligence";
import type { SyntheticJournalTestingObservation } from "../journal-testing";
import type { SyntheticLeaseIntelligenceObservation } from "../lease-intelligence";
import type { SyntheticReconciliationObservation } from "../reconciliation";
import type { SyntheticReserveIntelligenceObservation } from "../reserve-intelligence";
import type { SyntheticRevenueIntelligenceObservation } from "../revenue-intelligence";
import type { SyntheticAuditSurface } from "../surfaces";
import type { SyntheticTaxIntelligenceObservation } from "../tax-intelligence";
import type { SyntheticUnitCostIntelligenceObservation } from "../unit-cost-intelligence";
import type { SyntheticAuditWatchlist } from "../watchlists";

export type SyntheticBalanceSheetIntegrityCategory =
  | "negative_asset_balance"
  | "negative_liability_balance"
  | "unexpected_debit_balance"
  | "unexpected_credit_balance"
  | "stagnant_balance"
  | "aged_balance_candidate"
  | "unsupported_balance_candidate"
  | "unexplained_balance_candidate"
  | "balance_movement_candidate"
  | "balance_classification_candidate"
  | "balance_sheet_integrity_candidate"
  | "balance_sheet_relationship_candidate"
  | "balance_sheet_reconciliation_risk"
  | "balance_sheet_materiality_candidate";

export const SYNTHETIC_BALANCE_SHEET_INTEGRITY_CATEGORIES: SyntheticBalanceSheetIntegrityCategory[] = [
  "negative_asset_balance",
  "negative_liability_balance",
  "unexpected_debit_balance",
  "unexpected_credit_balance",
  "stagnant_balance",
  "aged_balance_candidate",
  "unsupported_balance_candidate",
  "unexplained_balance_candidate",
  "balance_movement_candidate",
  "balance_classification_candidate",
  "balance_sheet_integrity_candidate",
  "balance_sheet_relationship_candidate",
  "balance_sheet_reconciliation_risk",
  "balance_sheet_materiality_candidate",
];

export interface BuildBalanceSheetIntegrityObservationInput {
  auditContract: SyntheticAuditContract | null;
  balanceSheetIntegrityObservationKey: string;
  balanceSheetIntegrityCategory: SyntheticBalanceSheetIntegrityCategory;
  financialStatementRelationshipObservations?: SyntheticFinancialStatementRelationshipObservation[];
  taxIntelligenceObservations?: SyntheticTaxIntelligenceObservation[];
  reserveIntelligenceObservations?: SyntheticReserveIntelligenceObservation[];
  leaseIntelligenceObservations?: SyntheticLeaseIntelligenceObservation[];
  revenueIntelligenceObservations?: SyntheticRevenueIntelligenceObservation[];
  inventoryIntelligenceObservations?: SyntheticInventoryIntelligenceObservation[];
  unitCostIntelligenceObservations?: SyntheticUnitCostIntelligenceObservation[];
  bankActivityObservations?: SyntheticBankActivityObservation[];
  cashApplicationObservations?: SyntheticCashApplicationObservation[];
  reconciliationObservations?: SyntheticReconciliationObservation[];
  journalTestingObservations?: SyntheticJournalTestingObservation[];
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticBalanceSheetIntegrityObservation {
  balanceSheetIntegrityObservationId: string;
  balanceSheetIntegrityObservationKey: string;
  balanceSheetIntegrityCategory: SyntheticBalanceSheetIntegrityCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  financialStatementRelationshipObservationIds: string[];
  taxIntelligenceObservationIds: string[];
  reserveIntelligenceObservationIds: string[];
  leaseIntelligenceObservationIds: string[];
  revenueIntelligenceObservationIds: string[];
  inventoryIntelligenceObservationIds: string[];
  unitCostIntelligenceObservationIds: string[];
  bankActivityObservationIds: string[];
  cashApplicationObservationIds: string[];
  reconciliationObservationIds: string[];
  journalTestingObservationIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  balanceSheetIntegrityReferenceIds: string[];
  evidence: SyntheticAuditEvidenceReferences;
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  observationMetadata: SyntheticAuditObservationMetadata[];
  findingMetadata: SyntheticAuditFindingMetadata[];
  exceptionMetadata: SyntheticAuditExceptionMetadata[];
  riskMetadata: SyntheticAuditRiskMetadata[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityCompatibility: SyntheticAuditMaterialityCompatibility[];
  personaCompatibility: SyntheticAuditPersonaCompatibility[];
  packageCompatibility: SyntheticAuditPackageCompatibility[];
  memoryCompatibility: SyntheticAuditMemoryCompatibility[];
  learningCompatibility: SyntheticAuditLearningCompatibility[];
  surfaceCompatibility: SyntheticAuditSurfaceCompatibility[];
  auditContract: SyntheticAuditContract;
  financialStatementRelationshipObservations: SyntheticFinancialStatementRelationshipObservation[];
  taxIntelligenceObservations: SyntheticTaxIntelligenceObservation[];
  reserveIntelligenceObservations: SyntheticReserveIntelligenceObservation[];
  leaseIntelligenceObservations: SyntheticLeaseIntelligenceObservation[];
  revenueIntelligenceObservations: SyntheticRevenueIntelligenceObservation[];
  inventoryIntelligenceObservations: SyntheticInventoryIntelligenceObservation[];
  unitCostIntelligenceObservations: SyntheticUnitCostIntelligenceObservation[];
  bankActivityObservations: SyntheticBankActivityObservation[];
  cashApplicationObservations: SyntheticCashApplicationObservation[];
  reconciliationObservations: SyntheticReconciliationObservation[];
  journalTestingObservations: SyntheticJournalTestingObservation[];
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildBalanceSheetIntegrityObservationResult {
  balanceSheetIntegrityObservation: SyntheticBalanceSheetIntegrityObservation | null;
  skipped: boolean;
  warnings: string[];
}

type AuditArtifact =
  | SyntheticAuditCandidate
  | SyntheticAuditEvidencePackage
  | SyntheticAuditFinding
  | SyntheticAuditConfidence
  | SyntheticAuditSurface
  | SyntheticAuditWatchlist
  | SyntheticAuditBriefing;

type DomainObservation =
  | SyntheticFinancialStatementRelationshipObservation
  | SyntheticTaxIntelligenceObservation
  | SyntheticReserveIntelligenceObservation
  | SyntheticLeaseIntelligenceObservation
  | SyntheticRevenueIntelligenceObservation
  | SyntheticInventoryIntelligenceObservation
  | SyntheticUnitCostIntelligenceObservation
  | SyntheticBankActivityObservation
  | SyntheticCashApplicationObservation
  | SyntheticReconciliationObservation
  | SyntheticJournalTestingObservation;

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function hasArrayValue(values: string[] | undefined): boolean {
  return Array.isArray(values) && values.some(hasValue);
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(hasValue))];
}

function compactDefined<T>(values: Array<T | undefined>): T[] {
  return values.filter((value): value is T => value !== undefined);
}

function getStringProperty(value: object, propertyName: string): string[] {
  const property = (value as Record<string, unknown>)[propertyName];
  return typeof property === "string" ? [property] : [];
}

function getStringArrayProperty(value: object, propertyName: string): string[] {
  const property = (value as Record<string, unknown>)[propertyName];
  return Array.isArray(property) ? property.filter((item): item is string => typeof item === "string") : [];
}

function isSupportedBalanceSheetIntegrityCategory(category: SyntheticBalanceSheetIntegrityCategory): boolean {
  return SYNTHETIC_BALANCE_SHEET_INTEGRITY_CATEGORIES.includes(category);
}

function getAuditCategory(auditContract: SyntheticAuditContract): SyntheticAuditCategory | undefined {
  return (
    auditContract.observationMetadata?.auditCategory ??
    auditContract.findingMetadata?.auditCategory ??
    auditContract.exceptionMetadata?.auditCategory ??
    auditContract.riskMetadata?.auditCategory
  );
}

function getAuditContractReferenceIds(auditContract: SyntheticAuditContract | null): string[] {
  if (!auditContract) return [];

  return uniqueStable([
    auditContract.observationMetadata?.auditObservationId,
    auditContract.findingMetadata?.auditFindingId,
    auditContract.exceptionMetadata?.auditExceptionId,
    auditContract.riskMetadata?.auditRiskId,
    ...auditContract.evidence.sourceReferenceIds,
    ...auditContract.evidence.lineageReferenceIds,
  ].filter((value): value is string => value !== undefined));
}

function getFinancialStatementRelationshipObservations(
  input: BuildBalanceSheetIntegrityObservationInput,
): SyntheticFinancialStatementRelationshipObservation[] {
  return input.financialStatementRelationshipObservations ?? [];
}

function getTaxIntelligenceObservations(
  input: BuildBalanceSheetIntegrityObservationInput,
): SyntheticTaxIntelligenceObservation[] {
  return input.taxIntelligenceObservations ?? [];
}

function getReserveIntelligenceObservations(
  input: BuildBalanceSheetIntegrityObservationInput,
): SyntheticReserveIntelligenceObservation[] {
  return input.reserveIntelligenceObservations ?? [];
}

function getLeaseIntelligenceObservations(
  input: BuildBalanceSheetIntegrityObservationInput,
): SyntheticLeaseIntelligenceObservation[] {
  return input.leaseIntelligenceObservations ?? [];
}

function getRevenueIntelligenceObservations(
  input: BuildBalanceSheetIntegrityObservationInput,
): SyntheticRevenueIntelligenceObservation[] {
  return input.revenueIntelligenceObservations ?? [];
}

function getInventoryIntelligenceObservations(
  input: BuildBalanceSheetIntegrityObservationInput,
): SyntheticInventoryIntelligenceObservation[] {
  return input.inventoryIntelligenceObservations ?? [];
}

function getUnitCostIntelligenceObservations(
  input: BuildBalanceSheetIntegrityObservationInput,
): SyntheticUnitCostIntelligenceObservation[] {
  return input.unitCostIntelligenceObservations ?? [];
}

function getBankActivityObservations(
  input: BuildBalanceSheetIntegrityObservationInput,
): SyntheticBankActivityObservation[] {
  return input.bankActivityObservations ?? [];
}

function getCashApplicationObservations(
  input: BuildBalanceSheetIntegrityObservationInput,
): SyntheticCashApplicationObservation[] {
  return input.cashApplicationObservations ?? [];
}

function getReconciliationObservations(
  input: BuildBalanceSheetIntegrityObservationInput,
): SyntheticReconciliationObservation[] {
  return input.reconciliationObservations ?? [];
}

function getJournalTestingObservations(
  input: BuildBalanceSheetIntegrityObservationInput,
): SyntheticJournalTestingObservation[] {
  return input.journalTestingObservations ?? [];
}

function getDomainObservations(input: BuildBalanceSheetIntegrityObservationInput): DomainObservation[] {
  return [
    ...getFinancialStatementRelationshipObservations(input),
    ...getTaxIntelligenceObservations(input),
    ...getReserveIntelligenceObservations(input),
    ...getLeaseIntelligenceObservations(input),
    ...getRevenueIntelligenceObservations(input),
    ...getInventoryIntelligenceObservations(input),
    ...getUnitCostIntelligenceObservations(input),
    ...getBankActivityObservations(input),
    ...getCashApplicationObservations(input),
    ...getReconciliationObservations(input),
    ...getJournalTestingObservations(input),
  ];
}

function getAuditCandidates(input: BuildBalanceSheetIntegrityObservationInput): SyntheticAuditCandidate[] {
  return input.auditCandidates ?? [];
}

function getAuditEvidencePackages(input: BuildBalanceSheetIntegrityObservationInput): SyntheticAuditEvidencePackage[] {
  return input.auditEvidencePackages ?? [];
}

function getAuditFindings(input: BuildBalanceSheetIntegrityObservationInput): SyntheticAuditFinding[] {
  return input.auditFindings ?? [];
}

function getAuditConfidencePackages(input: BuildBalanceSheetIntegrityObservationInput): SyntheticAuditConfidence[] {
  return input.auditConfidencePackages ?? [];
}

function getAuditSurfaces(input: BuildBalanceSheetIntegrityObservationInput): SyntheticAuditSurface[] {
  return input.auditSurfaces ?? [];
}

function getAuditWatchlists(input: BuildBalanceSheetIntegrityObservationInput): SyntheticAuditWatchlist[] {
  return input.auditWatchlists ?? [];
}

function getAuditBriefings(input: BuildBalanceSheetIntegrityObservationInput): SyntheticAuditBriefing[] {
  return input.auditBriefings ?? [];
}

function getAllAuditArtifacts(input: BuildBalanceSheetIntegrityObservationInput): AuditArtifact[] {
  return [
    ...getAuditCandidates(input),
    ...getAuditEvidencePackages(input),
    ...getAuditFindings(input),
    ...getAuditConfidencePackages(input),
    ...getAuditSurfaces(input),
    ...getAuditWatchlists(input),
    ...getAuditBriefings(input),
  ];
}

function getPackagedAuditArtifacts(
  input: BuildBalanceSheetIntegrityObservationInput,
): Array<
  | SyntheticAuditEvidencePackage
  | SyntheticAuditFinding
  | SyntheticAuditConfidence
  | SyntheticAuditSurface
  | SyntheticAuditWatchlist
  | SyntheticAuditBriefing
> {
  return [
    ...getAuditEvidencePackages(input),
    ...getAuditFindings(input),
    ...getAuditConfidencePackages(input),
    ...getAuditSurfaces(input),
    ...getAuditWatchlists(input),
    ...getAuditBriefings(input),
  ];
}

function getEvidenceReferenceIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => observation.evidenceReferenceIds),
  ]);
}

function getSourceReferenceIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => observation.sourceReferenceIds),
  ]);
}

function getLineageReferenceIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => observation.lineageReferenceIds),
  ]);
}

function getAuditContractReferenceIdsFromInput(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return uniqueStable([
    ...getAuditContractReferenceIds(input.auditContract),
    ...getAllAuditArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "auditContractReferenceIds")),
    ...getDomainObservations(input).flatMap((observation) => observation.auditContractReferenceIds),
  ]);
}

function getAuditCandidateIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditCandidateId"),
      ...getStringArrayProperty(artifact, "auditCandidateIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditCandidateIds),
  ]);
}

function getAuditEvidencePackageIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditEvidencePackageId"),
      ...getStringArrayProperty(artifact, "auditEvidencePackageIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditEvidencePackageIds),
  ]);
}

function getAuditFindingArtifactIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditFindingArtifactId"),
      ...getStringArrayProperty(artifact, "auditFindingArtifactIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditFindingArtifactIds),
  ]);
}

function getAuditFindingIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditFindingId"),
      ...getStringArrayProperty(artifact, "auditFindingIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditFindingIds),
  ]);
}

function getAuditConfidenceIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditConfidenceId"),
      ...getStringArrayProperty(artifact, "auditConfidenceIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditConfidenceIds),
  ]);
}

function getAuditSurfaceIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditSurfaceId"),
      ...getStringArrayProperty(artifact, "auditSurfaceIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditSurfaceIds),
  ]);
}

function getAuditWatchlistIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditWatchlistId"),
      ...getStringArrayProperty(artifact, "auditWatchlistIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditWatchlistIds),
  ]);
}

function getAuditBriefingIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditBriefingId"),
      ...getStringArrayProperty(artifact, "auditBriefingIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditBriefingIds),
  ]);
}

function getBalanceSheetIntegrityReferenceIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.observationMetadata?.sourceArtifactIds ?? []),
    ...(input.auditContract?.observationMetadata?.relatedScheduleIds ?? []),
    ...getAllAuditArtifacts(input).flatMap((artifact) => artifact.observationMetadata?.sourceArtifactIds ?? []),
    ...getAllAuditArtifacts(input).flatMap((artifact) => artifact.observationMetadata?.relatedScheduleIds ?? []),
    ...getDomainObservations(input).flatMap((observation) =>
      observation.observationMetadata.flatMap((metadata) => metadata.sourceArtifactIds),
    ),
    ...getDomainObservations(input).flatMap((observation) =>
      observation.observationMetadata.flatMap((metadata) => metadata.relatedScheduleIds),
    ),
    ...getSourceReferenceIds(input),
  ]);
}

function getFinancialStatementRelationshipObservationIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return getFinancialStatementRelationshipObservations(input).map(
    (observation) => observation.financialStatementRelationshipObservationId,
  );
}

function getTaxIntelligenceObservationIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return getTaxIntelligenceObservations(input).map((observation) => observation.taxIntelligenceObservationId);
}

function getReserveIntelligenceObservationIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return getReserveIntelligenceObservations(input).map((observation) => observation.reserveIntelligenceObservationId);
}

function getLeaseIntelligenceObservationIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return getLeaseIntelligenceObservations(input).map((observation) => observation.leaseIntelligenceObservationId);
}

function getRevenueIntelligenceObservationIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return getRevenueIntelligenceObservations(input).map((observation) => observation.revenueIntelligenceObservationId);
}

function getInventoryIntelligenceObservationIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return getInventoryIntelligenceObservations(input).map((observation) => observation.inventoryIntelligenceObservationId);
}

function getUnitCostIntelligenceObservationIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return getUnitCostIntelligenceObservations(input).map((observation) => observation.unitCostIntelligenceObservationId);
}

function getBankActivityObservationIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return getBankActivityObservations(input).map((observation) => observation.bankActivityObservationId);
}

function getCashApplicationObservationIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return getCashApplicationObservations(input).map((observation) => observation.cashApplicationObservationId);
}

function getReconciliationObservationIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return getReconciliationObservations(input).map((observation) => observation.reconciliationObservationId);
}

function getJournalTestingObservationIds(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  return getJournalTestingObservations(input).map((observation) => observation.journalTestingObservationId);
}

function buildBalanceSheetIntegrityObservationId(input: BuildBalanceSheetIntegrityObservationInput): string {
  return `synthetic-balance-sheet-integrity-observation:${stableSnapshotHash({
    balanceSheetIntegrityObservationKey: input.balanceSheetIntegrityObservationKey,
    balanceSheetIntegrityCategory: input.balanceSheetIntegrityCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    financialStatementRelationshipObservationIds: getFinancialStatementRelationshipObservationIds(input),
    taxIntelligenceObservationIds: getTaxIntelligenceObservationIds(input),
    reserveIntelligenceObservationIds: getReserveIntelligenceObservationIds(input),
    leaseIntelligenceObservationIds: getLeaseIntelligenceObservationIds(input),
    revenueIntelligenceObservationIds: getRevenueIntelligenceObservationIds(input),
    inventoryIntelligenceObservationIds: getInventoryIntelligenceObservationIds(input),
    unitCostIntelligenceObservationIds: getUnitCostIntelligenceObservationIds(input),
    bankActivityObservationIds: getBankActivityObservationIds(input),
    cashApplicationObservationIds: getCashApplicationObservationIds(input),
    reconciliationObservationIds: getReconciliationObservationIds(input),
    journalTestingObservationIds: getJournalTestingObservationIds(input),
    auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
    auditCandidateIds: getAuditCandidateIds(input),
    auditEvidencePackageIds: getAuditEvidencePackageIds(input),
    auditFindingArtifactIds: getAuditFindingArtifactIds(input),
    auditConfidenceIds: getAuditConfidenceIds(input),
    auditSurfaceIds: getAuditSurfaceIds(input),
    auditWatchlistIds: getAuditWatchlistIds(input),
    auditBriefingIds: getAuditBriefingIds(input),
    balanceSheetIntegrityReferenceIds: getBalanceSheetIntegrityReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
    isolationBoundaryIds: input.auditContract?.scope.isolationBoundaryIds ?? [],
  })}`;
}

function validateAuditArtifacts(input: BuildBalanceSheetIntegrityObservationInput, warnings: string[]): void {
  const companyId = input.auditContract?.scope.companyId;
  for (const [artifactName, artifacts, idField] of [
    ["auditCandidates", getAuditCandidates(input), "auditCandidateId"],
    ["auditEvidencePackages", getAuditEvidencePackages(input), "auditEvidencePackageId"],
    ["auditFindings", getAuditFindings(input), "auditFindingArtifactId"],
    ["auditConfidencePackages", getAuditConfidencePackages(input), "auditConfidenceId"],
    ["auditSurfaces", getAuditSurfaces(input), "auditSurfaceId"],
    ["auditWatchlists", getAuditWatchlists(input), "auditWatchlistId"],
    ["auditBriefings", getAuditBriefings(input), "auditBriefingId"],
  ] as const) {
    artifacts.forEach((artifact, index) => {
      const artifactId = artifact[idField as keyof typeof artifact];
      if (!hasValue(artifactId)) warnings.push(`${artifactName}[${index}].${idField} is required.`);
      if (!hasValue(artifact.companyId)) warnings.push(`${artifactName}[${index}].companyId is required.`);
      if (companyId !== undefined && artifact.companyId !== companyId) {
        warnings.push(`${artifactName}[${index}].companyId must align with auditContract.scope.companyId.`);
      }
    });
  }
}

function validateDomainObservations(input: BuildBalanceSheetIntegrityObservationInput, warnings: string[]): void {
  const companyId = input.auditContract?.scope.companyId;
  for (const [observationName, observations, idField] of [
    [
      "financialStatementRelationshipObservations",
      getFinancialStatementRelationshipObservations(input),
      "financialStatementRelationshipObservationId",
    ],
    ["taxIntelligenceObservations", getTaxIntelligenceObservations(input), "taxIntelligenceObservationId"],
    ["reserveIntelligenceObservations", getReserveIntelligenceObservations(input), "reserveIntelligenceObservationId"],
    ["leaseIntelligenceObservations", getLeaseIntelligenceObservations(input), "leaseIntelligenceObservationId"],
    ["revenueIntelligenceObservations", getRevenueIntelligenceObservations(input), "revenueIntelligenceObservationId"],
    [
      "inventoryIntelligenceObservations",
      getInventoryIntelligenceObservations(input),
      "inventoryIntelligenceObservationId",
    ],
    ["unitCostIntelligenceObservations", getUnitCostIntelligenceObservations(input), "unitCostIntelligenceObservationId"],
    ["bankActivityObservations", getBankActivityObservations(input), "bankActivityObservationId"],
    ["cashApplicationObservations", getCashApplicationObservations(input), "cashApplicationObservationId"],
    ["reconciliationObservations", getReconciliationObservations(input), "reconciliationObservationId"],
    ["journalTestingObservations", getJournalTestingObservations(input), "journalTestingObservationId"],
  ] as const) {
    observations.forEach((observation, index) => {
      const observationId = observation[idField as keyof typeof observation];
      if (!hasValue(observationId)) warnings.push(`${observationName}[${index}].${idField} is required.`);
      if (!hasValue(observation.companyId)) warnings.push(`${observationName}[${index}].companyId is required.`);
      if (companyId !== undefined && observation.companyId !== companyId) {
        warnings.push(`${observationName}[${index}].companyId must align with auditContract.scope.companyId.`);
      }
    });
  }
}

function validateInput(input: BuildBalanceSheetIntegrityObservationInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (!hasValue(input.balanceSheetIntegrityObservationKey)) {
    warnings.push("balanceSheetIntegrityObservationKey is required.");
  }
  if (!hasValue(input.balanceSheetIntegrityCategory)) warnings.push("balanceSheetIntegrityCategory is required.");
  if (!isSupportedBalanceSheetIntegrityCategory(input.balanceSheetIntegrityCategory)) {
    warnings.push("balanceSheetIntegrityCategory must be a supported balance sheet integrity category.");
  }
  if (!auditContract.scope) warnings.push("auditContract.scope is required.");
  if (!auditContract.evidence) warnings.push("auditContract.evidence is required.");
  if (!auditContract.scope || !auditContract.evidence) return warnings;

  if (!hasValue(auditContract.scope.companyId)) warnings.push("scope.companyId is required.");
  if (!hasArrayValue(auditContract.scope.isolationBoundaryIds)) {
    warnings.push("scope.isolationBoundaryIds must include at least one value.");
  }
  if (!hasArrayValue(auditContract.evidence.evidenceIds)) {
    warnings.push("evidence.evidenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditContract.evidence.sourceReferenceIds)) {
    warnings.push("evidence.sourceReferenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditContract.evidence.lineageReferenceIds)) {
    warnings.push("evidence.lineageReferenceIds must include at least one value.");
  }

  validateAuditArtifacts(input, warnings);
  validateDomainObservations(input, warnings);
  return warnings;
}

export function buildBalanceSheetIntegrityObservation(
  input: BuildBalanceSheetIntegrityObservationInput,
): BuildBalanceSheetIntegrityObservationResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.auditContract) {
    return {
      balanceSheetIntegrityObservation: null,
      skipped: true,
      warnings,
    };
  }

  const auditContract = input.auditContract;
  const financialStatementRelationshipObservations = getFinancialStatementRelationshipObservations(input);
  const taxIntelligenceObservations = getTaxIntelligenceObservations(input);
  const reserveIntelligenceObservations = getReserveIntelligenceObservations(input);
  const leaseIntelligenceObservations = getLeaseIntelligenceObservations(input);
  const revenueIntelligenceObservations = getRevenueIntelligenceObservations(input);
  const inventoryIntelligenceObservations = getInventoryIntelligenceObservations(input);
  const unitCostIntelligenceObservations = getUnitCostIntelligenceObservations(input);
  const bankActivityObservations = getBankActivityObservations(input);
  const cashApplicationObservations = getCashApplicationObservations(input);
  const reconciliationObservations = getReconciliationObservations(input);
  const journalTestingObservations = getJournalTestingObservations(input);
  const auditCandidates = getAuditCandidates(input);
  const auditEvidencePackages = getAuditEvidencePackages(input);
  const auditFindings = getAuditFindings(input);
  const auditConfidencePackages = getAuditConfidencePackages(input);
  const auditSurfaces = getAuditSurfaces(input);
  const auditWatchlists = getAuditWatchlists(input);
  const auditBriefings = getAuditBriefings(input);
  const allArtifacts = getAllAuditArtifacts(input);
  const domainObservations = getDomainObservations(input);

  return {
    balanceSheetIntegrityObservation: {
      balanceSheetIntegrityObservationId: buildBalanceSheetIntegrityObservationId(input),
      balanceSheetIntegrityObservationKey: input.balanceSheetIntegrityObservationKey,
      balanceSheetIntegrityCategory: input.balanceSheetIntegrityCategory,
      companyId: auditContract.scope.companyId,
      auditCategory: getAuditCategory(auditContract),
      scope: auditContract.scope,
      financialStatementRelationshipObservationIds: getFinancialStatementRelationshipObservationIds(input),
      taxIntelligenceObservationIds: getTaxIntelligenceObservationIds(input),
      reserveIntelligenceObservationIds: getReserveIntelligenceObservationIds(input),
      leaseIntelligenceObservationIds: getLeaseIntelligenceObservationIds(input),
      revenueIntelligenceObservationIds: getRevenueIntelligenceObservationIds(input),
      inventoryIntelligenceObservationIds: getInventoryIntelligenceObservationIds(input),
      unitCostIntelligenceObservationIds: getUnitCostIntelligenceObservationIds(input),
      bankActivityObservationIds: getBankActivityObservationIds(input),
      cashApplicationObservationIds: getCashApplicationObservationIds(input),
      reconciliationObservationIds: getReconciliationObservationIds(input),
      journalTestingObservationIds: getJournalTestingObservationIds(input),
      auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
      auditCandidateIds: getAuditCandidateIds(input),
      auditEvidencePackageIds: getAuditEvidencePackageIds(input),
      auditFindingArtifactIds: getAuditFindingArtifactIds(input),
      auditFindingIds: getAuditFindingIds(input),
      auditConfidenceIds: getAuditConfidenceIds(input),
      auditSurfaceIds: getAuditSurfaceIds(input),
      auditWatchlistIds: getAuditWatchlistIds(input),
      auditBriefingIds: getAuditBriefingIds(input),
      balanceSheetIntegrityReferenceIds: getBalanceSheetIntegrityReferenceIds(input),
      evidence: auditContract.evidence,
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      sourceReferenceIds: getSourceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      observationMetadata: compactDefined([
        auditContract.observationMetadata,
        ...allArtifacts.map((artifact) => artifact.observationMetadata),
        ...domainObservations.flatMap((observation) => observation.observationMetadata),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...allArtifacts.map((artifact) => artifact.findingMetadata),
        ...domainObservations.flatMap((observation) => observation.findingMetadata),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...allArtifacts.map((artifact) => artifact.exceptionMetadata),
        ...domainObservations.flatMap((observation) => observation.exceptionMetadata),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...allArtifacts.map((artifact) => artifact.riskMetadata),
        ...domainObservations.flatMap((observation) => observation.riskMetadata),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...allArtifacts.map((artifact) => artifact.trustMetadata),
        ...domainObservations.flatMap((observation) => observation.trustMetadata),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...allArtifacts.map((artifact) => artifact.confidenceMetadata),
        ...domainObservations.flatMap((observation) => observation.confidenceMetadata),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...allArtifacts.map((artifact) => artifact.governanceMetadata),
        ...domainObservations.flatMap((observation) => observation.governanceMetadata),
      ]),
      materialityCompatibility: compactDefined([
        auditContract.materialityCompatibility,
        ...allArtifacts.map((artifact) => artifact.materialityCompatibility),
        ...domainObservations.flatMap((observation) => observation.materialityCompatibility),
      ]),
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...allArtifacts.map((artifact) => artifact.personaCompatibility),
        ...domainObservations.flatMap((observation) => observation.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...allArtifacts.map((artifact) => artifact.packageCompatibility),
        ...domainObservations.flatMap((observation) => observation.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...allArtifacts.map((artifact) => artifact.memoryCompatibility),
        ...domainObservations.flatMap((observation) => observation.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...allArtifacts.map((artifact) => artifact.learningCompatibility),
        ...domainObservations.flatMap((observation) => observation.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...allArtifacts.map((artifact) => artifact.surfaceCompatibility),
        ...domainObservations.flatMap((observation) => observation.surfaceCompatibility),
      ]),
      auditContract,
      financialStatementRelationshipObservations,
      taxIntelligenceObservations,
      reserveIntelligenceObservations,
      leaseIntelligenceObservations,
      revenueIntelligenceObservations,
      inventoryIntelligenceObservations,
      unitCostIntelligenceObservations,
      bankActivityObservations,
      cashApplicationObservations,
      reconciliationObservations,
      journalTestingObservations,
      auditCandidates,
      auditEvidencePackages,
      auditFindings,
      auditConfidencePackages,
      auditSurfaces,
      auditWatchlists,
      auditBriefings,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
