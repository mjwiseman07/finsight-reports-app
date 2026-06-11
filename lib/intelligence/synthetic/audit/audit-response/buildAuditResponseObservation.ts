import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticAuditCoverageObservation } from "../audit-coverage";
import type { SyntheticAuditReadinessObservation } from "../audit-readiness";
import type { SyntheticAuditScheduleObservation } from "../audit-schedules";
import type { SyntheticAuditTieOutObservation } from "../audit-tie-outs";
import type { SyntheticAuditBriefing } from "../briefings";
import type { SyntheticAuditCandidate } from "../candidates";
import type { SyntheticAuditConfidence } from "../confidence";
import type { SyntheticContinuousAuditObservation } from "../continuous-audit";
import type { SyntheticContinuousControllerObservation } from "../continuous-controller";
import type { SyntheticAuditEvidencePackage } from "../evidence";
import type { SyntheticEvidenceSufficiencyObservation } from "../evidence-sufficiency";
import type { SyntheticAuditFinding } from "../findings";
import type { SyntheticPbcRequestObservation } from "../pbc-request";
import type { SyntheticPlatformIntegrityObservation } from "../platform-integrity";
import type { SyntheticScheduleCompletenessObservation } from "../schedule-completeness";
import type { SyntheticTrustVerificationObservation } from "../trust-verification";
import type { SyntheticAuditSurface } from "../surfaces";
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

export type SyntheticAuditResponseCategory =
  | "audit_response_candidate"
  | "pbc_response_candidate"
  | "schedule_response_candidate"
  | "support_response_candidate"
  | "documentation_response_candidate"
  | "reconciliation_response_candidate"
  | "tie_out_response_candidate"
  | "balance_support_response_candidate"
  | "transaction_support_response_candidate"
  | "policy_response_candidate"
  | "methodology_response_candidate"
  | "audit_readiness_response_candidate"
  | "audit_journal_response_candidate"
  | "audit_flux_response_candidate"
  | "audit_payroll_response_candidate";

export const SYNTHETIC_AUDIT_RESPONSE_CATEGORIES: SyntheticAuditResponseCategory[] = [
  "audit_response_candidate",
  "pbc_response_candidate",
  "schedule_response_candidate",
  "support_response_candidate",
  "documentation_response_candidate",
  "reconciliation_response_candidate",
  "tie_out_response_candidate",
  "balance_support_response_candidate",
  "transaction_support_response_candidate",
  "policy_response_candidate",
  "methodology_response_candidate",
  "audit_readiness_response_candidate",
  "audit_journal_response_candidate",
  "audit_flux_response_candidate",
  "audit_payroll_response_candidate",
];

export const AUDIT_RESPONSE_PACKAGE_CATEGORY_PHASE_35_CANDIDATE = "audit_response_package_candidate";

export interface SyntheticAuditResponseIsolationDimension {
  required: boolean;
  referenceIds: string[];
}

