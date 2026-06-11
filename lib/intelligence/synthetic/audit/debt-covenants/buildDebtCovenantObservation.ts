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
import type { SyntheticAuditEvidencePackage } from "../evidence";
import type { SyntheticEvidenceSufficiencyObservation } from "../evidence-sufficiency";
import type { SyntheticFinancialStatementRelationshipObservation } from "../financial-statement-relationships";
import type { SyntheticAuditFinding } from "../findings";
import type { SyntheticPbcRequestObservation } from "../pbc-request";
import type { SyntheticPlatformIntegrityObservation } from "../platform-integrity";
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

export type SyntheticDebtCovenantCategory =
  | "debt_schedule_candidate"
  | "covenant_candidate"
  | "covenant_threshold_candidate"
  | "covenant_relationship_candidate"
  | "debt_balance_candidate"
  | "interest_relationship_candidate"
  | "leverage_relationship_candidate"
  | "liquidity_relationship_candidate"
  | "debt_reconciliation_candidate"
  | "debt_support_candidate"
  | "debt_documentation_candidate"
  | "debt_compliance_candidate"
  | "debt_covenant_candidate"
  | "debt_maturity_candidate"
  | "debt_classification_candidate"
  | "covenant_headroom_candidate"
  | "covenant_trend_candidate"
  | "covenant_reporting_period_candidate";

export const SYNTHETIC_DEBT_COVENANT_CATEGORIES: SyntheticDebtCovenantCategory[] = [
  "debt_schedule_candidate",
  "covenant_candidate",
  "covenant_threshold_candidate",
  "covenant_relationship_candidate",
  "debt_balance_candidate",
  "interest_relationship_candidate",
  "leverage_relationship_candidate",
  "liquidity_relationship_candidate",
  "debt_reconciliation_candidate",
  "debt_support_candidate",
  "debt_documentation_candidate",
  "debt_compliance_candidate",
  "debt_covenant_candidate",
  "debt_maturity_candidate",
  "debt_classification_candidate",
  "covenant_headroom_candidate",
  "covenant_trend_candidate",
  "covenant_reporting_period_candidate",
];

export interface SyntheticDebtCovenantIsolationDimension {
  required: boolean;
  referenceIds: string[];
}

