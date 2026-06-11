import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticAuditCoverageObservation } from "../audit-coverage";
import type { SyntheticAuditReadinessObservation } from "../audit-readiness";
import type { SyntheticAuditScheduleObservation } from "../audit-schedules";
import type { SyntheticAuditTieOutObservation } from "../audit-tie-outs";
import type { SyntheticBalanceSheetIntegrityObservation } from "../balance-sheet-integrity";
import type { SyntheticBankActivityObservation } from "../bank-activity";
import type { SyntheticAuditBriefing } from "../briefings";
import type { SyntheticCashApplicationObservation } from "../cash-application";
import type { SyntheticAuditCandidate } from "../candidates";
import type { SyntheticAuditConfidence } from "../confidence";
import type { SyntheticContinuousAuditObservation } from "../continuous-audit";
import type { SyntheticContinuousControllerObservation } from "../continuous-controller";
import type { SyntheticCutoffIntelligenceObservation } from "../cutoff-intelligence";
import type { SyntheticDebtCovenantObservation } from "../debt-covenants";
import type { SyntheticAuditEvidencePackage } from "../evidence";
import type { SyntheticEvidenceSufficiencyObservation } from "../evidence-sufficiency";
import type { SyntheticExpectedActivityObservation } from "../expected-activity";
import type { SyntheticFinancialStatementRelationshipObservation } from "../financial-statement-relationships";
import type { SyntheticFixedAssetIntelligenceObservation } from "../fixed-asset-intelligence";
import type { SyntheticFluxIntelligenceObservation } from "../flux-intelligence";
import type { SyntheticAuditFinding } from "../findings";
import type { SyntheticInventoryIntelligenceObservation } from "../inventory-intelligence";
import type { SyntheticJournalTestingObservation } from "../journal-testing";
import type { SyntheticLeaseIntelligenceObservation } from "../lease-intelligence";
import type { SyntheticMaterialityObservation } from "../materiality";
import type { SyntheticMissingActivityObservation } from "../missing-activity";
import type { SyntheticPbcRequestObservation } from "../pbc-request";
import type { SyntheticPeriodEndActivityObservation } from "../period-end-activity";
import type { SyntheticPlatformIntegrityObservation } from "../platform-integrity";
import type { SyntheticPrepaidIntelligenceObservation } from "../prepaid-intelligence";
import type { SyntheticReconciliationObservation } from "../reconciliation";
import type { SyntheticRecurringPatternObservation } from "../recurring-patterns";
import type { SyntheticReserveIntelligenceObservation } from "../reserve-intelligence";
import type { SyntheticRevenueIntelligenceObservation } from "../revenue-intelligence";
import type { SyntheticScheduleCompletenessObservation } from "../schedule-completeness";
import type { SyntheticAuditSurface } from "../surfaces";
import type { SyntheticSurfacingObservation } from "../surfacing";
import type { SyntheticTaxIntelligenceObservation } from "../tax-intelligence";
import type { SyntheticTrustVerificationObservation } from "../trust-verification";
import type { SyntheticUnitCostIntelligenceObservation } from "../unit-cost-intelligence";
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
import type { SyntheticAuditWatchlist } from "../watchlists";

export type SyntheticAnomalyIntelligenceCategory =
  | "unusual_activity_candidate"
  | "unusual_pattern_candidate"
  | "unusual_relationship_candidate"
  | "unusual_balance_candidate"
  | "unusual_timing_candidate"
  | "unusual_transaction_candidate"
  | "unusual_period_end_candidate"
  | "unusual_vendor_candidate"
  | "unusual_customer_candidate"
  | "unusual_journal_candidate"
  | "unusual_reconciliation_candidate"
  | "anomaly_intelligence_candidate"
  | "concentration_anomaly_candidate"
  | "reversal_anomaly_candidate"
  | "trend_anomaly_candidate"
  | "expected_activity_anomaly_candidate"
  | "missing_activity_anomaly_candidate"
  | "recurring_pattern_anomaly_candidate"
  | "cutoff_anomaly_candidate"
  | "inventory_anomaly_candidate"
  | "revenue_anomaly_candidate"
  | "reserve_anomaly_candidate"
  | "lease_anomaly_candidate"
  | "tax_anomaly_candidate"
  | "debt_anomaly_candidate"
  | "prepaid_anomaly_candidate"
  | "fixed_asset_anomaly_candidate"
  | "working_capital_anomaly_candidate"
  | "cash_disbursement_anomaly_candidate"
  | "payroll_anomaly_candidate"
  | "headcount_anomaly_candidate"
  | "intercompany_anomaly_candidate"
  | "period_over_period_anomaly_candidate"
  | "multi_domain_anomaly_candidate"
  | "audit_readiness_anomaly_candidate"
  | "cross_domain_anomaly_candidate";

export const SYNTHETIC_ANOMALY_INTELLIGENCE_CATEGORIES: SyntheticAnomalyIntelligenceCategory[] = [
  "unusual_activity_candidate",
  "unusual_pattern_candidate",
  "unusual_relationship_candidate",
  "unusual_balance_candidate",
  "unusual_timing_candidate",
  "unusual_transaction_candidate",
  "unusual_period_end_candidate",
  "unusual_vendor_candidate",
  "unusual_customer_candidate",
  "unusual_journal_candidate",
  "unusual_reconciliation_candidate",
  "anomaly_intelligence_candidate",
  "concentration_anomaly_candidate",
  "reversal_anomaly_candidate",
  "trend_anomaly_candidate",
  "expected_activity_anomaly_candidate",
  "missing_activity_anomaly_candidate",
  "recurring_pattern_anomaly_candidate",
  "cutoff_anomaly_candidate",
  "inventory_anomaly_candidate",
  "revenue_anomaly_candidate",
  "reserve_anomaly_candidate",
  "lease_anomaly_candidate",
  "tax_anomaly_candidate",
  "debt_anomaly_candidate",
  "prepaid_anomaly_candidate",
  "fixed_asset_anomaly_candidate",
  "working_capital_anomaly_candidate",
  "cash_disbursement_anomaly_candidate",
  "payroll_anomaly_candidate",
  "headcount_anomaly_candidate",
  "intercompany_anomaly_candidate",
  "period_over_period_anomaly_candidate",
  "multi_domain_anomaly_candidate",
  "audit_readiness_anomaly_candidate",
  "cross_domain_anomaly_candidate",
];