export interface SyntheticAuditResponseForwardCompatibleObservation {
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

export interface BuildAuditResponseObservationInput {
  auditContract: SyntheticAuditContract | null;
  auditResponseObservationKey: string;
  auditResponseCategory: SyntheticAuditResponseCategory;
  auditReadinessObservations?: SyntheticAuditReadinessObservation[];
  auditCoverageObservations?: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations?: SyntheticEvidenceSufficiencyObservation[];
  pbcRequestObservations?: SyntheticPbcRequestObservation[];
  auditScheduleObservations?: SyntheticAuditScheduleObservation[];
  auditTieOutObservations?: SyntheticAuditTieOutObservation[];
  scheduleCompletenessObservations?: SyntheticScheduleCompletenessObservation[];
  trustVerificationObservations?: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations?: SyntheticPlatformIntegrityObservation[];
  continuousAuditObservations?: SyntheticContinuousAuditObservation[];
  continuousControllerObservations?: SyntheticContinuousControllerObservation[];
  fixedAssetIntelligenceObservations?: SyntheticAuditResponseForwardCompatibleObservation[];
  prepaidIntelligenceObservations?: SyntheticAuditResponseForwardCompatibleObservation[];
  fluxIntelligenceObservations?: SyntheticAuditResponseForwardCompatibleObservation[];
  unrecordedLiabilityIntelligenceObservations?: SyntheticAuditResponseForwardCompatibleObservation[];
  anomalyIntelligenceObservations?: SyntheticAuditResponseForwardCompatibleObservation[];
  debtCovenantIntelligenceObservations?: SyntheticAuditResponseForwardCompatibleObservation[];
  cashDisbursementIntelligenceObservations?: SyntheticAuditResponseForwardCompatibleObservation[];
  payrollIntelligenceObservations?: SyntheticAuditResponseForwardCompatibleObservation[];
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticAuditResponseObservation {
  auditResponseObservationId: string;
  auditResponseObservationKey: string;
  auditResponseCategory: SyntheticAuditResponseCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticAuditResponseIsolationDimension;
  firmIsolation: SyntheticAuditResponseIsolationDimension;
  clientIsolation: SyntheticAuditResponseIsolationDimension;
  auditReadinessObservationIds: string[];
  auditCoverageObservationIds: string[];
  evidenceSufficiencyObservationIds: string[];
  pbcRequestObservationIds: string[];
  auditScheduleObservationIds: string[];
  auditTieOutObservationIds: string[];
  scheduleCompletenessObservationIds: string[];
  trustVerificationObservationIds: string[];
  platformIntegrityObservationIds: string[];
  continuousAuditObservationIds: string[];
  continuousControllerObservationIds: string[];
  fixedAssetIntelligenceObservationIds: string[];
  prepaidIntelligenceObservationIds: string[];
  fluxIntelligenceObservationIds: string[];
  unrecordedLiabilityIntelligenceObservationIds: string[];
  anomalyIntelligenceObservationIds: string[];
  debtCovenantIntelligenceObservationIds: string[];
  cashDisbursementIntelligenceObservationIds: string[];
  payrollIntelligenceObservationIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  auditResponseReferenceIds: string[];
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
  auditReadinessObservations: SyntheticAuditReadinessObservation[];
  auditCoverageObservations: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations: SyntheticEvidenceSufficiencyObservation[];
  pbcRequestObservations: SyntheticPbcRequestObservation[];
  auditScheduleObservations: SyntheticAuditScheduleObservation[];
  auditTieOutObservations: SyntheticAuditTieOutObservation[];
  scheduleCompletenessObservations: SyntheticScheduleCompletenessObservation[];
  trustVerificationObservations: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations: SyntheticPlatformIntegrityObservation[];
  continuousAuditObservations: SyntheticContinuousAuditObservation[];
  continuousControllerObservations: SyntheticContinuousControllerObservation[];
  fixedAssetIntelligenceObservations: SyntheticAuditResponseForwardCompatibleObservation[];
  prepaidIntelligenceObservations: SyntheticAuditResponseForwardCompatibleObservation[];
  fluxIntelligenceObservations: SyntheticAuditResponseForwardCompatibleObservation[];
  unrecordedLiabilityIntelligenceObservations: SyntheticAuditResponseForwardCompatibleObservation[];
  anomalyIntelligenceObservations: SyntheticAuditResponseForwardCompatibleObservation[];
  debtCovenantIntelligenceObservations: SyntheticAuditResponseForwardCompatibleObservation[];
  cashDisbursementIntelligenceObservations: SyntheticAuditResponseForwardCompatibleObservation[];
  payrollIntelligenceObservations: SyntheticAuditResponseForwardCompatibleObservation[];
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildAuditResponseObservationResult {
  auditResponseObservation: SyntheticAuditResponseObservation | null;
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

function isSupportedAuditResponseCategory(category: SyntheticAuditResponseCategory): boolean {
  return SYNTHETIC_AUDIT_RESPONSE_CATEGORIES.includes(category);
}

function getAuditCategory(auditContract: SyntheticAuditContract): SyntheticAuditCategory | undefined {
  return (
    auditContract.observationMetadata?.auditCategory ??
    auditContract.findingMetadata?.auditCategory ??
    auditContract.exceptionMetadata?.auditCategory ??
    auditContract.riskMetadata?.auditCategory
  );
}

function buildCustomerIsolation(scope: SyntheticAuditScope): SyntheticAuditResponseIsolationDimension {
  return {
    required: scope.customerIsolationRequired,
    referenceIds: scope.isolationBoundaryIds,
  };
}

function buildFirmIsolation(scope: SyntheticAuditScope): SyntheticAuditResponseIsolationDimension {
  return {
    required: scope.firmIsolationRequired,
    referenceIds: uniqueStable([scope.firmId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function buildClientIsolation(scope: SyntheticAuditScope): SyntheticAuditResponseIsolationDimension {
  return {
    required: scope.clientIsolationRequired,
    referenceIds: uniqueStable([scope.clientId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
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

function getAuditReadinessObservations(input: BuildAuditResponseObservationInput): SyntheticAuditReadinessObservation[] {
  return input.auditReadinessObservations ?? [];
}

function getAuditCoverageObservations(input: BuildAuditResponseObservationInput): SyntheticAuditCoverageObservation[] {
  return input.auditCoverageObservations ?? [];
}

function getEvidenceSufficiencyObservations(
  input: BuildAuditResponseObservationInput,
): SyntheticEvidenceSufficiencyObservation[] {
  return input.evidenceSufficiencyObservations ?? [];
}

function getPbcRequestObservations(input: BuildAuditResponseObservationInput): SyntheticPbcRequestObservation[] {
  return input.pbcRequestObservations ?? [];
}

function getAuditScheduleObservations(input: BuildAuditResponseObservationInput): SyntheticAuditScheduleObservation[] {
  return input.auditScheduleObservations ?? [];
}

function getAuditTieOutObservations(input: BuildAuditResponseObservationInput): SyntheticAuditTieOutObservation[] {
  return input.auditTieOutObservations ?? [];
}

function getScheduleCompletenessObservations(
  input: BuildAuditResponseObservationInput,
): SyntheticScheduleCompletenessObservation[] {
  return input.scheduleCompletenessObservations ?? [];
}

function getTrustVerificationObservations(input: BuildAuditResponseObservationInput): SyntheticTrustVerificationObservation[] {
  return input.trustVerificationObservations ?? [];
}

function getPlatformIntegrityObservations(input: BuildAuditResponseObservationInput): SyntheticPlatformIntegrityObservation[] {
  return input.platformIntegrityObservations ?? [];
}

function getContinuousAuditObservations(input: BuildAuditResponseObservationInput): SyntheticContinuousAuditObservation[] {
  return input.continuousAuditObservations ?? [];
}

function getContinuousControllerObservations(
  input: BuildAuditResponseObservationInput,
): SyntheticContinuousControllerObservation[] {
  return input.continuousControllerObservations ?? [];
}

function getFixedAssetIntelligenceObservations(
  input: BuildAuditResponseObservationInput,
): SyntheticAuditResponseForwardCompatibleObservation[] {
  return input.fixedAssetIntelligenceObservations ?? [];
}

function getPrepaidIntelligenceObservations(
  input: BuildAuditResponseObservationInput,
): SyntheticAuditResponseForwardCompatibleObservation[] {
  return input.prepaidIntelligenceObservations ?? [];
}

function getFluxIntelligenceObservations(
  input: BuildAuditResponseObservationInput,
): SyntheticAuditResponseForwardCompatibleObservation[] {
  return input.fluxIntelligenceObservations ?? [];
}

function getUnrecordedLiabilityIntelligenceObservations(
  input: BuildAuditResponseObservationInput,
): SyntheticAuditResponseForwardCompatibleObservation[] {
  return input.unrecordedLiabilityIntelligenceObservations ?? [];
}

function getAnomalyIntelligenceObservations(
  input: BuildAuditResponseObservationInput,
): SyntheticAuditResponseForwardCompatibleObservation[] {
  return input.anomalyIntelligenceObservations ?? [];
}

function getDebtCovenantIntelligenceObservations(
  input: BuildAuditResponseObservationInput,
): SyntheticAuditResponseForwardCompatibleObservation[] {
  return input.debtCovenantIntelligenceObservations ?? [];
}

function getCashDisbursementIntelligenceObservations(
  input: BuildAuditResponseObservationInput,
): SyntheticAuditResponseForwardCompatibleObservation[] {
  return input.cashDisbursementIntelligenceObservations ?? [];
}

function getPayrollIntelligenceObservations(
  input: BuildAuditResponseObservationInput,
): SyntheticAuditResponseForwardCompatibleObservation[] {
  return input.payrollIntelligenceObservations ?? [];
}

function getDomainObservations(input: BuildAuditResponseObservationInput): object[] {
  return [
    ...getAuditReadinessObservations(input),
    ...getAuditCoverageObservations(input),
    ...getEvidenceSufficiencyObservations(input),
    ...getPbcRequestObservations(input),
    ...getAuditScheduleObservations(input),
    ...getAuditTieOutObservations(input),
    ...getScheduleCompletenessObservations(input),
    ...getTrustVerificationObservations(input),
    ...getPlatformIntegrityObservations(input),
    ...getContinuousAuditObservations(input),
    ...getContinuousControllerObservations(input),
    ...getFixedAssetIntelligenceObservations(input),
    ...getPrepaidIntelligenceObservations(input),
    ...getFluxIntelligenceObservations(input),
    ...getUnrecordedLiabilityIntelligenceObservations(input),
    ...getAnomalyIntelligenceObservations(input),
    ...getDebtCovenantIntelligenceObservations(input),
    ...getCashDisbursementIntelligenceObservations(input),
    ...getPayrollIntelligenceObservations(input),
  ];
}

function getAuditCandidates(input: BuildAuditResponseObservationInput): SyntheticAuditCandidate[] {
  return input.auditCandidates ?? [];
}

function getAuditEvidencePackages(input: BuildAuditResponseObservationInput): SyntheticAuditEvidencePackage[] {
  return input.auditEvidencePackages ?? [];
}

function getAuditFindings(input: BuildAuditResponseObservationInput): SyntheticAuditFinding[] {
  return input.auditFindings ?? [];
}

function getAuditConfidencePackages(input: BuildAuditResponseObservationInput): SyntheticAuditConfidence[] {
  return input.auditConfidencePackages ?? [];
}

function getAuditSurfaces(input: BuildAuditResponseObservationInput): SyntheticAuditSurface[] {
  return input.auditSurfaces ?? [];
}

function getAuditWatchlists(input: BuildAuditResponseObservationInput): SyntheticAuditWatchlist[] {
  return input.auditWatchlists ?? [];
}

function getAuditBriefings(input: BuildAuditResponseObservationInput): SyntheticAuditBriefing[] {
  return input.auditBriefings ?? [];
}

function getAllAuditArtifacts(input: BuildAuditResponseObservationInput): AuditArtifact[] {
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
  input: BuildAuditResponseObservationInput,
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

function getEvidenceReferenceIds(input: BuildAuditResponseObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "evidenceReferenceIds")),
  ]);
}

function getSourceReferenceIds(input: BuildAuditResponseObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "sourceReferenceIds")),
  ]);
}

function getLineageReferenceIds(input: BuildAuditResponseObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "lineageReferenceIds")),
  ]);
}

function getAuditContractReferenceIdsFromInput(input: BuildAuditResponseObservationInput): string[] {
  return uniqueStable([
    ...getAuditContractReferenceIds(input.auditContract),
    ...getAllAuditArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "auditContractReferenceIds")),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditContractReferenceIds")),
  ]);
}

