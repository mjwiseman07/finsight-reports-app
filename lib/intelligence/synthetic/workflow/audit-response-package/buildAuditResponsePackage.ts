import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticAuditCoverageObservation } from "../../audit/audit-coverage";
import type { SyntheticAuditReadinessObservation } from "../../audit/audit-readiness";
import type { SyntheticAuditScheduleObservation } from "../../audit/audit-schedules";
import type { SyntheticAuditTieOutObservation } from "../../audit/audit-tie-outs";
import type { SyntheticAuditResponseObservation } from "../../audit/audit-response";
import type { SyntheticAuditBriefing } from "../../audit/briefings";
import type { SyntheticAuditCandidate } from "../../audit/candidates";
import type { SyntheticAuditConfidence } from "../../audit/confidence";
import type { SyntheticContinuousAuditObservation } from "../../audit/continuous-audit";
import type { SyntheticContinuousControllerObservation } from "../../audit/continuous-controller";
import type { SyntheticAuditEvidencePackage } from "../../audit/evidence";
import type { SyntheticEvidenceSufficiencyObservation } from "../../audit/evidence-sufficiency";
import type { SyntheticAuditFinding } from "../../audit/findings";
import type { SyntheticPbcRequestObservation } from "../../audit/pbc-request";
import type { SyntheticPlatformIntegrityObservation } from "../../audit/platform-integrity";
import type { SyntheticScheduleCompletenessObservation } from "../../audit/schedule-completeness";
import type { SyntheticAuditSurface } from "../../audit/surfaces";
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
import type { SyntheticAuditWatchlist } from "../../audit/watchlists";

export type SyntheticAuditResponsePackageCategory =
  | "audit_response_package"
  | "pbc_response_package"
  | "schedule_response_package"
  | "support_response_package"
  | "documentation_response_package"
  | "methodology_response_package"
  | "audit_readiness_response_package";

export const SYNTHETIC_AUDIT_RESPONSE_PACKAGE_CATEGORIES: SyntheticAuditResponsePackageCategory[] = [
  "audit_response_package",
  "pbc_response_package",
  "schedule_response_package",
  "support_response_package",
  "documentation_response_package",
  "methodology_response_package",
  "audit_readiness_response_package",
];

export interface SyntheticAuditResponsePackageIsolationDimension {
  required: boolean;
  referenceIds: string[];
}

