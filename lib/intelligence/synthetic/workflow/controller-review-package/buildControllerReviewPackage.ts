import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticAnomalyIntelligenceObservation } from "../../audit/anomaly-intelligence";
import type { SyntheticAuditReadinessObservation } from "../../audit/audit-readiness";
import type { SyntheticBalanceSheetIntegrityObservation } from "../../audit/balance-sheet-integrity";
import type { SyntheticBankActivityObservation } from "../../audit/bank-activity";
import type { SyntheticAuditBriefing } from "../../audit/briefings";
import type { SyntheticCashApplicationObservation } from "../../audit/cash-application";
import type { SyntheticCashDisbursementObservation } from "../../audit/cash-disbursement";
import type { SyntheticAuditCandidate } from "../../audit/candidates";
import type { SyntheticAuditConfidence } from "../../audit/confidence";
import type { SyntheticContinuousAuditObservation } from "../../audit/continuous-audit";
import type { SyntheticContinuousControllerObservation } from "../../audit/continuous-controller";
import type { SyntheticCutoffIntelligenceObservation } from "../../audit/cutoff-intelligence";
import type { SyntheticCustomerTaxValidationObservation } from "../../audit/customer-tax-validation";
import type { SyntheticDebtCovenantObservation } from "../../audit/debt-covenants";
import type { SyntheticAuditEvidencePackage } from "../../audit/evidence";
import type { SyntheticFinancialStatementRelationshipObservation } from "../../audit/financial-statement-relationships";
import type { SyntheticAuditFinding } from "../../audit/findings";
import type { SyntheticFixedAssetIntelligenceObservation } from "../../audit/fixed-asset-intelligence";
import type { SyntheticFluxIntelligenceObservation } from "../../audit/flux-intelligence";
import type { SyntheticJournalPopulationObservation } from "../../audit/journal-population";
import type { SyntheticManagementOverrideObservation } from "../../audit/management-override";
import type { SyntheticMaterialityObservation } from "../../audit/materiality";
import type { SyntheticPeriodEndActivityObservation } from "../../audit/period-end-activity";
import type { SyntheticPlatformIntegrityObservation } from "../../audit/platform-integrity";
import type { SyntheticPrepaidIntelligenceObservation } from "../../audit/prepaid-intelligence";
import type { SyntheticReconciliationObservation } from "../../audit/reconciliation";
import type { SyntheticSalesTaxRemittanceObservation } from "../../audit/sales-tax-remittance";
import type { SyntheticTaxIntelligenceObservation } from "../../audit/tax-intelligence";
import type { SyntheticTaxToInvoiceObservation } from "../../audit/tax-to-invoice";
import type { SyntheticTrustVerificationObservation } from "../../audit/trust-verification";
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
} from "../../audit/types";
import type { SyntheticUnrecordedLiabilityObservation } from "../../audit/unrecorded-liability";
import type { SyntheticAuditSurface } from "../../audit/surfaces";
import type { SyntheticAuditWatchlist } from "../../audit/watchlists";
import type { SyntheticAuditPackage } from "../audit-package";
import type { SyntheticAuditResponsePackage } from "../audit-response-package";

export type SyntheticControllerReviewPackageCategory =
  | "controller_review_package"
  | "close_health_package"
  | "controller_exception_package"
  | "balance_sheet_review_package"
  | "tax_review_package"
  | "cash_review_package"
  | "audit_context_package";

export const SYNTHETIC_CONTROLLER_REVIEW_PACKAGE_CATEGORIES: SyntheticControllerReviewPackageCategory[] = [
  "controller_review_package",
  "close_health_package",
  "controller_exception_package",
  "balance_sheet_review_package",
  "tax_review_package",
  "cash_review_package",
  "audit_context_package",
];

export interface SyntheticControllerReviewPackageIsolationDimension {
  required: boolean;
  referenceIds: string[];
}

export interface SyntheticControllerReviewForwardCompatibleObservation {
  healthcarePpdObservationId?: string;
  payrollObservationId?: string;
  methodologyObservationId?: string;
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
  materialityMetadata?: SyntheticAuditMaterialityCompatibility[];
  materialityCompatibility?: SyntheticAuditMaterialityCompatibility[];
  personaCompatibility?: SyntheticAuditPersonaCompatibility[];
  packageCompatibility?: SyntheticAuditPackageCompatibility[];
  memoryCompatibility?: SyntheticAuditMemoryCompatibility[];
  learningCompatibility?: SyntheticAuditLearningCompatibility[];
  surfaceCompatibility?: SyntheticAuditSurfaceCompatibility[];
}

