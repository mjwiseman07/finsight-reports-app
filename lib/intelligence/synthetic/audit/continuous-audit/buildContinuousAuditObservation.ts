import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticAuditBriefing } from "../briefings";
import type { SyntheticAuditCandidate } from "../candidates";
import type { SyntheticAuditConfidence } from "../confidence";
import type { SyntheticAuditEvidencePackage } from "../evidence";
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
import type { SyntheticBalanceSheetIntegrityObservation } from "../balance-sheet-integrity";
import type { SyntheticBankActivityObservation } from "../bank-activity";
import type { SyntheticCashApplicationObservation } from "../cash-application";
import type { SyntheticCutoffIntelligenceObservation } from "../cutoff-intelligence";
import type { SyntheticFinancialStatementRelationshipObservation } from "../financial-statement-relationships";
import type { SyntheticInventoryIntelligenceObservation } from "../inventory-intelligence";
import type { SyntheticJournalTestingObservation } from "../journal-testing";
import type { SyntheticLeaseIntelligenceObservation } from "../lease-intelligence";
import type { SyntheticPeriodEndActivityObservation } from "../period-end-activity";
import type { SyntheticReconciliationObservation } from "../reconciliation";
import type { SyntheticReserveIntelligenceObservation } from "../reserve-intelligence";
import type { SyntheticRevenueIntelligenceObservation } from "../revenue-intelligence";
import type { SyntheticAuditSurface } from "../surfaces";
import type { SyntheticTaxIntelligenceObservation } from "../tax-intelligence";
import type { SyntheticUnitCostIntelligenceObservation } from "../unit-cost-intelligence";
import type { SyntheticAuditWatchlist } from "../watchlists";

export type SyntheticContinuousAuditCategory =
  | "audit_readiness_candidate"
  | "audit_exception_candidate"
  | "audit_coverage_candidate"
  | "audit_relationship_candidate"
  | "audit_materiality_candidate"
  | "audit_reconciliation_candidate"
  | "audit_journal_candidate"
  | "audit_tax_candidate"
  | "audit_reserve_candidate"
  | "audit_inventory_candidate"
  | "audit_revenue_candidate"
  | "audit_lease_candidate"
  | "audit_balance_sheet_candidate"
  | "audit_cross_domain_candidate"
  | "continuous_audit_candidate";

export const SYNTHETIC_CONTINUOUS_AUDIT_CATEGORIES: SyntheticContinuousAuditCategory[] = [
  "audit_readiness_candidate",
  "audit_exception_candidate",
  "audit_coverage_candidate",
  "audit_relationship_candidate",
  "audit_materiality_candidate",
  "audit_reconciliation_candidate",
  "audit_journal_candidate",
  "audit_tax_candidate",
  "audit_reserve_candidate",
  "audit_inventory_candidate",
  "audit_revenue_candidate",
  "audit_lease_candidate",
  "audit_balance_sheet_candidate",
  "audit_cross_domain_candidate",
  "continuous_audit_candidate",
];