function getAuditCandidateIds(input: BuildAuditResponseObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditCandidateId"),
      ...getStringArrayProperty(artifact, "auditCandidateIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditCandidateIds")),
  ]);
}

function getAuditEvidencePackageIds(input: BuildAuditResponseObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditEvidencePackageId"),
      ...getStringArrayProperty(artifact, "auditEvidencePackageIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditEvidencePackageIds")),
  ]);
}

function getAuditFindingArtifactIds(input: BuildAuditResponseObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditFindingArtifactId"),
      ...getStringArrayProperty(artifact, "auditFindingArtifactIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditFindingArtifactIds")),
  ]);
}

function getAuditFindingIds(input: BuildAuditResponseObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditFindingId"),
      ...getStringArrayProperty(artifact, "auditFindingIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditFindingIds")),
  ]);
}

function getAuditConfidenceIds(input: BuildAuditResponseObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditConfidenceId"),
      ...getStringArrayProperty(artifact, "auditConfidenceIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditConfidenceIds")),
  ]);
}

function getAuditSurfaceIds(input: BuildAuditResponseObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditSurfaceId"),
      ...getStringArrayProperty(artifact, "auditSurfaceIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditSurfaceIds")),
  ]);
}

function getAuditWatchlistIds(input: BuildAuditResponseObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditWatchlistId"),
      ...getStringArrayProperty(artifact, "auditWatchlistIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditWatchlistIds")),
  ]);
}