export interface BuildControllerReviewPackageInput {
  auditContract: SyntheticAuditContract | null;
  packageKey: string;
  packageCategory: SyntheticControllerReviewPackageCategory;
  continuousControllerObservations?: SyntheticContinuousControllerObservation[];
  continuousAuditObservations?: SyntheticContinuousAuditObservation[];
  fluxObservations?: SyntheticFluxIntelligenceObservation[];
  anomalyObservations?: SyntheticAnomalyIntelligenceObservation[];
  balanceSheetIntegrityObservations?: SyntheticBalanceSheetIntegrityObservation[];
  financialStatementRelationshipObservations?: SyntheticFinancialStatementRelationshipObservation[];
  periodEndObservations?: SyntheticPeriodEndActivityObservation[];
  cutoffObservations?: SyntheticCutoffIntelligenceObservation[];
  reconciliationObservations?: SyntheticReconciliationObservation[];
  bankActivityObservations?: SyntheticBankActivityObservation[];
  cashApplicationObservations?: SyntheticCashApplicationObservation[];
  cashDisbursementObservations?: SyntheticCashDisbursementObservation[];
  debtCovenantObservations?: SyntheticDebtCovenantObservation[];
  prepaidObservations?: SyntheticPrepaidIntelligenceObservation[];
  fixedAssetObservations?: SyntheticFixedAssetIntelligenceObservation[];
  taxObservations?: SyntheticTaxIntelligenceObservation[];
  customerTaxValidationObservations?: SyntheticCustomerTaxValidationObservation[];
  salesTaxRemittanceObservations?: SyntheticSalesTaxRemittanceObservation[];
  taxToInvoiceObservations?: SyntheticTaxToInvoiceObservation[];
  unrecordedLiabilityObservations?: SyntheticUnrecordedLiabilityObservation[];
  managementOverrideObservations?: SyntheticManagementOverrideObservation[];
  journalPopulationObservations?: SyntheticJournalPopulationObservation[];
  materialityObservations?: SyntheticMaterialityObservation[];
  trustVerificationObservations?: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations?: SyntheticPlatformIntegrityObservation[];
  auditReadinessObservations?: SyntheticAuditReadinessObservation[];
  auditResponsePackages?: SyntheticAuditResponsePackage[];
  auditPackages?: SyntheticAuditPackage[];
  healthcarePpdObservations?: SyntheticControllerReviewForwardCompatibleObservation[];
  payrollObservations?: SyntheticControllerReviewForwardCompatibleObservation[];
  methodologyObservations?: SyntheticControllerReviewForwardCompatibleObservation[];
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticControllerReviewPackage {
  packageId: string;
  packageKey: string;
  packageCategory: SyntheticControllerReviewPackageCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticControllerReviewPackageIsolationDimension;
  firmIsolation: SyntheticControllerReviewPackageIsolationDimension;
  clientIsolation: SyntheticControllerReviewPackageIsolationDimension;
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  upstreamObservationIds: string[];
  continuousControllerObservationIds: string[];
  continuousAuditObservationIds: string[];
  fluxObservationIds: string[];
  anomalyObservationIds: string[];
  balanceSheetIntegrityObservationIds: string[];
  financialStatementRelationshipObservationIds: string[];
  periodEndObservationIds: string[];
  cutoffObservationIds: string[];
  reconciliationObservationIds: string[];
  bankActivityObservationIds: string[];
  cashApplicationObservationIds: string[];
  cashDisbursementObservationIds: string[];
  debtCovenantObservationIds: string[];
  prepaidObservationIds: string[];
  fixedAssetObservationIds: string[];
  taxObservationIds: string[];
  customerTaxValidationObservationIds: string[];
  salesTaxRemittanceObservationIds: string[];
  taxToInvoiceObservationIds: string[];
  unrecordedLiabilityObservationIds: string[];
  managementOverrideObservationIds: string[];
  journalPopulationObservationIds: string[];
  materialityObservationIds: string[];
  trustVerificationObservationIds: string[];
  platformIntegrityObservationIds: string[];
  auditReadinessObservationIds: string[];
  upstreamPackageIds: string[];
  auditResponsePackageIds: string[];
  auditPackageIds: string[];
  healthcarePpdObservationIds: string[];
  payrollObservationIds: string[];
  methodologyObservationIds: string[];
  evidence: SyntheticAuditEvidenceReferences;
  observationMetadata: SyntheticAuditObservationMetadata[];
  findingMetadata: SyntheticAuditFindingMetadata[];
  exceptionMetadata: SyntheticAuditExceptionMetadata[];
  riskMetadata: SyntheticAuditRiskMetadata[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
  materialityCompatibility: SyntheticAuditMaterialityCompatibility[];
  personaCompatibility: SyntheticAuditPersonaCompatibility[];
  packageCompatibility: SyntheticAuditPackageCompatibility[];
  memoryCompatibility: SyntheticAuditMemoryCompatibility[];
  learningCompatibility: SyntheticAuditLearningCompatibility[];
  surfaceCompatibility: SyntheticAuditSurfaceCompatibility[];
  auditContract: SyntheticAuditContract;
  continuousControllerObservations: SyntheticContinuousControllerObservation[];
  continuousAuditObservations: SyntheticContinuousAuditObservation[];
  fluxObservations: SyntheticFluxIntelligenceObservation[];
  anomalyObservations: SyntheticAnomalyIntelligenceObservation[];
  balanceSheetIntegrityObservations: SyntheticBalanceSheetIntegrityObservation[];
  financialStatementRelationshipObservations: SyntheticFinancialStatementRelationshipObservation[];
  periodEndObservations: SyntheticPeriodEndActivityObservation[];
  cutoffObservations: SyntheticCutoffIntelligenceObservation[];
  reconciliationObservations: SyntheticReconciliationObservation[];
  bankActivityObservations: SyntheticBankActivityObservation[];
  cashApplicationObservations: SyntheticCashApplicationObservation[];
  cashDisbursementObservations: SyntheticCashDisbursementObservation[];
  debtCovenantObservations: SyntheticDebtCovenantObservation[];
  prepaidObservations: SyntheticPrepaidIntelligenceObservation[];
  fixedAssetObservations: SyntheticFixedAssetIntelligenceObservation[];
  taxObservations: SyntheticTaxIntelligenceObservation[];
  customerTaxValidationObservations: SyntheticCustomerTaxValidationObservation[];
  salesTaxRemittanceObservations: SyntheticSalesTaxRemittanceObservation[];
  taxToInvoiceObservations: SyntheticTaxToInvoiceObservation[];
  unrecordedLiabilityObservations: SyntheticUnrecordedLiabilityObservation[];
  managementOverrideObservations: SyntheticManagementOverrideObservation[];
  journalPopulationObservations: SyntheticJournalPopulationObservation[];
  materialityObservations: SyntheticMaterialityObservation[];
  trustVerificationObservations: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations: SyntheticPlatformIntegrityObservation[];
  auditReadinessObservations: SyntheticAuditReadinessObservation[];
  auditResponsePackages: SyntheticAuditResponsePackage[];
  auditPackages: SyntheticAuditPackage[];
  healthcarePpdObservations: SyntheticControllerReviewForwardCompatibleObservation[];
  payrollObservations: SyntheticControllerReviewForwardCompatibleObservation[];
  methodologyObservations: SyntheticControllerReviewForwardCompatibleObservation[];
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildControllerReviewPackageResult {
  controllerReviewPackage: SyntheticControllerReviewPackage | null;
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

type UpstreamPackage = SyntheticAuditResponsePackage | SyntheticAuditPackage;

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

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
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

function isSupportedPackageCategory(category: SyntheticControllerReviewPackageCategory): boolean {
  return SYNTHETIC_CONTROLLER_REVIEW_PACKAGE_CATEGORIES.includes(category);
}

function buildCustomerIsolation(scope: SyntheticAuditScope): SyntheticControllerReviewPackageIsolationDimension {
  return { required: scope.customerIsolationRequired, referenceIds: uniqueStable([scope.companyId, ...scope.isolationBoundaryIds]) };
}

function buildFirmIsolation(scope: SyntheticAuditScope): SyntheticControllerReviewPackageIsolationDimension {
  return {
    required: scope.firmIsolationRequired,
    referenceIds: uniqueStable([scope.firmId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function buildClientIsolation(scope: SyntheticAuditScope): SyntheticControllerReviewPackageIsolationDimension {
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

function getDomainObservations(input: BuildControllerReviewPackageInput): object[] {
  return [
    ...getInputArray(input.continuousControllerObservations),
    ...getInputArray(input.continuousAuditObservations),
    ...getInputArray(input.fluxObservations),
    ...getInputArray(input.anomalyObservations),
    ...getInputArray(input.balanceSheetIntegrityObservations),
    ...getInputArray(input.financialStatementRelationshipObservations),
    ...getInputArray(input.periodEndObservations),
    ...getInputArray(input.cutoffObservations),
    ...getInputArray(input.reconciliationObservations),
    ...getInputArray(input.bankActivityObservations),
    ...getInputArray(input.cashApplicationObservations),
    ...getInputArray(input.cashDisbursementObservations),
    ...getInputArray(input.debtCovenantObservations),
    ...getInputArray(input.prepaidObservations),
    ...getInputArray(input.fixedAssetObservations),
    ...getInputArray(input.taxObservations),
    ...getInputArray(input.customerTaxValidationObservations),
    ...getInputArray(input.salesTaxRemittanceObservations),
    ...getInputArray(input.taxToInvoiceObservations),
    ...getInputArray(input.unrecordedLiabilityObservations),
    ...getInputArray(input.managementOverrideObservations),
    ...getInputArray(input.journalPopulationObservations),
    ...getInputArray(input.materialityObservations),
    ...getInputArray(input.trustVerificationObservations),
    ...getInputArray(input.platformIntegrityObservations),
    ...getInputArray(input.auditReadinessObservations),
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getAuditArtifacts(input: BuildControllerReviewPackageInput): AuditArtifact[] {
  return [
    ...getInputArray(input.auditCandidates),
    ...getInputArray(input.auditEvidencePackages),
    ...getInputArray(input.auditFindings),
    ...getInputArray(input.auditConfidencePackages),
    ...getInputArray(input.auditSurfaces),
    ...getInputArray(input.auditWatchlists),
    ...getInputArray(input.auditBriefings),
  ];
}

function getPackagedAuditArtifacts(
  input: BuildControllerReviewPackageInput,
): Array<
  | SyntheticAuditEvidencePackage
  | SyntheticAuditFinding
  | SyntheticAuditConfidence
  | SyntheticAuditSurface
  | SyntheticAuditWatchlist
  | SyntheticAuditBriefing
> {
  return [
    ...getInputArray(input.auditEvidencePackages),
    ...getInputArray(input.auditFindings),
    ...getInputArray(input.auditConfidencePackages),
    ...getInputArray(input.auditSurfaces),
    ...getInputArray(input.auditWatchlists),
    ...getInputArray(input.auditBriefings),
  ];
}

function getUpstreamPackages(input: BuildControllerReviewPackageInput): UpstreamPackage[] {
  return [...getInputArray(input.auditResponsePackages), ...getInputArray(input.auditPackages)];
}

function getObservationIds(observations: object[], propertyName: string): string[] {
  return uniqueStable(observations.flatMap((observation) => getStringProperty(observation, propertyName)));
}

function getAuditContractReferenceIds(input: BuildControllerReviewPackageInput): string[] {
  const auditContract = input.auditContract;
  return uniqueStable([
    auditContract?.observationMetadata?.auditObservationId,
    auditContract?.findingMetadata?.auditFindingId,
    auditContract?.exceptionMetadata?.auditExceptionId,
    auditContract?.riskMetadata?.auditRiskId,
    ...(auditContract?.evidence.sourceReferenceIds ?? []),
    ...(auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAuditArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "auditContractReferenceIds")),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditContractReferenceIds")),
    ...getUpstreamPackages(input).flatMap((auditPackage) => auditPackage.auditContractReferenceIds),
  ].filter((value): value is string => value !== undefined));
}

function getReferenceIds(input: BuildControllerReviewPackageInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, singularName),
      ...getStringArrayProperty(artifact, arrayName),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, arrayName)),
    ...getUpstreamPackages(input).flatMap((auditPackage) => getStringArrayProperty(auditPackage, arrayName)),
  ]);
}

function getEvidenceReferenceIds(input: BuildControllerReviewPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getInputArray(input.auditCandidates).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "evidenceReferenceIds")),
    ...getUpstreamPackages(input).flatMap((auditPackage) => auditPackage.evidenceReferenceIds),
  ]);
}

function getSourceReferenceIds(input: BuildControllerReviewPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getInputArray(input.auditCandidates).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "sourceReferenceIds")),
    ...getUpstreamPackages(input).flatMap((auditPackage) => auditPackage.sourceReferenceIds),
  ]);
}