export interface SyntheticDebtCovenantForwardCompatibleObservation {
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

export interface BuildDebtCovenantObservationInput {
  auditContract: SyntheticAuditContract | null;
  debtCovenantObservationKey: string;
  debtCovenantCategory: SyntheticDebtCovenantCategory;
  financialStatementRelationshipObservations?: SyntheticFinancialStatementRelationshipObservation[];
  balanceSheetIntegrityObservations?: SyntheticBalanceSheetIntegrityObservation[];
  auditReadinessObservations?: SyntheticAuditReadinessObservation[];
  continuousAuditObservations?: SyntheticContinuousAuditObservation[];
  continuousControllerObservations?: SyntheticContinuousControllerObservation[];
  bankActivityObservations?: SyntheticBankActivityObservation[];
  cashDisbursementObservations?: SyntheticDebtCovenantForwardCompatibleObservation[];
  reserveIntelligenceObservations?: SyntheticReserveIntelligenceObservation[];
  auditCoverageObservations?: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations?: SyntheticEvidenceSufficiencyObservation[];
  pbcRequestObservations?: SyntheticPbcRequestObservation[];
  auditScheduleObservations?: SyntheticAuditScheduleObservation[];
  auditTieOutObservations?: SyntheticAuditTieOutObservation[];
  scheduleCompletenessObservations?: SyntheticScheduleCompletenessObservation[];
  trustVerificationObservations?: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations?: SyntheticPlatformIntegrityObservation[];
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticDebtCovenantObservation {
  debtCovenantObservationId: string;
  debtCovenantObservationKey: string;
  debtCovenantCategory: SyntheticDebtCovenantCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticDebtCovenantIsolationDimension;
  firmIsolation: SyntheticDebtCovenantIsolationDimension;
  clientIsolation: SyntheticDebtCovenantIsolationDimension;
  financialStatementRelationshipObservationIds: string[];
  balanceSheetIntegrityObservationIds: string[];
  auditReadinessObservationIds: string[];
  continuousAuditObservationIds: string[];
  continuousControllerObservationIds: string[];
  bankActivityObservationIds: string[];
  cashDisbursementObservationIds: string[];
  reserveIntelligenceObservationIds: string[];
  auditCoverageObservationIds: string[];
  evidenceSufficiencyObservationIds: string[];
  pbcRequestObservationIds: string[];
  auditScheduleObservationIds: string[];
  auditTieOutObservationIds: string[];
  scheduleCompletenessObservationIds: string[];
  trustVerificationObservationIds: string[];
  platformIntegrityObservationIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  debtCovenantReferenceIds: string[];
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
  bankActivityObservations: SyntheticBankActivityObservation[];
  cashDisbursementObservations: SyntheticDebtCovenantForwardCompatibleObservation[];
  reserveIntelligenceObservations: SyntheticReserveIntelligenceObservation[];
  auditCoverageObservations: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations: SyntheticEvidenceSufficiencyObservation[];
  pbcRequestObservations: SyntheticPbcRequestObservation[];
  auditScheduleObservations: SyntheticAuditScheduleObservation[];
  auditTieOutObservations: SyntheticAuditTieOutObservation[];
  scheduleCompletenessObservations: SyntheticScheduleCompletenessObservation[];
  trustVerificationObservations: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations: SyntheticPlatformIntegrityObservation[];
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildDebtCovenantObservationResult {
  debtCovenantObservation: SyntheticDebtCovenantObservation | null;
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

function isSupportedDebtCovenantCategory(category: SyntheticDebtCovenantCategory): boolean {
  return SYNTHETIC_DEBT_COVENANT_CATEGORIES.includes(category);
}

function buildCustomerIsolation(scope: SyntheticAuditScope): SyntheticDebtCovenantIsolationDimension {
  return { required: scope.customerIsolationRequired, referenceIds: scope.isolationBoundaryIds };
}

function buildFirmIsolation(scope: SyntheticAuditScope): SyntheticDebtCovenantIsolationDimension {
  return {
    required: scope.firmIsolationRequired,
    referenceIds: uniqueStable([scope.firmId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function buildClientIsolation(scope: SyntheticAuditScope): SyntheticDebtCovenantIsolationDimension {
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

function getFinancialStatementRelationshipObservations(
  input: BuildDebtCovenantObservationInput,
): SyntheticFinancialStatementRelationshipObservation[] {
  return input.financialStatementRelationshipObservations ?? [];
}

function getBalanceSheetIntegrityObservations(
  input: BuildDebtCovenantObservationInput,
): SyntheticBalanceSheetIntegrityObservation[] {
  return input.balanceSheetIntegrityObservations ?? [];
}

function getAuditReadinessObservations(input: BuildDebtCovenantObservationInput): SyntheticAuditReadinessObservation[] {
  return input.auditReadinessObservations ?? [];
}

function getContinuousAuditObservations(input: BuildDebtCovenantObservationInput): SyntheticContinuousAuditObservation[] {
  return input.continuousAuditObservations ?? [];
}

function getContinuousControllerObservations(
  input: BuildDebtCovenantObservationInput,
): SyntheticContinuousControllerObservation[] {
  return input.continuousControllerObservations ?? [];
}

function getBankActivityObservations(input: BuildDebtCovenantObservationInput): SyntheticBankActivityObservation[] {
  return input.bankActivityObservations ?? [];
}

function getCashDisbursementObservations(
  input: BuildDebtCovenantObservationInput,
): SyntheticDebtCovenantForwardCompatibleObservation[] {
  return input.cashDisbursementObservations ?? [];
}

function getReserveIntelligenceObservations(
  input: BuildDebtCovenantObservationInput,
): SyntheticReserveIntelligenceObservation[] {
  return input.reserveIntelligenceObservations ?? [];
}

function getAuditCoverageObservations(input: BuildDebtCovenantObservationInput): SyntheticAuditCoverageObservation[] {
  return input.auditCoverageObservations ?? [];
}

function getEvidenceSufficiencyObservations(
  input: BuildDebtCovenantObservationInput,
): SyntheticEvidenceSufficiencyObservation[] {
  return input.evidenceSufficiencyObservations ?? [];
}

function getPbcRequestObservations(input: BuildDebtCovenantObservationInput): SyntheticPbcRequestObservation[] {
  return input.pbcRequestObservations ?? [];
}

function getAuditScheduleObservations(input: BuildDebtCovenantObservationInput): SyntheticAuditScheduleObservation[] {
  return input.auditScheduleObservations ?? [];
}

function getAuditTieOutObservations(input: BuildDebtCovenantObservationInput): SyntheticAuditTieOutObservation[] {
  return input.auditTieOutObservations ?? [];
}

function getScheduleCompletenessObservations(
  input: BuildDebtCovenantObservationInput,
): SyntheticScheduleCompletenessObservation[] {
  return input.scheduleCompletenessObservations ?? [];
}

function getTrustVerificationObservations(input: BuildDebtCovenantObservationInput): SyntheticTrustVerificationObservation[] {
  return input.trustVerificationObservations ?? [];
}

function getPlatformIntegrityObservations(input: BuildDebtCovenantObservationInput): SyntheticPlatformIntegrityObservation[] {
  return input.platformIntegrityObservations ?? [];
}

function getDomainObservations(input: BuildDebtCovenantObservationInput): object[] {
  return [
    ...getFinancialStatementRelationshipObservations(input),
    ...getBalanceSheetIntegrityObservations(input),
    ...getAuditReadinessObservations(input),
    ...getContinuousAuditObservations(input),
    ...getContinuousControllerObservations(input),
    ...getBankActivityObservations(input),
    ...getCashDisbursementObservations(input),
    ...getReserveIntelligenceObservations(input),
    ...getAuditCoverageObservations(input),
    ...getEvidenceSufficiencyObservations(input),
    ...getPbcRequestObservations(input),
    ...getAuditScheduleObservations(input),
    ...getAuditTieOutObservations(input),
    ...getScheduleCompletenessObservations(input),
    ...getTrustVerificationObservations(input),
    ...getPlatformIntegrityObservations(input),
  ];
}

function getAuditCandidates(input: BuildDebtCovenantObservationInput): SyntheticAuditCandidate[] {
  return input.auditCandidates ?? [];
}

function getAuditEvidencePackages(input: BuildDebtCovenantObservationInput): SyntheticAuditEvidencePackage[] {
  return input.auditEvidencePackages ?? [];
}

function getAuditFindings(input: BuildDebtCovenantObservationInput): SyntheticAuditFinding[] {
  return input.auditFindings ?? [];
}

function getAuditConfidencePackages(input: BuildDebtCovenantObservationInput): SyntheticAuditConfidence[] {
  return input.auditConfidencePackages ?? [];
}

function getAuditSurfaces(input: BuildDebtCovenantObservationInput): SyntheticAuditSurface[] {
  return input.auditSurfaces ?? [];
}

function getAuditWatchlists(input: BuildDebtCovenantObservationInput): SyntheticAuditWatchlist[] {
  return input.auditWatchlists ?? [];
}

function getAuditBriefings(input: BuildDebtCovenantObservationInput): SyntheticAuditBriefing[] {
  return input.auditBriefings ?? [];
}

function getAllAuditArtifacts(input: BuildDebtCovenantObservationInput): AuditArtifact[] {
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
  input: BuildDebtCovenantObservationInput,
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

function getEvidenceReferenceIds(input: BuildDebtCovenantObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "evidenceReferenceIds")),
  ]);
}

function getSourceReferenceIds(input: BuildDebtCovenantObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "sourceReferenceIds")),
  ]);
}

function getLineageReferenceIds(input: BuildDebtCovenantObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "lineageReferenceIds")),
  ]);
}

