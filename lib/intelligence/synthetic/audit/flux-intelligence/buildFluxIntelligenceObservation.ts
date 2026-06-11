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
import type { SyntheticAuditFinding } from "../findings";
import type { SyntheticInventoryIntelligenceObservation } from "../inventory-intelligence";
import type { SyntheticJournalTestingObservation } from "../journal-testing";
import type { SyntheticLeaseIntelligenceObservation } from "../lease-intelligence";
import type { SyntheticMissingActivityObservation } from "../missing-activity";
import type { SyntheticPbcRequestObservation } from "../pbc-request";
import type { SyntheticPeriodEndActivityObservation } from "../period-end-activity";
import type { SyntheticPlatformIntegrityObservation } from "../platform-integrity";
import type { SyntheticPrepaidIntelligenceObservation } from "../prepaid-intelligence";
import type { SyntheticRecurringPatternObservation } from "../recurring-patterns";
import type { SyntheticReserveIntelligenceObservation } from "../reserve-intelligence";
import type { SyntheticRevenueIntelligenceObservation } from "../revenue-intelligence";
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

export type SyntheticFluxIntelligenceCategory =
  | "balance_change_candidate"
  | "account_change_candidate"
  | "month_over_month_candidate"
  | "quarter_over_quarter_candidate"
  | "year_over_year_candidate"
  | "trend_candidate"
  | "relationship_change_candidate"
  | "unusual_change_candidate"
  | "expected_change_candidate"
  | "unexpected_change_candidate"
  | "financial_statement_flux_candidate"
  | "flux_intelligence_candidate"
  | "income_statement_flux_candidate"
  | "balance_sheet_flux_candidate"
  | "cash_flow_flux_candidate"
  | "payroll_flux_candidate"
  | "headcount_flux_candidate"
  | "interperiod_flux_candidate"
  | "concentration_flux_candidate"
  | "reversal_flux_candidate"
  | "cutoff_flux_candidate"
  | "working_capital_flux_candidate";

export const SYNTHETIC_FLUX_INTELLIGENCE_CATEGORIES: SyntheticFluxIntelligenceCategory[] = [
  "balance_change_candidate",
  "account_change_candidate",
  "month_over_month_candidate",
  "quarter_over_quarter_candidate",
  "year_over_year_candidate",
  "trend_candidate",
  "relationship_change_candidate",
  "unusual_change_candidate",
  "expected_change_candidate",
  "unexpected_change_candidate",
  "financial_statement_flux_candidate",
  "flux_intelligence_candidate",
  "income_statement_flux_candidate",
  "balance_sheet_flux_candidate",
  "cash_flow_flux_candidate",
  "payroll_flux_candidate",
  "headcount_flux_candidate",
  "interperiod_flux_candidate",
  "concentration_flux_candidate",
  "reversal_flux_candidate",
  "cutoff_flux_candidate",
  "working_capital_flux_candidate",
];

export interface SyntheticFluxIntelligenceIsolationDimension {
  required: boolean;
  referenceIds: string[];
}