export interface SyntheticAnomalyIntelligenceIsolationDimension {
  required: boolean;
  referenceIds: string[];
}

export interface SyntheticAnomalyIntelligenceForwardCompatibleObservation {
  payrollObservationId?: string;
  headcountObservationId?: string;
  customerTaxValidationObservationId?: string;
  salesTaxRemittanceObservationId?: string;
  intercompanyObservationId?: string;
  cashDisbursementObservationId?: string;
  cashDisbursementAnomalyObservationId?: string;
  payrollAnomalyObservationId?: string;
  headcountAnomalyObservationId?: string;
  companyId: string;
  evidenceReferenceIds?: string[];
  sourceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  auditContractReferenceIds?: string[];
  auditCandidateIds?: string[];
  auditEvidencePackageIds?: string[];
  auditFindingArtifactIds?: string[];
  auditFindingIds?: string[];
  auditConfidenceIds?: string[];
  auditSurfaceIds?: string[];
  auditWatchlistIds?: string[];
  auditBriefingIds?: string[];
  observationMetadata?: SyntheticAuditObservationMetadata[];
  findingMetadata?: SyntheticAuditFindingMetadata[];
  exceptionMetadata?: SyntheticAuditExceptionMetadata[];
  riskMetadata?: SyntheticAuditRiskMetadata[];
  trustMetadata?: SyntheticAuditTrustMetadata[];
  confidenceMetadata?: SyntheticAuditConfidenceMetadata[];
  governanceMetadata?: SyntheticAuditGovernanceMetadata[];
  materialityCompatibility?: SyntheticAuditMaterialityCompatibility[];
  personaCompatibility?: SyntheticAuditPersonaCompatibility[];
  packageCompatibility?: SyntheticAuditPackageCompatibility[];
  memoryCompatibility?: SyntheticAuditMemoryCompatibility[];
  learningCompatibility?: SyntheticAuditLearningCompatibility[];
  surfaceCompatibility?: SyntheticAuditSurfaceCompatibility[];
}