export interface BuildContinuousAuditObservationInput {
  auditContract: SyntheticAuditContract | null;
  continuousAuditObservationKey: string;
  continuousAuditCategory: SyntheticContinuousAuditCategory;
  journalTestingObservations?: SyntheticJournalTestingObservation[];
  reconciliationObservations?: SyntheticReconciliationObservation[];
  bankActivityObservations?: SyntheticBankActivityObservation[];
  cashApplicationObservations?: SyntheticCashApplicationObservation[];
  taxIntelligenceObservations?: SyntheticTaxIntelligenceObservation[];
  reserveIntelligenceObservations?: SyntheticReserveIntelligenceObservation[];
  leaseIntelligenceObservations?: SyntheticLeaseIntelligenceObservation[];
  revenueIntelligenceObservations?: SyntheticRevenueIntelligenceObservation[];
  inventoryIntelligenceObservations?: SyntheticInventoryIntelligenceObservation[];
  unitCostIntelligenceObservations?: SyntheticUnitCostIntelligenceObservation[];
  cutoffIntelligenceObservations?: SyntheticCutoffIntelligenceObservation[];
  periodEndActivityObservations?: SyntheticPeriodEndActivityObservation[];
  financialStatementRelationshipObservations?: SyntheticFinancialStatementRelationshipObservation[];
  balanceSheetIntegrityObservations?: SyntheticBalanceSheetIntegrityObservation[];
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticContinuousAuditObservation {
  continuousAuditObservationId: string;
  continuousAuditObservationKey: string;
  continuousAuditCategory: SyntheticContinuousAuditCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  journalTestingObservationIds: string[];
  reconciliationObservationIds: string[];
  bankActivityObservationIds: string[];
  cashApplicationObservationIds: string[];
  taxIntelligenceObservationIds: string[];
  reserveIntelligenceObservationIds: string[];
  leaseIntelligenceObservationIds: string[];
  revenueIntelligenceObservationIds: string[];
  inventoryIntelligenceObservationIds: string[];
  unitCostIntelligenceObservationIds: string[];
  cutoffIntelligenceObservationIds: string[];
  periodEndActivityObservationIds: string[];
  financialStatementRelationshipObservationIds: string[];
  balanceSheetIntegrityObservationIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  continuousAuditReferenceIds: string[];
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
  journalTestingObservations: SyntheticJournalTestingObservation[];
  reconciliationObservations: SyntheticReconciliationObservation[];
  bankActivityObservations: SyntheticBankActivityObservation[];
  cashApplicationObservations: SyntheticCashApplicationObservation[];
  taxIntelligenceObservations: SyntheticTaxIntelligenceObservation[];
  reserveIntelligenceObservations: SyntheticReserveIntelligenceObservation[];
  leaseIntelligenceObservations: SyntheticLeaseIntelligenceObservation[];
  revenueIntelligenceObservations: SyntheticRevenueIntelligenceObservation[];
  inventoryIntelligenceObservations: SyntheticInventoryIntelligenceObservation[];
  unitCostIntelligenceObservations: SyntheticUnitCostIntelligenceObservation[];
  cutoffIntelligenceObservations: SyntheticCutoffIntelligenceObservation[];
  periodEndActivityObservations: SyntheticPeriodEndActivityObservation[];
  financialStatementRelationshipObservations: SyntheticFinancialStatementRelationshipObservation[];
  balanceSheetIntegrityObservations: SyntheticBalanceSheetIntegrityObservation[];
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildContinuousAuditObservationResult {
  continuousAuditObservation: SyntheticContinuousAuditObservation | null;
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
  | SyntheticJournalTestingObservation
  | SyntheticReconciliationObservation
  | SyntheticBankActivityObservation
  | SyntheticCashApplicationObservation
  | SyntheticTaxIntelligenceObservation
  | SyntheticReserveIntelligenceObservation
  | SyntheticLeaseIntelligenceObservation
  | SyntheticRevenueIntelligenceObservation
  | SyntheticInventoryIntelligenceObservation
  | SyntheticUnitCostIntelligenceObservation
  | SyntheticCutoffIntelligenceObservation
  | SyntheticPeriodEndActivityObservation
  | SyntheticFinancialStatementRelationshipObservation
  | SyntheticBalanceSheetIntegrityObservation;

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

function isSupportedContinuousAuditCategory(category: SyntheticContinuousAuditCategory): boolean {
  return SYNTHETIC_CONTINUOUS_AUDIT_CATEGORIES.includes(category);
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

function getJournalTestingObservations(input: BuildContinuousAuditObservationInput): SyntheticJournalTestingObservation[] {
  return input.journalTestingObservations ?? [];
}

function getReconciliationObservations(input: BuildContinuousAuditObservationInput): SyntheticReconciliationObservation[] {
  return input.reconciliationObservations ?? [];
}

function getBankActivityObservations(input: BuildContinuousAuditObservationInput): SyntheticBankActivityObservation[] {
  return input.bankActivityObservations ?? [];
}

function getCashApplicationObservations(input: BuildContinuousAuditObservationInput): SyntheticCashApplicationObservation[] {
  return input.cashApplicationObservations ?? [];
}

function getTaxIntelligenceObservations(input: BuildContinuousAuditObservationInput): SyntheticTaxIntelligenceObservation[] {
  return input.taxIntelligenceObservations ?? [];
}

function getReserveIntelligenceObservations(
  input: BuildContinuousAuditObservationInput,
): SyntheticReserveIntelligenceObservation[] {
  return input.reserveIntelligenceObservations ?? [];
}

function getLeaseIntelligenceObservations(input: BuildContinuousAuditObservationInput): SyntheticLeaseIntelligenceObservation[] {
  return input.leaseIntelligenceObservations ?? [];
}

function getRevenueIntelligenceObservations(
  input: BuildContinuousAuditObservationInput,
): SyntheticRevenueIntelligenceObservation[] {
  return input.revenueIntelligenceObservations ?? [];
}

function getInventoryIntelligenceObservations(
  input: BuildContinuousAuditObservationInput,
): SyntheticInventoryIntelligenceObservation[] {
  return input.inventoryIntelligenceObservations ?? [];
}

function getUnitCostIntelligenceObservations(
  input: BuildContinuousAuditObservationInput,
): SyntheticUnitCostIntelligenceObservation[] {
  return input.unitCostIntelligenceObservations ?? [];
}

function getCutoffIntelligenceObservations(
  input: BuildContinuousAuditObservationInput,
): SyntheticCutoffIntelligenceObservation[] {
  return input.cutoffIntelligenceObservations ?? [];
}

function getPeriodEndActivityObservations(
  input: BuildContinuousAuditObservationInput,
): SyntheticPeriodEndActivityObservation[] {
  return input.periodEndActivityObservations ?? [];
}

function getFinancialStatementRelationshipObservations(
  input: BuildContinuousAuditObservationInput,
): SyntheticFinancialStatementRelationshipObservation[] {
  return input.financialStatementRelationshipObservations ?? [];
}

function getBalanceSheetIntegrityObservations(
  input: BuildContinuousAuditObservationInput,
): SyntheticBalanceSheetIntegrityObservation[] {
  return input.balanceSheetIntegrityObservations ?? [];
}

function getDomainObservations(input: BuildContinuousAuditObservationInput): DomainObservation[] {
  return [
    ...getJournalTestingObservations(input),
    ...getReconciliationObservations(input),
    ...getBankActivityObservations(input),
    ...getCashApplicationObservations(input),
    ...getTaxIntelligenceObservations(input),
    ...getReserveIntelligenceObservations(input),
    ...getLeaseIntelligenceObservations(input),
    ...getRevenueIntelligenceObservations(input),
    ...getInventoryIntelligenceObservations(input),
    ...getUnitCostIntelligenceObservations(input),
    ...getCutoffIntelligenceObservations(input),
    ...getPeriodEndActivityObservations(input),
    ...getFinancialStatementRelationshipObservations(input),
    ...getBalanceSheetIntegrityObservations(input),
  ];
}

function getAuditCandidates(input: BuildContinuousAuditObservationInput): SyntheticAuditCandidate[] {
  return input.auditCandidates ?? [];
}

function getAuditEvidencePackages(input: BuildContinuousAuditObservationInput): SyntheticAuditEvidencePackage[] {
  return input.auditEvidencePackages ?? [];
}

function getAuditFindings(input: BuildContinuousAuditObservationInput): SyntheticAuditFinding[] {
  return input.auditFindings ?? [];
}

function getAuditConfidencePackages(input: BuildContinuousAuditObservationInput): SyntheticAuditConfidence[] {
  return input.auditConfidencePackages ?? [];
}

function getAuditSurfaces(input: BuildContinuousAuditObservationInput): SyntheticAuditSurface[] {
  return input.auditSurfaces ?? [];
}

function getAuditWatchlists(input: BuildContinuousAuditObservationInput): SyntheticAuditWatchlist[] {
  return input.auditWatchlists ?? [];
}

function getAuditBriefings(input: BuildContinuousAuditObservationInput): SyntheticAuditBriefing[] {
  return input.auditBriefings ?? [];
}

function getAllAuditArtifacts(input: BuildContinuousAuditObservationInput): AuditArtifact[] {
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
  input: BuildContinuousAuditObservationInput,
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

function getObservationIds(observations: object[], propertyName: string): string[] {
  return observations.flatMap((observation) => getStringProperty(observation, propertyName));
}

function getEvidenceReferenceIds(input: BuildContinuousAuditObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => observation.evidenceReferenceIds),
  ]);
}

function getSourceReferenceIds(input: BuildContinuousAuditObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => observation.sourceReferenceIds),
  ]);
}