export interface SyntheticFluxIntelligenceForwardCompatibleObservation {
  anomalyObservationId?: string;
  cashDisbursementObservationId?: string;
  payrollFluxObservationId?: string;
  headcountFluxObservationId?: string;
  budgetFluxObservationId?: string;
  forecastFluxObservationId?: string;
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

export interface BuildFluxIntelligenceObservationInput {
  auditContract: SyntheticAuditContract | null;
  fluxIntelligenceObservationKey: string;
  fluxIntelligenceCategory: SyntheticFluxIntelligenceCategory;
  financialStatementRelationshipObservations?: SyntheticFinancialStatementRelationshipObservation[];
  balanceSheetIntegrityObservations?: SyntheticBalanceSheetIntegrityObservation[];
  continuousAuditObservations?: SyntheticContinuousAuditObservation[];
  continuousControllerObservations?: SyntheticContinuousControllerObservation[];
  periodEndActivityObservations?: SyntheticPeriodEndActivityObservation[];
  cutoffIntelligenceObservations?: SyntheticCutoffIntelligenceObservation[];
  journalTestingObservations?: SyntheticJournalTestingObservation[];
  inventoryIntelligenceObservations?: SyntheticInventoryIntelligenceObservation[];
  revenueIntelligenceObservations?: SyntheticRevenueIntelligenceObservation[];
  reserveIntelligenceObservations?: SyntheticReserveIntelligenceObservation[];
  taxIntelligenceObservations?: SyntheticTaxIntelligenceObservation[];
  leaseIntelligenceObservations?: SyntheticLeaseIntelligenceObservation[];
  debtCovenantObservations?: SyntheticDebtCovenantObservation[];
  prepaidIntelligenceObservations?: SyntheticPrepaidIntelligenceObservation[];
  fixedAssetIntelligenceObservations?: SyntheticFixedAssetIntelligenceObservation[];
  auditReadinessObservations?: SyntheticAuditReadinessObservation[];
  trustVerificationObservations?: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations?: SyntheticPlatformIntegrityObservation[];
  missingActivityObservations?: SyntheticMissingActivityObservation[];
  expectedActivityObservations?: SyntheticExpectedActivityObservation[];
  recurringPatternObservations?: SyntheticRecurringPatternObservation[];
  bankActivityObservations?: SyntheticBankActivityObservation[];
  cashApplicationObservations?: SyntheticCashApplicationObservation[];
  auditCoverageObservations?: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations?: SyntheticEvidenceSufficiencyObservation[];
  pbcRequestObservations?: SyntheticPbcRequestObservation[];
  auditScheduleObservations?: SyntheticAuditScheduleObservation[];
  auditTieOutObservations?: SyntheticAuditTieOutObservation[];
  scheduleCompletenessObservations?: SyntheticScheduleCompletenessObservation[];
  anomalyObservations?: SyntheticFluxIntelligenceForwardCompatibleObservation[];
  cashDisbursementObservations?: SyntheticFluxIntelligenceForwardCompatibleObservation[];
  payrollFluxObservations?: SyntheticFluxIntelligenceForwardCompatibleObservation[];
  headcountFluxObservations?: SyntheticFluxIntelligenceForwardCompatibleObservation[];
  budgetFluxObservations?: SyntheticFluxIntelligenceForwardCompatibleObservation[];
  forecastFluxObservations?: SyntheticFluxIntelligenceForwardCompatibleObservation[];
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticFluxIntelligenceObservation {
  fluxIntelligenceObservationId: string;
  fluxIntelligenceObservationKey: string;
  fluxIntelligenceCategory: SyntheticFluxIntelligenceCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticFluxIntelligenceIsolationDimension;
  firmIsolation: SyntheticFluxIntelligenceIsolationDimension;
  clientIsolation: SyntheticFluxIntelligenceIsolationDimension;
  financialStatementRelationshipObservationIds: string[];
  balanceSheetIntegrityObservationIds: string[];
  continuousAuditObservationIds: string[];
  continuousControllerObservationIds: string[];
  periodEndActivityObservationIds: string[];
  cutoffIntelligenceObservationIds: string[];
  journalTestingObservationIds: string[];
  inventoryIntelligenceObservationIds: string[];
  revenueIntelligenceObservationIds: string[];
  reserveIntelligenceObservationIds: string[];
  taxIntelligenceObservationIds: string[];
  leaseIntelligenceObservationIds: string[];
  debtCovenantObservationIds: string[];
  prepaidIntelligenceObservationIds: string[];
  fixedAssetIntelligenceObservationIds: string[];
  auditReadinessObservationIds: string[];
  trustVerificationObservationIds: string[];
  platformIntegrityObservationIds: string[];
  missingActivityObservationIds: string[];
  expectedActivityObservationIds: string[];
  recurringPatternObservationIds: string[];
  bankActivityObservationIds: string[];
  cashApplicationObservationIds: string[];
  auditCoverageObservationIds: string[];
  evidenceSufficiencyObservationIds: string[];
  pbcRequestObservationIds: string[];
  auditScheduleObservationIds: string[];
  auditTieOutObservationIds: string[];
  scheduleCompletenessObservationIds: string[];
  anomalyObservationIds: string[];
  cashDisbursementObservationIds: string[];
  payrollFluxObservationIds: string[];
  headcountFluxObservationIds: string[];
  budgetFluxObservationIds: string[];
  forecastFluxObservationIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  fluxIntelligenceReferenceIds: string[];
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
  balanceSheetIntegrityObservations: SyntheticBalanceSheetIntegrityObservation[];
  continuousAuditObservations: SyntheticContinuousAuditObservation[];
  continuousControllerObservations: SyntheticContinuousControllerObservation[];
  periodEndActivityObservations: SyntheticPeriodEndActivityObservation[];
  cutoffIntelligenceObservations: SyntheticCutoffIntelligenceObservation[];
  journalTestingObservations: SyntheticJournalTestingObservation[];
  inventoryIntelligenceObservations: SyntheticInventoryIntelligenceObservation[];
  revenueIntelligenceObservations: SyntheticRevenueIntelligenceObservation[];
  reserveIntelligenceObservations: SyntheticReserveIntelligenceObservation[];
  taxIntelligenceObservations: SyntheticTaxIntelligenceObservation[];
  leaseIntelligenceObservations: SyntheticLeaseIntelligenceObservation[];
  debtCovenantObservations: SyntheticDebtCovenantObservation[];
  prepaidIntelligenceObservations: SyntheticPrepaidIntelligenceObservation[];
  fixedAssetIntelligenceObservations: SyntheticFixedAssetIntelligenceObservation[];
  auditReadinessObservations: SyntheticAuditReadinessObservation[];
  trustVerificationObservations: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations: SyntheticPlatformIntegrityObservation[];
  missingActivityObservations: SyntheticMissingActivityObservation[];
  expectedActivityObservations: SyntheticExpectedActivityObservation[];
  recurringPatternObservations: SyntheticRecurringPatternObservation[];
  bankActivityObservations: SyntheticBankActivityObservation[];
  cashApplicationObservations: SyntheticCashApplicationObservation[];
  auditCoverageObservations: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations: SyntheticEvidenceSufficiencyObservation[];
  pbcRequestObservations: SyntheticPbcRequestObservation[];
  auditScheduleObservations: SyntheticAuditScheduleObservation[];
  auditTieOutObservations: SyntheticAuditTieOutObservation[];
  scheduleCompletenessObservations: SyntheticScheduleCompletenessObservation[];
  anomalyObservations: SyntheticFluxIntelligenceForwardCompatibleObservation[];
  cashDisbursementObservations: SyntheticFluxIntelligenceForwardCompatibleObservation[];
  payrollFluxObservations: SyntheticFluxIntelligenceForwardCompatibleObservation[];
  headcountFluxObservations: SyntheticFluxIntelligenceForwardCompatibleObservation[];
  budgetFluxObservations: SyntheticFluxIntelligenceForwardCompatibleObservation[];
  forecastFluxObservations: SyntheticFluxIntelligenceForwardCompatibleObservation[];
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildFluxIntelligenceObservationResult {
  fluxIntelligenceObservation: SyntheticFluxIntelligenceObservation | null;
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

function isSupportedFluxIntelligenceCategory(category: SyntheticFluxIntelligenceCategory): boolean {
  return SYNTHETIC_FLUX_INTELLIGENCE_CATEGORIES.includes(category);
}

function buildCustomerIsolation(scope: SyntheticAuditScope): SyntheticFluxIntelligenceIsolationDimension {
  return { required: scope.customerIsolationRequired, referenceIds: scope.isolationBoundaryIds };
}

function buildFirmIsolation(scope: SyntheticAuditScope): SyntheticFluxIntelligenceIsolationDimension {
  return {
    required: scope.firmIsolationRequired,
    referenceIds: uniqueStable([scope.firmId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function buildClientIsolation(scope: SyntheticAuditScope): SyntheticFluxIntelligenceIsolationDimension {
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

function getDomainObservations(input: BuildFluxIntelligenceObservationInput): object[] {
  return [
    ...getInputArray(input.financialStatementRelationshipObservations),
    ...getInputArray(input.balanceSheetIntegrityObservations),
    ...getInputArray(input.continuousAuditObservations),
    ...getInputArray(input.continuousControllerObservations),
    ...getInputArray(input.periodEndActivityObservations),
    ...getInputArray(input.cutoffIntelligenceObservations),
    ...getInputArray(input.journalTestingObservations),
    ...getInputArray(input.inventoryIntelligenceObservations),
    ...getInputArray(input.revenueIntelligenceObservations),
    ...getInputArray(input.reserveIntelligenceObservations),
    ...getInputArray(input.taxIntelligenceObservations),
    ...getInputArray(input.leaseIntelligenceObservations),
    ...getInputArray(input.debtCovenantObservations),
    ...getInputArray(input.prepaidIntelligenceObservations),
    ...getInputArray(input.fixedAssetIntelligenceObservations),
    ...getInputArray(input.auditReadinessObservations),
    ...getInputArray(input.trustVerificationObservations),
    ...getInputArray(input.platformIntegrityObservations),
    ...getInputArray(input.missingActivityObservations),
    ...getInputArray(input.expectedActivityObservations),
    ...getInputArray(input.recurringPatternObservations),
    ...getInputArray(input.bankActivityObservations),
    ...getInputArray(input.cashApplicationObservations),
    ...getInputArray(input.auditCoverageObservations),
    ...getInputArray(input.evidenceSufficiencyObservations),
    ...getInputArray(input.pbcRequestObservations),
    ...getInputArray(input.auditScheduleObservations),
    ...getInputArray(input.auditTieOutObservations),
    ...getInputArray(input.scheduleCompletenessObservations),
    ...getInputArray(input.anomalyObservations),
    ...getInputArray(input.cashDisbursementObservations),
    ...getInputArray(input.payrollFluxObservations),
    ...getInputArray(input.headcountFluxObservations),
    ...getInputArray(input.budgetFluxObservations),
    ...getInputArray(input.forecastFluxObservations),
  ];
}

function getAuditCandidates(input: BuildFluxIntelligenceObservationInput): SyntheticAuditCandidate[] {
  return getInputArray(input.auditCandidates);
}

function getAuditEvidencePackages(input: BuildFluxIntelligenceObservationInput): SyntheticAuditEvidencePackage[] {
  return getInputArray(input.auditEvidencePackages);
}

function getAuditFindings(input: BuildFluxIntelligenceObservationInput): SyntheticAuditFinding[] {
  return getInputArray(input.auditFindings);
}

function getAuditConfidencePackages(input: BuildFluxIntelligenceObservationInput): SyntheticAuditConfidence[] {
  return getInputArray(input.auditConfidencePackages);
}

function getAuditSurfaces(input: BuildFluxIntelligenceObservationInput): SyntheticAuditSurface[] {
  return getInputArray(input.auditSurfaces);
}

function getAuditWatchlists(input: BuildFluxIntelligenceObservationInput): SyntheticAuditWatchlist[] {
  return getInputArray(input.auditWatchlists);
}

function getAuditBriefings(input: BuildFluxIntelligenceObservationInput): SyntheticAuditBriefing[] {
  return getInputArray(input.auditBriefings);
}

function getAllAuditArtifacts(input: BuildFluxIntelligenceObservationInput): AuditArtifact[] {
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
  input: BuildFluxIntelligenceObservationInput,
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

function getEvidenceReferenceIds(input: BuildFluxIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "evidenceReferenceIds")),
  ]);
}

function getSourceReferenceIds(input: BuildFluxIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "sourceReferenceIds")),
  ]);
}

function getLineageReferenceIds(input: BuildFluxIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "lineageReferenceIds")),
  ]);
}