function getAuditContractReferenceIdsFromInput(input: BuildDebtCovenantObservationInput): string[] {
  return uniqueStable([
    ...getAuditContractReferenceIds(input.auditContract),
    ...getAllAuditArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "auditContractReferenceIds")),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditContractReferenceIds")),
  ]);
}

function getReferenceIds(input: BuildDebtCovenantObservationInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, singularName),
      ...getStringArrayProperty(artifact, arrayName),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, arrayName)),
  ]);
}

function getDebtCovenantReferenceIds(input: BuildDebtCovenantObservationInput): string[] {
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

function buildDebtCovenantObservationId(input: BuildDebtCovenantObservationInput): string {
  return `synthetic-debt-covenant-observation:${stableSnapshotHash({
    debtCovenantObservationKey: input.debtCovenantObservationKey,
    debtCovenantCategory: input.debtCovenantCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    customerIsolation: input.auditContract ? buildCustomerIsolation(input.auditContract.scope) : null,
    firmIsolation: input.auditContract ? buildFirmIsolation(input.auditContract.scope) : null,
    clientIsolation: input.auditContract ? buildClientIsolation(input.auditContract.scope) : null,
    financialStatementRelationshipObservationIds: getObservationIds(
      getFinancialStatementRelationshipObservations(input),
      "financialStatementRelationshipObservationId",
    ),
    balanceSheetIntegrityObservationIds: getObservationIds(
      getBalanceSheetIntegrityObservations(input),
      "balanceSheetIntegrityObservationId",
    ),
    auditReadinessObservationIds: getObservationIds(getAuditReadinessObservations(input), "auditReadinessObservationId"),
    continuousAuditObservationIds: getObservationIds(getContinuousAuditObservations(input), "continuousAuditObservationId"),
    continuousControllerObservationIds: getObservationIds(
      getContinuousControllerObservations(input),
      "continuousControllerObservationId",
    ),
    bankActivityObservationIds: getObservationIds(getBankActivityObservations(input), "bankActivityObservationId"),
    cashDisbursementObservationIds: getObservationIds(
      getCashDisbursementObservations(input),
      "cashDisbursementObservationId",
    ),
    reserveIntelligenceObservationIds: getObservationIds(
      getReserveIntelligenceObservations(input),
      "reserveIntelligenceObservationId",
    ),
    auditCoverageObservationIds: getObservationIds(getAuditCoverageObservations(input), "auditCoverageObservationId"),
    evidenceSufficiencyObservationIds: getObservationIds(
      getEvidenceSufficiencyObservations(input),
      "evidenceSufficiencyObservationId",
    ),
    pbcRequestObservationIds: getObservationIds(getPbcRequestObservations(input), "pbcRequestObservationId"),
    auditScheduleObservationIds: getObservationIds(getAuditScheduleObservations(input), "auditScheduleObservationId"),
    auditTieOutObservationIds: getObservationIds(getAuditTieOutObservations(input), "auditTieOutObservationId"),
    scheduleCompletenessObservationIds: getObservationIds(
      getScheduleCompletenessObservations(input),
      "scheduleCompletenessObservationId",
    ),
    trustVerificationObservationIds: getObservationIds(getTrustVerificationObservations(input), "trustVerificationObservationId"),
    platformIntegrityObservationIds: getObservationIds(getPlatformIntegrityObservations(input), "platformIntegrityObservationId"),
    auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
    auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
    auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
    auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
    auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
    auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
    auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
    auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
    debtCovenantReferenceIds: getDebtCovenantReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
    isolationBoundaryIds: input.auditContract?.scope.isolationBoundaryIds ?? [],
  })}`;
}

function validateAuditArtifacts(input: BuildDebtCovenantObservationInput, warnings: string[]): void {
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

function validateDomainObservationIds(input: BuildDebtCovenantObservationInput, warnings: string[]): void {
  const companyId = input.auditContract?.scope.companyId;
  for (const [observationName, observations, idField] of [
    [
      "financialStatementRelationshipObservations",
      getFinancialStatementRelationshipObservations(input),
      "financialStatementRelationshipObservationId",
    ],
    ["balanceSheetIntegrityObservations", getBalanceSheetIntegrityObservations(input), "balanceSheetIntegrityObservationId"],
    ["auditReadinessObservations", getAuditReadinessObservations(input), "auditReadinessObservationId"],
    ["continuousAuditObservations", getContinuousAuditObservations(input), "continuousAuditObservationId"],
    ["continuousControllerObservations", getContinuousControllerObservations(input), "continuousControllerObservationId"],
    ["bankActivityObservations", getBankActivityObservations(input), "bankActivityObservationId"],
    ["cashDisbursementObservations", getCashDisbursementObservations(input), "cashDisbursementObservationId"],
    ["reserveIntelligenceObservations", getReserveIntelligenceObservations(input), "reserveIntelligenceObservationId"],
    ["auditCoverageObservations", getAuditCoverageObservations(input), "auditCoverageObservationId"],
    ["evidenceSufficiencyObservations", getEvidenceSufficiencyObservations(input), "evidenceSufficiencyObservationId"],
    ["pbcRequestObservations", getPbcRequestObservations(input), "pbcRequestObservationId"],
    ["auditScheduleObservations", getAuditScheduleObservations(input), "auditScheduleObservationId"],
    ["auditTieOutObservations", getAuditTieOutObservations(input), "auditTieOutObservationId"],
    [
      "scheduleCompletenessObservations",
      getScheduleCompletenessObservations(input),
      "scheduleCompletenessObservationId",
    ],
    ["trustVerificationObservations", getTrustVerificationObservations(input), "trustVerificationObservationId"],
    ["platformIntegrityObservations", getPlatformIntegrityObservations(input), "platformIntegrityObservationId"],
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

function getForwardCompatibilityWarnings(input: BuildDebtCovenantObservationInput): string[] {
  return getCashDisbursementObservations(input).length > 0
    ? ["cash disbursement intelligence is a forward-compatible Phase 34 module."]
    : [];
}

function validateInput(input: BuildDebtCovenantObservationInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (!hasValue(input.debtCovenantObservationKey)) warnings.push("debtCovenantObservationKey is required.");
  if (!hasValue(input.debtCovenantCategory)) warnings.push("debtCovenantCategory is required.");
  if (!isSupportedDebtCovenantCategory(input.debtCovenantCategory)) {
    warnings.push("debtCovenantCategory must be a supported debt covenant category.");
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

export function buildDebtCovenantObservation(
  input: BuildDebtCovenantObservationInput,
): BuildDebtCovenantObservationResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      debtCovenantObservation: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const financialStatementRelationshipObservations = getFinancialStatementRelationshipObservations(input);
  const balanceSheetIntegrityObservations = getBalanceSheetIntegrityObservations(input);
  const auditReadinessObservations = getAuditReadinessObservations(input);
  const continuousAuditObservations = getContinuousAuditObservations(input);
  const continuousControllerObservations = getContinuousControllerObservations(input);
  const bankActivityObservations = getBankActivityObservations(input);
  const cashDisbursementObservations = getCashDisbursementObservations(input);
  const reserveIntelligenceObservations = getReserveIntelligenceObservations(input);
  const auditCoverageObservations = getAuditCoverageObservations(input);
  const evidenceSufficiencyObservations = getEvidenceSufficiencyObservations(input);
  const pbcRequestObservations = getPbcRequestObservations(input);
  const auditScheduleObservations = getAuditScheduleObservations(input);
  const auditTieOutObservations = getAuditTieOutObservations(input);
  const scheduleCompletenessObservations = getScheduleCompletenessObservations(input);
  const trustVerificationObservations = getTrustVerificationObservations(input);
  const platformIntegrityObservations = getPlatformIntegrityObservations(input);
  const auditCandidates = getAuditCandidates(input);
  const auditEvidencePackages = getAuditEvidencePackages(input);
  const auditFindings = getAuditFindings(input);
  const auditConfidencePackages = getAuditConfidencePackages(input);
  const auditSurfaces = getAuditSurfaces(input);
  const auditWatchlists = getAuditWatchlists(input);
  const auditBriefings = getAuditBriefings(input);
  const allArtifacts = getAllAuditArtifacts(input);
  const domainObservations = getDomainObservations(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    debtCovenantObservation: {
      debtCovenantObservationId: buildDebtCovenantObservationId(input),
      debtCovenantObservationKey: input.debtCovenantObservationKey,
      debtCovenantCategory: input.debtCovenantCategory,
      companyId: auditContract.scope.companyId,
      auditCategory: getAuditCategory(auditContract),
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      financialStatementRelationshipObservationIds: getObservationIds(
        financialStatementRelationshipObservations,
        "financialStatementRelationshipObservationId",
      ),
      balanceSheetIntegrityObservationIds: getObservationIds(
        balanceSheetIntegrityObservations,
        "balanceSheetIntegrityObservationId",
      ),
      auditReadinessObservationIds: getObservationIds(auditReadinessObservations, "auditReadinessObservationId"),
      continuousAuditObservationIds: getObservationIds(continuousAuditObservations, "continuousAuditObservationId"),
      continuousControllerObservationIds: getObservationIds(
        continuousControllerObservations,
        "continuousControllerObservationId",
      ),
      bankActivityObservationIds: getObservationIds(bankActivityObservations, "bankActivityObservationId"),
      cashDisbursementObservationIds: getObservationIds(cashDisbursementObservations, "cashDisbursementObservationId"),
      reserveIntelligenceObservationIds: getObservationIds(
        reserveIntelligenceObservations,
        "reserveIntelligenceObservationId",
      ),
      auditCoverageObservationIds: getObservationIds(auditCoverageObservations, "auditCoverageObservationId"),
      evidenceSufficiencyObservationIds: getObservationIds(
        evidenceSufficiencyObservations,
        "evidenceSufficiencyObservationId",
      ),
      pbcRequestObservationIds: getObservationIds(pbcRequestObservations, "pbcRequestObservationId"),
      auditScheduleObservationIds: getObservationIds(auditScheduleObservations, "auditScheduleObservationId"),
      auditTieOutObservationIds: getObservationIds(auditTieOutObservations, "auditTieOutObservationId"),
      scheduleCompletenessObservationIds: getObservationIds(
        scheduleCompletenessObservations,
        "scheduleCompletenessObservationId",
      ),
      trustVerificationObservationIds: getObservationIds(trustVerificationObservations, "trustVerificationObservationId"),
      platformIntegrityObservationIds: getObservationIds(platformIntegrityObservations, "platformIntegrityObservationId"),
      auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
      auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
      auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
      auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
      auditFindingIds: getReferenceIds(input, "auditFindingId", "auditFindingIds"),
      auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
      auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
      auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
      auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
      debtCovenantReferenceIds: getDebtCovenantReferenceIds(input),
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
      financialStatementRelationshipObservations,
      balanceSheetIntegrityObservations,
      auditReadinessObservations,
      continuousAuditObservations,
      continuousControllerObservations,
      bankActivityObservations,
      cashDisbursementObservations,
      reserveIntelligenceObservations,
      auditCoverageObservations,
      evidenceSufficiencyObservations,
      pbcRequestObservations,
      auditScheduleObservations,
      auditTieOutObservations,
      scheduleCompletenessObservations,
      trustVerificationObservations,
      platformIntegrityObservations,
      auditCandidates,
      auditEvidencePackages,
      auditFindings,
      auditConfidencePackages,
      auditSurfaces,
      auditWatchlists,
      auditBriefings,
      warnings,
    },
    skipped: false,
    warnings,
  };
}
