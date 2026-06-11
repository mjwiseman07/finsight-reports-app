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
import type { SyntheticAuditEvidencePackage } from "../evidence";
import type { SyntheticEvidenceSufficiencyObservation } from "../evidence-sufficiency";
import type { SyntheticExpectedActivityObservation } from "../expected-activity";
import type { SyntheticFinancialStatementRelationshipObservation } from "../financial-statement-relationships";
import type { SyntheticFluxIntelligenceObservation } from "../flux-intelligence";
import type { SyntheticAuditFinding } from "../findings";
import type { SyntheticJournalTestingObservation } from "../journal-testing";
import type { SyntheticMissingActivityObservation } from "../missing-activity";
import type { SyntheticPbcRequestObservation } from "../pbc-request";
import type { SyntheticPeriodEndActivityObservation } from "../period-end-activity";
import type { SyntheticPlatformIntegrityObservation } from "../platform-integrity";
import type { SyntheticReconciliationObservation } from "../reconciliation";
import type { SyntheticRecurringPatternObservation } from "../recurring-patterns";
import type { SyntheticReserveIntelligenceObservation } from "../reserve-intelligence";
import type { SyntheticRevenueIntelligenceObservation } from "../revenue-intelligence";
import type { SyntheticSalesTaxRemittanceObservation } from "../sales-tax-remittance";
import type { SyntheticScheduleCompletenessObservation } from "../schedule-completeness";
import type { SyntheticAuditSurface } from "../surfaces";
import type { SyntheticTaxIntelligenceObservation } from "../tax-intelligence";
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

export type SyntheticTaxToInvoiceCategory =
  | "tax_to_invoice_candidate"
  | "invoice_tax_candidate"
  | "invoice_tax_relationship_candidate"
  | "invoice_tax_documentation_candidate"
  | "invoice_tax_support_candidate"
  | "invoice_tax_jurisdiction_candidate"
  | "invoice_tax_classification_candidate"
  | "invoice_tax_reconciliation_candidate"
  | "invoice_tax_period_candidate"
  | "invoice_tax_cutoff_candidate"
  | "tax_to_invoice_intelligence_candidate"
  | "invoice_tax_treatment_candidate"
  | "invoice_tax_pattern_candidate"
  | "invoice_tax_anomaly_candidate"
  | "invoice_tax_relationship_change_candidate"
  | "invoice_tax_multi_jurisdiction_candidate"
  | "invoice_tax_readiness_candidate"
  | "invoice_tax_support_gap_candidate"
  | "invoice_tax_missing_candidate"
  | "invoice_tax_timing_candidate"
  | "invoice_tax_methodology_candidate"
  | "invoice_tax_accrual_candidate"
  | "invoice_tax_reversal_candidate"
  | "invoice_tax_concentration_candidate"
  | "invoice_tax_frequency_change_candidate"
  | "invoice_tax_vendor_relationship_candidate";

export const SYNTHETIC_TAX_TO_INVOICE_CATEGORIES: SyntheticTaxToInvoiceCategory[] = [
  "tax_to_invoice_candidate",
  "invoice_tax_candidate",
  "invoice_tax_relationship_candidate",
  "invoice_tax_documentation_candidate",
  "invoice_tax_support_candidate",
  "invoice_tax_jurisdiction_candidate",
  "invoice_tax_classification_candidate",
  "invoice_tax_reconciliation_candidate",
  "invoice_tax_period_candidate",
  "invoice_tax_cutoff_candidate",
  "tax_to_invoice_intelligence_candidate",
  "invoice_tax_treatment_candidate",
  "invoice_tax_pattern_candidate",
  "invoice_tax_anomaly_candidate",
  "invoice_tax_relationship_change_candidate",
  "invoice_tax_multi_jurisdiction_candidate",
  "invoice_tax_readiness_candidate",
  "invoice_tax_support_gap_candidate",
  "invoice_tax_missing_candidate",
  "invoice_tax_timing_candidate",
  "invoice_tax_methodology_candidate",
  "invoice_tax_accrual_candidate",
  "invoice_tax_reversal_candidate",
  "invoice_tax_concentration_candidate",
  "invoice_tax_frequency_change_candidate",
  "invoice_tax_vendor_relationship_candidate",
];

export interface SyntheticTaxToInvoiceIsolationDimension {
  required: boolean;
  referenceIds: string[];
}

