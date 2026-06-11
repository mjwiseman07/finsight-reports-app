import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticAnomalyIntelligenceObservation } from "../anomaly-intelligence";
import type { SyntheticAuditCoverageObservation } from "../audit-coverage";
import type { SyntheticAuditReadinessObservation } from "../audit-readiness";
import type { SyntheticAuditScheduleObservation } from "../audit-schedules";
import type { SyntheticAuditTieOutObservation } from "../audit-tie-outs";
import type { SyntheticBalanceSheetIntegrityObservation } from "../balance-sheet-integrity";
import type { SyntheticAuditBriefing } from "../briefings";
import type { SyntheticCashDisbursementObservation } from "../cash-disbursement";
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
import type { SyntheticSalesTaxRemittanceObservation } from "../sales-tax-remittance";
import type { SyntheticScheduleCompletenessObservation } from "../schedule-completeness";
import type { SyntheticAuditSurface } from "../surfaces";
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

export type SyntheticUnrecordedLiabilityCategory =
  | "unrecorded_liability_candidate"
  | "liability_relationship_candidate"
  | "liability_documentation_candidate"
  | "liability_support_candidate"
  | "liability_period_candidate"
  | "liability_cutoff_candidate"
  | "liability_reconciliation_candidate"
  | "liability_readiness_candidate"
  | "liability_intelligence_candidate"
  | "accrual_candidate"
  | "accrual_relationship_candidate"
  | "accrual_gap_candidate"
  | "missing_accrual_candidate"
  | "expected_accrual_candidate"
  | "vendor_accrual_candidate"
  | "invoice_accrual_candidate"
  | "period_end_accrual_candidate"
  | "cutoff_accrual_candidate"
  | "recurring_accrual_candidate"
  | "liability_pattern_candidate"
  | "liability_anomaly_candidate"
  | "liability_timing_candidate"
  | "liability_concentration_candidate"
  | "liability_balance_sheet_candidate"
  | "liability_financial_statement_relationship";

export const SYNTHETIC_UNRECORDED_LIABILITY_CATEGORIES: SyntheticUnrecordedLiabilityCategory[] = [
  "unrecorded_liability_candidate",
  "liability_relationship_candidate",
  "liability_documentation_candidate",
  "liability_support_candidate",
  "liability_period_candidate",
  "liability_cutoff_candidate",
  "liability_reconciliation_candidate",
  "liability_readiness_candidate",
  "liability_intelligence_candidate",
  "accrual_candidate",
  "accrual_relationship_candidate",
  "accrual_gap_candidate",
  "missing_accrual_candidate",
  "expected_accrual_candidate",
  "vendor_accrual_candidate",
  "invoice_accrual_candidate",
  "period_end_accrual_candidate",
  "cutoff_accrual_candidate",
  "recurring_accrual_candidate",
  "liability_pattern_candidate",
  "liability_anomaly_candidate",
  "liability_timing_candidate",
  "liability_concentration_candidate",
  "liability_balance_sheet_candidate",
  "liability_financial_statement_relationship",
];

export interface SyntheticUnrecordedLiabilityIsolationDimension {
  required: boolean;
  referenceIds: string[];
}