export interface SyntheticAuditResponsePackageForwardCompatibleObservation {
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

export interface SyntheticAuditResponseUpstreamPackage {
  packageId: string;
  packageKey?: string;
  companyId: string;
  evidenceReferenceIds?: string[];
  sourceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  upstreamObservationIds?: string[];
  upstreamPackageIds?: string[];
  auditContractReferenceIds?: string[];
  auditCandidateIds?: string[];
  auditEvidencePackageIds?: string[];
  auditFindingArtifactIds?: string[];
  auditFindingIds?: string[];
  auditConfidenceIds?: string[];
  auditSurfaceIds?: string[];
  auditWatchlistIds?: string[];
  auditBriefingIds?: string[];
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

export interface BuildAuditResponsePackageInput {
  auditContract: SyntheticAuditContract | null;
  packageKey: string;
  packageCategory: SyntheticAuditResponsePackageCategory;
  auditResponseObservations?: SyntheticAuditResponseObservation[];
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
  upstreamPackages?: SyntheticAuditResponseUpstreamPackage[];
  healthcarePpdObservations?: SyntheticAuditResponsePackageForwardCompatibleObservation[];
  payrollObservations?: SyntheticAuditResponsePackageForwardCompatibleObservation[];
  methodologyObservations?: SyntheticAuditResponsePackageForwardCompatibleObservation[];
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticAuditResponsePackage {
  packageId: string;
  packageKey: string;
  packageCategory: SyntheticAuditResponsePackageCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticAuditResponsePackageIsolationDimension;
  firmIsolation: SyntheticAuditResponsePackageIsolationDimension;
  clientIsolation: SyntheticAuditResponsePackageIsolationDimension;
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
  upstreamPackageIds: string[];
  auditResponseObservationIds: string[];
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
  auditResponseObservations: SyntheticAuditResponseObservation[];
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
  upstreamPackages: SyntheticAuditResponseUpstreamPackage[];
  healthcarePpdObservations: SyntheticAuditResponsePackageForwardCompatibleObservation[];
  payrollObservations: SyntheticAuditResponsePackageForwardCompatibleObservation[];
  methodologyObservations: SyntheticAuditResponsePackageForwardCompatibleObservation[];
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildAuditResponsePackageResult {
  auditResponsePackage: SyntheticAuditResponsePackage | null;
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

function isSupportedPackageCategory(category: SyntheticAuditResponsePackageCategory): boolean {
  return SYNTHETIC_AUDIT_RESPONSE_PACKAGE_CATEGORIES.includes(category);
}

function buildCustomerIsolation(scope: SyntheticAuditScope): SyntheticAuditResponsePackageIsolationDimension {
  return { required: scope.customerIsolationRequired, referenceIds: uniqueStable([scope.companyId, ...scope.isolationBoundaryIds]) };
}

function buildFirmIsolation(scope: SyntheticAuditScope): SyntheticAuditResponsePackageIsolationDimension {
  return {
    required: scope.firmIsolationRequired,
    referenceIds: uniqueStable([scope.firmId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function buildClientIsolation(scope: SyntheticAuditScope): SyntheticAuditResponsePackageIsolationDimension {
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

function getDomainObservations(input: BuildAuditResponsePackageInput): object[] {
  return [
    ...getInputArray(input.auditResponseObservations),
    ...getInputArray(input.auditReadinessObservations),
    ...getInputArray(input.auditCoverageObservations),
    ...getInputArray(input.evidenceSufficiencyObservations),
    ...getInputArray(input.pbcRequestObservations),
    ...getInputArray(input.auditScheduleObservations),
    ...getInputArray(input.auditTieOutObservations),
    ...getInputArray(input.scheduleCompletenessObservations),
    ...getInputArray(input.trustVerificationObservations),
    ...getInputArray(input.platformIntegrityObservations),
    ...getInputArray(input.continuousAuditObservations),
    ...getInputArray(input.continuousControllerObservations),
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getAuditArtifacts(input: BuildAuditResponsePackageInput): AuditArtifact[] {
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
  input: BuildAuditResponsePackageInput,
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

function getObservationIds(observations: object[], propertyName: string): string[] {
  return uniqueStable(observations.flatMap((observation) => getStringProperty(observation, propertyName)));
}

function getAuditContractReferenceIds(input: BuildAuditResponsePackageInput): string[] {
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
    ...getInputArray(input.upstreamPackages).flatMap((auditPackage) => auditPackage.auditContractReferenceIds ?? []),
  ].filter((value): value is string => value !== undefined));
}

function getReferenceIds(input: BuildAuditResponsePackageInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, singularName),
      ...getStringArrayProperty(artifact, arrayName),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, arrayName)),
    ...getInputArray(input.upstreamPackages).flatMap((auditPackage) => auditPackage[arrayName as keyof SyntheticAuditResponseUpstreamPackage] as string[] | undefined ?? []),
  ]);
}

function getEvidenceReferenceIds(input: BuildAuditResponsePackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getInputArray(input.auditCandidates).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "evidenceReferenceIds")),
    ...getInputArray(input.upstreamPackages).flatMap((auditPackage) => auditPackage.evidenceReferenceIds ?? []),
  ]);
}

function getSourceReferenceIds(input: BuildAuditResponsePackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getInputArray(input.auditCandidates).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "sourceReferenceIds")),
    ...getInputArray(input.upstreamPackages).flatMap((auditPackage) => auditPackage.sourceReferenceIds ?? []),
  ]);
}

function getLineageReferenceIds(input: BuildAuditResponsePackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getInputArray(input.auditCandidates).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "lineageReferenceIds")),
    ...getInputArray(input.upstreamPackages).flatMap((auditPackage) => auditPackage.lineageReferenceIds ?? []),
  ]);
}