export interface SyntheticTaxToInvoiceForwardCompatibleObservation {
  customerMasterObservationId?: string;
  invoiceObservationId?: string;
  methodologyObservationId?: string;
  taxMethodologyObservationId?: string;
  invoiceTaxAccrualObservationId?: string;
  invoiceTaxReversalObservationId?: string;
  invoiceTaxVendorRelationshipObservationId?: string;
  unrecordedLiabilityObservationId?: string;
  cashDisbursementObservationId?: string;
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

export interface BuildTaxToInvoiceObservationInput {
  auditContract: SyntheticAuditContract | null;
  taxToInvoiceObservationKey: string;
  taxToInvoiceCategory: SyntheticTaxToInvoiceCategory;
  taxIntelligenceObservations?: SyntheticTaxIntelligenceObservation[];
  customerTaxValidationObservations?: SyntheticCustomerTaxValidationObservation[];
  salesTaxRemittanceObservations?: SyntheticSalesTaxRemittanceObservation[];
  revenueIntelligenceObservations?: SyntheticRevenueIntelligenceObservation[];
  financialStatementRelationshipObservations?: SyntheticFinancialStatementRelationshipObservation[];
  balanceSheetIntegrityObservations?: SyntheticBalanceSheetIntegrityObservation[];
  continuousAuditObservations?: SyntheticContinuousAuditObservation[];
  continuousControllerObservations?: SyntheticContinuousControllerObservation[];
  anomalyIntelligenceObservations?: SyntheticAnomalyIntelligenceObservation[];
  fluxIntelligenceObservations?: SyntheticFluxIntelligenceObservation[];
  cutoffIntelligenceObservations?: SyntheticCutoffIntelligenceObservation[];
  periodEndActivityObservations?: SyntheticPeriodEndActivityObservation[];
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
  journalTestingObservations?: SyntheticJournalTestingObservation[];
  reconciliationObservations?: SyntheticReconciliationObservation[];
  cashApplicationObservations?: SyntheticCashApplicationObservation[];
  bankActivityObservations?: SyntheticBankActivityObservation[];
  cashDisbursementObservations?: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  reserveIntelligenceObservations?: SyntheticReserveIntelligenceObservation[];
  unrecordedLiabilityObservations?: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  customerMasterObservations?: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  invoiceObservations?: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  methodologyObservations?: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  taxMethodologyObservations?: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  invoiceTaxAccrualObservations?: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  invoiceTaxReversalObservations?: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  invoiceTaxVendorRelationshipObservations?: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticTaxToInvoiceObservation {
  taxToInvoiceObservationId: string;
  taxToInvoiceObservationKey: string;
  taxToInvoiceCategory: SyntheticTaxToInvoiceCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticTaxToInvoiceIsolationDimension;
  firmIsolation: SyntheticTaxToInvoiceIsolationDimension;
  clientIsolation: SyntheticTaxToInvoiceIsolationDimension;
  taxIntelligenceObservationIds: string[];
  customerTaxValidationObservationIds: string[];
  salesTaxRemittanceObservationIds: string[];
  revenueIntelligenceObservationIds: string[];
  financialStatementRelationshipObservationIds: string[];
  balanceSheetIntegrityObservationIds: string[];
  continuousAuditObservationIds: string[];
  continuousControllerObservationIds: string[];
  anomalyIntelligenceObservationIds: string[];
  fluxIntelligenceObservationIds: string[];
  cutoffIntelligenceObservationIds: string[];
  periodEndActivityObservationIds: string[];
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
  journalTestingObservationIds: string[];
  reconciliationObservationIds: string[];
  cashApplicationObservationIds: string[];
  bankActivityObservationIds: string[];
  cashDisbursementObservationIds: string[];
  reserveIntelligenceObservationIds: string[];
  unrecordedLiabilityObservationIds: string[];
  customerMasterObservationIds: string[];
  invoiceObservationIds: string[];
  methodologyObservationIds: string[];
  taxMethodologyObservationIds: string[];
  invoiceTaxAccrualObservationIds: string[];
  invoiceTaxReversalObservationIds: string[];
  invoiceTaxVendorRelationshipObservationIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  taxToInvoiceReferenceIds: string[];
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
  taxIntelligenceObservations: SyntheticTaxIntelligenceObservation[];
  customerTaxValidationObservations: SyntheticCustomerTaxValidationObservation[];
  salesTaxRemittanceObservations: SyntheticSalesTaxRemittanceObservation[];
  revenueIntelligenceObservations: SyntheticRevenueIntelligenceObservation[];
  financialStatementRelationshipObservations: SyntheticFinancialStatementRelationshipObservation[];
  balanceSheetIntegrityObservations: SyntheticBalanceSheetIntegrityObservation[];
  continuousAuditObservations: SyntheticContinuousAuditObservation[];
  continuousControllerObservations: SyntheticContinuousControllerObservation[];
  anomalyIntelligenceObservations: SyntheticAnomalyIntelligenceObservation[];
  fluxIntelligenceObservations: SyntheticFluxIntelligenceObservation[];
  cutoffIntelligenceObservations: SyntheticCutoffIntelligenceObservation[];
  periodEndActivityObservations: SyntheticPeriodEndActivityObservation[];
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
  journalTestingObservations: SyntheticJournalTestingObservation[];
  reconciliationObservations: SyntheticReconciliationObservation[];
  cashApplicationObservations: SyntheticCashApplicationObservation[];
  bankActivityObservations: SyntheticBankActivityObservation[];
  cashDisbursementObservations: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  reserveIntelligenceObservations: SyntheticReserveIntelligenceObservation[];
  unrecordedLiabilityObservations: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  customerMasterObservations: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  invoiceObservations: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  methodologyObservations: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  taxMethodologyObservations: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  invoiceTaxAccrualObservations: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  invoiceTaxReversalObservations: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  invoiceTaxVendorRelationshipObservations: SyntheticTaxToInvoiceForwardCompatibleObservation[];
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildTaxToInvoiceObservationResult {
  taxToInvoiceObservation: SyntheticTaxToInvoiceObservation | null;
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

function buildCustomerIsolation(scope: SyntheticAuditScope): SyntheticTaxToInvoiceIsolationDimension {
  return { required: scope.customerIsolationRequired, referenceIds: scope.isolationBoundaryIds };
}

function buildFirmIsolation(scope: SyntheticAuditScope): SyntheticTaxToInvoiceIsolationDimension {
  return {
    required: scope.firmIsolationRequired,
    referenceIds: uniqueStable([scope.firmId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function buildClientIsolation(scope: SyntheticAuditScope): SyntheticTaxToInvoiceIsolationDimension {
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

function isSupportedTaxToInvoiceCategory(category: SyntheticTaxToInvoiceCategory): boolean {
  return SYNTHETIC_TAX_TO_INVOICE_CATEGORIES.includes(category);
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

function getDomainObservations(input: BuildTaxToInvoiceObservationInput): object[] {
  return [
    ...getInputArray(input.taxIntelligenceObservations),
    ...getInputArray(input.customerTaxValidationObservations),
    ...getInputArray(input.salesTaxRemittanceObservations),
    ...getInputArray(input.revenueIntelligenceObservations),
    ...getInputArray(input.financialStatementRelationshipObservations),
    ...getInputArray(input.balanceSheetIntegrityObservations),
    ...getInputArray(input.continuousAuditObservations),
    ...getInputArray(input.continuousControllerObservations),
    ...getInputArray(input.anomalyIntelligenceObservations),
    ...getInputArray(input.fluxIntelligenceObservations),
    ...getInputArray(input.cutoffIntelligenceObservations),
    ...getInputArray(input.periodEndActivityObservations),
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
    ...getInputArray(input.journalTestingObservations),
    ...getInputArray(input.reconciliationObservations),
    ...getInputArray(input.cashApplicationObservations),
    ...getInputArray(input.bankActivityObservations),
    ...getInputArray(input.cashDisbursementObservations),
    ...getInputArray(input.reserveIntelligenceObservations),
    ...getInputArray(input.unrecordedLiabilityObservations),
    ...getInputArray(input.customerMasterObservations),
    ...getInputArray(input.invoiceObservations),
    ...getInputArray(input.methodologyObservations),
    ...getInputArray(input.taxMethodologyObservations),
    ...getInputArray(input.invoiceTaxAccrualObservations),
    ...getInputArray(input.invoiceTaxReversalObservations),
    ...getInputArray(input.invoiceTaxVendorRelationshipObservations),
  ];
}

function getAuditCandidates(input: BuildTaxToInvoiceObservationInput): SyntheticAuditCandidate[] {
  return getInputArray(input.auditCandidates);
}

function getAuditEvidencePackages(input: BuildTaxToInvoiceObservationInput): SyntheticAuditEvidencePackage[] {
  return getInputArray(input.auditEvidencePackages);
}

function getAuditFindings(input: BuildTaxToInvoiceObservationInput): SyntheticAuditFinding[] {
  return getInputArray(input.auditFindings);
}

function getAuditConfidencePackages(input: BuildTaxToInvoiceObservationInput): SyntheticAuditConfidence[] {
  return getInputArray(input.auditConfidencePackages);
}

function getAuditSurfaces(input: BuildTaxToInvoiceObservationInput): SyntheticAuditSurface[] {
  return getInputArray(input.auditSurfaces);
}

function getAuditWatchlists(input: BuildTaxToInvoiceObservationInput): SyntheticAuditWatchlist[] {
  return getInputArray(input.auditWatchlists);
}

function getAuditBriefings(input: BuildTaxToInvoiceObservationInput): SyntheticAuditBriefing[] {
  return getInputArray(input.auditBriefings);
}

function getAllAuditArtifacts(input: BuildTaxToInvoiceObservationInput): AuditArtifact[] {
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
  input: BuildTaxToInvoiceObservationInput,
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

function getEvidenceReferenceIds(input: BuildTaxToInvoiceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "evidenceReferenceIds")),
  ]);
}

function getSourceReferenceIds(input: BuildTaxToInvoiceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "sourceReferenceIds")),
  ]);
}

function getLineageReferenceIds(input: BuildTaxToInvoiceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "lineageReferenceIds")),
  ]);
}