export interface SyntheticUnrecordedLiabilityForwardCompatibleObservation {
  accountsPayableObservationId?: string;
  vendorObservationId?: string;
  invoiceObservationId?: string;
  methodologyObservationId?: string;
  accrualObservationId?: string;
  missingAccrualObservationId?: string;
  expectedAccrualObservationId?: string;
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

export interface BuildUnrecordedLiabilityObservationInput {
  auditContract: SyntheticAuditContract | null;
  unrecordedLiabilityObservationKey: string;
  unrecordedLiabilityCategory: SyntheticUnrecordedLiabilityCategory;
  missingActivityObservations?: SyntheticMissingActivityObservation[];
  expectedActivityObservations?: SyntheticExpectedActivityObservation[];
  recurringPatternObservations?: SyntheticRecurringPatternObservation[];
  cutoffIntelligenceObservations?: SyntheticCutoffIntelligenceObservation[];
  periodEndActivityObservations?: SyntheticPeriodEndActivityObservation[];
  reconciliationObservations?: SyntheticReconciliationObservation[];
  journalTestingObservations?: SyntheticJournalTestingObservation[];
  anomalyIntelligenceObservations?: SyntheticAnomalyIntelligenceObservation[];
  fluxIntelligenceObservations?: SyntheticFluxIntelligenceObservation[];
  debtCovenantObservations?: SyntheticDebtCovenantObservation[];
  prepaidIntelligenceObservations?: SyntheticPrepaidIntelligenceObservation[];
  cashDisbursementObservations?: SyntheticCashDisbursementObservation[];
  salesTaxRemittanceObservations?: SyntheticSalesTaxRemittanceObservation[];
  taxToInvoiceObservations?: SyntheticTaxToInvoiceObservation[];
  financialStatementRelationshipObservations?: SyntheticFinancialStatementRelationshipObservation[];
  balanceSheetIntegrityObservations?: SyntheticBalanceSheetIntegrityObservation[];
  continuousAuditObservations?: SyntheticContinuousAuditObservation[];
  continuousControllerObservations?: SyntheticContinuousControllerObservation[];
  auditReadinessObservations?: SyntheticAuditReadinessObservation[];
  trustVerificationObservations?: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations?: SyntheticPlatformIntegrityObservation[];
  auditCoverageObservations?: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations?: SyntheticEvidenceSufficiencyObservation[];
  pbcRequestObservations?: SyntheticPbcRequestObservation[];
  auditScheduleObservations?: SyntheticAuditScheduleObservation[];
  auditTieOutObservations?: SyntheticAuditTieOutObservation[];
  scheduleCompletenessObservations?: SyntheticScheduleCompletenessObservation[];
  accountsPayableObservations?: SyntheticUnrecordedLiabilityForwardCompatibleObservation[];
  vendorObservations?: SyntheticUnrecordedLiabilityForwardCompatibleObservation[];
  invoiceObservations?: SyntheticUnrecordedLiabilityForwardCompatibleObservation[];
  methodologyObservations?: SyntheticUnrecordedLiabilityForwardCompatibleObservation[];
  accrualObservations?: SyntheticUnrecordedLiabilityForwardCompatibleObservation[];
  missingAccrualObservations?: SyntheticUnrecordedLiabilityForwardCompatibleObservation[];
  expectedAccrualObservations?: SyntheticUnrecordedLiabilityForwardCompatibleObservation[];
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticUnrecordedLiabilityObservation {
  unrecordedLiabilityObservationId: string;
  unrecordedLiabilityObservationKey: string;
  unrecordedLiabilityCategory: SyntheticUnrecordedLiabilityCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticUnrecordedLiabilityIsolationDimension;
  firmIsolation: SyntheticUnrecordedLiabilityIsolationDimension;
  clientIsolation: SyntheticUnrecordedLiabilityIsolationDimension;
  missingActivityObservationIds: string[];
  expectedActivityObservationIds: string[];
  recurringPatternObservationIds: string[];
  cutoffIntelligenceObservationIds: string[];
  periodEndActivityObservationIds: string[];
  reconciliationObservationIds: string[];
  journalTestingObservationIds: string[];
  anomalyIntelligenceObservationIds: string[];
  fluxIntelligenceObservationIds: string[];
  debtCovenantObservationIds: string[];
  prepaidIntelligenceObservationIds: string[];
  cashDisbursementObservationIds: string[];
  salesTaxRemittanceObservationIds: string[];
  taxToInvoiceObservationIds: string[];
  financialStatementRelationshipObservationIds: string[];
  balanceSheetIntegrityObservationIds: string[];
  continuousAuditObservationIds: string[];
  continuousControllerObservationIds: string[];
  auditReadinessObservationIds: string[];
  trustVerificationObservationIds: string[];
  platformIntegrityObservationIds: string[];
  auditCoverageObservationIds: string[];
  evidenceSufficiencyObservationIds: string[];
  pbcRequestObservationIds: string[];
  auditScheduleObservationIds: string[];
  auditTieOutObservationIds: string[];
  scheduleCompletenessObservationIds: string[];
  accountsPayableObservationIds: string[];
  vendorObservationIds: string[];
  invoiceObservationIds: string[];
  methodologyObservationIds: string[];
  accrualObservationIds: string[];
  missingAccrualObservationIds: string[];
  expectedAccrualObservationIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  unrecordedLiabilityReferenceIds: string[];
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
  cutoffIntelligenceObservations: SyntheticCutoffIntelligenceObservation[];
  periodEndActivityObservations: SyntheticPeriodEndActivityObservation[];
  reconciliationObservations: SyntheticReconciliationObservation[];
  journalTestingObservations: SyntheticJournalTestingObservation[];
  anomalyIntelligenceObservations: SyntheticAnomalyIntelligenceObservation[];
  fluxIntelligenceObservations: SyntheticFluxIntelligenceObservation[];
  debtCovenantObservations: SyntheticDebtCovenantObservation[];
  prepaidIntelligenceObservations: SyntheticPrepaidIntelligenceObservation[];
  cashDisbursementObservations: SyntheticCashDisbursementObservation[];
  salesTaxRemittanceObservations: SyntheticSalesTaxRemittanceObservation[];
  taxToInvoiceObservations: SyntheticTaxToInvoiceObservation[];
  financialStatementRelationshipObservations: SyntheticFinancialStatementRelationshipObservation[];
  balanceSheetIntegrityObservations: SyntheticBalanceSheetIntegrityObservation[];
  continuousAuditObservations: SyntheticContinuousAuditObservation[];
  continuousControllerObservations: SyntheticContinuousControllerObservation[];
  auditReadinessObservations: SyntheticAuditReadinessObservation[];
  trustVerificationObservations: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations: SyntheticPlatformIntegrityObservation[];
  auditCoverageObservations: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations: SyntheticEvidenceSufficiencyObservation[];
  pbcRequestObservations: SyntheticPbcRequestObservation[];
  auditScheduleObservations: SyntheticAuditScheduleObservation[];
  auditTieOutObservations: SyntheticAuditTieOutObservation[];
  scheduleCompletenessObservations: SyntheticScheduleCompletenessObservation[];
  accountsPayableObservations: SyntheticUnrecordedLiabilityForwardCompatibleObservation[];
  vendorObservations: SyntheticUnrecordedLiabilityForwardCompatibleObservation[];
  invoiceObservations: SyntheticUnrecordedLiabilityForwardCompatibleObservation[];
  methodologyObservations: SyntheticUnrecordedLiabilityForwardCompatibleObservation[];
  accrualObservations: SyntheticUnrecordedLiabilityForwardCompatibleObservation[];
  missingAccrualObservations: SyntheticUnrecordedLiabilityForwardCompatibleObservation[];
  expectedAccrualObservations: SyntheticUnrecordedLiabilityForwardCompatibleObservation[];
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildUnrecordedLiabilityObservationResult {
  unrecordedLiabilityObservation: SyntheticUnrecordedLiabilityObservation | null;
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

function isSupportedUnrecordedLiabilityCategory(category: SyntheticUnrecordedLiabilityCategory): boolean {
  return SYNTHETIC_UNRECORDED_LIABILITY_CATEGORIES.includes(category);
}

function buildCustomerIsolation(scope: SyntheticAuditScope): SyntheticUnrecordedLiabilityIsolationDimension {
  return { required: scope.customerIsolationRequired, referenceIds: scope.isolationBoundaryIds };
}

function buildFirmIsolation(scope: SyntheticAuditScope): SyntheticUnrecordedLiabilityIsolationDimension {
  return {
    required: scope.firmIsolationRequired,
    referenceIds: uniqueStable([scope.firmId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function buildClientIsolation(scope: SyntheticAuditScope): SyntheticUnrecordedLiabilityIsolationDimension {
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

function getDomainObservations(input: BuildUnrecordedLiabilityObservationInput): object[] {
  return [
    ...getInputArray(input.missingActivityObservations),
    ...getInputArray(input.expectedActivityObservations),
    ...getInputArray(input.recurringPatternObservations),
    ...getInputArray(input.cutoffIntelligenceObservations),
    ...getInputArray(input.periodEndActivityObservations),
    ...getInputArray(input.reconciliationObservations),
    ...getInputArray(input.journalTestingObservations),
    ...getInputArray(input.anomalyIntelligenceObservations),
    ...getInputArray(input.fluxIntelligenceObservations),
    ...getInputArray(input.debtCovenantObservations),
    ...getInputArray(input.prepaidIntelligenceObservations),
    ...getInputArray(input.cashDisbursementObservations),
    ...getInputArray(input.salesTaxRemittanceObservations),
    ...getInputArray(input.taxToInvoiceObservations),
    ...getInputArray(input.financialStatementRelationshipObservations),
    ...getInputArray(input.balanceSheetIntegrityObservations),
    ...getInputArray(input.continuousAuditObservations),
    ...getInputArray(input.continuousControllerObservations),
    ...getInputArray(input.auditReadinessObservations),
    ...getInputArray(input.trustVerificationObservations),
    ...getInputArray(input.platformIntegrityObservations),
    ...getInputArray(input.auditCoverageObservations),
    ...getInputArray(input.evidenceSufficiencyObservations),
    ...getInputArray(input.pbcRequestObservations),
    ...getInputArray(input.auditScheduleObservations),
    ...getInputArray(input.auditTieOutObservations),
    ...getInputArray(input.scheduleCompletenessObservations),
    ...getInputArray(input.accountsPayableObservations),
    ...getInputArray(input.vendorObservations),
    ...getInputArray(input.invoiceObservations),
    ...getInputArray(input.methodologyObservations),
    ...getInputArray(input.accrualObservations),
    ...getInputArray(input.missingAccrualObservations),
    ...getInputArray(input.expectedAccrualObservations),
  ];
}

function getAuditCandidates(input: BuildUnrecordedLiabilityObservationInput): SyntheticAuditCandidate[] {
  return getInputArray(input.auditCandidates);
}

function getAuditEvidencePackages(input: BuildUnrecordedLiabilityObservationInput): SyntheticAuditEvidencePackage[] {
  return getInputArray(input.auditEvidencePackages);
}

function getAuditFindings(input: BuildUnrecordedLiabilityObservationInput): SyntheticAuditFinding[] {
  return getInputArray(input.auditFindings);
}

function getAuditConfidencePackages(input: BuildUnrecordedLiabilityObservationInput): SyntheticAuditConfidence[] {
  return getInputArray(input.auditConfidencePackages);
}

function getAuditSurfaces(input: BuildUnrecordedLiabilityObservationInput): SyntheticAuditSurface[] {
  return getInputArray(input.auditSurfaces);
}

function getAuditWatchlists(input: BuildUnrecordedLiabilityObservationInput): SyntheticAuditWatchlist[] {
  return getInputArray(input.auditWatchlists);
}

function getAuditBriefings(input: BuildUnrecordedLiabilityObservationInput): SyntheticAuditBriefing[] {
  return getInputArray(input.auditBriefings);
}

function getAllAuditArtifacts(input: BuildUnrecordedLiabilityObservationInput): AuditArtifact[] {
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
  input: BuildUnrecordedLiabilityObservationInput,
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

function getEvidenceReferenceIds(input: BuildUnrecordedLiabilityObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "evidenceReferenceIds")),
  ]);
}

function getSourceReferenceIds(input: BuildUnrecordedLiabilityObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "sourceReferenceIds")),
  ]);
}

function getLineageReferenceIds(input: BuildUnrecordedLiabilityObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "lineageReferenceIds")),
  ]);
}