function getUpstreamObservationIds(input: BuildAuditResponsePackageInput): string[] {
  return uniqueStable([
    ...getObservationIds(getDomainObservations(input), "auditResponseObservationId"),
    ...getObservationIds(getDomainObservations(input), "auditReadinessObservationId"),
    ...getObservationIds(getDomainObservations(input), "auditCoverageObservationId"),
    ...getObservationIds(getDomainObservations(input), "evidenceSufficiencyObservationId"),
    ...getObservationIds(getDomainObservations(input), "pbcRequestObservationId"),
    ...getObservationIds(getDomainObservations(input), "auditScheduleObservationId"),
    ...getObservationIds(getDomainObservations(input), "auditTieOutObservationId"),
    ...getObservationIds(getDomainObservations(input), "scheduleCompletenessObservationId"),
    ...getObservationIds(getDomainObservations(input), "trustVerificationObservationId"),
    ...getObservationIds(getDomainObservations(input), "platformIntegrityObservationId"),
    ...getObservationIds(getDomainObservations(input), "continuousAuditObservationId"),
    ...getObservationIds(getDomainObservations(input), "continuousControllerObservationId"),
    ...getObservationIds(getDomainObservations(input), "healthcarePpdObservationId"),
    ...getObservationIds(getDomainObservations(input), "payrollObservationId"),
    ...getObservationIds(getDomainObservations(input), "methodologyObservationId"),
    ...getInputArray(input.upstreamPackages).flatMap((auditPackage) => auditPackage.upstreamObservationIds ?? []),
  ]);
}

function getMaterialityMetadata(input: BuildAuditResponsePackageInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getAuditArtifacts(input).map((artifact) => artifact.materialityCompatibility),
    ...getDomainObservations(input).flatMap((observation) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(observation, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(observation, "materialityCompatibility"),
    ]),
    ...getInputArray(input.upstreamPackages).flatMap((auditPackage) => [
      ...(auditPackage.materialityMetadata ?? []),
      ...(auditPackage.materialityCompatibility ?? []),
    ]),
  ]);
}

