import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticAnomalyIntelligenceObservation } from "../anomaly-intelligence";
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
import type { SyntheticCustomerTaxValidationObservation } from "../customer-tax-validation";
import type { SyntheticCutoffIntelligenceObservation } from "../cutoff-intelligence";
import type { SyntheticDebtCovenantObservation } from "../debt-covenants";
import type { SyntheticAuditEvidencePackage } from "../evidence";
import type { SyntheticEvidenceSufficiencyObservation } from "../evidence-sufficiency";
import type { SyntheticExpectedActivityObservation } from "../expected-activity";
import type { SyntheticFinancialStatementRelationshipObservation } from "../financial-statement-relationships";
import type { SyntheticFixedAssetIntelligenceObservation } from "../fixed-asset-intelligence";
import type { SyntheticFluxIntelligenceObservation } from "../flux-intelligence";
import type { SyntheticAuditFinding } from "../findings";
import type { SyntheticJournalTestingObservation } from "../journal-testing";
import type { SyntheticMissingActivityObservation } from "../missing-activity";
import type { SyntheticPbcRequestObservation } from "../pbc-request";
import type { SyntheticPeriodEndActivityObservation } from "../period-end-activity";
import type { SyntheticPlatformIntegrityObservation } from "../platform-integrity";
import type { SyntheticPrepaidIntelligenceObservation } from "../prepaid-intelligence";
import type { SyntheticReconciliationObservation } from "../reconciliation";
import type { SyntheticRecurringPatternObservation } from "../recurring-patterns";
import type { SyntheticReserveIntelligenceObservation } from "../reserve-intelligence";
import type { SyntheticSalesTaxRemittanceObservation } from "../sales-tax-remittance";
import type { SyntheticScheduleCompletenessObservation } from "../schedule-completeness";
import type { SyntheticAuditSurface } from "../surfaces";
import type { SyntheticTaxIntelligenceObservation } from "../tax-intelligence";
import type { SyntheticTaxToInvoiceObservation } from "../tax-to-invoice";
import type { SyntheticTrustVerificationObservation } from "../trust-verification";
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

export type SyntheticCashDisbursementCategory =
  | "cash_disbursement_candidate"
  | "vendor_payment_candidate"
  | "payment_timing_candidate"
  | "payment_relationship_candidate"
  | "payment_documentation_candidate"
  | "payment_support_candidate"
  | "payment_period_candidate"
  | "payment_cutoff_candidate"
  | "payment_reconciliation_candidate"
  | "cash_disbursement_intelligence_candidate"
  | "vendor_relationship_candidate"
  | "recurring_payment_candidate"
  | "unusual_payment_candidate"
  | "payment_frequency_candidate"
  | "payment_pattern_candidate"
  | "payment_timing_change_candidate"
  | "payment_concentration_candidate"
  | "payment_reversal_candidate"
  | "payment_jurisdiction_candidate"
  | "payment_method_candidate"
  | "payment_readiness_candidate"
  | "new_payee_candidate"
  | "dormant_payee_candidate"
  | "payment_accrual_candidate"
  | "payment_missing_candidate"
  | "payment_multi_method_candidate"
  | "payment_invoice_relationship_candidate";

export const SYNTHETIC_CASH_DISBURSEMENT_CATEGORIES: SyntheticCashDisbursementCategory[] = [
  "cash_disbursement_candidate",
  "vendor_payment_candidate",
  "payment_timing_candidate",
  "payment_relationship_candidate",
  "payment_documentation_candidate",
  "payment_support_candidate",
  "payment_period_candidate",
  "payment_cutoff_candidate",
  "payment_reconciliation_candidate",
  "cash_disbursement_intelligence_candidate",
  "vendor_relationship_candidate",
  "recurring_payment_candidate",
  "unusual_payment_candidate",
  "payment_frequency_candidate",
  "payment_pattern_candidate",
  "payment_timing_change_candidate",
  "payment_concentration_candidate",
  "payment_reversal_candidate",
  "payment_jurisdiction_candidate",
  "payment_method_candidate",
  "payment_readiness_candidate",
  "new_payee_candidate",
  "dormant_payee_candidate",
  "payment_accrual_candidate",
  "payment_missing_candidate",
  "payment_multi_method_candidate",
  "payment_invoice_relationship_candidate",
];

export interface SyntheticCashDisbursementIsolationDimension {
  required: boolean;
  referenceIds: string[];
}