function getLineageReferenceIds(input: BuildContinuousAuditObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => observation.lineageReferenceIds),
  ]);
}

function getAuditContractReferenceIdsFromInput(input: BuildContinuousAuditObservationInput): string[] {
  return uniqueStable([
    ...getAuditContractReferenceIds(input.auditContract),
    ...getAllAuditArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "auditContractReferenceIds")),
    ...getDomainObservations(input).flatMap((observation) => observation.auditContractReferenceIds),
  ]);
}

function getAuditCandidateIds(input: BuildContinuousAuditObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditCandidateId"),
      ...getStringArrayProperty(artifact, "auditCandidateIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditCandidateIds),
  ]);
}

function getAuditEvidencePackageIds(input: BuildContinuousAuditObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditEvidencePackageId"),
      ...getStringArrayProperty(artifact, "auditEvidencePackageIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditEvidencePackageIds),
  ]);
}

function getAuditFindingArtifactIds(input: BuildContinuousAuditObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditFindingArtifactId"),
      ...getStringArrayProperty(artifact, "auditFindingArtifactIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditFindingArtifactIds),
  ]);
}

function getAuditFindingIds(input: BuildContinuousAuditObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditFindingId"),
      ...getStringArrayProperty(artifact, "auditFindingIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditFindingIds),
  ]);
}

