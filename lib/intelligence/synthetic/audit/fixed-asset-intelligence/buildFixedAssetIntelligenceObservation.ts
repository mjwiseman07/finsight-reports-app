import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticAuditCoverageObservation } from "../audit-coverage";
import type { SyntheticAuditReadinessObservation } from "../audit-readiness";
import type { SyntheticAuditScheduleObservation } from "../audit-schedules";
import type { SyntheticAuditTieOutObservation } from "../audit-tie-outs";
import type { SyntheticBalanceSheetIntegrityObservation } from "../balance-sheet-integrity";
import type { SyntheticBankActivityObservation } from "../bank-activity";
import type { SyntheticAuditBriefing } from "../briefings";
import type { SyntheticAuditCandidate } from "../candidates";
import type { SyntheticAuditConfidence } from "../confidence";
import type { SyntheticContinuousAuditObservation } from "../continuous-audit";
import type { SyntheticContinuousControllerObservation } from "../continuous-controller";
import type { SyntheticCutoffIntelligenceObservation } from "../cutoff-intelligence";
import type { SyntheticAuditEvidencePackage } from "../evidence";
import type { SyntheticEvidenceSufficiencyObservation } from "../evidence-sufficiency";
import type { SyntheticExpectedActivityObservation } from "../expected-activity";
import type { SyntheticFinancialStatementRelationshipObservation } from "../financial-statement-relationships";
import type { SyntheticAuditFinding } from "../findings";
import type { SyntheticJournalTestingObservation } from "../journal-testing";
import type { SyntheticMissingActivityObservation } from "../missing-activity";
import type { SyntheticPbcRequestObservation } from "../pbc-request";
import type { SyntheticPeriodEndActivityObservation } from "../period-end-activity";
import type { SyntheticPlatformIntegrityObservation } from "../platform-integrity";
import type { SyntheticRecurringPatternObservation } from "../recurring-patterns";
import type { SyntheticReserveIntelligenceObservation } from "../reserve-intelligence";
import type { SyntheticScheduleCompletenessObservation } from "../schedule-completeness";
import type { SyntheticAuditSurface } from "../surfaces";
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

export type SyntheticFixedAssetIntelligenceCategory =
  | "fixed_asset_balance_candidate"
  | "fixed_asset_addition_candidate"
  | "fixed_asset_disposal_candidate"
  | "fixed_asset_depreciation_candidate"
  | "fixed_asset_useful_life_candidate"
  | "fixed_asset_impairment_candidate"
  | "fixed_asset_classification_candidate"
  | "fixed_asset_reconciliation_candidate"
  | "fixed_asset_support_candidate"
  | "fixed_asset_documentation_candidate"
  | "fixed_asset_financial_statement_relationship"
  | "fixed_asset_balance_sheet_candidate"
  | "fixed_asset_intelligence_candidate"
  | "fixed_asset_period_end_candidate"
  | "fixed_asset_unusual_addition_candidate"
  | "fixed_asset_cip_candidate"
  | "fixed_asset_fully_depreciated_candidate"
  | "fixed_asset_gain_loss_candidate"
  | "fixed_asset_rollforward_candidate"
  | "fixed_asset_capitalization_candidate"
  | "fixed_asset_vendor_relationship_candidate"
  | "fixed_asset_transfer_candidate";

export const SYNTHETIC_FIXED_ASSET_INTELLIGENCE_CATEGORIES: SyntheticFixedAssetIntelligenceCategory[] = [
  "fixed_asset_balance_candidate",
  "fixed_asset_addition_candidate",
  "fixed_asset_disposal_candidate",
  "fixed_asset_depreciation_candidate",
  "fixed_asset_useful_life_candidate",
  "fixed_asset_impairment_candidate",
  "fixed_asset_classification_candidate",
  "fixed_asset_reconciliation_candidate",
  "fixed_asset_support_candidate",
  "fixed_asset_documentation_candidate",
  "fixed_asset_financial_statement_relationship",
  "fixed_asset_balance_sheet_candidate",
  "fixed_asset_intelligence_candidate",
  "fixed_asset_period_end_candidate",
  "fixed_asset_unusual_addition_candidate",
  "fixed_asset_cip_candidate",
  "fixed_asset_fully_depreciated_candidate",
  "fixed_asset_gain_loss_candidate",
  "fixed_asset_rollforward_candidate",
  "fixed_asset_capitalization_candidate",
  "fixed_asset_vendor_relationship_candidate",
  "fixed_asset_transfer_candidate",
];