export interface SyntheticCashDisbursementForwardCompatibleObservation {
  paymentMatchingObservationId?: string;
  cashReceiptMatchingObservationId?: string;
  vendorMasterObservationId?: string;
  approvalObservationId?: string;
  methodologyObservationId?: string;
  newPayeeObservationId?: string;
  dormantPayeeObservationId?: string;
  paymentAccrualObservationId?: string;
  paymentMissingObservationId?: string;
  unrecordedLiabilityObservationId?: string;
  payrollObservationId?: string;
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

export interface BuildCashDisbursementObservationInput {
  auditContract: SyntheticAuditContract | null;
  cashDisbursementObservationKey: string;
  cashDisbursementCategory: SyntheticCashDisbursementCategory;
  bankActivityObservations?: SyntheticBankActivityObservation[];
  cashApplicationObservations?: SyntheticCashApplicationObservation[];
  reconciliationObservations?: SyntheticReconciliationObservation[];
  journalTestingObservations?: SyntheticJournalTestingObservation[];
  anomalyIntelligenceObservations?: SyntheticAnomalyIntelligenceObservation[];
  fluxIntelligenceObservations?: SyntheticFluxIntelligenceObservation[];
  cutoffIntelligenceObservations?: SyntheticCutoffIntelligenceObservation[];
  periodEndActivityObservations?: SyntheticPeriodEndActivityObservation[];
  debtCovenantObservations?: SyntheticDebtCovenantObservation[];
  prepaidIntelligenceObservations?: SyntheticPrepaidIntelligenceObservation[];
  fixedAssetIntelligenceObservations?: SyntheticFixedAssetIntelligenceObservation[];
  salesTaxRemittanceObservations?: SyntheticSalesTaxRemittanceObservation[];
  taxToInvoiceObservations?: SyntheticTaxToInvoiceObservation[];
  financialStatementRelationshipObservations?: SyntheticFinancialStatementRelationshipObservation[];
  balanceSheetIntegrityObservations?: SyntheticBalanceSheetIntegrityObservation[];
  continuousAuditObservations?: SyntheticContinuousAuditObservation[];
  continuousControllerObservations?: SyntheticContinuousControllerObservation[];
  taxIntelligenceObservations?: SyntheticTaxIntelligenceObservation[];
  customerTaxValidationObservations?: SyntheticCustomerTaxValidationObservation[];
  reserveIntelligenceObservations?: SyntheticReserveIntelligenceObservation[];
  auditReadinessObservations?: SyntheticAuditReadinessObservation[];
  trustVerificationObservations?: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations?: SyntheticPlatformIntegrityObservation[];
  auditCoverageObservations?: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations?: SyntheticEvidenceSufficiencyObservation[];
  pbcRequestObservations?: SyntheticPbcRequestObservation[];
  auditScheduleObservations?: SyntheticAuditScheduleObservation[];
  auditTieOutObservations?: SyntheticAuditTieOutObservation[];
  scheduleCompletenessObservations?: SyntheticScheduleCompletenessObservation[];
  missingActivityObservations?: SyntheticMissingActivityObservation[];
  expectedActivityObservations?: SyntheticExpectedActivityObservation[];
  recurringPatternObservations?: SyntheticRecurringPatternObservation[];
  paymentMatchingObservations?: SyntheticCashDisbursementForwardCompatibleObservation[];
  cashReceiptMatchingObservations?: SyntheticCashDisbursementForwardCompatibleObservation[];
  vendorMasterObservations?: SyntheticCashDisbursementForwardCompatibleObservation[];
  approvalObservations?: SyntheticCashDisbursementForwardCompatibleObservation[];
  methodologyObservations?: SyntheticCashDisbursementForwardCompatibleObservation[];
  newPayeeObservations?: SyntheticCashDisbursementForwardCompatibleObservation[];
  dormantPayeeObservations?: SyntheticCashDisbursementForwardCompatibleObservation[];
  paymentAccrualObservations?: SyntheticCashDisbursementForwardCompatibleObservation[];
  paymentMissingObservations?: SyntheticCashDisbursementForwardCompatibleObservation[];
  unrecordedLiabilityObservations?: SyntheticCashDisbursementForwardCompatibleObservation[];
  payrollObservations?: SyntheticCashDisbursementForwardCompatibleObservation[];
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticCashDisbursementObservation {
  cashDisbursementObservationId: string;
  cashDisbursementObservationKey: string;
  cashDisbursementCategory: SyntheticCashDisbursementCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticCashDisbursementIsolationDimension;
  firmIsolation: SyntheticCashDisbursementIsolationDimension;
  clientIsolation: SyntheticCashDisbursementIsolationDimension;
  bankActivityObservationIds: string[];
  cashApplicationObservationIds: string[];
  reconciliationObservationIds: string[];
  journalTestingObservationIds: string[];
  anomalyIntelligenceObservationIds: string[];
  fluxIntelligenceObservationIds: string[];
  cutoffIntelligenceObservationIds: string[];
  periodEndActivityObservationIds: string[];
  debtCovenantObservationIds: string[];
  prepaidIntelligenceObservationIds: string[];
  fixedAssetIntelligenceObservationIds: string[];
  salesTaxRemittanceObservationIds: string[];
  taxToInvoiceObservationIds: string[];
  financialStatementRelationshipObservationIds: string[];
  balanceSheetIntegrityObservationIds: string[];
  continuousAuditObservationIds: string[];
  continuousControllerObservationIds: string[];
  taxIntelligenceObservationIds: string[];
  customerTaxValidationObservationIds: string[];
  reserveIntelligenceObservationIds: string[];
  auditReadinessObservationIds: string[];
  trustVerificationObservationIds: string[];
  platformIntegrityObservationIds: string[];
  auditCoverageObservationIds: string[];
  evidenceSufficiencyObservationIds: string[];
  pbcRequestObservationIds: string[];
  auditScheduleObservationIds: string[];
  auditTieOutObservationIds: string[];
  scheduleCompletenessObservationIds: string[];
  missingActivityObservationIds: string[];
  expectedActivityObservationIds: string[];
  recurringPatternObservationIds: string[];
  paymentMatchingObservationIds: string[];
  cashReceiptMatchingObservationIds: string[];
  vendorMasterObservationIds: string[];
  approvalObservationIds: string[];
  methodologyObservationIds: string[];
  newPayeeObservationIds: string[];
  dormantPayeeObservationIds: string[];
  paymentAccrualObservationIds: string[];
  paymentMissingObservationIds: string[];
  unrecordedLiabilityObservationIds: string[];
  payrollObservationIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  cashDisbursementReferenceIds: string[];
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
  bankActivityObservations: SyntheticBankActivityObservation[];
  cashApplicationObservations: SyntheticCashApplicationObservation[];
  reconciliationObservations: SyntheticReconciliationObservation[];
  journalTestingObservations: SyntheticJournalTestingObservation[];
  anomalyIntelligenceObservations: SyntheticAnomalyIntelligenceObservation[];
  fluxIntelligenceObservations: SyntheticFluxIntelligenceObservation[];
  cutoffIntelligenceObservations: SyntheticCutoffIntelligenceObservation[];
  periodEndActivityObservations: SyntheticPeriodEndActivityObservation[];
  debtCovenantObservations: SyntheticDebtCovenantObservation[];
  prepaidIntelligenceObservations: SyntheticPrepaidIntelligenceObservation[];
  fixedAssetIntelligenceObservations: SyntheticFixedAssetIntelligenceObservation[];
  salesTaxRemittanceObservations: SyntheticSalesTaxRemittanceObservation[];
  taxToInvoiceObservations: SyntheticTaxToInvoiceObservation[];
  financialStatementRelationshipObservations: SyntheticFinancialStatementRelationshipObservation[];
  balanceSheetIntegrityObservations: SyntheticBalanceSheetIntegrityObservation[];
  continuousAuditObservations: SyntheticContinuousAuditObservation[];
  continuousControllerObservations: SyntheticContinuousControllerObservation[];
  taxIntelligenceObservations: SyntheticTaxIntelligenceObservation[];
  customerTaxValidationObservations: SyntheticCustomerTaxValidationObservation[];
  reserveIntelligenceObservations: SyntheticReserveIntelligenceObservation[];
  auditReadinessObservations: SyntheticAuditReadinessObservation[];
  trustVerificationObservations: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations: SyntheticPlatformIntegrityObservation[];
  auditCoverageObservations: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations: SyntheticEvidenceSufficiencyObservation[];
  pbcRequestObservations: SyntheticPbcRequestObservation[];
  auditScheduleObservations: SyntheticAuditScheduleObservation[];
  auditTieOutObservations: SyntheticAuditTieOutObservation[];
  scheduleCompletenessObservations: SyntheticScheduleCompletenessObservation[];
  missingActivityObservations: SyntheticMissingActivityObservation[];
  expectedActivityObservations: SyntheticExpectedActivityObservation[];
  recurringPatternObservations: SyntheticRecurringPatternObservation[];
  paymentMatchingObservations: SyntheticCashDisbursementForwardCompatibleObservation[];
  cashReceiptMatchingObservations: SyntheticCashDisbursementForwardCompatibleObservation[];
  vendorMasterObservations: SyntheticCashDisbursementForwardCompatibleObservation[];
  approvalObservations: SyntheticCashDisbursementForwardCompatibleObservation[];
  methodologyObservations: SyntheticCashDisbursementForwardCompatibleObservation[];
  newPayeeObservations: SyntheticCashDisbursementForwardCompatibleObservation[];
  dormantPayeeObservations: SyntheticCashDisbursementForwardCompatibleObservation[];
  paymentAccrualObservations: SyntheticCashDisbursementForwardCompatibleObservation[];
  paymentMissingObservations: SyntheticCashDisbursementForwardCompatibleObservation[];
  unrecordedLiabilityObservations: SyntheticCashDisbursementForwardCompatibleObservation[];
  payrollObservations: SyntheticCashDisbursementForwardCompatibleObservation[];
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildCashDisbursementObservationResult {
  cashDisbursementObservation: SyntheticCashDisbursementObservation | null;
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

function isSupportedCashDisbursementCategory(category: SyntheticCashDisbursementCategory): boolean {
  return SYNTHETIC_CASH_DISBURSEMENT_CATEGORIES.includes(category);
}

function buildCustomerIsolation(scope: SyntheticAuditScope): SyntheticCashDisbursementIsolationDimension {
  return { required: scope.customerIsolationRequired, referenceIds: scope.isolationBoundaryIds };
}

function buildFirmIsolation(scope: SyntheticAuditScope): SyntheticCashDisbursementIsolationDimension {
  return {
    required: scope.firmIsolationRequired,
    referenceIds: uniqueStable([scope.firmId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function buildClientIsolation(scope: SyntheticAuditScope): SyntheticCashDisbursementIsolationDimension {
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

function getDomainObservations(input: BuildCashDisbursementObservationInput): object[] {
  return [
    ...getInputArray(input.bankActivityObservations),
    ...getInputArray(input.cashApplicationObservations),
    ...getInputArray(input.reconciliationObservations),
    ...getInputArray(input.journalTestingObservations),
    ...getInputArray(input.anomalyIntelligenceObservations),
    ...getInputArray(input.fluxIntelligenceObservations),
    ...getInputArray(input.cutoffIntelligenceObservations),
    ...getInputArray(input.periodEndActivityObservations),
    ...getInputArray(input.debtCovenantObservations),
    ...getInputArray(input.prepaidIntelligenceObservations),
    ...getInputArray(input.fixedAssetIntelligenceObservations),
    ...getInputArray(input.salesTaxRemittanceObservations),
    ...getInputArray(input.taxToInvoiceObservations),
    ...getInputArray(input.financialStatementRelationshipObservations),
    ...getInputArray(input.balanceSheetIntegrityObservations),
    ...getInputArray(input.continuousAuditObservations),
    ...getInputArray(input.continuousControllerObservations),
    ...getInputArray(input.taxIntelligenceObservations),
    ...getInputArray(input.customerTaxValidationObservations),
    ...getInputArray(input.reserveIntelligenceObservations),
    ...getInputArray(input.auditReadinessObservations),
    ...getInputArray(input.trustVerificationObservations),
    ...getInputArray(input.platformIntegrityObservations),
    ...getInputArray(input.auditCoverageObservations),
    ...getInputArray(input.evidenceSufficiencyObservations),
    ...getInputArray(input.pbcRequestObservations),
    ...getInputArray(input.auditScheduleObservations),
    ...getInputArray(input.auditTieOutObservations),
    ...getInputArray(input.scheduleCompletenessObservations),
    ...getInputArray(input.missingActivityObservations),
    ...getInputArray(input.expectedActivityObservations),
    ...getInputArray(input.recurringPatternObservations),
    ...getInputArray(input.paymentMatchingObservations),
    ...getInputArray(input.cashReceiptMatchingObservations),
    ...getInputArray(input.vendorMasterObservations),
    ...getInputArray(input.approvalObservations),
    ...getInputArray(input.methodologyObservations),
    ...getInputArray(input.newPayeeObservations),
    ...getInputArray(input.dormantPayeeObservations),
    ...getInputArray(input.paymentAccrualObservations),
    ...getInputArray(input.paymentMissingObservations),
    ...getInputArray(input.unrecordedLiabilityObservations),
    ...getInputArray(input.payrollObservations),
  ];
}

function getAuditCandidates(input: BuildCashDisbursementObservationInput): SyntheticAuditCandidate[] {
  return getInputArray(input.auditCandidates);
}

function getAuditEvidencePackages(input: BuildCashDisbursementObservationInput): SyntheticAuditEvidencePackage[] {
  return getInputArray(input.auditEvidencePackages);
}

function getAuditFindings(input: BuildCashDisbursementObservationInput): SyntheticAuditFinding[] {
  return getInputArray(input.auditFindings);
}

function getAuditConfidencePackages(input: BuildCashDisbursementObservationInput): SyntheticAuditConfidence[] {
  return getInputArray(input.auditConfidencePackages);
}

function getAuditSurfaces(input: BuildCashDisbursementObservationInput): SyntheticAuditSurface[] {
  return getInputArray(input.auditSurfaces);
}

function getAuditWatchlists(input: BuildCashDisbursementObservationInput): SyntheticAuditWatchlist[] {
  return getInputArray(input.auditWatchlists);
}

function getAuditBriefings(input: BuildCashDisbursementObservationInput): SyntheticAuditBriefing[] {
  return getInputArray(input.auditBriefings);
}

function getAllAuditArtifacts(input: BuildCashDisbursementObservationInput): AuditArtifact[] {
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
  input: BuildCashDisbursementObservationInput,
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
  return uniqueStable(observations.flatMap((observation) => getStringProperty(observation, propertyName)));
}

function getEvidenceReferenceIds(input: BuildCashDisbursementObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "evidenceReferenceIds")),
  ]);
}

function getSourceReferenceIds(input: BuildCashDisbursementObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "sourceReferenceIds")),
  ]);
}

function getLineageReferenceIds(input: BuildCashDisbursementObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "lineageReferenceIds")),
  ]);
}