function getAuditBriefingIds(input: BuildAuditResponseObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditBriefingId"),
      ...getStringArrayProperty(artifact, "auditBriefingIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "auditBriefingIds")),
  ]);
}

function getAuditResponseReferenceIds(input: BuildAuditResponseObservationInput): string[] {
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

function buildAuditResponseObservationId(input: BuildAuditResponseObservationInput): string {
  return `synthetic-audit-response-observation:${stableSnapshotHash({
    auditResponseObservationKey: input.auditResponseObservationKey,
    auditResponseCategory: input.auditResponseCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    customerIsolation: input.auditContract ? buildCustomerIsolation(input.auditContract.scope) : null,
    firmIsolation: input.auditContract ? buildFirmIsolation(input.auditContract.scope) : null,
    clientIsolation: input.auditContract ? buildClientIsolation(input.auditContract.scope) : null,
    auditReadinessObservationIds: getObservationIds(getAuditReadinessObservations(input), "auditReadinessObservationId"),
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
    continuousAuditObservationIds: getObservationIds(getContinuousAuditObservations(input), "continuousAuditObservationId"),
    continuousControllerObservationIds: getObservationIds(
      getContinuousControllerObservations(input),
      "continuousControllerObservationId",
    ),
    fixedAssetIntelligenceObservationIds: getObservationIds(
      getFixedAssetIntelligenceObservations(input),
      "fixedAssetIntelligenceObservationId",
    ),
    prepaidIntelligenceObservationIds: getObservationIds(getPrepaidIntelligenceObservations(input), "prepaidIntelligenceObservationId"),
    fluxIntelligenceObservationIds: getObservationIds(getFluxIntelligenceObservations(input), "fluxIntelligenceObservationId"),
    unrecordedLiabilityIntelligenceObservationIds: getObservationIds(
      getUnrecordedLiabilityIntelligenceObservations(input),
      "unrecordedLiabilityIntelligenceObservationId",
    ),
    anomalyIntelligenceObservationIds: getObservationIds(getAnomalyIntelligenceObservations(input), "anomalyIntelligenceObservationId"),
    debtCovenantIntelligenceObservationIds: getObservationIds(
      getDebtCovenantIntelligenceObservations(input),
      "debtCovenantIntelligenceObservationId",
    ),
    cashDisbursementIntelligenceObservationIds: getObservationIds(
      getCashDisbursementIntelligenceObservations(input),
      "cashDisbursementIntelligenceObservationId",
    ),
    payrollIntelligenceObservationIds: getObservationIds(getPayrollIntelligenceObservations(input), "payrollIntelligenceObservationId"),
    auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
    auditCandidateIds: getAuditCandidateIds(input),
    auditEvidencePackageIds: getAuditEvidencePackageIds(input),
    auditFindingArtifactIds: getAuditFindingArtifactIds(input),
    auditConfidenceIds: getAuditConfidenceIds(input),
    auditSurfaceIds: getAuditSurfaceIds(input),
    auditWatchlistIds: getAuditWatchlistIds(input),
    auditBriefingIds: getAuditBriefingIds(input),
    auditResponseReferenceIds: getAuditResponseReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
    isolationBoundaryIds: input.auditContract?.scope.isolationBoundaryIds ?? [],
  })}`;
}

function validateAuditArtifacts(input: BuildAuditResponseObservationInput, warnings: string[]): void {
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

function validateDomainObservationIds(input: BuildAuditResponseObservationInput, warnings: string[]): void {
  const companyId = input.auditContract?.scope.companyId;
  for (const [observationName, observations, idField] of [
    ["auditReadinessObservations", getAuditReadinessObservations(input), "auditReadinessObservationId"],
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
    ["continuousAuditObservations", getContinuousAuditObservations(input), "continuousAuditObservationId"],
    ["continuousControllerObservations", getContinuousControllerObservations(input), "continuousControllerObservationId"],
    ["fixedAssetIntelligenceObservations", getFixedAssetIntelligenceObservations(input), "fixedAssetIntelligenceObservationId"],
    ["prepaidIntelligenceObservations", getPrepaidIntelligenceObservations(input), "prepaidIntelligenceObservationId"],
    ["fluxIntelligenceObservations", getFluxIntelligenceObservations(input), "fluxIntelligenceObservationId"],
    [
      "unrecordedLiabilityIntelligenceObservations",
      getUnrecordedLiabilityIntelligenceObservations(input),
      "unrecordedLiabilityIntelligenceObservationId",
    ],
    ["anomalyIntelligenceObservations", getAnomalyIntelligenceObservations(input), "anomalyIntelligenceObservationId"],
    [
      "debtCovenantIntelligenceObservations",
      getDebtCovenantIntelligenceObservations(input),
      "debtCovenantIntelligenceObservationId",
    ],
    [
      "cashDisbursementIntelligenceObservations",
      getCashDisbursementIntelligenceObservations(input),
      "cashDisbursementIntelligenceObservationId",
    ],
    ["payrollIntelligenceObservations", getPayrollIntelligenceObservations(input), "payrollIntelligenceObservationId"],
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

function validateInput(input: BuildAuditResponseObservationInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (input.auditResponseCategory === (AUDIT_RESPONSE_PACKAGE_CATEGORY_PHASE_35_CANDIDATE as SyntheticAuditResponseCategory)) {
    warnings.push("audit_response_package_candidate is reserved for a Phase 35 package-builder artifact.");
  }
  if (!hasValue(input.auditResponseObservationKey)) warnings.push("auditResponseObservationKey is required.");
  if (!hasValue(input.auditResponseCategory)) warnings.push("auditResponseCategory is required.");
  if (!isSupportedAuditResponseCategory(input.auditResponseCategory)) {
    warnings.push("auditResponseCategory must be a supported audit response observation category.");
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

export function buildAuditResponseObservation(input: BuildAuditResponseObservationInput): BuildAuditResponseObservationResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.auditContract) {
    return {
      auditResponseObservation: null,
      skipped: true,
      warnings,
    };
  }

  const auditContract = input.auditContract;
  const auditReadinessObservations = getAuditReadinessObservations(input);
  const auditCoverageObservations = getAuditCoverageObservations(input);
  const evidenceSufficiencyObservations = getEvidenceSufficiencyObservations(input);
  const pbcRequestObservations = getPbcRequestObservations(input);
  const auditScheduleObservations = getAuditScheduleObservations(input);
  const auditTieOutObservations = getAuditTieOutObservations(input);
  const scheduleCompletenessObservations = getScheduleCompletenessObservations(input);
  const trustVerificationObservations = getTrustVerificationObservations(input);
  const platformIntegrityObservations = getPlatformIntegrityObservations(input);
  const continuousAuditObservations = getContinuousAuditObservations(input);
  const continuousControllerObservations = getContinuousControllerObservations(input);
  const fixedAssetIntelligenceObservations = getFixedAssetIntelligenceObservations(input);
  const prepaidIntelligenceObservations = getPrepaidIntelligenceObservations(input);
  const fluxIntelligenceObservations = getFluxIntelligenceObservations(input);
  const unrecordedLiabilityIntelligenceObservations = getUnrecordedLiabilityIntelligenceObservations(input);
  const anomalyIntelligenceObservations = getAnomalyIntelligenceObservations(input);
  const debtCovenantIntelligenceObservations = getDebtCovenantIntelligenceObservations(input);
  const cashDisbursementIntelligenceObservations = getCashDisbursementIntelligenceObservations(input);
  const payrollIntelligenceObservations = getPayrollIntelligenceObservations(input);
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
    auditResponseObservation: {
      auditResponseObservationId: buildAuditResponseObservationId(input),
      auditResponseObservationKey: input.auditResponseObservationKey,
      auditResponseCategory: input.auditResponseCategory,
      companyId: auditContract.scope.companyId,
      auditCategory: getAuditCategory(auditContract),
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      auditReadinessObservationIds: getObservationIds(auditReadinessObservations, "auditReadinessObservationId"),
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
      continuousAuditObservationIds: getObservationIds(continuousAuditObservations, "continuousAuditObservationId"),
      continuousControllerObservationIds: getObservationIds(
        continuousControllerObservations,
        "continuousControllerObservationId",
      ),
      fixedAssetIntelligenceObservationIds: getObservationIds(
        fixedAssetIntelligenceObservations,
        "fixedAssetIntelligenceObservationId",
      ),
      prepaidIntelligenceObservationIds: getObservationIds(prepaidIntelligenceObservations, "prepaidIntelligenceObservationId"),
      fluxIntelligenceObservationIds: getObservationIds(fluxIntelligenceObservations, "fluxIntelligenceObservationId"),
      unrecordedLiabilityIntelligenceObservationIds: getObservationIds(
        unrecordedLiabilityIntelligenceObservations,
        "unrecordedLiabilityIntelligenceObservationId",
      ),
      anomalyIntelligenceObservationIds: getObservationIds(anomalyIntelligenceObservations, "anomalyIntelligenceObservationId"),
      debtCovenantIntelligenceObservationIds: getObservationIds(
        debtCovenantIntelligenceObservations,
        "debtCovenantIntelligenceObservationId",
      ),
      cashDisbursementIntelligenceObservationIds: getObservationIds(
        cashDisbursementIntelligenceObservations,
        "cashDisbursementIntelligenceObservationId",
      ),
      payrollIntelligenceObservationIds: getObservationIds(payrollIntelligenceObservations, "payrollIntelligenceObservationId"),
      auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
      auditCandidateIds: getAuditCandidateIds(input),
      auditEvidencePackageIds: getAuditEvidencePackageIds(input),
      auditFindingArtifactIds: getAuditFindingArtifactIds(input),
      auditFindingIds: getAuditFindingIds(input),
      auditConfidenceIds: getAuditConfidenceIds(input),
      auditSurfaceIds: getAuditSurfaceIds(input),
      auditWatchlistIds: getAuditWatchlistIds(input),
      auditBriefingIds: getAuditBriefingIds(input),
      auditResponseReferenceIds: getAuditResponseReferenceIds(input),
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
      auditReadinessObservations,
      auditCoverageObservations,
      evidenceSufficiencyObservations,
      pbcRequestObservations,
      auditScheduleObservations,
      auditTieOutObservations,
      scheduleCompletenessObservations,
      trustVerificationObservations,
      platformIntegrityObservations,
      continuousAuditObservations,
      continuousControllerObservations,
      fixedAssetIntelligenceObservations,
      prepaidIntelligenceObservations,
      fluxIntelligenceObservations,
      unrecordedLiabilityIntelligenceObservations,
      anomalyIntelligenceObservations,
      debtCovenantIntelligenceObservations,
      cashDisbursementIntelligenceObservations,
      payrollIntelligenceObservations,
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