function getAuditContractReferenceIdsFromInput(input: BuildFluxIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...getAuditContractReferenceIds(input.auditContract),
    ...getAllAuditArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "auditContractReferenceIds")),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditContractReferenceIds")),
  ]);
}

function getReferenceIds(input: BuildFluxIntelligenceObservationInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, singularName),
      ...getStringArrayProperty(artifact, arrayName),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, arrayName)),
  ]);
}

function getFluxIntelligenceReferenceIds(input: BuildFluxIntelligenceObservationInput): string[] {
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

function buildFluxIntelligenceObservationId(input: BuildFluxIntelligenceObservationInput): string {
  return `synthetic-flux-intelligence-observation:${stableSnapshotHash({
    fluxIntelligenceObservationKey: input.fluxIntelligenceObservationKey,
    fluxIntelligenceCategory: input.fluxIntelligenceCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    customerIsolation: input.auditContract ? buildCustomerIsolation(input.auditContract.scope) : null,
    firmIsolation: input.auditContract ? buildFirmIsolation(input.auditContract.scope) : null,
    clientIsolation: input.auditContract ? buildClientIsolation(input.auditContract.scope) : null,
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
    inventoryIntelligenceObservationIds: getObservationIds(
      getInputArray(input.inventoryIntelligenceObservations),
      "inventoryIntelligenceObservationId",
    ),
    revenueIntelligenceObservationIds: getObservationIds(getInputArray(input.revenueIntelligenceObservations), "revenueIntelligenceObservationId"),
    reserveIntelligenceObservationIds: getObservationIds(getInputArray(input.reserveIntelligenceObservations), "reserveIntelligenceObservationId"),
    taxIntelligenceObservationIds: getObservationIds(getInputArray(input.taxIntelligenceObservations), "taxIntelligenceObservationId"),
    leaseIntelligenceObservationIds: getObservationIds(getInputArray(input.leaseIntelligenceObservations), "leaseIntelligenceObservationId"),
    debtCovenantObservationIds: getObservationIds(getInputArray(input.debtCovenantObservations), "debtCovenantObservationId"),
    prepaidIntelligenceObservationIds: getObservationIds(
      getInputArray(input.prepaidIntelligenceObservations),
      "prepaidIntelligenceObservationId",
    ),
    fixedAssetIntelligenceObservationIds: getObservationIds(
      getInputArray(input.fixedAssetIntelligenceObservations),
      "fixedAssetIntelligenceObservationId",
    ),
    auditReadinessObservationIds: getObservationIds(getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"),
    trustVerificationObservationIds: getObservationIds(getInputArray(input.trustVerificationObservations), "trustVerificationObservationId"),
    platformIntegrityObservationIds: getObservationIds(getInputArray(input.platformIntegrityObservations), "platformIntegrityObservationId"),
    missingActivityObservationIds: getObservationIds(getInputArray(input.missingActivityObservations), "missingActivityObservationId"),
    expectedActivityObservationIds: getObservationIds(getInputArray(input.expectedActivityObservations), "expectedActivityObservationId"),
    recurringPatternObservationIds: getObservationIds(getInputArray(input.recurringPatternObservations), "recurringPatternObservationId"),
    bankActivityObservationIds: getObservationIds(getInputArray(input.bankActivityObservations), "bankActivityObservationId"),
    cashApplicationObservationIds: getObservationIds(getInputArray(input.cashApplicationObservations), "cashApplicationObservationId"),
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
    anomalyObservationIds: getObservationIds(getInputArray(input.anomalyObservations), "anomalyObservationId"),
    cashDisbursementObservationIds: getObservationIds(getInputArray(input.cashDisbursementObservations), "cashDisbursementObservationId"),
    payrollFluxObservationIds: getObservationIds(getInputArray(input.payrollFluxObservations), "payrollFluxObservationId"),
    headcountFluxObservationIds: getObservationIds(getInputArray(input.headcountFluxObservations), "headcountFluxObservationId"),
    budgetFluxObservationIds: getObservationIds(getInputArray(input.budgetFluxObservations), "budgetFluxObservationId"),
    forecastFluxObservationIds: getObservationIds(getInputArray(input.forecastFluxObservations), "forecastFluxObservationId"),
    auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
    auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
    auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
    auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
    auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
    auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
    auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
    auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
    fluxIntelligenceReferenceIds: getFluxIntelligenceReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
    isolationBoundaryIds: input.auditContract?.scope.isolationBoundaryIds ?? [],
  })}`;
}

function validateAuditArtifacts(input: BuildFluxIntelligenceObservationInput, warnings: string[]): void {
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

function validateDomainObservationIds(input: BuildFluxIntelligenceObservationInput, warnings: string[]): void {
  const companyId = input.auditContract?.scope.companyId;
  for (const [observationName, observations, idField] of [
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
    ["inventoryIntelligenceObservations", getInputArray(input.inventoryIntelligenceObservations), "inventoryIntelligenceObservationId"],
    ["revenueIntelligenceObservations", getInputArray(input.revenueIntelligenceObservations), "revenueIntelligenceObservationId"],
    ["reserveIntelligenceObservations", getInputArray(input.reserveIntelligenceObservations), "reserveIntelligenceObservationId"],
    ["taxIntelligenceObservations", getInputArray(input.taxIntelligenceObservations), "taxIntelligenceObservationId"],
    ["leaseIntelligenceObservations", getInputArray(input.leaseIntelligenceObservations), "leaseIntelligenceObservationId"],
    ["debtCovenantObservations", getInputArray(input.debtCovenantObservations), "debtCovenantObservationId"],
    ["prepaidIntelligenceObservations", getInputArray(input.prepaidIntelligenceObservations), "prepaidIntelligenceObservationId"],
    [
      "fixedAssetIntelligenceObservations",
      getInputArray(input.fixedAssetIntelligenceObservations),
      "fixedAssetIntelligenceObservationId",
    ],
    ["auditReadinessObservations", getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"],
    ["trustVerificationObservations", getInputArray(input.trustVerificationObservations), "trustVerificationObservationId"],
    ["platformIntegrityObservations", getInputArray(input.platformIntegrityObservations), "platformIntegrityObservationId"],
    ["missingActivityObservations", getInputArray(input.missingActivityObservations), "missingActivityObservationId"],
    ["expectedActivityObservations", getInputArray(input.expectedActivityObservations), "expectedActivityObservationId"],
    ["recurringPatternObservations", getInputArray(input.recurringPatternObservations), "recurringPatternObservationId"],
    ["bankActivityObservations", getInputArray(input.bankActivityObservations), "bankActivityObservationId"],
    ["cashApplicationObservations", getInputArray(input.cashApplicationObservations), "cashApplicationObservationId"],
    ["auditCoverageObservations", getInputArray(input.auditCoverageObservations), "auditCoverageObservationId"],
    ["evidenceSufficiencyObservations", getInputArray(input.evidenceSufficiencyObservations), "evidenceSufficiencyObservationId"],
    ["pbcRequestObservations", getInputArray(input.pbcRequestObservations), "pbcRequestObservationId"],
    ["auditScheduleObservations", getInputArray(input.auditScheduleObservations), "auditScheduleObservationId"],
    ["auditTieOutObservations", getInputArray(input.auditTieOutObservations), "auditTieOutObservationId"],
    ["scheduleCompletenessObservations", getInputArray(input.scheduleCompletenessObservations), "scheduleCompletenessObservationId"],
    ["anomalyObservations", getInputArray(input.anomalyObservations), "anomalyObservationId"],
    ["cashDisbursementObservations", getInputArray(input.cashDisbursementObservations), "cashDisbursementObservationId"],
    ["payrollFluxObservations", getInputArray(input.payrollFluxObservations), "payrollFluxObservationId"],
    ["headcountFluxObservations", getInputArray(input.headcountFluxObservations), "headcountFluxObservationId"],
    ["budgetFluxObservations", getInputArray(input.budgetFluxObservations), "budgetFluxObservationId"],
    ["forecastFluxObservations", getInputArray(input.forecastFluxObservations), "forecastFluxObservationId"],
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

function getForwardCompatibilityWarnings(input: BuildFluxIntelligenceObservationInput): string[] {
  return [
    ...(getInputArray(input.anomalyObservations).length > 0
      ? ["anomaly intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.cashDisbursementObservations).length > 0
      ? ["cash disbursement intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.payrollFluxObservations).length > 0 || getInputArray(input.headcountFluxObservations).length > 0
      ? ["payroll intelligence is a forward-compatible Phase 34 module."]
      : []),
  ];
}

function validateInput(input: BuildFluxIntelligenceObservationInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (!hasValue(input.fluxIntelligenceObservationKey)) warnings.push("fluxIntelligenceObservationKey is required.");
  if (!hasValue(input.fluxIntelligenceCategory)) warnings.push("fluxIntelligenceCategory is required.");
  if (!isSupportedFluxIntelligenceCategory(input.fluxIntelligenceCategory)) {
    warnings.push("fluxIntelligenceCategory must be a supported flux intelligence category.");
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

export function buildFluxIntelligenceObservation(
  input: BuildFluxIntelligenceObservationInput,
): BuildFluxIntelligenceObservationResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      fluxIntelligenceObservation: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const allArtifacts = getAllAuditArtifacts(input);
  const domainObservations = getDomainObservations(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    fluxIntelligenceObservation: {
      fluxIntelligenceObservationId: buildFluxIntelligenceObservationId(input),
      fluxIntelligenceObservationKey: input.fluxIntelligenceObservationKey,
      fluxIntelligenceCategory: input.fluxIntelligenceCategory,
      companyId: auditContract.scope.companyId,
      auditCategory: getAuditCategory(auditContract),
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
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
      inventoryIntelligenceObservationIds: getObservationIds(
        getInputArray(input.inventoryIntelligenceObservations),
        "inventoryIntelligenceObservationId",
      ),
      revenueIntelligenceObservationIds: getObservationIds(getInputArray(input.revenueIntelligenceObservations), "revenueIntelligenceObservationId"),
      reserveIntelligenceObservationIds: getObservationIds(getInputArray(input.reserveIntelligenceObservations), "reserveIntelligenceObservationId"),
      taxIntelligenceObservationIds: getObservationIds(getInputArray(input.taxIntelligenceObservations), "taxIntelligenceObservationId"),
      leaseIntelligenceObservationIds: getObservationIds(getInputArray(input.leaseIntelligenceObservations), "leaseIntelligenceObservationId"),
      debtCovenantObservationIds: getObservationIds(getInputArray(input.debtCovenantObservations), "debtCovenantObservationId"),
      prepaidIntelligenceObservationIds: getObservationIds(
        getInputArray(input.prepaidIntelligenceObservations),
        "prepaidIntelligenceObservationId",
      ),
      fixedAssetIntelligenceObservationIds: getObservationIds(
        getInputArray(input.fixedAssetIntelligenceObservations),
        "fixedAssetIntelligenceObservationId",
      ),
      auditReadinessObservationIds: getObservationIds(getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"),
      trustVerificationObservationIds: getObservationIds(getInputArray(input.trustVerificationObservations), "trustVerificationObservationId"),
      platformIntegrityObservationIds: getObservationIds(getInputArray(input.platformIntegrityObservations), "platformIntegrityObservationId"),
      missingActivityObservationIds: getObservationIds(getInputArray(input.missingActivityObservations), "missingActivityObservationId"),
      expectedActivityObservationIds: getObservationIds(getInputArray(input.expectedActivityObservations), "expectedActivityObservationId"),
      recurringPatternObservationIds: getObservationIds(getInputArray(input.recurringPatternObservations), "recurringPatternObservationId"),
      bankActivityObservationIds: getObservationIds(getInputArray(input.bankActivityObservations), "bankActivityObservationId"),
      cashApplicationObservationIds: getObservationIds(getInputArray(input.cashApplicationObservations), "cashApplicationObservationId"),
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
      anomalyObservationIds: getObservationIds(getInputArray(input.anomalyObservations), "anomalyObservationId"),
      cashDisbursementObservationIds: getObservationIds(getInputArray(input.cashDisbursementObservations), "cashDisbursementObservationId"),
      payrollFluxObservationIds: getObservationIds(getInputArray(input.payrollFluxObservations), "payrollFluxObservationId"),
      headcountFluxObservationIds: getObservationIds(getInputArray(input.headcountFluxObservations), "headcountFluxObservationId"),
      budgetFluxObservationIds: getObservationIds(getInputArray(input.budgetFluxObservations), "budgetFluxObservationId"),
      forecastFluxObservationIds: getObservationIds(getInputArray(input.forecastFluxObservations), "forecastFluxObservationId"),
      auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
      auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
      auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
      auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
      auditFindingIds: getReferenceIds(input, "auditFindingId", "auditFindingIds"),
      auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
      auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
      auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
      auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
      fluxIntelligenceReferenceIds: getFluxIntelligenceReferenceIds(input),
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
      financialStatementRelationshipObservations: getInputArray(input.financialStatementRelationshipObservations),
      balanceSheetIntegrityObservations: getInputArray(input.balanceSheetIntegrityObservations),
      continuousAuditObservations: getInputArray(input.continuousAuditObservations),
      continuousControllerObservations: getInputArray(input.continuousControllerObservations),
      periodEndActivityObservations: getInputArray(input.periodEndActivityObservations),
      cutoffIntelligenceObservations: getInputArray(input.cutoffIntelligenceObservations),
      journalTestingObservations: getInputArray(input.journalTestingObservations),
      inventoryIntelligenceObservations: getInputArray(input.inventoryIntelligenceObservations),
      revenueIntelligenceObservations: getInputArray(input.revenueIntelligenceObservations),
      reserveIntelligenceObservations: getInputArray(input.reserveIntelligenceObservations),
      taxIntelligenceObservations: getInputArray(input.taxIntelligenceObservations),
      leaseIntelligenceObservations: getInputArray(input.leaseIntelligenceObservations),
      debtCovenantObservations: getInputArray(input.debtCovenantObservations),
      prepaidIntelligenceObservations: getInputArray(input.prepaidIntelligenceObservations),
      fixedAssetIntelligenceObservations: getInputArray(input.fixedAssetIntelligenceObservations),
      auditReadinessObservations: getInputArray(input.auditReadinessObservations),
      trustVerificationObservations: getInputArray(input.trustVerificationObservations),
      platformIntegrityObservations: getInputArray(input.platformIntegrityObservations),
      missingActivityObservations: getInputArray(input.missingActivityObservations),
      expectedActivityObservations: getInputArray(input.expectedActivityObservations),
      recurringPatternObservations: getInputArray(input.recurringPatternObservations),
      bankActivityObservations: getInputArray(input.bankActivityObservations),
      cashApplicationObservations: getInputArray(input.cashApplicationObservations),
      auditCoverageObservations: getInputArray(input.auditCoverageObservations),
      evidenceSufficiencyObservations: getInputArray(input.evidenceSufficiencyObservations),
      pbcRequestObservations: getInputArray(input.pbcRequestObservations),
      auditScheduleObservations: getInputArray(input.auditScheduleObservations),
      auditTieOutObservations: getInputArray(input.auditTieOutObservations),
      scheduleCompletenessObservations: getInputArray(input.scheduleCompletenessObservations),
      anomalyObservations: getInputArray(input.anomalyObservations),
      cashDisbursementObservations: getInputArray(input.cashDisbursementObservations),
      payrollFluxObservations: getInputArray(input.payrollFluxObservations),
      headcountFluxObservations: getInputArray(input.headcountFluxObservations),
      budgetFluxObservations: getInputArray(input.budgetFluxObservations),
      forecastFluxObservations: getInputArray(input.forecastFluxObservations),
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