export interface BuildAnomalyIntelligenceObservationInput {
  auditContract: SyntheticAuditContract | null;
  anomalyIntelligenceObservationKey: string;
  anomalyIntelligenceCategory: SyntheticAnomalyIntelligenceCategory;
  missingActivityObservations?: SyntheticMissingActivityObservation[];
  expectedActivityObservations?: SyntheticExpectedActivityObservation[];
  recurringPatternObservations?: SyntheticRecurringPatternObservation[];
  materialityObservations?: SyntheticMaterialityObservation[];
  surfacingObservations?: SyntheticSurfacingObservation[];
  financialStatementRelationshipObservations?: SyntheticFinancialStatementRelationshipObservation[];
  balanceSheetIntegrityObservations?: SyntheticBalanceSheetIntegrityObservation[];
  continuousAuditObservations?: SyntheticContinuousAuditObservation[];
  continuousControllerObservations?: SyntheticContinuousControllerObservation[];
  periodEndActivityObservations?: SyntheticPeriodEndActivityObservation[];
  cutoffIntelligenceObservations?: SyntheticCutoffIntelligenceObservation[];
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
  debtCovenantObservations?: SyntheticDebtCovenantObservation[];
  prepaidIntelligenceObservations?: SyntheticPrepaidIntelligenceObservation[];
  fixedAssetIntelligenceObservations?: SyntheticFixedAssetIntelligenceObservation[];
  fluxIntelligenceObservations?: SyntheticFluxIntelligenceObservation[];
  auditReadinessObservations?: SyntheticAuditReadinessObservation[];
  trustVerificationObservations?: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations?: SyntheticPlatformIntegrityObservation[];
  auditCoverageObservations?: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations?: SyntheticEvidenceSufficiencyObservation[];
  pbcRequestObservations?: SyntheticPbcRequestObservation[];
  auditScheduleObservations?: SyntheticAuditScheduleObservation[];
  auditTieOutObservations?: SyntheticAuditTieOutObservation[];
  scheduleCompletenessObservations?: SyntheticScheduleCompletenessObservation[];
  payrollObservations?: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  headcountObservations?: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  customerTaxValidationObservations?: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  salesTaxRemittanceObservations?: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  intercompanyObservations?: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  cashDisbursementObservations?: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  cashDisbursementAnomalyObservations?: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  payrollAnomalyObservations?: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  headcountAnomalyObservations?: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticAnomalyIntelligenceObservation {
  anomalyIntelligenceObservationId: string;
  anomalyIntelligenceObservationKey: string;
  anomalyIntelligenceCategory: SyntheticAnomalyIntelligenceCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticAnomalyIntelligenceIsolationDimension;
  firmIsolation: SyntheticAnomalyIntelligenceIsolationDimension;
  clientIsolation: SyntheticAnomalyIntelligenceIsolationDimension;
  missingActivityObservationIds: string[];
  expectedActivityObservationIds: string[];
  recurringPatternObservationIds: string[];
  materialityObservationIds: string[];
  surfacingObservationIds: string[];
  financialStatementRelationshipObservationIds: string[];
  balanceSheetIntegrityObservationIds: string[];
  continuousAuditObservationIds: string[];
  continuousControllerObservationIds: string[];
  periodEndActivityObservationIds: string[];
  cutoffIntelligenceObservationIds: string[];
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
  debtCovenantObservationIds: string[];
  prepaidIntelligenceObservationIds: string[];
  fixedAssetIntelligenceObservationIds: string[];
  fluxIntelligenceObservationIds: string[];
  auditReadinessObservationIds: string[];
  trustVerificationObservationIds: string[];
  platformIntegrityObservationIds: string[];
  auditCoverageObservationIds: string[];
  evidenceSufficiencyObservationIds: string[];
  pbcRequestObservationIds: string[];
  auditScheduleObservationIds: string[];
  auditTieOutObservationIds: string[];
  scheduleCompletenessObservationIds: string[];
  payrollObservationIds: string[];
  headcountObservationIds: string[];
  customerTaxValidationObservationIds: string[];
  salesTaxRemittanceObservationIds: string[];
  intercompanyObservationIds: string[];
  cashDisbursementObservationIds: string[];
  cashDisbursementAnomalyObservationIds: string[];
  payrollAnomalyObservationIds: string[];
  headcountAnomalyObservationIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  anomalyIntelligenceReferenceIds: string[];
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
  missingActivityObservations: SyntheticMissingActivityObservation[];
  expectedActivityObservations: SyntheticExpectedActivityObservation[];
  recurringPatternObservations: SyntheticRecurringPatternObservation[];
  materialityObservations: SyntheticMaterialityObservation[];
  surfacingObservations: SyntheticSurfacingObservation[];
  financialStatementRelationshipObservations: SyntheticFinancialStatementRelationshipObservation[];
  balanceSheetIntegrityObservations: SyntheticBalanceSheetIntegrityObservation[];
  continuousAuditObservations: SyntheticContinuousAuditObservation[];
  continuousControllerObservations: SyntheticContinuousControllerObservation[];
  periodEndActivityObservations: SyntheticPeriodEndActivityObservation[];
  cutoffIntelligenceObservations: SyntheticCutoffIntelligenceObservation[];
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
  debtCovenantObservations: SyntheticDebtCovenantObservation[];
  prepaidIntelligenceObservations: SyntheticPrepaidIntelligenceObservation[];
  fixedAssetIntelligenceObservations: SyntheticFixedAssetIntelligenceObservation[];
  fluxIntelligenceObservations: SyntheticFluxIntelligenceObservation[];
  auditReadinessObservations: SyntheticAuditReadinessObservation[];
  trustVerificationObservations: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations: SyntheticPlatformIntegrityObservation[];
  auditCoverageObservations: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations: SyntheticEvidenceSufficiencyObservation[];
  pbcRequestObservations: SyntheticPbcRequestObservation[];
  auditScheduleObservations: SyntheticAuditScheduleObservation[];
  auditTieOutObservations: SyntheticAuditTieOutObservation[];
  scheduleCompletenessObservations: SyntheticScheduleCompletenessObservation[];
  payrollObservations: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  headcountObservations: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  customerTaxValidationObservations: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  salesTaxRemittanceObservations: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  intercompanyObservations: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  cashDisbursementObservations: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  cashDisbursementAnomalyObservations: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  payrollAnomalyObservations: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  headcountAnomalyObservations: SyntheticAnomalyIntelligenceForwardCompatibleObservation[];
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildAnomalyIntelligenceObservationResult {
  anomalyIntelligenceObservation: SyntheticAnomalyIntelligenceObservation | null;
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

function getObjectArrayProperty<T>(value: object, propertyName: string): T[] {
  const property = (value as Record<string, unknown>)[propertyName];
  return Array.isArray(property) ? (property as T[]) : [];
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function isSupportedAnomalyIntelligenceCategory(category: SyntheticAnomalyIntelligenceCategory): boolean {
  return SYNTHETIC_ANOMALY_INTELLIGENCE_CATEGORIES.includes(category);
}

function buildCustomerIsolation(scope: SyntheticAuditScope): SyntheticAnomalyIntelligenceIsolationDimension {
  return { required: scope.customerIsolationRequired, referenceIds: scope.isolationBoundaryIds };
}

function buildFirmIsolation(scope: SyntheticAuditScope): SyntheticAnomalyIntelligenceIsolationDimension {
  return {
    required: scope.firmIsolationRequired,
    referenceIds: uniqueStable([scope.firmId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function buildClientIsolation(scope: SyntheticAuditScope): SyntheticAnomalyIntelligenceIsolationDimension {
  return {
    required: scope.clientIsolationRequired,
    referenceIds: uniqueStable([scope.clientId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
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

function getDomainObservations(input: BuildAnomalyIntelligenceObservationInput): object[] {
  return [
    ...getInputArray(input.missingActivityObservations),
    ...getInputArray(input.expectedActivityObservations),
    ...getInputArray(input.recurringPatternObservations),
    ...getInputArray(input.materialityObservations),
    ...getInputArray(input.surfacingObservations),
    ...getInputArray(input.financialStatementRelationshipObservations),
    ...getInputArray(input.balanceSheetIntegrityObservations),
    ...getInputArray(input.continuousAuditObservations),
    ...getInputArray(input.continuousControllerObservations),
    ...getInputArray(input.periodEndActivityObservations),
    ...getInputArray(input.cutoffIntelligenceObservations),
    ...getInputArray(input.journalTestingObservations),
    ...getInputArray(input.reconciliationObservations),
    ...getInputArray(input.bankActivityObservations),
    ...getInputArray(input.cashApplicationObservations),
    ...getInputArray(input.taxIntelligenceObservations),
    ...getInputArray(input.reserveIntelligenceObservations),
    ...getInputArray(input.leaseIntelligenceObservations),
    ...getInputArray(input.revenueIntelligenceObservations),
    ...getInputArray(input.inventoryIntelligenceObservations),
    ...getInputArray(input.unitCostIntelligenceObservations),
    ...getInputArray(input.debtCovenantObservations),
    ...getInputArray(input.prepaidIntelligenceObservations),
    ...getInputArray(input.fixedAssetIntelligenceObservations),
    ...getInputArray(input.fluxIntelligenceObservations),
    ...getInputArray(input.auditReadinessObservations),
    ...getInputArray(input.trustVerificationObservations),
    ...getInputArray(input.platformIntegrityObservations),
    ...getInputArray(input.auditCoverageObservations),
    ...getInputArray(input.evidenceSufficiencyObservations),
    ...getInputArray(input.pbcRequestObservations),
    ...getInputArray(input.auditScheduleObservations),
    ...getInputArray(input.auditTieOutObservations),
    ...getInputArray(input.scheduleCompletenessObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.headcountObservations),
    ...getInputArray(input.customerTaxValidationObservations),
    ...getInputArray(input.salesTaxRemittanceObservations),
    ...getInputArray(input.intercompanyObservations),
    ...getInputArray(input.cashDisbursementObservations),
    ...getInputArray(input.cashDisbursementAnomalyObservations),
    ...getInputArray(input.payrollAnomalyObservations),
    ...getInputArray(input.headcountAnomalyObservations),
  ];
}

function getAuditCandidates(input: BuildAnomalyIntelligenceObservationInput): SyntheticAuditCandidate[] {
  return getInputArray(input.auditCandidates);
}

function getAuditEvidencePackages(input: BuildAnomalyIntelligenceObservationInput): SyntheticAuditEvidencePackage[] {
  return getInputArray(input.auditEvidencePackages);
}

function getAuditFindings(input: BuildAnomalyIntelligenceObservationInput): SyntheticAuditFinding[] {
  return getInputArray(input.auditFindings);
}

function getAuditConfidencePackages(input: BuildAnomalyIntelligenceObservationInput): SyntheticAuditConfidence[] {
  return getInputArray(input.auditConfidencePackages);
}

function getAuditSurfaces(input: BuildAnomalyIntelligenceObservationInput): SyntheticAuditSurface[] {
  return getInputArray(input.auditSurfaces);
}

function getAuditWatchlists(input: BuildAnomalyIntelligenceObservationInput): SyntheticAuditWatchlist[] {
  return getInputArray(input.auditWatchlists);
}

function getAuditBriefings(input: BuildAnomalyIntelligenceObservationInput): SyntheticAuditBriefing[] {
  return getInputArray(input.auditBriefings);
}

function getAllAuditArtifacts(input: BuildAnomalyIntelligenceObservationInput): AuditArtifact[] {
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
  input: BuildAnomalyIntelligenceObservationInput,
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

function getEvidenceReferenceIds(input: BuildAnomalyIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "evidenceReferenceIds")),
  ]);
}

function getSourceReferenceIds(input: BuildAnomalyIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "sourceReferenceIds")),
  ]);
}

function getLineageReferenceIds(input: BuildAnomalyIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "lineageReferenceIds")),
  ]);
}

function getAuditContractReferenceIdsFromInput(input: BuildAnomalyIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...getAuditContractReferenceIds(input.auditContract),
    ...getAllAuditArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "auditContractReferenceIds")),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditContractReferenceIds")),
  ]);
}