export interface SyntheticFixedAssetIntelligenceIsolationDimension {
  required: boolean;
  referenceIds: string[];
}

export interface SyntheticFixedAssetIntelligenceForwardCompatibleObservation {
  anomalyObservationId?: string;
  cashDisbursementObservationId?: string;
  depreciationScheduleObservationId?: string;
  cipObservationId?: string;
  gainLossObservationId?: string;
  rollforwardObservationId?: string;
  capitalizationObservationId?: string;
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

export interface BuildFixedAssetIntelligenceObservationInput {
  auditContract: SyntheticAuditContract | null;
  fixedAssetIntelligenceObservationKey: string;
  fixedAssetIntelligenceCategory: SyntheticFixedAssetIntelligenceCategory;
  financialStatementRelationshipObservations?: SyntheticFinancialStatementRelationshipObservation[];
  balanceSheetIntegrityObservations?: SyntheticBalanceSheetIntegrityObservation[];
  auditReadinessObservations?: SyntheticAuditReadinessObservation[];
  continuousAuditObservations?: SyntheticContinuousAuditObservation[];
  continuousControllerObservations?: SyntheticContinuousControllerObservation[];
  periodEndActivityObservations?: SyntheticPeriodEndActivityObservation[];
  cutoffIntelligenceObservations?: SyntheticCutoffIntelligenceObservation[];
  journalTestingObservations?: SyntheticJournalTestingObservation[];
  auditCoverageObservations?: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations?: SyntheticEvidenceSufficiencyObservation[];
  pbcRequestObservations?: SyntheticPbcRequestObservation[];
  auditScheduleObservations?: SyntheticAuditScheduleObservation[];
  auditTieOutObservations?: SyntheticAuditTieOutObservation[];
  scheduleCompletenessObservations?: SyntheticScheduleCompletenessObservation[];
  trustVerificationObservations?: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations?: SyntheticPlatformIntegrityObservation[];
  missingActivityObservations?: SyntheticMissingActivityObservation[];
  expectedActivityObservations?: SyntheticExpectedActivityObservation[];
  recurringPatternObservations?: SyntheticRecurringPatternObservation[];
  bankActivityObservations?: SyntheticBankActivityObservation[];
  reserveIntelligenceObservations?: SyntheticReserveIntelligenceObservation[];
  anomalyObservations?: SyntheticFixedAssetIntelligenceForwardCompatibleObservation[];
  cashDisbursementObservations?: SyntheticFixedAssetIntelligenceForwardCompatibleObservation[];
  depreciationScheduleObservations?: SyntheticFixedAssetIntelligenceForwardCompatibleObservation[];
  cipObservations?: SyntheticFixedAssetIntelligenceForwardCompatibleObservation[];
  gainLossObservations?: SyntheticFixedAssetIntelligenceForwardCompatibleObservation[];
  rollforwardObservations?: SyntheticFixedAssetIntelligenceForwardCompatibleObservation[];
  capitalizationObservations?: SyntheticFixedAssetIntelligenceForwardCompatibleObservation[];
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticFixedAssetIntelligenceObservation {
  fixedAssetIntelligenceObservationId: string;
  fixedAssetIntelligenceObservationKey: string;
  fixedAssetIntelligenceCategory: SyntheticFixedAssetIntelligenceCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticFixedAssetIntelligenceIsolationDimension;
  firmIsolation: SyntheticFixedAssetIntelligenceIsolationDimension;
  clientIsolation: SyntheticFixedAssetIntelligenceIsolationDimension;
  financialStatementRelationshipObservationIds: string[];
  balanceSheetIntegrityObservationIds: string[];
  auditReadinessObservationIds: string[];
  continuousAuditObservationIds: string[];
  continuousControllerObservationIds: string[];
  periodEndActivityObservationIds: string[];
  cutoffIntelligenceObservationIds: string[];
  journalTestingObservationIds: string[];
  auditCoverageObservationIds: string[];
  evidenceSufficiencyObservationIds: string[];
  pbcRequestObservationIds: string[];
  auditScheduleObservationIds: string[];
  auditTieOutObservationIds: string[];
  scheduleCompletenessObservationIds: string[];
  trustVerificationObservationIds: string[];
  platformIntegrityObservationIds: string[];
  missingActivityObservationIds: string[];
  expectedActivityObservationIds: string[];
  recurringPatternObservationIds: string[];
  bankActivityObservationIds: string[];
  reserveIntelligenceObservationIds: string[];
  anomalyObservationIds: string[];
  cashDisbursementObservationIds: string[];
  depreciationScheduleObservationIds: string[];
  cipObservationIds: string[];
  gainLossObservationIds: string[];
  rollforwardObservationIds: string[];
  capitalizationObservationIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  fixedAssetIntelligenceReferenceIds: string[];
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
  auditReadinessObservations: SyntheticAuditReadinessObservation[];
  continuousAuditObservations: SyntheticContinuousAuditObservation[];
  continuousControllerObservations: SyntheticContinuousControllerObservation[];
  periodEndActivityObservations: SyntheticPeriodEndActivityObservation[];
  cutoffIntelligenceObservations: SyntheticCutoffIntelligenceObservation[];
  journalTestingObservations: SyntheticJournalTestingObservation[];
  auditCoverageObservations: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations: SyntheticEvidenceSufficiencyObservation[];
  pbcRequestObservations: SyntheticPbcRequestObservation[];
  auditScheduleObservations: SyntheticAuditScheduleObservation[];
  auditTieOutObservations: SyntheticAuditTieOutObservation[];
  scheduleCompletenessObservations: SyntheticScheduleCompletenessObservation[];
  trustVerificationObservations: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations: SyntheticPlatformIntegrityObservation[];
  missingActivityObservations: SyntheticMissingActivityObservation[];
  expectedActivityObservations: SyntheticExpectedActivityObservation[];
  recurringPatternObservations: SyntheticRecurringPatternObservation[];
  bankActivityObservations: SyntheticBankActivityObservation[];
  reserveIntelligenceObservations: SyntheticReserveIntelligenceObservation[];
  anomalyObservations: SyntheticFixedAssetIntelligenceForwardCompatibleObservation[];
  cashDisbursementObservations: SyntheticFixedAssetIntelligenceForwardCompatibleObservation[];
  depreciationScheduleObservations: SyntheticFixedAssetIntelligenceForwardCompatibleObservation[];
  cipObservations: SyntheticFixedAssetIntelligenceForwardCompatibleObservation[];
  gainLossObservations: SyntheticFixedAssetIntelligenceForwardCompatibleObservation[];
  rollforwardObservations: SyntheticFixedAssetIntelligenceForwardCompatibleObservation[];
  capitalizationObservations: SyntheticFixedAssetIntelligenceForwardCompatibleObservation[];
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildFixedAssetIntelligenceObservationResult {
  fixedAssetIntelligenceObservation: SyntheticFixedAssetIntelligenceObservation | null;
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

function isSupportedFixedAssetIntelligenceCategory(category: SyntheticFixedAssetIntelligenceCategory): boolean {
  return SYNTHETIC_FIXED_ASSET_INTELLIGENCE_CATEGORIES.includes(category);
}

function buildCustomerIsolation(scope: SyntheticAuditScope): SyntheticFixedAssetIntelligenceIsolationDimension {
  return { required: scope.customerIsolationRequired, referenceIds: scope.isolationBoundaryIds };
}

function buildFirmIsolation(scope: SyntheticAuditScope): SyntheticFixedAssetIntelligenceIsolationDimension {
  return {
    required: scope.firmIsolationRequired,
    referenceIds: uniqueStable([scope.firmId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function buildClientIsolation(scope: SyntheticAuditScope): SyntheticFixedAssetIntelligenceIsolationDimension {
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

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getDomainObservations(input: BuildFixedAssetIntelligenceObservationInput): object[] {
  return [
    ...getInputArray(input.financialStatementRelationshipObservations),
    ...getInputArray(input.balanceSheetIntegrityObservations),
    ...getInputArray(input.auditReadinessObservations),
    ...getInputArray(input.continuousAuditObservations),
    ...getInputArray(input.continuousControllerObservations),
    ...getInputArray(input.periodEndActivityObservations),
    ...getInputArray(input.cutoffIntelligenceObservations),
    ...getInputArray(input.journalTestingObservations),
    ...getInputArray(input.auditCoverageObservations),
    ...getInputArray(input.evidenceSufficiencyObservations),
    ...getInputArray(input.pbcRequestObservations),
    ...getInputArray(input.auditScheduleObservations),
    ...getInputArray(input.auditTieOutObservations),
    ...getInputArray(input.scheduleCompletenessObservations),
    ...getInputArray(input.trustVerificationObservations),
    ...getInputArray(input.platformIntegrityObservations),
    ...getInputArray(input.missingActivityObservations),
    ...getInputArray(input.expectedActivityObservations),
    ...getInputArray(input.recurringPatternObservations),
    ...getInputArray(input.bankActivityObservations),
    ...getInputArray(input.reserveIntelligenceObservations),
    ...getInputArray(input.anomalyObservations),
    ...getInputArray(input.cashDisbursementObservations),
    ...getInputArray(input.depreciationScheduleObservations),
    ...getInputArray(input.cipObservations),
    ...getInputArray(input.gainLossObservations),
    ...getInputArray(input.rollforwardObservations),
    ...getInputArray(input.capitalizationObservations),
  ];
}

function getAuditCandidates(input: BuildFixedAssetIntelligenceObservationInput): SyntheticAuditCandidate[] {
  return getInputArray(input.auditCandidates);
}

function getAuditEvidencePackages(input: BuildFixedAssetIntelligenceObservationInput): SyntheticAuditEvidencePackage[] {
  return getInputArray(input.auditEvidencePackages);
}

function getAuditFindings(input: BuildFixedAssetIntelligenceObservationInput): SyntheticAuditFinding[] {
  return getInputArray(input.auditFindings);
}

function getAuditConfidencePackages(input: BuildFixedAssetIntelligenceObservationInput): SyntheticAuditConfidence[] {
  return getInputArray(input.auditConfidencePackages);
}

function getAuditSurfaces(input: BuildFixedAssetIntelligenceObservationInput): SyntheticAuditSurface[] {
  return getInputArray(input.auditSurfaces);
}

function getAuditWatchlists(input: BuildFixedAssetIntelligenceObservationInput): SyntheticAuditWatchlist[] {
  return getInputArray(input.auditWatchlists);
}

function getAuditBriefings(input: BuildFixedAssetIntelligenceObservationInput): SyntheticAuditBriefing[] {
  return getInputArray(input.auditBriefings);
}

function getAllAuditArtifacts(input: BuildFixedAssetIntelligenceObservationInput): AuditArtifact[] {
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
  input: BuildFixedAssetIntelligenceObservationInput,
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

function getEvidenceReferenceIds(input: BuildFixedAssetIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "evidenceReferenceIds")),
  ]);
}

function getSourceReferenceIds(input: BuildFixedAssetIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "sourceReferenceIds")),
  ]);
}

function getLineageReferenceIds(input: BuildFixedAssetIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "lineageReferenceIds")),
  ]);
}