function getAuditContractReferenceIdsFromInput(input: BuildTaxToInvoiceObservationInput): string[] {
  return uniqueStable([
    ...getAuditContractReferenceIds(input.auditContract),
    ...getAllAuditArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "auditContractReferenceIds")),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditContractReferenceIds")),
  ]);
}

function getReferenceIds(input: BuildTaxToInvoiceObservationInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, singularName),
      ...getStringArrayProperty(artifact, arrayName),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, arrayName)),
  ]);
}

function getTaxToInvoiceReferenceIds(input: BuildTaxToInvoiceObservationInput): string[] {
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

function buildTaxToInvoiceObservationId(input: BuildTaxToInvoiceObservationInput): string {
  return `synthetic-tax-to-invoice-observation:${stableSnapshotHash({
    taxToInvoiceObservationKey: input.taxToInvoiceObservationKey,
    taxToInvoiceCategory: input.taxToInvoiceCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    customerIsolation: input.auditContract ? buildCustomerIsolation(input.auditContract.scope) : null,
    firmIsolation: input.auditContract ? buildFirmIsolation(input.auditContract.scope) : null,
    clientIsolation: input.auditContract ? buildClientIsolation(input.auditContract.scope) : null,
    taxIntelligenceObservationIds: getObservationIds(getInputArray(input.taxIntelligenceObservations), "taxIntelligenceObservationId"),
    customerTaxValidationObservationIds: getObservationIds(
      getInputArray(input.customerTaxValidationObservations),
      "customerTaxValidationObservationId",
    ),
    salesTaxRemittanceObservationIds: getObservationIds(
      getInputArray(input.salesTaxRemittanceObservations),
      "salesTaxRemittanceObservationId",
    ),
    revenueIntelligenceObservationIds: getObservationIds(
      getInputArray(input.revenueIntelligenceObservations),
      "revenueIntelligenceObservationId",
    ),
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
    anomalyIntelligenceObservationIds: getObservationIds(
      getInputArray(input.anomalyIntelligenceObservations),
      "anomalyIntelligenceObservationId",
    ),
    fluxIntelligenceObservationIds: getObservationIds(getInputArray(input.fluxIntelligenceObservations), "fluxIntelligenceObservationId"),
    cutoffIntelligenceObservationIds: getObservationIds(getInputArray(input.cutoffIntelligenceObservations), "cutoffIntelligenceObservationId"),
    periodEndActivityObservationIds: getObservationIds(getInputArray(input.periodEndActivityObservations), "periodEndActivityObservationId"),
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
    journalTestingObservationIds: getObservationIds(getInputArray(input.journalTestingObservations), "journalTestingObservationId"),
    reconciliationObservationIds: getObservationIds(getInputArray(input.reconciliationObservations), "reconciliationObservationId"),
    cashApplicationObservationIds: getObservationIds(getInputArray(input.cashApplicationObservations), "cashApplicationObservationId"),
    bankActivityObservationIds: getObservationIds(getInputArray(input.bankActivityObservations), "bankActivityObservationId"),
    cashDisbursementObservationIds: getObservationIds(getInputArray(input.cashDisbursementObservations), "cashDisbursementObservationId"),
    reserveIntelligenceObservationIds: getObservationIds(getInputArray(input.reserveIntelligenceObservations), "reserveIntelligenceObservationId"),
    unrecordedLiabilityObservationIds: getObservationIds(
      getInputArray(input.unrecordedLiabilityObservations),
      "unrecordedLiabilityObservationId",
    ),
    customerMasterObservationIds: getObservationIds(getInputArray(input.customerMasterObservations), "customerMasterObservationId"),
    invoiceObservationIds: getObservationIds(getInputArray(input.invoiceObservations), "invoiceObservationId"),
    methodologyObservationIds: getObservationIds(getInputArray(input.methodologyObservations), "methodologyObservationId"),
    taxMethodologyObservationIds: getObservationIds(getInputArray(input.taxMethodologyObservations), "taxMethodologyObservationId"),
    invoiceTaxAccrualObservationIds: getObservationIds(
      getInputArray(input.invoiceTaxAccrualObservations),
      "invoiceTaxAccrualObservationId",
    ),
    invoiceTaxReversalObservationIds: getObservationIds(
      getInputArray(input.invoiceTaxReversalObservations),
      "invoiceTaxReversalObservationId",
    ),
    invoiceTaxVendorRelationshipObservationIds: getObservationIds(
      getInputArray(input.invoiceTaxVendorRelationshipObservations),
      "invoiceTaxVendorRelationshipObservationId",
    ),
    auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
    auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
    auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
    auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
    auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
    auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
    auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
    auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
    taxToInvoiceReferenceIds: getTaxToInvoiceReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  })}`;
}

function validateAuditArtifacts(input: BuildTaxToInvoiceObservationInput, warnings: string[]): void {
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

function validateDomainObservationIds(input: BuildTaxToInvoiceObservationInput, warnings: string[]): void {
  const companyId = input.auditContract?.scope.companyId;
  for (const [observationName, observations, idField] of [
    ["taxIntelligenceObservations", getInputArray(input.taxIntelligenceObservations), "taxIntelligenceObservationId"],
    [
      "customerTaxValidationObservations",
      getInputArray(input.customerTaxValidationObservations),
      "customerTaxValidationObservationId",
    ],
    ["salesTaxRemittanceObservations", getInputArray(input.salesTaxRemittanceObservations), "salesTaxRemittanceObservationId"],
    ["revenueIntelligenceObservations", getInputArray(input.revenueIntelligenceObservations), "revenueIntelligenceObservationId"],
    [
      "financialStatementRelationshipObservations",
      getInputArray(input.financialStatementRelationshipObservations),
      "financialStatementRelationshipObservationId",
    ],
    ["balanceSheetIntegrityObservations", getInputArray(input.balanceSheetIntegrityObservations), "balanceSheetIntegrityObservationId"],
    ["continuousAuditObservations", getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"],
    ["continuousControllerObservations", getInputArray(input.continuousControllerObservations), "continuousControllerObservationId"],
    ["anomalyIntelligenceObservations", getInputArray(input.anomalyIntelligenceObservations), "anomalyIntelligenceObservationId"],
    ["fluxIntelligenceObservations", getInputArray(input.fluxIntelligenceObservations), "fluxIntelligenceObservationId"],
    ["cutoffIntelligenceObservations", getInputArray(input.cutoffIntelligenceObservations), "cutoffIntelligenceObservationId"],
    ["periodEndActivityObservations", getInputArray(input.periodEndActivityObservations), "periodEndActivityObservationId"],
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
    ["journalTestingObservations", getInputArray(input.journalTestingObservations), "journalTestingObservationId"],
    ["reconciliationObservations", getInputArray(input.reconciliationObservations), "reconciliationObservationId"],
    ["cashApplicationObservations", getInputArray(input.cashApplicationObservations), "cashApplicationObservationId"],
    ["bankActivityObservations", getInputArray(input.bankActivityObservations), "bankActivityObservationId"],
    ["cashDisbursementObservations", getInputArray(input.cashDisbursementObservations), "cashDisbursementObservationId"],
    ["reserveIntelligenceObservations", getInputArray(input.reserveIntelligenceObservations), "reserveIntelligenceObservationId"],
    ["unrecordedLiabilityObservations", getInputArray(input.unrecordedLiabilityObservations), "unrecordedLiabilityObservationId"],
    ["customerMasterObservations", getInputArray(input.customerMasterObservations), "customerMasterObservationId"],
    ["invoiceObservations", getInputArray(input.invoiceObservations), "invoiceObservationId"],
    ["methodologyObservations", getInputArray(input.methodologyObservations), "methodologyObservationId"],
    ["taxMethodologyObservations", getInputArray(input.taxMethodologyObservations), "taxMethodologyObservationId"],
    ["invoiceTaxAccrualObservations", getInputArray(input.invoiceTaxAccrualObservations), "invoiceTaxAccrualObservationId"],
    ["invoiceTaxReversalObservations", getInputArray(input.invoiceTaxReversalObservations), "invoiceTaxReversalObservationId"],
    [
      "invoiceTaxVendorRelationshipObservations",
      getInputArray(input.invoiceTaxVendorRelationshipObservations),
      "invoiceTaxVendorRelationshipObservationId",
    ],
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

function getForwardCompatibilityWarnings(input: BuildTaxToInvoiceObservationInput): string[] {
  return [
    ...(getInputArray(input.customerMasterObservations).length > 0
      ? ["customer master intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.invoiceObservations).length > 0 ? ["invoice intelligence is a forward-compatible Phase 34 module."] : []),
    ...(getInputArray(input.methodologyObservations).length > 0
      ? ["methodology intelligence is a Phase 37 forward-compatible reference."]
      : []),
    ...(getInputArray(input.taxMethodologyObservations).length > 0
      ? ["tax methodology intelligence is a Phase 37 forward-compatible reference."]
      : []),
    ...(getInputArray(input.cashDisbursementObservations).length > 0
      ? ["cash disbursement intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.unrecordedLiabilityObservations).length > 0
      ? ["unrecorded liability intelligence is a forward-compatible Phase 34 module."]
      : []),
  ];
}

function validateInput(input: BuildTaxToInvoiceObservationInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (!hasValue(input.taxToInvoiceObservationKey)) warnings.push("taxToInvoiceObservationKey is required.");
  if (!hasValue(input.taxToInvoiceCategory)) warnings.push("taxToInvoiceCategory is required.");
  if (!isSupportedTaxToInvoiceCategory(input.taxToInvoiceCategory)) {
    warnings.push("taxToInvoiceCategory must be a supported tax-to-invoice category.");
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

export function buildTaxToInvoiceObservation(input: BuildTaxToInvoiceObservationInput): BuildTaxToInvoiceObservationResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      taxToInvoiceObservation: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const allArtifacts = getAllAuditArtifacts(input);
  const domainObservations = getDomainObservations(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    taxToInvoiceObservation: {
      taxToInvoiceObservationId: buildTaxToInvoiceObservationId(input),
      taxToInvoiceObservationKey: input.taxToInvoiceObservationKey,
      taxToInvoiceCategory: input.taxToInvoiceCategory,
      companyId: auditContract.scope.companyId,
      auditCategory: getAuditCategory(auditContract),
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      taxIntelligenceObservationIds: getObservationIds(getInputArray(input.taxIntelligenceObservations), "taxIntelligenceObservationId"),
      customerTaxValidationObservationIds: getObservationIds(
        getInputArray(input.customerTaxValidationObservations),
        "customerTaxValidationObservationId",
      ),
      salesTaxRemittanceObservationIds: getObservationIds(
        getInputArray(input.salesTaxRemittanceObservations),
        "salesTaxRemittanceObservationId",
      ),
      revenueIntelligenceObservationIds: getObservationIds(
        getInputArray(input.revenueIntelligenceObservations),
        "revenueIntelligenceObservationId",
      ),
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
      anomalyIntelligenceObservationIds: getObservationIds(
        getInputArray(input.anomalyIntelligenceObservations),
        "anomalyIntelligenceObservationId",
      ),
      fluxIntelligenceObservationIds: getObservationIds(getInputArray(input.fluxIntelligenceObservations), "fluxIntelligenceObservationId"),
      cutoffIntelligenceObservationIds: getObservationIds(getInputArray(input.cutoffIntelligenceObservations), "cutoffIntelligenceObservationId"),
      periodEndActivityObservationIds: getObservationIds(getInputArray(input.periodEndActivityObservations), "periodEndActivityObservationId"),
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
      journalTestingObservationIds: getObservationIds(getInputArray(input.journalTestingObservations), "journalTestingObservationId"),
      reconciliationObservationIds: getObservationIds(getInputArray(input.reconciliationObservations), "reconciliationObservationId"),
      cashApplicationObservationIds: getObservationIds(getInputArray(input.cashApplicationObservations), "cashApplicationObservationId"),
      bankActivityObservationIds: getObservationIds(getInputArray(input.bankActivityObservations), "bankActivityObservationId"),
      cashDisbursementObservationIds: getObservationIds(getInputArray(input.cashDisbursementObservations), "cashDisbursementObservationId"),
      reserveIntelligenceObservationIds: getObservationIds(getInputArray(input.reserveIntelligenceObservations), "reserveIntelligenceObservationId"),
      unrecordedLiabilityObservationIds: getObservationIds(
        getInputArray(input.unrecordedLiabilityObservations),
        "unrecordedLiabilityObservationId",
      ),
      customerMasterObservationIds: getObservationIds(getInputArray(input.customerMasterObservations), "customerMasterObservationId"),
      invoiceObservationIds: getObservationIds(getInputArray(input.invoiceObservations), "invoiceObservationId"),
      methodologyObservationIds: getObservationIds(getInputArray(input.methodologyObservations), "methodologyObservationId"),
      taxMethodologyObservationIds: getObservationIds(getInputArray(input.taxMethodologyObservations), "taxMethodologyObservationId"),
      invoiceTaxAccrualObservationIds: getObservationIds(
        getInputArray(input.invoiceTaxAccrualObservations),
        "invoiceTaxAccrualObservationId",
      ),
      invoiceTaxReversalObservationIds: getObservationIds(
        getInputArray(input.invoiceTaxReversalObservations),
        "invoiceTaxReversalObservationId",
      ),
      invoiceTaxVendorRelationshipObservationIds: getObservationIds(
        getInputArray(input.invoiceTaxVendorRelationshipObservations),
        "invoiceTaxVendorRelationshipObservationId",
      ),
      auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
      auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
      auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
      auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
      auditFindingIds: getReferenceIds(input, "auditFindingId", "auditFindingIds"),
      auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
      auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
      auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
      auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
      taxToInvoiceReferenceIds: getTaxToInvoiceReferenceIds(input),
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
      taxIntelligenceObservations: getInputArray(input.taxIntelligenceObservations),
      customerTaxValidationObservations: getInputArray(input.customerTaxValidationObservations),
      salesTaxRemittanceObservations: getInputArray(input.salesTaxRemittanceObservations),
      revenueIntelligenceObservations: getInputArray(input.revenueIntelligenceObservations),
      financialStatementRelationshipObservations: getInputArray(input.financialStatementRelationshipObservations),
      balanceSheetIntegrityObservations: getInputArray(input.balanceSheetIntegrityObservations),
      continuousAuditObservations: getInputArray(input.continuousAuditObservations),
      continuousControllerObservations: getInputArray(input.continuousControllerObservations),
      anomalyIntelligenceObservations: getInputArray(input.anomalyIntelligenceObservations),
      fluxIntelligenceObservations: getInputArray(input.fluxIntelligenceObservations),
      cutoffIntelligenceObservations: getInputArray(input.cutoffIntelligenceObservations),
      periodEndActivityObservations: getInputArray(input.periodEndActivityObservations),
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
      journalTestingObservations: getInputArray(input.journalTestingObservations),
      reconciliationObservations: getInputArray(input.reconciliationObservations),
      cashApplicationObservations: getInputArray(input.cashApplicationObservations),
      bankActivityObservations: getInputArray(input.bankActivityObservations),
      cashDisbursementObservations: getInputArray(input.cashDisbursementObservations),
      reserveIntelligenceObservations: getInputArray(input.reserveIntelligenceObservations),
      unrecordedLiabilityObservations: getInputArray(input.unrecordedLiabilityObservations),
      customerMasterObservations: getInputArray(input.customerMasterObservations),
      invoiceObservations: getInputArray(input.invoiceObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      taxMethodologyObservations: getInputArray(input.taxMethodologyObservations),
      invoiceTaxAccrualObservations: getInputArray(input.invoiceTaxAccrualObservations),
      invoiceTaxReversalObservations: getInputArray(input.invoiceTaxReversalObservations),
      invoiceTaxVendorRelationshipObservations: getInputArray(input.invoiceTaxVendorRelationshipObservations),
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