function getReferenceIds(input: BuildAnomalyIntelligenceObservationInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, singularName),
      ...getStringArrayProperty(artifact, arrayName),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, arrayName)),
  ]);
}

function getAnomalyIntelligenceReferenceIds(input: BuildAnomalyIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.observationMetadata?.sourceArtifactIds ?? []),
    ...(input.auditContract?.observationMetadata?.relatedScheduleIds ?? []),
    ...getAllAuditArtifacts(input).flatMap((artifact) => artifact.observationMetadata?.sourceArtifactIds ?? []),
    ...getAllAuditArtifacts(input).flatMap((artifact) => artifact.observationMetadata?.relatedScheduleIds ?? []),
    ...getDomainObservations(input).flatMap((observation) =>
      getObjectArrayProperty<SyntheticAuditObservationMetadata>(observation, "observationMetadata").flatMap(
        (metadata) => metadata.sourceArtifactIds,
      ),
    ),
    ...getDomainObservations(input).flatMap((observation) =>
      getObjectArrayProperty<SyntheticAuditObservationMetadata>(observation, "observationMetadata").flatMap(
        (metadata) => metadata.relatedScheduleIds,
      ),
    ),
    ...getSourceReferenceIds(input),
  ]);
}

function buildAnomalyIntelligenceObservationId(input: BuildAnomalyIntelligenceObservationInput): string {
  return `synthetic-anomaly-intelligence-observation:${stableSnapshotHash({
    anomalyIntelligenceObservationKey: input.anomalyIntelligenceObservationKey,
    anomalyIntelligenceCategory: input.anomalyIntelligenceCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    customerIsolation: input.auditContract ? buildCustomerIsolation(input.auditContract.scope) : null,
    firmIsolation: input.auditContract ? buildFirmIsolation(input.auditContract.scope) : null,
    clientIsolation: input.auditContract ? buildClientIsolation(input.auditContract.scope) : null,
    missingActivityObservationIds: getObservationIds(getInputArray(input.missingActivityObservations), "missingActivityObservationId"),
    expectedActivityObservationIds: getObservationIds(getInputArray(input.expectedActivityObservations), "expectedActivityObservationId"),
    recurringPatternObservationIds: getObservationIds(getInputArray(input.recurringPatternObservations), "recurringPatternObservationId"),
    materialityObservationIds: getObservationIds(getInputArray(input.materialityObservations), "materialityObservationId"),
    surfacingObservationIds: getObservationIds(getInputArray(input.surfacingObservations), "surfacingObservationId"),
    financialStatementRelationshipObservationIds: getObservationIds(
      getInputArray(input.financialStatementRelationshipObservations),
      "financialStatementRelationshipObservationId",
    ),
    balanceSheetIntegrityObservationIds: getObservationIds(
      getInputArray(input.balanceSheetIntegrityObservations),
      "balanceSheetIntegrityObservationId",
    ),
    continuousAuditObservationIds: getObservationIds(getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"),
    continuousControllerObservationIds: getObservationIds(
      getInputArray(input.continuousControllerObservations),
      "continuousControllerObservationId",
    ),
    periodEndActivityObservationIds: getObservationIds(getInputArray(input.periodEndActivityObservations), "periodEndActivityObservationId"),
    cutoffIntelligenceObservationIds: getObservationIds(getInputArray(input.cutoffIntelligenceObservations), "cutoffIntelligenceObservationId"),
    journalTestingObservationIds: getObservationIds(getInputArray(input.journalTestingObservations), "journalTestingObservationId"),
    reconciliationObservationIds: getObservationIds(getInputArray(input.reconciliationObservations), "reconciliationObservationId"),
    bankActivityObservationIds: getObservationIds(getInputArray(input.bankActivityObservations), "bankActivityObservationId"),
    cashApplicationObservationIds: getObservationIds(getInputArray(input.cashApplicationObservations), "cashApplicationObservationId"),
    taxIntelligenceObservationIds: getObservationIds(getInputArray(input.taxIntelligenceObservations), "taxIntelligenceObservationId"),
    reserveIntelligenceObservationIds: getObservationIds(getInputArray(input.reserveIntelligenceObservations), "reserveIntelligenceObservationId"),
    leaseIntelligenceObservationIds: getObservationIds(getInputArray(input.leaseIntelligenceObservations), "leaseIntelligenceObservationId"),
    revenueIntelligenceObservationIds: getObservationIds(getInputArray(input.revenueIntelligenceObservations), "revenueIntelligenceObservationId"),
    inventoryIntelligenceObservationIds: getObservationIds(
      getInputArray(input.inventoryIntelligenceObservations),
      "inventoryIntelligenceObservationId",
    ),
    unitCostIntelligenceObservationIds: getObservationIds(getInputArray(input.unitCostIntelligenceObservations), "unitCostIntelligenceObservationId"),
    debtCovenantObservationIds: getObservationIds(getInputArray(input.debtCovenantObservations), "debtCovenantObservationId"),
    prepaidIntelligenceObservationIds: getObservationIds(
      getInputArray(input.prepaidIntelligenceObservations),
      "prepaidIntelligenceObservationId",
    ),
    fixedAssetIntelligenceObservationIds: getObservationIds(
      getInputArray(input.fixedAssetIntelligenceObservations),
      "fixedAssetIntelligenceObservationId",
    ),
    fluxIntelligenceObservationIds: getObservationIds(getInputArray(input.fluxIntelligenceObservations), "fluxIntelligenceObservationId"),
    auditReadinessObservationIds: getObservationIds(getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"),
    trustVerificationObservationIds: getObservationIds(getInputArray(input.trustVerificationObservations), "trustVerificationObservationId"),
    platformIntegrityObservationIds: getObservationIds(getInputArray(input.platformIntegrityObservations), "platformIntegrityObservationId"),
    auditCoverageObservationIds: getObservationIds(getInputArray(input.auditCoverageObservations), "auditCoverageObservationId"),
    evidenceSufficiencyObservationIds: getObservationIds(
      getInputArray(input.evidenceSufficiencyObservations),
      "evidenceSufficiencyObservationId",
    ),
    pbcRequestObservationIds: getObservationIds(getInputArray(input.pbcRequestObservations), "pbcRequestObservationId"),
    auditScheduleObservationIds: getObservationIds(getInputArray(input.auditScheduleObservations), "auditScheduleObservationId"),
    auditTieOutObservationIds: getObservationIds(getInputArray(input.auditTieOutObservations), "auditTieOutObservationId"),
    scheduleCompletenessObservationIds: getObservationIds(
      getInputArray(input.scheduleCompletenessObservations),
      "scheduleCompletenessObservationId",
    ),
    payrollObservationIds: getObservationIds(getInputArray(input.payrollObservations), "payrollObservationId"),
    headcountObservationIds: getObservationIds(getInputArray(input.headcountObservations), "headcountObservationId"),
    customerTaxValidationObservationIds: getObservationIds(
      getInputArray(input.customerTaxValidationObservations),
      "customerTaxValidationObservationId",
    ),
    salesTaxRemittanceObservationIds: getObservationIds(
      getInputArray(input.salesTaxRemittanceObservations),
      "salesTaxRemittanceObservationId",
    ),
    intercompanyObservationIds: getObservationIds(getInputArray(input.intercompanyObservations), "intercompanyObservationId"),
    cashDisbursementObservationIds: getObservationIds(getInputArray(input.cashDisbursementObservations), "cashDisbursementObservationId"),
    cashDisbursementAnomalyObservationIds: getObservationIds(
      getInputArray(input.cashDisbursementAnomalyObservations),
      "cashDisbursementAnomalyObservationId",
    ),
    payrollAnomalyObservationIds: getObservationIds(getInputArray(input.payrollAnomalyObservations), "payrollAnomalyObservationId"),
    headcountAnomalyObservationIds: getObservationIds(getInputArray(input.headcountAnomalyObservations), "headcountAnomalyObservationId"),
    auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
    auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
    auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
    auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
    auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
    auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
    auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
    auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
    anomalyIntelligenceReferenceIds: getAnomalyIntelligenceReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
    isolationBoundaryIds: input.auditContract?.scope.isolationBoundaryIds ?? [],
  })}`;
}