function getAuditContractReferenceIdsFromInput(input: BuildCashDisbursementObservationInput): string[] {
  return uniqueStable([
    ...getAuditContractReferenceIds(input.auditContract),
    ...getAllAuditArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "auditContractReferenceIds")),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditContractReferenceIds")),
  ]);
}

function getReferenceIds(input: BuildCashDisbursementObservationInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, singularName),
      ...getStringArrayProperty(artifact, arrayName),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, arrayName)),
  ]);
}

function getCashDisbursementReferenceIds(input: BuildCashDisbursementObservationInput): string[] {
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

function getCashDisbursementObservationIds(input: BuildCashDisbursementObservationInput): Record<string, string[]> {
  return {
    bankActivityObservationIds: getObservationIds(getInputArray(input.bankActivityObservations), "bankActivityObservationId"),
    cashApplicationObservationIds: getObservationIds(getInputArray(input.cashApplicationObservations), "cashApplicationObservationId"),
    reconciliationObservationIds: getObservationIds(getInputArray(input.reconciliationObservations), "reconciliationObservationId"),
    journalTestingObservationIds: getObservationIds(getInputArray(input.journalTestingObservations), "journalTestingObservationId"),
    anomalyIntelligenceObservationIds: getObservationIds(
      getInputArray(input.anomalyIntelligenceObservations),
      "anomalyIntelligenceObservationId",
    ),
    fluxIntelligenceObservationIds: getObservationIds(getInputArray(input.fluxIntelligenceObservations), "fluxIntelligenceObservationId"),
    cutoffIntelligenceObservationIds: getObservationIds(getInputArray(input.cutoffIntelligenceObservations), "cutoffIntelligenceObservationId"),
    periodEndActivityObservationIds: getObservationIds(getInputArray(input.periodEndActivityObservations), "periodEndActivityObservationId"),
    debtCovenantObservationIds: getObservationIds(getInputArray(input.debtCovenantObservations), "debtCovenantObservationId"),
    prepaidIntelligenceObservationIds: getObservationIds(
      getInputArray(input.prepaidIntelligenceObservations),
      "prepaidIntelligenceObservationId",
    ),
    fixedAssetIntelligenceObservationIds: getObservationIds(
      getInputArray(input.fixedAssetIntelligenceObservations),
      "fixedAssetIntelligenceObservationId",
    ),
    salesTaxRemittanceObservationIds: getObservationIds(
      getInputArray(input.salesTaxRemittanceObservations),
      "salesTaxRemittanceObservationId",
    ),
    taxToInvoiceObservationIds: getObservationIds(getInputArray(input.taxToInvoiceObservations), "taxToInvoiceObservationId"),
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
    taxIntelligenceObservationIds: getObservationIds(getInputArray(input.taxIntelligenceObservations), "taxIntelligenceObservationId"),
    customerTaxValidationObservationIds: getObservationIds(
      getInputArray(input.customerTaxValidationObservations),
      "customerTaxValidationObservationId",
    ),
    reserveIntelligenceObservationIds: getObservationIds(getInputArray(input.reserveIntelligenceObservations), "reserveIntelligenceObservationId"),
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
    missingActivityObservationIds: getObservationIds(getInputArray(input.missingActivityObservations), "missingActivityObservationId"),
    expectedActivityObservationIds: getObservationIds(getInputArray(input.expectedActivityObservations), "expectedActivityObservationId"),
    recurringPatternObservationIds: getObservationIds(getInputArray(input.recurringPatternObservations), "recurringPatternObservationId"),
    paymentMatchingObservationIds: getObservationIds(getInputArray(input.paymentMatchingObservations), "paymentMatchingObservationId"),
    cashReceiptMatchingObservationIds: getObservationIds(
      getInputArray(input.cashReceiptMatchingObservations),
      "cashReceiptMatchingObservationId",
    ),
    vendorMasterObservationIds: getObservationIds(getInputArray(input.vendorMasterObservations), "vendorMasterObservationId"),
    approvalObservationIds: getObservationIds(getInputArray(input.approvalObservations), "approvalObservationId"),
    methodologyObservationIds: getObservationIds(getInputArray(input.methodologyObservations), "methodologyObservationId"),
    newPayeeObservationIds: getObservationIds(getInputArray(input.newPayeeObservations), "newPayeeObservationId"),
    dormantPayeeObservationIds: getObservationIds(getInputArray(input.dormantPayeeObservations), "dormantPayeeObservationId"),
    paymentAccrualObservationIds: getObservationIds(getInputArray(input.paymentAccrualObservations), "paymentAccrualObservationId"),
    paymentMissingObservationIds: getObservationIds(getInputArray(input.paymentMissingObservations), "paymentMissingObservationId"),
    unrecordedLiabilityObservationIds: getObservationIds(
      getInputArray(input.unrecordedLiabilityObservations),
      "unrecordedLiabilityObservationId",
    ),
    payrollObservationIds: getObservationIds(getInputArray(input.payrollObservations), "payrollObservationId"),
  };
}

function buildCashDisbursementObservationId(input: BuildCashDisbursementObservationInput): string {
  return `synthetic-cash-disbursement-observation:${stableSnapshotHash({
    cashDisbursementObservationKey: input.cashDisbursementObservationKey,
    cashDisbursementCategory: input.cashDisbursementCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    customerIsolation: input.auditContract ? buildCustomerIsolation(input.auditContract.scope) : null,
    firmIsolation: input.auditContract ? buildFirmIsolation(input.auditContract.scope) : null,
    clientIsolation: input.auditContract ? buildClientIsolation(input.auditContract.scope) : null,
    ...getCashDisbursementObservationIds(input),
    auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
    auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
    auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
    auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
    auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
    auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
    auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
    auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
    cashDisbursementReferenceIds: getCashDisbursementReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  })}`;
}

function validateAuditArtifacts(input: BuildCashDisbursementObservationInput, warnings: string[]): void {
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

function validateDomainObservationIds(input: BuildCashDisbursementObservationInput, warnings: string[]): void {
  const companyId = input.auditContract?.scope.companyId;
  for (const [observationName, observations, idField] of [
    ["bankActivityObservations", getInputArray(input.bankActivityObservations), "bankActivityObservationId"],
    ["cashApplicationObservations", getInputArray(input.cashApplicationObservations), "cashApplicationObservationId"],
    ["reconciliationObservations", getInputArray(input.reconciliationObservations), "reconciliationObservationId"],
    ["journalTestingObservations", getInputArray(input.journalTestingObservations), "journalTestingObservationId"],
    ["anomalyIntelligenceObservations", getInputArray(input.anomalyIntelligenceObservations), "anomalyIntelligenceObservationId"],
    ["fluxIntelligenceObservations", getInputArray(input.fluxIntelligenceObservations), "fluxIntelligenceObservationId"],
    ["cutoffIntelligenceObservations", getInputArray(input.cutoffIntelligenceObservations), "cutoffIntelligenceObservationId"],
    ["periodEndActivityObservations", getInputArray(input.periodEndActivityObservations), "periodEndActivityObservationId"],
    ["debtCovenantObservations", getInputArray(input.debtCovenantObservations), "debtCovenantObservationId"],
    ["prepaidIntelligenceObservations", getInputArray(input.prepaidIntelligenceObservations), "prepaidIntelligenceObservationId"],
    ["fixedAssetIntelligenceObservations", getInputArray(input.fixedAssetIntelligenceObservations), "fixedAssetIntelligenceObservationId"],
    ["salesTaxRemittanceObservations", getInputArray(input.salesTaxRemittanceObservations), "salesTaxRemittanceObservationId"],
    ["taxToInvoiceObservations", getInputArray(input.taxToInvoiceObservations), "taxToInvoiceObservationId"],
    [
      "financialStatementRelationshipObservations",
      getInputArray(input.financialStatementRelationshipObservations),
      "financialStatementRelationshipObservationId",
    ],
    ["balanceSheetIntegrityObservations", getInputArray(input.balanceSheetIntegrityObservations), "balanceSheetIntegrityObservationId"],
    ["continuousAuditObservations", getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"],
    ["continuousControllerObservations", getInputArray(input.continuousControllerObservations), "continuousControllerObservationId"],
    ["taxIntelligenceObservations", getInputArray(input.taxIntelligenceObservations), "taxIntelligenceObservationId"],
    [
      "customerTaxValidationObservations",
      getInputArray(input.customerTaxValidationObservations),
      "customerTaxValidationObservationId",
    ],
    ["reserveIntelligenceObservations", getInputArray(input.reserveIntelligenceObservations), "reserveIntelligenceObservationId"],
    ["auditReadinessObservations", getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"],
    ["trustVerificationObservations", getInputArray(input.trustVerificationObservations), "trustVerificationObservationId"],
    ["platformIntegrityObservations", getInputArray(input.platformIntegrityObservations), "platformIntegrityObservationId"],
    ["auditCoverageObservations", getInputArray(input.auditCoverageObservations), "auditCoverageObservationId"],
    ["evidenceSufficiencyObservations", getInputArray(input.evidenceSufficiencyObservations), "evidenceSufficiencyObservationId"],
    ["pbcRequestObservations", getInputArray(input.pbcRequestObservations), "pbcRequestObservationId"],
    ["auditScheduleObservations", getInputArray(input.auditScheduleObservations), "auditScheduleObservationId"],
    ["auditTieOutObservations", getInputArray(input.auditTieOutObservations), "auditTieOutObservationId"],
    ["scheduleCompletenessObservations", getInputArray(input.scheduleCompletenessObservations), "scheduleCompletenessObservationId"],
    ["missingActivityObservations", getInputArray(input.missingActivityObservations), "missingActivityObservationId"],
    ["expectedActivityObservations", getInputArray(input.expectedActivityObservations), "expectedActivityObservationId"],
    ["recurringPatternObservations", getInputArray(input.recurringPatternObservations), "recurringPatternObservationId"],
    ["paymentMatchingObservations", getInputArray(input.paymentMatchingObservations), "paymentMatchingObservationId"],
    ["cashReceiptMatchingObservations", getInputArray(input.cashReceiptMatchingObservations), "cashReceiptMatchingObservationId"],
    ["vendorMasterObservations", getInputArray(input.vendorMasterObservations), "vendorMasterObservationId"],
    ["approvalObservations", getInputArray(input.approvalObservations), "approvalObservationId"],
    ["methodologyObservations", getInputArray(input.methodologyObservations), "methodologyObservationId"],
    ["newPayeeObservations", getInputArray(input.newPayeeObservations), "newPayeeObservationId"],
    ["dormantPayeeObservations", getInputArray(input.dormantPayeeObservations), "dormantPayeeObservationId"],
    ["paymentAccrualObservations", getInputArray(input.paymentAccrualObservations), "paymentAccrualObservationId"],
    ["paymentMissingObservations", getInputArray(input.paymentMissingObservations), "paymentMissingObservationId"],
    ["unrecordedLiabilityObservations", getInputArray(input.unrecordedLiabilityObservations), "unrecordedLiabilityObservationId"],
    ["payrollObservations", getInputArray(input.payrollObservations), "payrollObservationId"],
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

function getForwardCompatibilityWarnings(input: BuildCashDisbursementObservationInput): string[] {
  return [
    ...(getInputArray(input.paymentMatchingObservations).length > 0
      ? ["payment matching intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.cashReceiptMatchingObservations).length > 0
      ? ["cash receipt matching intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.vendorMasterObservations).length > 0
      ? ["vendor master intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.approvalObservations).length > 0
      ? ["approval intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.methodologyObservations).length > 0
      ? ["methodology intelligence is a Phase 37 forward-compatible reference."]
      : []),
    ...(getInputArray(input.unrecordedLiabilityObservations).length > 0
      ? ["unrecorded liability intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.payrollObservations).length > 0
      ? ["payroll intelligence is a forward-compatible Phase 34 module."]
      : []),
  ];
}

function validateInput(input: BuildCashDisbursementObservationInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (!hasValue(input.cashDisbursementObservationKey)) warnings.push("cashDisbursementObservationKey is required.");
  if (!hasValue(input.cashDisbursementCategory)) warnings.push("cashDisbursementCategory is required.");
  if (!isSupportedCashDisbursementCategory(input.cashDisbursementCategory)) {
    warnings.push("cashDisbursementCategory must be a supported cash disbursement category.");
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

export function buildCashDisbursementObservation(
  input: BuildCashDisbursementObservationInput,
): BuildCashDisbursementObservationResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      cashDisbursementObservation: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const allArtifacts = getAllAuditArtifacts(input);
  const domainObservations = getDomainObservations(input);
  const warnings = getForwardCompatibilityWarnings(input);
  const observationIds = getCashDisbursementObservationIds(input);

  return {
    cashDisbursementObservation: {
      cashDisbursementObservationId: buildCashDisbursementObservationId(input),
      cashDisbursementObservationKey: input.cashDisbursementObservationKey,
      cashDisbursementCategory: input.cashDisbursementCategory,
      companyId: auditContract.scope.companyId,
      auditCategory: getAuditCategory(auditContract),
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      bankActivityObservationIds: observationIds.bankActivityObservationIds,
      cashApplicationObservationIds: observationIds.cashApplicationObservationIds,
      reconciliationObservationIds: observationIds.reconciliationObservationIds,
      journalTestingObservationIds: observationIds.journalTestingObservationIds,
      anomalyIntelligenceObservationIds: observationIds.anomalyIntelligenceObservationIds,
      fluxIntelligenceObservationIds: observationIds.fluxIntelligenceObservationIds,
      cutoffIntelligenceObservationIds: observationIds.cutoffIntelligenceObservationIds,
      periodEndActivityObservationIds: observationIds.periodEndActivityObservationIds,
      debtCovenantObservationIds: observationIds.debtCovenantObservationIds,
      prepaidIntelligenceObservationIds: observationIds.prepaidIntelligenceObservationIds,
      fixedAssetIntelligenceObservationIds: observationIds.fixedAssetIntelligenceObservationIds,
      salesTaxRemittanceObservationIds: observationIds.salesTaxRemittanceObservationIds,
      taxToInvoiceObservationIds: observationIds.taxToInvoiceObservationIds,
      financialStatementRelationshipObservationIds: observationIds.financialStatementRelationshipObservationIds,
      balanceSheetIntegrityObservationIds: observationIds.balanceSheetIntegrityObservationIds,
      continuousAuditObservationIds: observationIds.continuousAuditObservationIds,
      continuousControllerObservationIds: observationIds.continuousControllerObservationIds,
      taxIntelligenceObservationIds: observationIds.taxIntelligenceObservationIds,
      customerTaxValidationObservationIds: observationIds.customerTaxValidationObservationIds,
      reserveIntelligenceObservationIds: observationIds.reserveIntelligenceObservationIds,
      auditReadinessObservationIds: observationIds.auditReadinessObservationIds,
      trustVerificationObservationIds: observationIds.trustVerificationObservationIds,
      platformIntegrityObservationIds: observationIds.platformIntegrityObservationIds,
      auditCoverageObservationIds: observationIds.auditCoverageObservationIds,
      evidenceSufficiencyObservationIds: observationIds.evidenceSufficiencyObservationIds,
      pbcRequestObservationIds: observationIds.pbcRequestObservationIds,
      auditScheduleObservationIds: observationIds.auditScheduleObservationIds,
      auditTieOutObservationIds: observationIds.auditTieOutObservationIds,
      scheduleCompletenessObservationIds: observationIds.scheduleCompletenessObservationIds,
      missingActivityObservationIds: observationIds.missingActivityObservationIds,
      expectedActivityObservationIds: observationIds.expectedActivityObservationIds,
      recurringPatternObservationIds: observationIds.recurringPatternObservationIds,
      paymentMatchingObservationIds: observationIds.paymentMatchingObservationIds,
      cashReceiptMatchingObservationIds: observationIds.cashReceiptMatchingObservationIds,
      vendorMasterObservationIds: observationIds.vendorMasterObservationIds,
      approvalObservationIds: observationIds.approvalObservationIds,
      methodologyObservationIds: observationIds.methodologyObservationIds,
      newPayeeObservationIds: observationIds.newPayeeObservationIds,
      dormantPayeeObservationIds: observationIds.dormantPayeeObservationIds,
      paymentAccrualObservationIds: observationIds.paymentAccrualObservationIds,
      paymentMissingObservationIds: observationIds.paymentMissingObservationIds,
      unrecordedLiabilityObservationIds: observationIds.unrecordedLiabilityObservationIds,
      payrollObservationIds: observationIds.payrollObservationIds,
      auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
      auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
      auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
      auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
      auditFindingIds: getReferenceIds(input, "auditFindingId", "auditFindingIds"),
      auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
      auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
      auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
      auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
      cashDisbursementReferenceIds: getCashDisbursementReferenceIds(input),
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
      bankActivityObservations: getInputArray(input.bankActivityObservations),
      cashApplicationObservations: getInputArray(input.cashApplicationObservations),
      reconciliationObservations: getInputArray(input.reconciliationObservations),
      journalTestingObservations: getInputArray(input.journalTestingObservations),
      anomalyIntelligenceObservations: getInputArray(input.anomalyIntelligenceObservations),
      fluxIntelligenceObservations: getInputArray(input.fluxIntelligenceObservations),
      cutoffIntelligenceObservations: getInputArray(input.cutoffIntelligenceObservations),
      periodEndActivityObservations: getInputArray(input.periodEndActivityObservations),
      debtCovenantObservations: getInputArray(input.debtCovenantObservations),
      prepaidIntelligenceObservations: getInputArray(input.prepaidIntelligenceObservations),
      fixedAssetIntelligenceObservations: getInputArray(input.fixedAssetIntelligenceObservations),
      salesTaxRemittanceObservations: getInputArray(input.salesTaxRemittanceObservations),
      taxToInvoiceObservations: getInputArray(input.taxToInvoiceObservations),
      financialStatementRelationshipObservations: getInputArray(input.financialStatementRelationshipObservations),
      balanceSheetIntegrityObservations: getInputArray(input.balanceSheetIntegrityObservations),
      continuousAuditObservations: getInputArray(input.continuousAuditObservations),
      continuousControllerObservations: getInputArray(input.continuousControllerObservations),
      taxIntelligenceObservations: getInputArray(input.taxIntelligenceObservations),
      customerTaxValidationObservations: getInputArray(input.customerTaxValidationObservations),
      reserveIntelligenceObservations: getInputArray(input.reserveIntelligenceObservations),
      auditReadinessObservations: getInputArray(input.auditReadinessObservations),
      trustVerificationObservations: getInputArray(input.trustVerificationObservations),
      platformIntegrityObservations: getInputArray(input.platformIntegrityObservations),
      auditCoverageObservations: getInputArray(input.auditCoverageObservations),
      evidenceSufficiencyObservations: getInputArray(input.evidenceSufficiencyObservations),
      pbcRequestObservations: getInputArray(input.pbcRequestObservations),
      auditScheduleObservations: getInputArray(input.auditScheduleObservations),
      auditTieOutObservations: getInputArray(input.auditTieOutObservations),
      scheduleCompletenessObservations: getInputArray(input.scheduleCompletenessObservations),
      missingActivityObservations: getInputArray(input.missingActivityObservations),
      expectedActivityObservations: getInputArray(input.expectedActivityObservations),
      recurringPatternObservations: getInputArray(input.recurringPatternObservations),
      paymentMatchingObservations: getInputArray(input.paymentMatchingObservations),
      cashReceiptMatchingObservations: getInputArray(input.cashReceiptMatchingObservations),
      vendorMasterObservations: getInputArray(input.vendorMasterObservations),
      approvalObservations: getInputArray(input.approvalObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      newPayeeObservations: getInputArray(input.newPayeeObservations),
      dormantPayeeObservations: getInputArray(input.dormantPayeeObservations),
      paymentAccrualObservations: getInputArray(input.paymentAccrualObservations),
      paymentMissingObservations: getInputArray(input.paymentMissingObservations),
      unrecordedLiabilityObservations: getInputArray(input.unrecordedLiabilityObservations),
      payrollObservations: getInputArray(input.payrollObservations),
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