function getLineageReferenceIds(input: BuildControllerReviewPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getInputArray(input.auditCandidates).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "lineageReferenceIds")),
    ...getUpstreamPackages(input).flatMap((auditPackage) => auditPackage.lineageReferenceIds),
  ]);
}

function getControllerReviewObservationIds(input: BuildControllerReviewPackageInput) {
  return {
    continuousControllerObservationIds: getObservationIds(
      getInputArray(input.continuousControllerObservations),
      "continuousControllerObservationId",
    ),
    continuousAuditObservationIds: getObservationIds(getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"),
    fluxObservationIds: getObservationIds(getInputArray(input.fluxObservations), "fluxIntelligenceObservationId"),
    anomalyObservationIds: getObservationIds(getInputArray(input.anomalyObservations), "anomalyIntelligenceObservationId"),
    balanceSheetIntegrityObservationIds: getObservationIds(
      getInputArray(input.balanceSheetIntegrityObservations),
      "balanceSheetIntegrityObservationId",
    ),
    financialStatementRelationshipObservationIds: getObservationIds(
      getInputArray(input.financialStatementRelationshipObservations),
      "financialStatementRelationshipObservationId",
    ),
    periodEndObservationIds: getObservationIds(getInputArray(input.periodEndObservations), "periodEndActivityObservationId"),
    cutoffObservationIds: getObservationIds(getInputArray(input.cutoffObservations), "cutoffIntelligenceObservationId"),
    reconciliationObservationIds: getObservationIds(getInputArray(input.reconciliationObservations), "reconciliationObservationId"),
    bankActivityObservationIds: getObservationIds(getInputArray(input.bankActivityObservations), "bankActivityObservationId"),
    cashApplicationObservationIds: getObservationIds(getInputArray(input.cashApplicationObservations), "cashApplicationObservationId"),
    cashDisbursementObservationIds: getObservationIds(
      getInputArray(input.cashDisbursementObservations),
      "cashDisbursementObservationId",
    ),
    debtCovenantObservationIds: getObservationIds(getInputArray(input.debtCovenantObservations), "debtCovenantObservationId"),
    prepaidObservationIds: getObservationIds(getInputArray(input.prepaidObservations), "prepaidIntelligenceObservationId"),
    fixedAssetObservationIds: getObservationIds(getInputArray(input.fixedAssetObservations), "fixedAssetIntelligenceObservationId"),
    taxObservationIds: getObservationIds(getInputArray(input.taxObservations), "taxIntelligenceObservationId"),
    customerTaxValidationObservationIds: getObservationIds(
      getInputArray(input.customerTaxValidationObservations),
      "customerTaxValidationObservationId",
    ),
    salesTaxRemittanceObservationIds: getObservationIds(
      getInputArray(input.salesTaxRemittanceObservations),
      "salesTaxRemittanceObservationId",
    ),
    taxToInvoiceObservationIds: getObservationIds(getInputArray(input.taxToInvoiceObservations), "taxToInvoiceObservationId"),
    unrecordedLiabilityObservationIds: getObservationIds(
      getInputArray(input.unrecordedLiabilityObservations),
      "unrecordedLiabilityObservationId",
    ),
    managementOverrideObservationIds: getObservationIds(
      getInputArray(input.managementOverrideObservations),
      "managementOverrideObservationId",
    ),
    journalPopulationObservationIds: getObservationIds(
      getInputArray(input.journalPopulationObservations),
      "journalPopulationObservationId",
    ),
    materialityObservationIds: getObservationIds(getInputArray(input.materialityObservations), "materialityObservationId"),
    trustVerificationObservationIds: getObservationIds(
      getInputArray(input.trustVerificationObservations),
      "trustVerificationObservationId",
    ),
    platformIntegrityObservationIds: getObservationIds(
      getInputArray(input.platformIntegrityObservations),
      "platformIntegrityObservationId",
    ),
    auditReadinessObservationIds: getObservationIds(getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"),
    healthcarePpdObservationIds: getObservationIds(getInputArray(input.healthcarePpdObservations), "healthcarePpdObservationId"),
    payrollObservationIds: getObservationIds(getInputArray(input.payrollObservations), "payrollObservationId"),
    methodologyObservationIds: getObservationIds(getInputArray(input.methodologyObservations), "methodologyObservationId"),
  };
}

function getUpstreamObservationIds(input: BuildControllerReviewPackageInput): string[] {
  const observationIds = getControllerReviewObservationIds(input);
  return uniqueStable([
    ...observationIds.continuousControllerObservationIds,
    ...observationIds.continuousAuditObservationIds,
    ...observationIds.fluxObservationIds,
    ...observationIds.anomalyObservationIds,
    ...observationIds.balanceSheetIntegrityObservationIds,
    ...observationIds.financialStatementRelationshipObservationIds,
    ...observationIds.periodEndObservationIds,
    ...observationIds.cutoffObservationIds,
    ...observationIds.reconciliationObservationIds,
    ...observationIds.bankActivityObservationIds,
    ...observationIds.cashApplicationObservationIds,
    ...observationIds.cashDisbursementObservationIds,
    ...observationIds.debtCovenantObservationIds,
    ...observationIds.prepaidObservationIds,
    ...observationIds.fixedAssetObservationIds,
    ...observationIds.taxObservationIds,
    ...observationIds.customerTaxValidationObservationIds,
    ...observationIds.salesTaxRemittanceObservationIds,
    ...observationIds.taxToInvoiceObservationIds,
    ...observationIds.unrecordedLiabilityObservationIds,
    ...observationIds.managementOverrideObservationIds,
    ...observationIds.journalPopulationObservationIds,
    ...observationIds.materialityObservationIds,
    ...observationIds.trustVerificationObservationIds,
    ...observationIds.platformIntegrityObservationIds,
    ...observationIds.auditReadinessObservationIds,
    ...observationIds.healthcarePpdObservationIds,
    ...observationIds.payrollObservationIds,
    ...observationIds.methodologyObservationIds,
    ...getUpstreamPackages(input).flatMap((auditPackage) => auditPackage.upstreamObservationIds),
  ]);
}

function getMaterialityMetadata(input: BuildControllerReviewPackageInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getAuditArtifacts(input).map((artifact) => artifact.materialityCompatibility),
    ...getDomainObservations(input).flatMap((observation) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(observation, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(observation, "materialityCompatibility"),
    ]),
    ...getUpstreamPackages(input).flatMap((auditPackage) => [
      ...auditPackage.materialityMetadata,
      ...auditPackage.materialityCompatibility,
    ]),
  ]);
}