function validateAuditArtifacts(input: BuildAnomalyIntelligenceObservationInput, warnings: string[]): void {
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
      const artifactId = getStringProperty(artifact, idField)[0];
      if (!hasValue(artifactId)) warnings.push(`${artifactName}[${index}].${idField} is required.`);
      if (!hasValue(artifact.companyId)) warnings.push(`${artifactName}[${index}].companyId is required.`);
      if (companyId !== undefined && artifact.companyId !== companyId) {
        warnings.push(`${artifactName}[${index}].companyId must align with auditContract.scope.companyId.`);
      }
    });
  }
}

function validateDomainObservationIds(input: BuildAnomalyIntelligenceObservationInput, warnings: string[]): void {
  const companyId = input.auditContract?.scope.companyId;
  for (const [observationName, observations, idField] of [
    ["missingActivityObservations", getInputArray(input.missingActivityObservations), "missingActivityObservationId"],
    ["expectedActivityObservations", getInputArray(input.expectedActivityObservations), "expectedActivityObservationId"],
    ["recurringPatternObservations", getInputArray(input.recurringPatternObservations), "recurringPatternObservationId"],
    ["materialityObservations", getInputArray(input.materialityObservations), "materialityObservationId"],
    ["surfacingObservations", getInputArray(input.surfacingObservations), "surfacingObservationId"],
    [
      "financialStatementRelationshipObservations",
      getInputArray(input.financialStatementRelationshipObservations),
      "financialStatementRelationshipObservationId",
    ],
    ["balanceSheetIntegrityObservations", getInputArray(input.balanceSheetIntegrityObservations), "balanceSheetIntegrityObservationId"],
    ["continuousAuditObservations", getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"],
    ["continuousControllerObservations", getInputArray(input.continuousControllerObservations), "continuousControllerObservationId"],
    ["periodEndActivityObservations", getInputArray(input.periodEndActivityObservations), "periodEndActivityObservationId"],
    ["cutoffIntelligenceObservations", getInputArray(input.cutoffIntelligenceObservations), "cutoffIntelligenceObservationId"],
    ["journalTestingObservations", getInputArray(input.journalTestingObservations), "journalTestingObservationId"],
    ["reconciliationObservations", getInputArray(input.reconciliationObservations), "reconciliationObservationId"],
    ["bankActivityObservations", getInputArray(input.bankActivityObservations), "bankActivityObservationId"],
    ["cashApplicationObservations", getInputArray(input.cashApplicationObservations), "cashApplicationObservationId"],
    ["taxIntelligenceObservations", getInputArray(input.taxIntelligenceObservations), "taxIntelligenceObservationId"],
    ["reserveIntelligenceObservations", getInputArray(input.reserveIntelligenceObservations), "reserveIntelligenceObservationId"],
    ["leaseIntelligenceObservations", getInputArray(input.leaseIntelligenceObservations), "leaseIntelligenceObservationId"],
    ["revenueIntelligenceObservations", getInputArray(input.revenueIntelligenceObservations), "revenueIntelligenceObservationId"],
    ["inventoryIntelligenceObservations", getInputArray(input.inventoryIntelligenceObservations), "inventoryIntelligenceObservationId"],
    ["unitCostIntelligenceObservations", getInputArray(input.unitCostIntelligenceObservations), "unitCostIntelligenceObservationId"],
    ["debtCovenantObservations", getInputArray(input.debtCovenantObservations), "debtCovenantObservationId"],
    ["prepaidIntelligenceObservations", getInputArray(input.prepaidIntelligenceObservations), "prepaidIntelligenceObservationId"],
    [
      "fixedAssetIntelligenceObservations",
      getInputArray(input.fixedAssetIntelligenceObservations),
      "fixedAssetIntelligenceObservationId",
    ],
    ["fluxIntelligenceObservations", getInputArray(input.fluxIntelligenceObservations), "fluxIntelligenceObservationId"],
    ["auditReadinessObservations", getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"],
    ["trustVerificationObservations", getInputArray(input.trustVerificationObservations), "trustVerificationObservationId"],
    ["platformIntegrityObservations", getInputArray(input.platformIntegrityObservations), "platformIntegrityObservationId"],
    ["auditCoverageObservations", getInputArray(input.auditCoverageObservations), "auditCoverageObservationId"],
    ["evidenceSufficiencyObservations", getInputArray(input.evidenceSufficiencyObservations), "evidenceSufficiencyObservationId"],
    ["pbcRequestObservations", getInputArray(input.pbcRequestObservations), "pbcRequestObservationId"],
    ["auditScheduleObservations", getInputArray(input.auditScheduleObservations), "auditScheduleObservationId"],
    ["auditTieOutObservations", getInputArray(input.auditTieOutObservations), "auditTieOutObservationId"],
    ["scheduleCompletenessObservations", getInputArray(input.scheduleCompletenessObservations), "scheduleCompletenessObservationId"],
    ["payrollObservations", getInputArray(input.payrollObservations), "payrollObservationId"],
    ["headcountObservations", getInputArray(input.headcountObservations), "headcountObservationId"],
    ["customerTaxValidationObservations", getInputArray(input.customerTaxValidationObservations), "customerTaxValidationObservationId"],
    ["salesTaxRemittanceObservations", getInputArray(input.salesTaxRemittanceObservations), "salesTaxRemittanceObservationId"],
    ["intercompanyObservations", getInputArray(input.intercompanyObservations), "intercompanyObservationId"],
    ["cashDisbursementObservations", getInputArray(input.cashDisbursementObservations), "cashDisbursementObservationId"],
    [
      "cashDisbursementAnomalyObservations",
      getInputArray(input.cashDisbursementAnomalyObservations),
      "cashDisbursementAnomalyObservationId",
    ],
    ["payrollAnomalyObservations", getInputArray(input.payrollAnomalyObservations), "payrollAnomalyObservationId"],
    ["headcountAnomalyObservations", getInputArray(input.headcountAnomalyObservations), "headcountAnomalyObservationId"],
  ] as const) {
    observations.forEach((observation, index) => {
      const observationId = getStringProperty(observation, idField)[0];
      if (!hasValue(observationId)) warnings.push(`${observationName}[${index}].${idField} is required.`);
      const observationCompanyId = getStringProperty(observation, "companyId")[0];
      if (!hasValue(observationCompanyId)) warnings.push(`${observationName}[${index}].companyId is required.`);
      if (companyId !== undefined && observationCompanyId !== companyId) {
        warnings.push(`${observationName}[${index}].companyId must align with auditContract.scope.companyId.`);
      }
    });
  }
}

function getForwardCompatibilityWarnings(input: BuildAnomalyIntelligenceObservationInput): string[] {
  return [
    ...(getInputArray(input.payrollObservations).length > 0 || getInputArray(input.payrollAnomalyObservations).length > 0
      ? ["payroll intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.headcountObservations).length > 0 || getInputArray(input.headcountAnomalyObservations).length > 0
      ? ["headcount intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.customerTaxValidationObservations).length > 0
      ? ["customer tax validation intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.salesTaxRemittanceObservations).length > 0
      ? ["sales tax remittance intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.intercompanyObservations).length > 0
      ? ["intercompany intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.cashDisbursementObservations).length > 0 ||
    getInputArray(input.cashDisbursementAnomalyObservations).length > 0
      ? ["cash disbursement intelligence is a forward-compatible Phase 34 module."]
      : []),
  ];
}

function validateInput(input: BuildAnomalyIntelligenceObservationInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (!hasValue(input.anomalyIntelligenceObservationKey)) warnings.push("anomalyIntelligenceObservationKey is required.");
  if (!hasValue(input.anomalyIntelligenceCategory)) warnings.push("anomalyIntelligenceCategory is required.");
  if (!isSupportedAnomalyIntelligenceCategory(input.anomalyIntelligenceCategory)) {
    warnings.push("anomalyIntelligenceCategory must be a supported anomaly intelligence category.");
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

export function buildAnomalyIntelligenceObservation(
  input: BuildAnomalyIntelligenceObservationInput,
): BuildAnomalyIntelligenceObservationResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      anomalyIntelligenceObservation: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const allArtifacts = getAllAuditArtifacts(input);
  const domainObservations = getDomainObservations(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    anomalyIntelligenceObservation: {
      anomalyIntelligenceObservationId: buildAnomalyIntelligenceObservationId(input),
      anomalyIntelligenceObservationKey: input.anomalyIntelligenceObservationKey,
      anomalyIntelligenceCategory: input.anomalyIntelligenceCategory,
      companyId: auditContract.scope.companyId,
      auditCategory: getAuditCategory(auditContract),
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      missingActivityObservationIds: getObservationIds(getInputArray(input.missingActivityObservations), "missingActivityObservationId"),
      expectedActivityObservationIds: getObservationIds(getInputArray(input.expectedActivityObservations), "expectedActivityObservationId"),
      recurringPatternObservationIds: getObservationIds(getInputArray(input.recurringPatternObservations), "recurringPatternObservationId"),
      materialityObservationIds: getObservationIds(getInputArray(input.materialityObservations), "materialityObservationId"),
      surfacingObservationIds: getObservationIds(getInputArray(input.surfacingObservations), "surfacingObservationId"),
      financialStatementRelationshipObservationIds: getObservationIds(
        getInputArray(input.financialStatementRelationshipObservations),
        "financialStatementRelationshipObservationId",
      ),
      balanceSheetIntegrityObservationIds: getObservationIds(
        getInputArray(input.balanceSheetIntegrityObservations),
        "balanceSheetIntegrityObservationId",
      ),
      continuousAuditObservationIds: getObservationIds(getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"),
      continuousControllerObservationIds: getObservationIds(
        getInputArray(input.continuousControllerObservations),
        "continuousControllerObservationId",
      ),
      periodEndActivityObservationIds: getObservationIds(getInputArray(input.periodEndActivityObservations), "periodEndActivityObservationId"),
      cutoffIntelligenceObservationIds: getObservationIds(getInputArray(input.cutoffIntelligenceObservations), "cutoffIntelligenceObservationId"),
      journalTestingObservationIds: getObservationIds(getInputArray(input.journalTestingObservations), "journalTestingObservationId"),
      reconciliationObservationIds: getObservationIds(getInputArray(input.reconciliationObservations), "reconciliationObservationId"),
      bankActivityObservationIds: getObservationIds(getInputArray(input.bankActivityObservations), "bankActivityObservationId"),
      cashApplicationObservationIds: getObservationIds(getInputArray(input.cashApplicationObservations), "cashApplicationObservationId"),
      taxIntelligenceObservationIds: getObservationIds(getInputArray(input.taxIntelligenceObservations), "taxIntelligenceObservationId"),
      reserveIntelligenceObservationIds: getObservationIds(getInputArray(input.reserveIntelligenceObservations), "reserveIntelligenceObservationId"),
      leaseIntelligenceObservationIds: getObservationIds(getInputArray(input.leaseIntelligenceObservations), "leaseIntelligenceObservationId"),
      revenueIntelligenceObservationIds: getObservationIds(getInputArray(input.revenueIntelligenceObservations), "revenueIntelligenceObservationId"),
      inventoryIntelligenceObservationIds: getObservationIds(
        getInputArray(input.inventoryIntelligenceObservations),
        "inventoryIntelligenceObservationId",
      ),
      unitCostIntelligenceObservationIds: getObservationIds(
        getInputArray(input.unitCostIntelligenceObservations),
        "unitCostIntelligenceObservationId",
      ),
      debtCovenantObservationIds: getObservationIds(getInputArray(input.debtCovenantObservations), "debtCovenantObservationId"),
      prepaidIntelligenceObservationIds: getObservationIds(
        getInputArray(input.prepaidIntelligenceObservations),
        "prepaidIntelligenceObservationId",
      ),
      fixedAssetIntelligenceObservationIds: getObservationIds(
        getInputArray(input.fixedAssetIntelligenceObservations),
        "fixedAssetIntelligenceObservationId",
      ),
      fluxIntelligenceObservationIds: getObservationIds(getInputArray(input.fluxIntelligenceObservations), "fluxIntelligenceObservationId"),
      auditReadinessObservationIds: getObservationIds(getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"),
      trustVerificationObservationIds: getObservationIds(getInputArray(input.trustVerificationObservations), "trustVerificationObservationId"),
      platformIntegrityObservationIds: getObservationIds(getInputArray(input.platformIntegrityObservations), "platformIntegrityObservationId"),
      auditCoverageObservationIds: getObservationIds(getInputArray(input.auditCoverageObservations), "auditCoverageObservationId"),
      evidenceSufficiencyObservationIds: getObservationIds(
        getInputArray(input.evidenceSufficiencyObservations),
        "evidenceSufficiencyObservationId",
      ),
      pbcRequestObservationIds: getObservationIds(getInputArray(input.pbcRequestObservations), "pbcRequestObservationId"),
      auditScheduleObservationIds: getObservationIds(getInputArray(input.auditScheduleObservations), "auditScheduleObservationId"),
      auditTieOutObservationIds: getObservationIds(getInputArray(input.auditTieOutObservations), "auditTieOutObservationId"),
      scheduleCompletenessObservationIds: getObservationIds(
        getInputArray(input.scheduleCompletenessObservations),
        "scheduleCompletenessObservationId",
      ),
      payrollObservationIds: getObservationIds(getInputArray(input.payrollObservations), "payrollObservationId"),
      headcountObservationIds: getObservationIds(getInputArray(input.headcountObservations), "headcountObservationId"),
      customerTaxValidationObservationIds: getObservationIds(
        getInputArray(input.customerTaxValidationObservations),
        "customerTaxValidationObservationId",
      ),
      salesTaxRemittanceObservationIds: getObservationIds(
        getInputArray(input.salesTaxRemittanceObservations),
        "salesTaxRemittanceObservationId",
      ),
      intercompanyObservationIds: getObservationIds(getInputArray(input.intercompanyObservations), "intercompanyObservationId"),
      cashDisbursementObservationIds: getObservationIds(getInputArray(input.cashDisbursementObservations), "cashDisbursementObservationId"),
      cashDisbursementAnomalyObservationIds: getObservationIds(
        getInputArray(input.cashDisbursementAnomalyObservations),
        "cashDisbursementAnomalyObservationId",
      ),
      payrollAnomalyObservationIds: getObservationIds(getInputArray(input.payrollAnomalyObservations), "payrollAnomalyObservationId"),
      headcountAnomalyObservationIds: getObservationIds(getInputArray(input.headcountAnomalyObservations), "headcountAnomalyObservationId"),
      auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
      auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
      auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
      auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
      auditFindingIds: getReferenceIds(input, "auditFindingId", "auditFindingIds"),
      auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
      auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
      auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
      auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
      anomalyIntelligenceReferenceIds: getAnomalyIntelligenceReferenceIds(input),
      evidence: auditContract.evidence,
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      sourceReferenceIds: getSourceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      observationMetadata: compactDefined([
        auditContract.observationMetadata,
        ...allArtifacts.map((artifact) => artifact.observationMetadata),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditObservationMetadata>(observation, "observationMetadata"),
        ),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...allArtifacts.map((artifact) => artifact.findingMetadata),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditFindingMetadata>(observation, "findingMetadata"),
        ),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...allArtifacts.map((artifact) => artifact.exceptionMetadata),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditExceptionMetadata>(observation, "exceptionMetadata"),
        ),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...allArtifacts.map((artifact) => artifact.riskMetadata),
        ...domainObservations.flatMap((observation) => getObjectArrayProperty<SyntheticAuditRiskMetadata>(observation, "riskMetadata")),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...allArtifacts.map((artifact) => artifact.trustMetadata),
        ...domainObservations.flatMap((observation) => getObjectArrayProperty<SyntheticAuditTrustMetadata>(observation, "trustMetadata")),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...allArtifacts.map((artifact) => artifact.confidenceMetadata),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(observation, "confidenceMetadata"),
        ),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...allArtifacts.map((artifact) => artifact.governanceMetadata),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(observation, "governanceMetadata"),
        ),
      ]),
      materialityCompatibility: compactDefined([
        auditContract.materialityCompatibility,
        ...allArtifacts.map((artifact) => artifact.materialityCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(observation, "materialityCompatibility"),
        ),
      ]),
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...allArtifacts.map((artifact) => artifact.personaCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(observation, "personaCompatibility"),
        ),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...allArtifacts.map((artifact) => artifact.packageCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(observation, "packageCompatibility"),
        ),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...allArtifacts.map((artifact) => artifact.memoryCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(observation, "memoryCompatibility"),
        ),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...allArtifacts.map((artifact) => artifact.learningCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(observation, "learningCompatibility"),
        ),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...allArtifacts.map((artifact) => artifact.surfaceCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(observation, "surfaceCompatibility"),
        ),
      ]),
      auditContract,
      missingActivityObservations: getInputArray(input.missingActivityObservations),
      expectedActivityObservations: getInputArray(input.expectedActivityObservations),
      recurringPatternObservations: getInputArray(input.recurringPatternObservations),
      materialityObservations: getInputArray(input.materialityObservations),
      surfacingObservations: getInputArray(input.surfacingObservations),
      financialStatementRelationshipObservations: getInputArray(input.financialStatementRelationshipObservations),
      balanceSheetIntegrityObservations: getInputArray(input.balanceSheetIntegrityObservations),
      continuousAuditObservations: getInputArray(input.continuousAuditObservations),
      continuousControllerObservations: getInputArray(input.continuousControllerObservations),
      periodEndActivityObservations: getInputArray(input.periodEndActivityObservations),
      cutoffIntelligenceObservations: getInputArray(input.cutoffIntelligenceObservations),
      journalTestingObservations: getInputArray(input.journalTestingObservations),
      reconciliationObservations: getInputArray(input.reconciliationObservations),
      bankActivityObservations: getInputArray(input.bankActivityObservations),
      cashApplicationObservations: getInputArray(input.cashApplicationObservations),
      taxIntelligenceObservations: getInputArray(input.taxIntelligenceObservations),
      reserveIntelligenceObservations: getInputArray(input.reserveIntelligenceObservations),
      leaseIntelligenceObservations: getInputArray(input.leaseIntelligenceObservations),
      revenueIntelligenceObservations: getInputArray(input.revenueIntelligenceObservations),
      inventoryIntelligenceObservations: getInputArray(input.inventoryIntelligenceObservations),
      unitCostIntelligenceObservations: getInputArray(input.unitCostIntelligenceObservations),
      debtCovenantObservations: getInputArray(input.debtCovenantObservations),
      prepaidIntelligenceObservations: getInputArray(input.prepaidIntelligenceObservations),
      fixedAssetIntelligenceObservations: getInputArray(input.fixedAssetIntelligenceObservations),
      fluxIntelligenceObservations: getInputArray(input.fluxIntelligenceObservations),
      auditReadinessObservations: getInputArray(input.auditReadinessObservations),
      trustVerificationObservations: getInputArray(input.trustVerificationObservations),
      platformIntegrityObservations: getInputArray(input.platformIntegrityObservations),
      auditCoverageObservations: getInputArray(input.auditCoverageObservations),
      evidenceSufficiencyObservations: getInputArray(input.evidenceSufficiencyObservations),
      pbcRequestObservations: getInputArray(input.pbcRequestObservations),
      auditScheduleObservations: getInputArray(input.auditScheduleObservations),
      auditTieOutObservations: getInputArray(input.auditTieOutObservations),
      scheduleCompletenessObservations: getInputArray(input.scheduleCompletenessObservations),
      payrollObservations: getInputArray(input.payrollObservations),
      headcountObservations: getInputArray(input.headcountObservations),
      customerTaxValidationObservations: getInputArray(input.customerTaxValidationObservations),
      salesTaxRemittanceObservations: getInputArray(input.salesTaxRemittanceObservations),
      intercompanyObservations: getInputArray(input.intercompanyObservations),
      cashDisbursementObservations: getInputArray(input.cashDisbursementObservations),
      cashDisbursementAnomalyObservations: getInputArray(input.cashDisbursementAnomalyObservations),
      payrollAnomalyObservations: getInputArray(input.payrollAnomalyObservations),
      headcountAnomalyObservations: getInputArray(input.headcountAnomalyObservations),
      auditCandidates: getAuditCandidates(input),
      auditEvidencePackages: getAuditEvidencePackages(input),
      auditFindings: getAuditFindings(input),
      auditConfidencePackages: getAuditConfidencePackages(input),
      auditSurfaces: getAuditSurfaces(input),
      auditWatchlists: getAuditWatchlists(input),
      auditBriefings: getAuditBriefings(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