function getAuditConfidenceIds(input: BuildContinuousAuditObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditConfidenceId"),
      ...getStringArrayProperty(artifact, "auditConfidenceIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditConfidenceIds),
  ]);
}

function getAuditSurfaceIds(input: BuildContinuousAuditObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditSurfaceId"),
      ...getStringArrayProperty(artifact, "auditSurfaceIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditSurfaceIds),
  ]);
}

function getAuditWatchlistIds(input: BuildContinuousAuditObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditWatchlistId"),
      ...getStringArrayProperty(artifact, "auditWatchlistIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditWatchlistIds),
  ]);
}

function getAuditBriefingIds(input: BuildContinuousAuditObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditBriefingId"),
      ...getStringArrayProperty(artifact, "auditBriefingIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditBriefingIds),
  ]);
}

function getContinuousAuditReferenceIds(input: BuildContinuousAuditObservationInput): string[] {
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

function buildContinuousAuditObservationId(input: BuildContinuousAuditObservationInput): string {
  return `synthetic-continuous-audit-observation:${stableSnapshotHash({
    continuousAuditObservationKey: input.continuousAuditObservationKey,
    continuousAuditCategory: input.continuousAuditCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    journalTestingObservationIds: getObservationIds(getJournalTestingObservations(input), "journalTestingObservationId"),
    reconciliationObservationIds: getObservationIds(getReconciliationObservations(input), "reconciliationObservationId"),
    bankActivityObservationIds: getObservationIds(getBankActivityObservations(input), "bankActivityObservationId"),
    cashApplicationObservationIds: getObservationIds(getCashApplicationObservations(input), "cashApplicationObservationId"),
    taxIntelligenceObservationIds: getObservationIds(getTaxIntelligenceObservations(input), "taxIntelligenceObservationId"),
    reserveIntelligenceObservationIds: getObservationIds(
      getReserveIntelligenceObservations(input),
      "reserveIntelligenceObservationId",
    ),
    leaseIntelligenceObservationIds: getObservationIds(
      getLeaseIntelligenceObservations(input),
      "leaseIntelligenceObservationId",
    ),
    revenueIntelligenceObservationIds: getObservationIds(
      getRevenueIntelligenceObservations(input),
      "revenueIntelligenceObservationId",
    ),
    inventoryIntelligenceObservationIds: getObservationIds(
      getInventoryIntelligenceObservations(input),
      "inventoryIntelligenceObservationId",
    ),
    unitCostIntelligenceObservationIds: getObservationIds(
      getUnitCostIntelligenceObservations(input),
      "unitCostIntelligenceObservationId",
    ),
    cutoffIntelligenceObservationIds: getObservationIds(
      getCutoffIntelligenceObservations(input),
      "cutoffIntelligenceObservationId",
    ),
    periodEndActivityObservationIds: getObservationIds(
      getPeriodEndActivityObservations(input),
      "periodEndActivityObservationId",
    ),
    financialStatementRelationshipObservationIds: getObservationIds(
      getFinancialStatementRelationshipObservations(input),
      "financialStatementRelationshipObservationId",
    ),
    balanceSheetIntegrityObservationIds: getObservationIds(
      getBalanceSheetIntegrityObservations(input),
      "balanceSheetIntegrityObservationId",
    ),
    auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
    auditCandidateIds: getAuditCandidateIds(input),
    auditEvidencePackageIds: getAuditEvidencePackageIds(input),
    auditFindingArtifactIds: getAuditFindingArtifactIds(input),
    auditConfidenceIds: getAuditConfidenceIds(input),
    auditSurfaceIds: getAuditSurfaceIds(input),
    auditWatchlistIds: getAuditWatchlistIds(input),
    auditBriefingIds: getAuditBriefingIds(input),
    continuousAuditReferenceIds: getContinuousAuditReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
    isolationBoundaryIds: input.auditContract?.scope.isolationBoundaryIds ?? [],
  })}`;
}

function validateAuditArtifacts(input: BuildContinuousAuditObservationInput, warnings: string[]): void {
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

function validateDomainObservationIds(input: BuildContinuousAuditObservationInput, warnings: string[]): void {
  const companyId = input.auditContract?.scope.companyId;
  for (const [observationName, observations, idField] of [
    ["journalTestingObservations", getJournalTestingObservations(input), "journalTestingObservationId"],
    ["reconciliationObservations", getReconciliationObservations(input), "reconciliationObservationId"],
    ["bankActivityObservations", getBankActivityObservations(input), "bankActivityObservationId"],
    ["cashApplicationObservations", getCashApplicationObservations(input), "cashApplicationObservationId"],
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
    ["cutoffIntelligenceObservations", getCutoffIntelligenceObservations(input), "cutoffIntelligenceObservationId"],
    ["periodEndActivityObservations", getPeriodEndActivityObservations(input), "periodEndActivityObservationId"],
    [
      "financialStatementRelationshipObservations",
      getFinancialStatementRelationshipObservations(input),
      "financialStatementRelationshipObservationId",
    ],
    ["balanceSheetIntegrityObservations", getBalanceSheetIntegrityObservations(input), "balanceSheetIntegrityObservationId"],
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

function validateInput(input: BuildContinuousAuditObservationInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (!hasValue(input.continuousAuditObservationKey)) warnings.push("continuousAuditObservationKey is required.");
  if (!hasValue(input.continuousAuditCategory)) warnings.push("continuousAuditCategory is required.");
  if (!isSupportedContinuousAuditCategory(input.continuousAuditCategory)) {
    warnings.push("continuousAuditCategory must be a supported continuous audit category.");
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
  validateDomainObservationIds(input, warnings);
  return warnings;
}

export function buildContinuousAuditObservation(
  input: BuildContinuousAuditObservationInput,
): BuildContinuousAuditObservationResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.auditContract) {
    return {
      continuousAuditObservation: null,
      skipped: true,
      warnings,
    };
  }

  const auditContract = input.auditContract;
  const journalTestingObservations = getJournalTestingObservations(input);
  const reconciliationObservations = getReconciliationObservations(input);
  const bankActivityObservations = getBankActivityObservations(input);
  const cashApplicationObservations = getCashApplicationObservations(input);
  const taxIntelligenceObservations = getTaxIntelligenceObservations(input);
  const reserveIntelligenceObservations = getReserveIntelligenceObservations(input);
  const leaseIntelligenceObservations = getLeaseIntelligenceObservations(input);
  const revenueIntelligenceObservations = getRevenueIntelligenceObservations(input);
  const inventoryIntelligenceObservations = getInventoryIntelligenceObservations(input);
  const unitCostIntelligenceObservations = getUnitCostIntelligenceObservations(input);
  const cutoffIntelligenceObservations = getCutoffIntelligenceObservations(input);
  const periodEndActivityObservations = getPeriodEndActivityObservations(input);
  const financialStatementRelationshipObservations = getFinancialStatementRelationshipObservations(input);
  const balanceSheetIntegrityObservations = getBalanceSheetIntegrityObservations(input);
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
    continuousAuditObservation: {
      continuousAuditObservationId: buildContinuousAuditObservationId(input),
      continuousAuditObservationKey: input.continuousAuditObservationKey,
      continuousAuditCategory: input.continuousAuditCategory,
      companyId: auditContract.scope.companyId,
      auditCategory: getAuditCategory(auditContract),
      scope: auditContract.scope,
      journalTestingObservationIds: getObservationIds(journalTestingObservations, "journalTestingObservationId"),
      reconciliationObservationIds: getObservationIds(reconciliationObservations, "reconciliationObservationId"),
      bankActivityObservationIds: getObservationIds(bankActivityObservations, "bankActivityObservationId"),
      cashApplicationObservationIds: getObservationIds(cashApplicationObservations, "cashApplicationObservationId"),
      taxIntelligenceObservationIds: getObservationIds(taxIntelligenceObservations, "taxIntelligenceObservationId"),
      reserveIntelligenceObservationIds: getObservationIds(
        reserveIntelligenceObservations,
        "reserveIntelligenceObservationId",
      ),
      leaseIntelligenceObservationIds: getObservationIds(leaseIntelligenceObservations, "leaseIntelligenceObservationId"),
      revenueIntelligenceObservationIds: getObservationIds(
        revenueIntelligenceObservations,
        "revenueIntelligenceObservationId",
      ),
      inventoryIntelligenceObservationIds: getObservationIds(
        inventoryIntelligenceObservations,
        "inventoryIntelligenceObservationId",
      ),
      unitCostIntelligenceObservationIds: getObservationIds(
        unitCostIntelligenceObservations,
        "unitCostIntelligenceObservationId",
      ),
      cutoffIntelligenceObservationIds: getObservationIds(cutoffIntelligenceObservations, "cutoffIntelligenceObservationId"),
      periodEndActivityObservationIds: getObservationIds(periodEndActivityObservations, "periodEndActivityObservationId"),
      financialStatementRelationshipObservationIds: getObservationIds(
        financialStatementRelationshipObservations,
        "financialStatementRelationshipObservationId",
      ),
      balanceSheetIntegrityObservationIds: getObservationIds(
        balanceSheetIntegrityObservations,
        "balanceSheetIntegrityObservationId",
      ),
      auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
      auditCandidateIds: getAuditCandidateIds(input),
      auditEvidencePackageIds: getAuditEvidencePackageIds(input),
      auditFindingArtifactIds: getAuditFindingArtifactIds(input),
      auditFindingIds: getAuditFindingIds(input),
      auditConfidenceIds: getAuditConfidenceIds(input),
      auditSurfaceIds: getAuditSurfaceIds(input),
      auditWatchlistIds: getAuditWatchlistIds(input),
      auditBriefingIds: getAuditBriefingIds(input),
      continuousAuditReferenceIds: getContinuousAuditReferenceIds(input),
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
      journalTestingObservations,
      reconciliationObservations,
      bankActivityObservations,
      cashApplicationObservations,
      taxIntelligenceObservations,
      reserveIntelligenceObservations,
      leaseIntelligenceObservations,
      revenueIntelligenceObservations,
      inventoryIntelligenceObservations,
      unitCostIntelligenceObservations,
      cutoffIntelligenceObservations,
      periodEndActivityObservations,
      financialStatementRelationshipObservations,
      balanceSheetIntegrityObservations,
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