function getAuditContractReferenceIdsFromInput(input: BuildFixedAssetIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...getAuditContractReferenceIds(input.auditContract),
    ...getAllAuditArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "auditContractReferenceIds")),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditContractReferenceIds")),
  ]);
}

function getReferenceIds(input: BuildFixedAssetIntelligenceObservationInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, singularName),
      ...getStringArrayProperty(artifact, arrayName),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, arrayName)),
  ]);
}

function getFixedAssetIntelligenceReferenceIds(input: BuildFixedAssetIntelligenceObservationInput): string[] {
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

function buildFixedAssetIntelligenceObservationId(input: BuildFixedAssetIntelligenceObservationInput): string {
  return `synthetic-fixed-asset-intelligence-observation:${stableSnapshotHash({
    fixedAssetIntelligenceObservationKey: input.fixedAssetIntelligenceObservationKey,
    fixedAssetIntelligenceCategory: input.fixedAssetIntelligenceCategory,
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
    auditReadinessObservationIds: getObservationIds(getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"),
    continuousAuditObservationIds: getObservationIds(getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"),
    continuousControllerObservationIds: getObservationIds(
      getInputArray(input.continuousControllerObservations),
      "continuousControllerObservationId",
    ),
    periodEndActivityObservationIds: getObservationIds(getInputArray(input.periodEndActivityObservations), "periodEndActivityObservationId"),
    cutoffIntelligenceObservationIds: getObservationIds(getInputArray(input.cutoffIntelligenceObservations), "cutoffIntelligenceObservationId"),
    journalTestingObservationIds: getObservationIds(getInputArray(input.journalTestingObservations), "journalTestingObservationId"),
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
    trustVerificationObservationIds: getObservationIds(getInputArray(input.trustVerificationObservations), "trustVerificationObservationId"),
    platformIntegrityObservationIds: getObservationIds(getInputArray(input.platformIntegrityObservations), "platformIntegrityObservationId"),
    missingActivityObservationIds: getObservationIds(getInputArray(input.missingActivityObservations), "missingActivityObservationId"),
    expectedActivityObservationIds: getObservationIds(getInputArray(input.expectedActivityObservations), "expectedActivityObservationId"),
    recurringPatternObservationIds: getObservationIds(getInputArray(input.recurringPatternObservations), "recurringPatternObservationId"),
    bankActivityObservationIds: getObservationIds(getInputArray(input.bankActivityObservations), "bankActivityObservationId"),
    reserveIntelligenceObservationIds: getObservationIds(getInputArray(input.reserveIntelligenceObservations), "reserveIntelligenceObservationId"),
    anomalyObservationIds: getObservationIds(getInputArray(input.anomalyObservations), "anomalyObservationId"),
    cashDisbursementObservationIds: getObservationIds(getInputArray(input.cashDisbursementObservations), "cashDisbursementObservationId"),
    depreciationScheduleObservationIds: getObservationIds(
      getInputArray(input.depreciationScheduleObservations),
      "depreciationScheduleObservationId",
    ),
    cipObservationIds: getObservationIds(getInputArray(input.cipObservations), "cipObservationId"),
    gainLossObservationIds: getObservationIds(getInputArray(input.gainLossObservations), "gainLossObservationId"),
    rollforwardObservationIds: getObservationIds(getInputArray(input.rollforwardObservations), "rollforwardObservationId"),
    capitalizationObservationIds: getObservationIds(getInputArray(input.capitalizationObservations), "capitalizationObservationId"),
    auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
    auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
    auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
    auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
    auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
    auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
    auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
    auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
    fixedAssetIntelligenceReferenceIds: getFixedAssetIntelligenceReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
    isolationBoundaryIds: input.auditContract?.scope.isolationBoundaryIds ?? [],
  })}`;
}

function validateAuditArtifacts(input: BuildFixedAssetIntelligenceObservationInput, warnings: string[]): void {
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

function validateDomainObservationIds(input: BuildFixedAssetIntelligenceObservationInput, warnings: string[]): void {
  const companyId = input.auditContract?.scope.companyId;
  for (const [observationName, observations, idField] of [
    [
      "financialStatementRelationshipObservations",
      getInputArray(input.financialStatementRelationshipObservations),
      "financialStatementRelationshipObservationId",
    ],
    ["balanceSheetIntegrityObservations", getInputArray(input.balanceSheetIntegrityObservations), "balanceSheetIntegrityObservationId"],
    ["auditReadinessObservations", getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"],
    ["continuousAuditObservations", getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"],
    ["continuousControllerObservations", getInputArray(input.continuousControllerObservations), "continuousControllerObservationId"],
    ["periodEndActivityObservations", getInputArray(input.periodEndActivityObservations), "periodEndActivityObservationId"],
    ["cutoffIntelligenceObservations", getInputArray(input.cutoffIntelligenceObservations), "cutoffIntelligenceObservationId"],
    ["journalTestingObservations", getInputArray(input.journalTestingObservations), "journalTestingObservationId"],
    ["auditCoverageObservations", getInputArray(input.auditCoverageObservations), "auditCoverageObservationId"],
    ["evidenceSufficiencyObservations", getInputArray(input.evidenceSufficiencyObservations), "evidenceSufficiencyObservationId"],
    ["pbcRequestObservations", getInputArray(input.pbcRequestObservations), "pbcRequestObservationId"],
    ["auditScheduleObservations", getInputArray(input.auditScheduleObservations), "auditScheduleObservationId"],
    ["auditTieOutObservations", getInputArray(input.auditTieOutObservations), "auditTieOutObservationId"],
    ["scheduleCompletenessObservations", getInputArray(input.scheduleCompletenessObservations), "scheduleCompletenessObservationId"],
    ["trustVerificationObservations", getInputArray(input.trustVerificationObservations), "trustVerificationObservationId"],
    ["platformIntegrityObservations", getInputArray(input.platformIntegrityObservations), "platformIntegrityObservationId"],
    ["missingActivityObservations", getInputArray(input.missingActivityObservations), "missingActivityObservationId"],
    ["expectedActivityObservations", getInputArray(input.expectedActivityObservations), "expectedActivityObservationId"],
    ["recurringPatternObservations", getInputArray(input.recurringPatternObservations), "recurringPatternObservationId"],
    ["bankActivityObservations", getInputArray(input.bankActivityObservations), "bankActivityObservationId"],
    ["reserveIntelligenceObservations", getInputArray(input.reserveIntelligenceObservations), "reserveIntelligenceObservationId"],
    ["anomalyObservations", getInputArray(input.anomalyObservations), "anomalyObservationId"],
    ["cashDisbursementObservations", getInputArray(input.cashDisbursementObservations), "cashDisbursementObservationId"],
    ["depreciationScheduleObservations", getInputArray(input.depreciationScheduleObservations), "depreciationScheduleObservationId"],
    ["cipObservations", getInputArray(input.cipObservations), "cipObservationId"],
    ["gainLossObservations", getInputArray(input.gainLossObservations), "gainLossObservationId"],
    ["rollforwardObservations", getInputArray(input.rollforwardObservations), "rollforwardObservationId"],
    ["capitalizationObservations", getInputArray(input.capitalizationObservations), "capitalizationObservationId"],
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

function getForwardCompatibilityWarnings(input: BuildFixedAssetIntelligenceObservationInput): string[] {
  return [
    ...(getInputArray(input.anomalyObservations).length > 0
      ? ["anomaly intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.cashDisbursementObservations).length > 0
      ? ["cash disbursement intelligence is a forward-compatible Phase 34 module."]
      : []),
    ...(getInputArray(input.depreciationScheduleObservations).length > 0
      ? ["depreciation schedule intelligence is a forward-compatible Phase 34 module."]
      : []),
  ];
}

function validateInput(input: BuildFixedAssetIntelligenceObservationInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (!hasValue(input.fixedAssetIntelligenceObservationKey)) {
    warnings.push("fixedAssetIntelligenceObservationKey is required.");
  }
  if (!hasValue(input.fixedAssetIntelligenceCategory)) warnings.push("fixedAssetIntelligenceCategory is required.");
  if (!isSupportedFixedAssetIntelligenceCategory(input.fixedAssetIntelligenceCategory)) {
    warnings.push("fixedAssetIntelligenceCategory must be a supported fixed asset intelligence category.");
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

export function buildFixedAssetIntelligenceObservation(
  input: BuildFixedAssetIntelligenceObservationInput,
): BuildFixedAssetIntelligenceObservationResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      fixedAssetIntelligenceObservation: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const allArtifacts = getAllAuditArtifacts(input);
  const domainObservations = getDomainObservations(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    fixedAssetIntelligenceObservation: {
      fixedAssetIntelligenceObservationId: buildFixedAssetIntelligenceObservationId(input),
      fixedAssetIntelligenceObservationKey: input.fixedAssetIntelligenceObservationKey,
      fixedAssetIntelligenceCategory: input.fixedAssetIntelligenceCategory,
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
      auditReadinessObservationIds: getObservationIds(getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"),
      continuousAuditObservationIds: getObservationIds(getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"),
      continuousControllerObservationIds: getObservationIds(
        getInputArray(input.continuousControllerObservations),
        "continuousControllerObservationId",
      ),
      periodEndActivityObservationIds: getObservationIds(getInputArray(input.periodEndActivityObservations), "periodEndActivityObservationId"),
      cutoffIntelligenceObservationIds: getObservationIds(getInputArray(input.cutoffIntelligenceObservations), "cutoffIntelligenceObservationId"),
      journalTestingObservationIds: getObservationIds(getInputArray(input.journalTestingObservations), "journalTestingObservationId"),
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
      trustVerificationObservationIds: getObservationIds(getInputArray(input.trustVerificationObservations), "trustVerificationObservationId"),
      platformIntegrityObservationIds: getObservationIds(getInputArray(input.platformIntegrityObservations), "platformIntegrityObservationId"),
      missingActivityObservationIds: getObservationIds(getInputArray(input.missingActivityObservations), "missingActivityObservationId"),
      expectedActivityObservationIds: getObservationIds(getInputArray(input.expectedActivityObservations), "expectedActivityObservationId"),
      recurringPatternObservationIds: getObservationIds(getInputArray(input.recurringPatternObservations), "recurringPatternObservationId"),
      bankActivityObservationIds: getObservationIds(getInputArray(input.bankActivityObservations), "bankActivityObservationId"),
      reserveIntelligenceObservationIds: getObservationIds(getInputArray(input.reserveIntelligenceObservations), "reserveIntelligenceObservationId"),
      anomalyObservationIds: getObservationIds(getInputArray(input.anomalyObservations), "anomalyObservationId"),
      cashDisbursementObservationIds: getObservationIds(getInputArray(input.cashDisbursementObservations), "cashDisbursementObservationId"),
      depreciationScheduleObservationIds: getObservationIds(
        getInputArray(input.depreciationScheduleObservations),
        "depreciationScheduleObservationId",
      ),
      cipObservationIds: getObservationIds(getInputArray(input.cipObservations), "cipObservationId"),
      gainLossObservationIds: getObservationIds(getInputArray(input.gainLossObservations), "gainLossObservationId"),
      rollforwardObservationIds: getObservationIds(getInputArray(input.rollforwardObservations), "rollforwardObservationId"),
      capitalizationObservationIds: getObservationIds(getInputArray(input.capitalizationObservations), "capitalizationObservationId"),
      auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
      auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
      auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
      auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
      auditFindingIds: getReferenceIds(input, "auditFindingId", "auditFindingIds"),
      auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
      auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
      auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
      auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
      fixedAssetIntelligenceReferenceIds: getFixedAssetIntelligenceReferenceIds(input),
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
      auditReadinessObservations: getInputArray(input.auditReadinessObservations),
      continuousAuditObservations: getInputArray(input.continuousAuditObservations),
      continuousControllerObservations: getInputArray(input.continuousControllerObservations),
      periodEndActivityObservations: getInputArray(input.periodEndActivityObservations),
      cutoffIntelligenceObservations: getInputArray(input.cutoffIntelligenceObservations),
      journalTestingObservations: getInputArray(input.journalTestingObservations),
      auditCoverageObservations: getInputArray(input.auditCoverageObservations),
      evidenceSufficiencyObservations: getInputArray(input.evidenceSufficiencyObservations),
      pbcRequestObservations: getInputArray(input.pbcRequestObservations),
      auditScheduleObservations: getInputArray(input.auditScheduleObservations),
      auditTieOutObservations: getInputArray(input.auditTieOutObservations),
      scheduleCompletenessObservations: getInputArray(input.scheduleCompletenessObservations),
      trustVerificationObservations: getInputArray(input.trustVerificationObservations),
      platformIntegrityObservations: getInputArray(input.platformIntegrityObservations),
      missingActivityObservations: getInputArray(input.missingActivityObservations),
      expectedActivityObservations: getInputArray(input.expectedActivityObservations),
      recurringPatternObservations: getInputArray(input.recurringPatternObservations),
      bankActivityObservations: getInputArray(input.bankActivityObservations),
      reserveIntelligenceObservations: getInputArray(input.reserveIntelligenceObservations),
      anomalyObservations: getInputArray(input.anomalyObservations),
      cashDisbursementObservations: getInputArray(input.cashDisbursementObservations),
      depreciationScheduleObservations: getInputArray(input.depreciationScheduleObservations),
      cipObservations: getInputArray(input.cipObservations),
      gainLossObservations: getInputArray(input.gainLossObservations),
      rollforwardObservations: getInputArray(input.rollforwardObservations),
      capitalizationObservations: getInputArray(input.capitalizationObservations),
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