function getAuditContractReferenceIdsFromInput(input: BuildUnrecordedLiabilityObservationInput): string[] {
  return uniqueStable([
    ...getAuditContractReferenceIds(input.auditContract),
    ...getAllAuditArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "auditContractReferenceIds")),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditContractReferenceIds")),
  ]);
}

function getReferenceIds(input: BuildUnrecordedLiabilityObservationInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, singularName),
      ...getStringArrayProperty(artifact, arrayName),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, arrayName)),
  ]);
}

function getUnrecordedLiabilityReferenceIds(input: BuildUnrecordedLiabilityObservationInput): string[] {
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

function getUnrecordedLiabilityObservationIds(input: BuildUnrecordedLiabilityObservationInput): Record<string, string[]> {
  return {
    missingActivityObservationIds: getObservationIds(getInputArray(input.missingActivityObservations), "missingActivityObservationId"),
    expectedActivityObservationIds: getObservationIds(getInputArray(input.expectedActivityObservations), "expectedActivityObservationId"),
    recurringPatternObservationIds: getObservationIds(getInputArray(input.recurringPatternObservations), "recurringPatternObservationId"),
    cutoffIntelligenceObservationIds: getObservationIds(getInputArray(input.cutoffIntelligenceObservations), "cutoffIntelligenceObservationId"),
    periodEndActivityObservationIds: getObservationIds(getInputArray(input.periodEndActivityObservations), "periodEndActivityObservationId"),
    reconciliationObservationIds: getObservationIds(getInputArray(input.reconciliationObservations), "reconciliationObservationId"),
    journalTestingObservationIds: getObservationIds(getInputArray(input.journalTestingObservations), "journalTestingObservationId"),
    anomalyIntelligenceObservationIds: getObservationIds(
      getInputArray(input.anomalyIntelligenceObservations),
      "anomalyIntelligenceObservationId",
    ),
    fluxIntelligenceObservationIds: getObservationIds(getInputArray(input.fluxIntelligenceObservations), "fluxIntelligenceObservationId"),
    debtCovenantObservationIds: getObservationIds(getInputArray(input.debtCovenantObservations), "debtCovenantObservationId"),
    prepaidIntelligenceObservationIds: getObservationIds(
      getInputArray(input.prepaidIntelligenceObservations),
      "prepaidIntelligenceObservationId",
    ),
    cashDisbursementObservationIds: getObservationIds(getInputArray(input.cashDisbursementObservations), "cashDisbursementObservationId"),
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
    accountsPayableObservationIds: getObservationIds(getInputArray(input.accountsPayableObservations), "accountsPayableObservationId"),
    vendorObservationIds: getObservationIds(getInputArray(input.vendorObservations), "vendorObservationId"),
    invoiceObservationIds: getObservationIds(getInputArray(input.invoiceObservations), "invoiceObservationId"),
    methodologyObservationIds: getObservationIds(getInputArray(input.methodologyObservations), "methodologyObservationId"),
    accrualObservationIds: getObservationIds(getInputArray(input.accrualObservations), "accrualObservationId"),
    missingAccrualObservationIds: getObservationIds(getInputArray(input.missingAccrualObservations), "missingAccrualObservationId"),
    expectedAccrualObservationIds: getObservationIds(getInputArray(input.expectedAccrualObservations), "expectedAccrualObservationId"),
  };
}

function buildUnrecordedLiabilityObservationId(input: BuildUnrecordedLiabilityObservationInput): string {
  return `synthetic-unrecorded-liability-observation:${stableSnapshotHash({
    unrecordedLiabilityObservationKey: input.unrecordedLiabilityObservationKey,
    unrecordedLiabilityCategory: input.unrecordedLiabilityCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    customerIsolation: input.auditContract ? buildCustomerIsolation(input.auditContract.scope) : null,
    firmIsolation: input.auditContract ? buildFirmIsolation(input.auditContract.scope) : null,
    clientIsolation: input.auditContract ? buildClientIsolation(input.auditContract.scope) : null,
    ...getUnrecordedLiabilityObservationIds(input),
    auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
    auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
    auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
    auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
    auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
    auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
    auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
    auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
    unrecordedLiabilityReferenceIds: getUnrecordedLiabilityReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  })}`;
}

function validateAuditArtifacts(input: BuildUnrecordedLiabilityObservationInput, warnings: string[]): void {
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

function validateDomainObservationIds(input: BuildUnrecordedLiabilityObservationInput, warnings: string[]): void {
  const companyId = input.auditContract?.scope.companyId;
  for (const [observationName, observations, idField] of [
    ["missingActivityObservations", getInputArray(input.missingActivityObservations), "missingActivityObservationId"],
    ["expectedActivityObservations", getInputArray(input.expectedActivityObservations), "expectedActivityObservationId"],
    ["recurringPatternObservations", getInputArray(input.recurringPatternObservations), "recurringPatternObservationId"],
    ["cutoffIntelligenceObservations", getInputArray(input.cutoffIntelligenceObservations), "cutoffIntelligenceObservationId"],
    ["periodEndActivityObservations", getInputArray(input.periodEndActivityObservations), "periodEndActivityObservationId"],
    ["reconciliationObservations", getInputArray(input.reconciliationObservations), "reconciliationObservationId"],
    ["journalTestingObservations", getInputArray(input.journalTestingObservations), "journalTestingObservationId"],
    ["anomalyIntelligenceObservations", getInputArray(input.anomalyIntelligenceObservations), "anomalyIntelligenceObservationId"],
    ["fluxIntelligenceObservations", getInputArray(input.fluxIntelligenceObservations), "fluxIntelligenceObservationId"],
    ["debtCovenantObservations", getInputArray(input.debtCovenantObservations), "debtCovenantObservationId"],
    ["prepaidIntelligenceObservations", getInputArray(input.prepaidIntelligenceObservations), "prepaidIntelligenceObservationId"],
    ["cashDisbursementObservations", getInputArray(input.cashDisbursementObservations), "cashDisbursementObservationId"],
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
    ["auditReadinessObservations", getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"],
    ["trustVerificationObservations", getInputArray(input.trustVerificationObservations), "trustVerificationObservationId"],
    ["platformIntegrityObservations", getInputArray(input.platformIntegrityObservations), "platformIntegrityObservationId"],
    ["auditCoverageObservations", getInputArray(input.auditCoverageObservations), "auditCoverageObservationId"],
    ["evidenceSufficiencyObservations", getInputArray(input.evidenceSufficiencyObservations), "evidenceSufficiencyObservationId"],
    ["pbcRequestObservations", getInputArray(input.pbcRequestObservations), "pbcRequestObservationId"],
    ["auditScheduleObservations", getInputArray(input.auditScheduleObservations), "auditScheduleObservationId"],
    ["auditTieOutObservations", getInputArray(input.auditTieOutObservations), "auditTieOutObservationId"],
    ["scheduleCompletenessObservations", getInputArray(input.scheduleCompletenessObservations), "scheduleCompletenessObservationId"],
    ["accountsPayableObservations", getInputArray(input.accountsPayableObservations), "accountsPayableObservationId"],
    ["vendorObservations", getInputArray(input.vendorObservations), "vendorObservationId"],
    ["invoiceObservations", getInputArray(input.invoiceObservations), "invoiceObservationId"],
    ["methodologyObservations", getInputArray(input.methodologyObservations), "methodologyObservationId"],
    ["accrualObservations", getInputArray(input.accrualObservations), "accrualObservationId"],
    ["missingAccrualObservations", getInputArray(input.missingAccrualObservations), "missingAccrualObservationId"],
    ["expectedAccrualObservations", getInputArray(input.expectedAccrualObservations), "expectedAccrualObservationId"],
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

function getForwardCompatibilityWarnings(input: BuildUnrecordedLiabilityObservationInput): string[] {
  return [
    ...(getInputArray(input.accountsPayableObservations).length > 0
      ? ["accounts payable intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.vendorObservations).length > 0 ? ["vendor intelligence is a forward-compatible Phase 34 module."] : []),
    ...(getInputArray(input.invoiceObservations).length > 0 ? ["invoice intelligence is a forward-compatible Phase 34 module."] : []),
    ...(getInputArray(input.methodologyObservations).length > 0
      ? ["methodology intelligence is a Phase 37 forward-compatible reference."]
      : []),
  ];
}

function validateInput(input: BuildUnrecordedLiabilityObservationInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (!hasValue(input.unrecordedLiabilityObservationKey)) warnings.push("unrecordedLiabilityObservationKey is required.");
  if (!hasValue(input.unrecordedLiabilityCategory)) warnings.push("unrecordedLiabilityCategory is required.");
  if (!isSupportedUnrecordedLiabilityCategory(input.unrecordedLiabilityCategory)) {
    warnings.push("unrecordedLiabilityCategory must be a supported unrecorded liability category.");
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

export function buildUnrecordedLiabilityObservation(
  input: BuildUnrecordedLiabilityObservationInput,
): BuildUnrecordedLiabilityObservationResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      unrecordedLiabilityObservation: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const allArtifacts = getAllAuditArtifacts(input);
  const domainObservations = getDomainObservations(input);
  const warnings = getForwardCompatibilityWarnings(input);
  const observationIds = getUnrecordedLiabilityObservationIds(input);

  return {
    unrecordedLiabilityObservation: {
      unrecordedLiabilityObservationId: buildUnrecordedLiabilityObservationId(input),
      unrecordedLiabilityObservationKey: input.unrecordedLiabilityObservationKey,
      unrecordedLiabilityCategory: input.unrecordedLiabilityCategory,
      companyId: auditContract.scope.companyId,
      auditCategory: getAuditCategory(auditContract),
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      missingActivityObservationIds: observationIds.missingActivityObservationIds,
      expectedActivityObservationIds: observationIds.expectedActivityObservationIds,
      recurringPatternObservationIds: observationIds.recurringPatternObservationIds,
      cutoffIntelligenceObservationIds: observationIds.cutoffIntelligenceObservationIds,
      periodEndActivityObservationIds: observationIds.periodEndActivityObservationIds,
      reconciliationObservationIds: observationIds.reconciliationObservationIds,
      journalTestingObservationIds: observationIds.journalTestingObservationIds,
      anomalyIntelligenceObservationIds: observationIds.anomalyIntelligenceObservationIds,
      fluxIntelligenceObservationIds: observationIds.fluxIntelligenceObservationIds,
      debtCovenantObservationIds: observationIds.debtCovenantObservationIds,
      prepaidIntelligenceObservationIds: observationIds.prepaidIntelligenceObservationIds,
      cashDisbursementObservationIds: observationIds.cashDisbursementObservationIds,
      salesTaxRemittanceObservationIds: observationIds.salesTaxRemittanceObservationIds,
      taxToInvoiceObservationIds: observationIds.taxToInvoiceObservationIds,
      financialStatementRelationshipObservationIds: observationIds.financialStatementRelationshipObservationIds,
      balanceSheetIntegrityObservationIds: observationIds.balanceSheetIntegrityObservationIds,
      continuousAuditObservationIds: observationIds.continuousAuditObservationIds,
      continuousControllerObservationIds: observationIds.continuousControllerObservationIds,
      auditReadinessObservationIds: observationIds.auditReadinessObservationIds,
      trustVerificationObservationIds: observationIds.trustVerificationObservationIds,
      platformIntegrityObservationIds: observationIds.platformIntegrityObservationIds,
      auditCoverageObservationIds: observationIds.auditCoverageObservationIds,
      evidenceSufficiencyObservationIds: observationIds.evidenceSufficiencyObservationIds,
      pbcRequestObservationIds: observationIds.pbcRequestObservationIds,
      auditScheduleObservationIds: observationIds.auditScheduleObservationIds,
      auditTieOutObservationIds: observationIds.auditTieOutObservationIds,
      scheduleCompletenessObservationIds: observationIds.scheduleCompletenessObservationIds,
      accountsPayableObservationIds: observationIds.accountsPayableObservationIds,
      vendorObservationIds: observationIds.vendorObservationIds,
      invoiceObservationIds: observationIds.invoiceObservationIds,
      methodologyObservationIds: observationIds.methodologyObservationIds,
      accrualObservationIds: observationIds.accrualObservationIds,
      missingAccrualObservationIds: observationIds.missingAccrualObservationIds,
      expectedAccrualObservationIds: observationIds.expectedAccrualObservationIds,
      auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
      auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
      auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
      auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
      auditFindingIds: getReferenceIds(input, "auditFindingId", "auditFindingIds"),
      auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
      auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
      auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
      auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
      unrecordedLiabilityReferenceIds: getUnrecordedLiabilityReferenceIds(input),
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
      cutoffIntelligenceObservations: getInputArray(input.cutoffIntelligenceObservations),
      periodEndActivityObservations: getInputArray(input.periodEndActivityObservations),
      reconciliationObservations: getInputArray(input.reconciliationObservations),
      journalTestingObservations: getInputArray(input.journalTestingObservations),
      anomalyIntelligenceObservations: getInputArray(input.anomalyIntelligenceObservations),
      fluxIntelligenceObservations: getInputArray(input.fluxIntelligenceObservations),
      debtCovenantObservations: getInputArray(input.debtCovenantObservations),
      prepaidIntelligenceObservations: getInputArray(input.prepaidIntelligenceObservations),
      cashDisbursementObservations: getInputArray(input.cashDisbursementObservations),
      salesTaxRemittanceObservations: getInputArray(input.salesTaxRemittanceObservations),
      taxToInvoiceObservations: getInputArray(input.taxToInvoiceObservations),
      financialStatementRelationshipObservations: getInputArray(input.financialStatementRelationshipObservations),
      balanceSheetIntegrityObservations: getInputArray(input.balanceSheetIntegrityObservations),
      continuousAuditObservations: getInputArray(input.continuousAuditObservations),
      continuousControllerObservations: getInputArray(input.continuousControllerObservations),
      auditReadinessObservations: getInputArray(input.auditReadinessObservations),
      trustVerificationObservations: getInputArray(input.trustVerificationObservations),
      platformIntegrityObservations: getInputArray(input.platformIntegrityObservations),
      auditCoverageObservations: getInputArray(input.auditCoverageObservations),
      evidenceSufficiencyObservations: getInputArray(input.evidenceSufficiencyObservations),
      pbcRequestObservations: getInputArray(input.pbcRequestObservations),
      auditScheduleObservations: getInputArray(input.auditScheduleObservations),
      auditTieOutObservations: getInputArray(input.auditTieOutObservations),
      scheduleCompletenessObservations: getInputArray(input.scheduleCompletenessObservations),
      accountsPayableObservations: getInputArray(input.accountsPayableObservations),
      vendorObservations: getInputArray(input.vendorObservations),
      invoiceObservations: getInputArray(input.invoiceObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      accrualObservations: getInputArray(input.accrualObservations),
      missingAccrualObservations: getInputArray(input.missingAccrualObservations),
      expectedAccrualObservations: getInputArray(input.expectedAccrualObservations),
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