function buildPackageId(input: BuildAuditResponsePackageInput): string {
  return `synthetic-audit-response-package:${stableSnapshotHash({
    packageKey: input.packageKey,
    packageCategory: input.packageCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    customerIsolation: input.auditContract ? buildCustomerIsolation(input.auditContract.scope) : null,
    firmIsolation: input.auditContract ? buildFirmIsolation(input.auditContract.scope) : null,
    clientIsolation: input.auditContract ? buildClientIsolation(input.auditContract.scope) : null,
    upstreamObservationIds: getUpstreamObservationIds(input),
    upstreamPackageIds: getInputArray(input.upstreamPackages).map((auditPackage) => auditPackage.packageId),
    auditContractReferenceIds: getAuditContractReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildAuditResponsePackageInput): string[] {
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

function validateInput(input: BuildAuditResponsePackageInput): string[] {
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
  if (!hasArrayValue(auditContract.evidence.sourceReferenceIds)) {
    warnings.push("evidence.sourceReferenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditContract.evidence.lineageReferenceIds)) {
    warnings.push("evidence.lineageReferenceIds must include at least one value.");
  }

  const companyId = auditContract.scope.companyId;
  for (const [inputName, values, idField] of [
    ["auditResponseObservations", getInputArray(input.auditResponseObservations), "auditResponseObservationId"],
    ["auditReadinessObservations", getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"],
    ["auditCoverageObservations", getInputArray(input.auditCoverageObservations), "auditCoverageObservationId"],
    ["evidenceSufficiencyObservations", getInputArray(input.evidenceSufficiencyObservations), "evidenceSufficiencyObservationId"],
    ["pbcRequestObservations", getInputArray(input.pbcRequestObservations), "pbcRequestObservationId"],
    ["auditScheduleObservations", getInputArray(input.auditScheduleObservations), "auditScheduleObservationId"],
    ["auditTieOutObservations", getInputArray(input.auditTieOutObservations), "auditTieOutObservationId"],
    ["scheduleCompletenessObservations", getInputArray(input.scheduleCompletenessObservations), "scheduleCompletenessObservationId"],
    ["trustVerificationObservations", getInputArray(input.trustVerificationObservations), "trustVerificationObservationId"],
    ["platformIntegrityObservations", getInputArray(input.platformIntegrityObservations), "platformIntegrityObservationId"],
    ["continuousAuditObservations", getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"],
    ["continuousControllerObservations", getInputArray(input.continuousControllerObservations), "continuousControllerObservationId"],
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

  getInputArray(input.upstreamPackages).forEach((auditPackage, index) => {
    if (!hasValue(auditPackage.packageId)) warnings.push(`upstreamPackages[${index}].packageId is required.`);
    if (!hasValue(auditPackage.companyId)) warnings.push(`upstreamPackages[${index}].companyId is required.`);
    if (auditPackage.companyId && auditPackage.companyId !== companyId) {
      warnings.push(`upstreamPackages[${index}].companyId must match scope.companyId.`);
    }
  });

  return warnings;
}

export function buildAuditResponsePackage(input: BuildAuditResponsePackageInput): BuildAuditResponsePackageResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      auditResponsePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const auditArtifacts = getAuditArtifacts(input);
  const domainObservations = getDomainObservations(input);
  const upstreamPackages = getInputArray(input.upstreamPackages);
  const materialityMetadata = getMaterialityMetadata(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    auditResponsePackage: {
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
      upstreamPackageIds: uniqueStable([
        ...upstreamPackages.map((auditPackage) => auditPackage.packageId),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.upstreamPackageIds ?? []),
      ]),
      auditResponseObservationIds: getObservationIds(getInputArray(input.auditResponseObservations), "auditResponseObservationId"),
      auditReadinessObservationIds: getObservationIds(getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"),
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
      continuousAuditObservationIds: getObservationIds(getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"),
      continuousControllerObservationIds: getObservationIds(
        getInputArray(input.continuousControllerObservations),
        "continuousControllerObservationId",
      ),
      healthcarePpdObservationIds: getObservationIds(getInputArray(input.healthcarePpdObservations), "healthcarePpdObservationId"),
      payrollObservationIds: getObservationIds(getInputArray(input.payrollObservations), "payrollObservationId"),
      methodologyObservationIds: getObservationIds(getInputArray(input.methodologyObservations), "methodologyObservationId"),
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
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.trustMetadata ?? []),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...auditArtifacts.map((artifact) => artifact.confidenceMetadata),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(observation, "confidenceMetadata"),
        ),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.confidenceMetadata ?? []),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...auditArtifacts.map((artifact) => artifact.governanceMetadata),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(observation, "governanceMetadata"),
        ),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.governanceMetadata ?? []),
      ]),
      materialityMetadata,
      materialityCompatibility: materialityMetadata,
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...auditArtifacts.map((artifact) => artifact.personaCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(observation, "personaCompatibility"),
        ),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.personaCompatibility ?? []),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...auditArtifacts.map((artifact) => artifact.packageCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(observation, "packageCompatibility"),
        ),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.packageCompatibility ?? []),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...auditArtifacts.map((artifact) => artifact.memoryCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(observation, "memoryCompatibility"),
        ),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.memoryCompatibility ?? []),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...auditArtifacts.map((artifact) => artifact.learningCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(observation, "learningCompatibility"),
        ),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.learningCompatibility ?? []),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...auditArtifacts.map((artifact) => artifact.surfaceCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(observation, "surfaceCompatibility"),
        ),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.surfaceCompatibility ?? []),
      ]),
      auditContract,
      auditResponseObservations: getInputArray(input.auditResponseObservations),
      auditReadinessObservations: getInputArray(input.auditReadinessObservations),
      auditCoverageObservations: getInputArray(input.auditCoverageObservations),
      evidenceSufficiencyObservations: getInputArray(input.evidenceSufficiencyObservations),
      pbcRequestObservations: getInputArray(input.pbcRequestObservations),
      auditScheduleObservations: getInputArray(input.auditScheduleObservations),
      auditTieOutObservations: getInputArray(input.auditTieOutObservations),
      scheduleCompletenessObservations: getInputArray(input.scheduleCompletenessObservations),
      trustVerificationObservations: getInputArray(input.trustVerificationObservations),
      platformIntegrityObservations: getInputArray(input.platformIntegrityObservations),
      continuousAuditObservations: getInputArray(input.continuousAuditObservations),
      continuousControllerObservations: getInputArray(input.continuousControllerObservations),
      upstreamPackages,
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