function buildPackageId(input: BuildControllerReviewPackageInput): string {
  return `synthetic-controller-review-package:${stableSnapshotHash({
    packageKey: input.packageKey,
    packageCategory: input.packageCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    customerIsolation: input.auditContract ? buildCustomerIsolation(input.auditContract.scope) : null,
    firmIsolation: input.auditContract ? buildFirmIsolation(input.auditContract.scope) : null,
    clientIsolation: input.auditContract ? buildClientIsolation(input.auditContract.scope) : null,
    ...getControllerReviewObservationIds(input),
    upstreamObservationIds: getUpstreamObservationIds(input),
    upstreamPackageIds: getUpstreamPackages(input).map((auditPackage) => auditPackage.packageId),
    auditContractReferenceIds: getAuditContractReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildControllerReviewPackageInput): string[] {
  return [
    ...(getInputArray(input.healthcarePpdObservations).length > 0
      ? ["healthcare PPD observations are forward-compatible references for a future healthcare intelligence module."]
      : []),
    ...(getInputArray(input.payrollObservations).length > 0
      ? ["payroll observations are forward-compatible references and do not activate payroll intelligence."]
      : []),
    ...(getInputArray(input.methodologyObservations).length > 0
      ? ["methodology observations are Phase 37 forward-compatible references."]
      : []),
  ];
}

function validateInput(input: BuildControllerReviewPackageInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (!hasValue(input.packageKey)) warnings.push("packageKey is required.");
  if (!hasValue(input.packageCategory)) warnings.push("packageCategory is required.");
  if (!isSupportedPackageCategory(input.packageCategory)) warnings.push("packageCategory must be supported.");
  if (!auditContract.scope) warnings.push("auditContract.scope is required.");
  if (!auditContract.evidence) warnings.push("auditContract.evidence is required.");
  if (!auditContract.scope || !auditContract.evidence) return warnings;

  if (!hasValue(auditContract.scope.companyId)) warnings.push("scope.companyId is required.");
  if (!hasArrayValue(auditContract.scope.isolationBoundaryIds)) warnings.push("scope.isolationBoundaryIds must include at least one value.");
  if (auditContract.scope.firmIsolationRequired && !hasValue(auditContract.scope.firmId)) warnings.push("scope.firmId is required.");
  if (auditContract.scope.clientIsolationRequired && !hasValue(auditContract.scope.clientId)) warnings.push("scope.clientId is required.");
  if (!hasArrayValue(auditContract.evidence.evidenceIds)) warnings.push("evidence.evidenceIds must include at least one value.");
  if (!hasArrayValue(auditContract.evidence.sourceReferenceIds)) warnings.push("evidence.sourceReferenceIds must include at least one value.");
  if (!hasArrayValue(auditContract.evidence.lineageReferenceIds)) warnings.push("evidence.lineageReferenceIds must include at least one value.");

  const companyId = auditContract.scope.companyId;
  for (const [inputName, values, idField] of [
    ["continuousControllerObservations", getInputArray(input.continuousControllerObservations), "continuousControllerObservationId"],
    ["continuousAuditObservations", getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"],
    ["fluxObservations", getInputArray(input.fluxObservations), "fluxIntelligenceObservationId"],
    ["anomalyObservations", getInputArray(input.anomalyObservations), "anomalyIntelligenceObservationId"],
    ["balanceSheetIntegrityObservations", getInputArray(input.balanceSheetIntegrityObservations), "balanceSheetIntegrityObservationId"],
    [
      "financialStatementRelationshipObservations",
      getInputArray(input.financialStatementRelationshipObservations),
      "financialStatementRelationshipObservationId",
    ],
    ["periodEndObservations", getInputArray(input.periodEndObservations), "periodEndActivityObservationId"],
    ["cutoffObservations", getInputArray(input.cutoffObservations), "cutoffIntelligenceObservationId"],
    ["reconciliationObservations", getInputArray(input.reconciliationObservations), "reconciliationObservationId"],
    ["bankActivityObservations", getInputArray(input.bankActivityObservations), "bankActivityObservationId"],
    ["cashApplicationObservations", getInputArray(input.cashApplicationObservations), "cashApplicationObservationId"],
    ["cashDisbursementObservations", getInputArray(input.cashDisbursementObservations), "cashDisbursementObservationId"],
    ["debtCovenantObservations", getInputArray(input.debtCovenantObservations), "debtCovenantObservationId"],
    ["prepaidObservations", getInputArray(input.prepaidObservations), "prepaidIntelligenceObservationId"],
    ["fixedAssetObservations", getInputArray(input.fixedAssetObservations), "fixedAssetIntelligenceObservationId"],
    ["taxObservations", getInputArray(input.taxObservations), "taxIntelligenceObservationId"],
    ["customerTaxValidationObservations", getInputArray(input.customerTaxValidationObservations), "customerTaxValidationObservationId"],
    ["salesTaxRemittanceObservations", getInputArray(input.salesTaxRemittanceObservations), "salesTaxRemittanceObservationId"],
    ["taxToInvoiceObservations", getInputArray(input.taxToInvoiceObservations), "taxToInvoiceObservationId"],
    ["unrecordedLiabilityObservations", getInputArray(input.unrecordedLiabilityObservations), "unrecordedLiabilityObservationId"],
    ["managementOverrideObservations", getInputArray(input.managementOverrideObservations), "managementOverrideObservationId"],
    ["journalPopulationObservations", getInputArray(input.journalPopulationObservations), "journalPopulationObservationId"],
    ["materialityObservations", getInputArray(input.materialityObservations), "materialityObservationId"],
    ["trustVerificationObservations", getInputArray(input.trustVerificationObservations), "trustVerificationObservationId"],
    ["platformIntegrityObservations", getInputArray(input.platformIntegrityObservations), "platformIntegrityObservationId"],
    ["auditReadinessObservations", getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"],
    ["healthcarePpdObservations", getInputArray(input.healthcarePpdObservations), "healthcarePpdObservationId"],
    ["payrollObservations", getInputArray(input.payrollObservations), "payrollObservationId"],
    ["methodologyObservations", getInputArray(input.methodologyObservations), "methodologyObservationId"],
  ] as const) {
    values.forEach((value, index) => {
      if (!hasValue(getStringProperty(value, idField)[0])) warnings.push(`${inputName}[${index}].${idField} is required.`);
      const observationCompanyId = getStringProperty(value, "companyId")[0];
      if (!hasValue(observationCompanyId)) warnings.push(`${inputName}[${index}].companyId is required.`);
      if (observationCompanyId && observationCompanyId !== companyId) warnings.push(`${inputName}[${index}].companyId must match scope.companyId.`);
    });
  }

  for (const [inputName, values] of [
    ["auditResponsePackages", getInputArray(input.auditResponsePackages)],
    ["auditPackages", getInputArray(input.auditPackages)],
  ] as const) {
    values.forEach((auditPackage, index) => {
      if (!hasValue(auditPackage.packageId)) warnings.push(`${inputName}[${index}].packageId is required.`);
      if (!hasValue(auditPackage.companyId)) warnings.push(`${inputName}[${index}].companyId is required.`);
      if (auditPackage.companyId && auditPackage.companyId !== companyId) warnings.push(`${inputName}[${index}].companyId must match scope.companyId.`);
    });
  }

  return warnings;
}

export function buildControllerReviewPackage(input: BuildControllerReviewPackageInput): BuildControllerReviewPackageResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      controllerReviewPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const auditArtifacts = getAuditArtifacts(input);
  const domainObservations = getDomainObservations(input);
  const auditResponsePackages = getInputArray(input.auditResponsePackages);
  const auditPackages = getInputArray(input.auditPackages);
  const upstreamPackages = getUpstreamPackages(input);
  const materialityMetadata = getMaterialityMetadata(input);
  const observationIds = getControllerReviewObservationIds(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    controllerReviewPackage: {
      packageId: buildPackageId(input),
      packageKey: input.packageKey,
      packageCategory: input.packageCategory,
      companyId: auditContract.scope.companyId,
      auditCategory: getAuditCategory(auditContract),
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      sourceReferenceIds: getSourceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      auditContractReferenceIds: getAuditContractReferenceIds(input),
      auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
      auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
      auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
      auditFindingIds: getReferenceIds(input, "auditFindingId", "auditFindingIds"),
      auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
      auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
      auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
      auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
      upstreamObservationIds: getUpstreamObservationIds(input),
      continuousControllerObservationIds: observationIds.continuousControllerObservationIds,
      continuousAuditObservationIds: observationIds.continuousAuditObservationIds,
      fluxObservationIds: observationIds.fluxObservationIds,
      anomalyObservationIds: observationIds.anomalyObservationIds,
      balanceSheetIntegrityObservationIds: observationIds.balanceSheetIntegrityObservationIds,
      financialStatementRelationshipObservationIds: observationIds.financialStatementRelationshipObservationIds,
      periodEndObservationIds: observationIds.periodEndObservationIds,
      cutoffObservationIds: observationIds.cutoffObservationIds,
      reconciliationObservationIds: observationIds.reconciliationObservationIds,
      bankActivityObservationIds: observationIds.bankActivityObservationIds,
      cashApplicationObservationIds: observationIds.cashApplicationObservationIds,
      cashDisbursementObservationIds: observationIds.cashDisbursementObservationIds,
      debtCovenantObservationIds: observationIds.debtCovenantObservationIds,
      prepaidObservationIds: observationIds.prepaidObservationIds,
      fixedAssetObservationIds: observationIds.fixedAssetObservationIds,
      taxObservationIds: observationIds.taxObservationIds,
      customerTaxValidationObservationIds: observationIds.customerTaxValidationObservationIds,
      salesTaxRemittanceObservationIds: observationIds.salesTaxRemittanceObservationIds,
      taxToInvoiceObservationIds: observationIds.taxToInvoiceObservationIds,
      unrecordedLiabilityObservationIds: observationIds.unrecordedLiabilityObservationIds,
      managementOverrideObservationIds: observationIds.managementOverrideObservationIds,
      journalPopulationObservationIds: observationIds.journalPopulationObservationIds,
      materialityObservationIds: observationIds.materialityObservationIds,
      trustVerificationObservationIds: observationIds.trustVerificationObservationIds,
      platformIntegrityObservationIds: observationIds.platformIntegrityObservationIds,
      auditReadinessObservationIds: observationIds.auditReadinessObservationIds,
      upstreamPackageIds: uniqueStable([
        ...upstreamPackages.map((auditPackage) => auditPackage.packageId),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.upstreamPackageIds),
      ]),
      auditResponsePackageIds: auditResponsePackages.map((auditPackage) => auditPackage.packageId),
      auditPackageIds: auditPackages.map((auditPackage) => auditPackage.packageId),
      healthcarePpdObservationIds: observationIds.healthcarePpdObservationIds,
      payrollObservationIds: observationIds.payrollObservationIds,
      methodologyObservationIds: observationIds.methodologyObservationIds,
      evidence: auditContract.evidence,
      observationMetadata: compactDefined([
        auditContract.observationMetadata,
        ...auditArtifacts.map((artifact) => artifact.observationMetadata),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditObservationMetadata>(observation, "observationMetadata"),
        ),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...auditArtifacts.map((artifact) => artifact.findingMetadata),
        ...domainObservations.flatMap((observation) => getObjectArrayProperty<SyntheticAuditFindingMetadata>(observation, "findingMetadata")),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...auditArtifacts.map((artifact) => artifact.exceptionMetadata),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditExceptionMetadata>(observation, "exceptionMetadata"),
        ),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...auditArtifacts.map((artifact) => artifact.riskMetadata),
        ...domainObservations.flatMap((observation) => getObjectArrayProperty<SyntheticAuditRiskMetadata>(observation, "riskMetadata")),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...auditArtifacts.map((artifact) => artifact.trustMetadata),
        ...domainObservations.flatMap((observation) => getObjectArrayProperty<SyntheticAuditTrustMetadata>(observation, "trustMetadata")),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.trustMetadata),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...auditArtifacts.map((artifact) => artifact.confidenceMetadata),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(observation, "confidenceMetadata"),
        ),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.confidenceMetadata),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...auditArtifacts.map((artifact) => artifact.governanceMetadata),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(observation, "governanceMetadata"),
        ),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.governanceMetadata),
      ]),
      materialityMetadata,
      materialityCompatibility: materialityMetadata,
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...auditArtifacts.map((artifact) => artifact.personaCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(observation, "personaCompatibility"),
        ),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...auditArtifacts.map((artifact) => artifact.packageCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(observation, "packageCompatibility"),
        ),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...auditArtifacts.map((artifact) => artifact.memoryCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(observation, "memoryCompatibility"),
        ),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...auditArtifacts.map((artifact) => artifact.learningCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(observation, "learningCompatibility"),
        ),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...auditArtifacts.map((artifact) => artifact.surfaceCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(observation, "surfaceCompatibility"),
        ),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.surfaceCompatibility),
      ]),
      auditContract,
      continuousControllerObservations: getInputArray(input.continuousControllerObservations),
      continuousAuditObservations: getInputArray(input.continuousAuditObservations),
      fluxObservations: getInputArray(input.fluxObservations),
      anomalyObservations: getInputArray(input.anomalyObservations),
      balanceSheetIntegrityObservations: getInputArray(input.balanceSheetIntegrityObservations),
      financialStatementRelationshipObservations: getInputArray(input.financialStatementRelationshipObservations),
      periodEndObservations: getInputArray(input.periodEndObservations),
      cutoffObservations: getInputArray(input.cutoffObservations),
      reconciliationObservations: getInputArray(input.reconciliationObservations),
      bankActivityObservations: getInputArray(input.bankActivityObservations),
      cashApplicationObservations: getInputArray(input.cashApplicationObservations),
      cashDisbursementObservations: getInputArray(input.cashDisbursementObservations),
      debtCovenantObservations: getInputArray(input.debtCovenantObservations),
      prepaidObservations: getInputArray(input.prepaidObservations),
      fixedAssetObservations: getInputArray(input.fixedAssetObservations),
      taxObservations: getInputArray(input.taxObservations),
      customerTaxValidationObservations: getInputArray(input.customerTaxValidationObservations),
      salesTaxRemittanceObservations: getInputArray(input.salesTaxRemittanceObservations),
      taxToInvoiceObservations: getInputArray(input.taxToInvoiceObservations),
      unrecordedLiabilityObservations: getInputArray(input.unrecordedLiabilityObservations),
      managementOverrideObservations: getInputArray(input.managementOverrideObservations),
      journalPopulationObservations: getInputArray(input.journalPopulationObservations),
      materialityObservations: getInputArray(input.materialityObservations),
      trustVerificationObservations: getInputArray(input.trustVerificationObservations),
      platformIntegrityObservations: getInputArray(input.platformIntegrityObservations),
      auditReadinessObservations: getInputArray(input.auditReadinessObservations),
      auditResponsePackages,
      auditPackages,
      healthcarePpdObservations: getInputArray(input.healthcarePpdObservations),
      payrollObservations: getInputArray(input.payrollObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      auditCandidates: getInputArray(input.auditCandidates),
      auditEvidencePackages: getInputArray(input.auditEvidencePackages),
      auditFindings: getInputArray(input.auditFindings),
      auditConfidencePackages: getInputArray(input.auditConfidencePackages),
      auditSurfaces: getInputArray(input.auditSurfaces),
      auditWatchlists: getInputArray(input.auditWatchlists),
      auditBriefings: getInputArray(input.auditBriefings),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
