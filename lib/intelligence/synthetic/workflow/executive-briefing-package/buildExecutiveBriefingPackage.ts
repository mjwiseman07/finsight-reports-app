import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticAnomalyIntelligenceObservation } from "../../audit/anomaly-intelligence";
import type { SyntheticAuditCoverageObservation } from "../../audit/audit-coverage";
import type { SyntheticAuditReadinessObservation } from "../../audit/audit-readiness";
import type { SyntheticBalanceSheetIntegrityObservation } from "../../audit/balance-sheet-integrity";
import type { SyntheticAuditBriefing } from "../../audit/briefings";
import type { SyntheticAuditCandidate } from "../../audit/candidates";
import type { SyntheticAuditConfidence } from "../../audit/confidence";
import type { SyntheticContinuousAuditObservation } from "../../audit/continuous-audit";
import type { SyntheticContinuousControllerObservation } from "../../audit/continuous-controller";
import type { SyntheticAuditEvidencePackage } from "../../audit/evidence";
import type { SyntheticEvidenceSufficiencyObservation } from "../../audit/evidence-sufficiency";
import type { SyntheticFinancialStatementRelationshipObservation } from "../../audit/financial-statement-relationships";
import type { SyntheticAuditFinding } from "../../audit/findings";
import type { SyntheticFluxIntelligenceObservation } from "../../audit/flux-intelligence";
import type { SyntheticMaterialityObservation } from "../../audit/materiality";
import type { SyntheticPlatformIntegrityObservation } from "../../audit/platform-integrity";
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
import type { SyntheticAuditSurface } from "../../audit/surfaces";
import type { SyntheticAuditWatchlist } from "../../audit/watchlists";
import type { SyntheticAuditPackage } from "../audit-package";
import type { SyntheticAuditResponsePackage } from "../audit-response-package";
import type { SyntheticControllerReviewPackage } from "../controller-review-package";

export type SyntheticExecutiveBriefingPackageCategory =
  | "executive_briefing_package"
  | "executive_readiness_package"
  | "executive_trust_package"
  | "executive_audit_context_package"
  | "executive_controller_context_package"
  | "executive_materiality_package"
  | "executive_organizational_intelligence_package";

export const SYNTHETIC_EXECUTIVE_BRIEFING_PACKAGE_CATEGORIES: SyntheticExecutiveBriefingPackageCategory[] = [
  "executive_briefing_package",
  "executive_readiness_package",
  "executive_trust_package",
  "executive_audit_context_package",
  "executive_controller_context_package",
  "executive_materiality_package",
  "executive_organizational_intelligence_package",
];

export interface SyntheticExecutiveBriefingPackageIsolationDimension {
  required: boolean;
  referenceIds: string[];
}

export interface SyntheticExecutiveBriefingForwardCompatibleObservation {
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

export interface BuildExecutiveBriefingPackageInput {
  auditContract: SyntheticAuditContract | null;
  packageKey: string;
  packageCategory: SyntheticExecutiveBriefingPackageCategory;
  continuousAuditObservations?: SyntheticContinuousAuditObservation[];
  continuousControllerObservations?: SyntheticContinuousControllerObservation[];
  auditReadinessObservations?: SyntheticAuditReadinessObservation[];
  trustVerificationObservations?: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations?: SyntheticPlatformIntegrityObservation[];
  anomalyObservations?: SyntheticAnomalyIntelligenceObservation[];
  fluxObservations?: SyntheticFluxIntelligenceObservation[];
  materialityObservations?: SyntheticMaterialityObservation[];
  balanceSheetIntegrityObservations?: SyntheticBalanceSheetIntegrityObservation[];
  financialStatementRelationshipObservations?: SyntheticFinancialStatementRelationshipObservation[];
  auditCoverageObservations?: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations?: SyntheticEvidenceSufficiencyObservation[];
  auditResponsePackages?: SyntheticAuditResponsePackage[];
  auditPackages?: SyntheticAuditPackage[];
  controllerReviewPackages?: SyntheticControllerReviewPackage[];
  healthcarePpdObservations?: SyntheticExecutiveBriefingForwardCompatibleObservation[];
  payrollObservations?: SyntheticExecutiveBriefingForwardCompatibleObservation[];
  methodologyObservations?: SyntheticExecutiveBriefingForwardCompatibleObservation[];
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticExecutiveBriefingPackage {
  packageId: string;
  packageKey: string;
  packageCategory: SyntheticExecutiveBriefingPackageCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticExecutiveBriefingPackageIsolationDimension;
  firmIsolation: SyntheticExecutiveBriefingPackageIsolationDimension;
  clientIsolation: SyntheticExecutiveBriefingPackageIsolationDimension;
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
  continuousAuditObservationIds: string[];
  continuousControllerObservationIds: string[];
  auditReadinessObservationIds: string[];
  trustVerificationObservationIds: string[];
  platformIntegrityObservationIds: string[];
  anomalyObservationIds: string[];
  fluxObservationIds: string[];
  materialityObservationIds: string[];
  balanceSheetIntegrityObservationIds: string[];
  financialStatementRelationshipObservationIds: string[];
  auditCoverageObservationIds: string[];
  evidenceSufficiencyObservationIds: string[];
  upstreamPackageIds: string[];
  auditResponsePackageIds: string[];
  auditPackageIds: string[];
  controllerReviewPackageIds: string[];
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
  continuousAuditObservations: SyntheticContinuousAuditObservation[];
  continuousControllerObservations: SyntheticContinuousControllerObservation[];
  auditReadinessObservations: SyntheticAuditReadinessObservation[];
  trustVerificationObservations: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations: SyntheticPlatformIntegrityObservation[];
  anomalyObservations: SyntheticAnomalyIntelligenceObservation[];
  fluxObservations: SyntheticFluxIntelligenceObservation[];
  materialityObservations: SyntheticMaterialityObservation[];
  balanceSheetIntegrityObservations: SyntheticBalanceSheetIntegrityObservation[];
  financialStatementRelationshipObservations: SyntheticFinancialStatementRelationshipObservation[];
  auditCoverageObservations: SyntheticAuditCoverageObservation[];
  evidenceSufficiencyObservations: SyntheticEvidenceSufficiencyObservation[];
  auditResponsePackages: SyntheticAuditResponsePackage[];
  auditPackages: SyntheticAuditPackage[];
  controllerReviewPackages: SyntheticControllerReviewPackage[];
  healthcarePpdObservations: SyntheticExecutiveBriefingForwardCompatibleObservation[];
  payrollObservations: SyntheticExecutiveBriefingForwardCompatibleObservation[];
  methodologyObservations: SyntheticExecutiveBriefingForwardCompatibleObservation[];
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildExecutiveBriefingPackageResult {
  executiveBriefingPackage: SyntheticExecutiveBriefingPackage | null;
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

type UpstreamPackage = SyntheticAuditResponsePackage | SyntheticAuditPackage | SyntheticControllerReviewPackage;

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

function isSupportedPackageCategory(category: SyntheticExecutiveBriefingPackageCategory): boolean {
  return SYNTHETIC_EXECUTIVE_BRIEFING_PACKAGE_CATEGORIES.includes(category);
}

function buildCustomerIsolation(scope: SyntheticAuditScope): SyntheticExecutiveBriefingPackageIsolationDimension {
  return { required: scope.customerIsolationRequired, referenceIds: uniqueStable([scope.companyId, ...scope.isolationBoundaryIds]) };
}

function buildFirmIsolation(scope: SyntheticAuditScope): SyntheticExecutiveBriefingPackageIsolationDimension {
  return {
    required: scope.firmIsolationRequired,
    referenceIds: uniqueStable([scope.firmId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function buildClientIsolation(scope: SyntheticAuditScope): SyntheticExecutiveBriefingPackageIsolationDimension {
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

function getDomainObservations(input: BuildExecutiveBriefingPackageInput): object[] {
  return [
    ...getInputArray(input.continuousAuditObservations),
    ...getInputArray(input.continuousControllerObservations),
    ...getInputArray(input.auditReadinessObservations),
    ...getInputArray(input.trustVerificationObservations),
    ...getInputArray(input.platformIntegrityObservations),
    ...getInputArray(input.anomalyObservations),
    ...getInputArray(input.fluxObservations),
    ...getInputArray(input.materialityObservations),
    ...getInputArray(input.balanceSheetIntegrityObservations),
    ...getInputArray(input.financialStatementRelationshipObservations),
    ...getInputArray(input.auditCoverageObservations),
    ...getInputArray(input.evidenceSufficiencyObservations),
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getAuditArtifacts(input: BuildExecutiveBriefingPackageInput): AuditArtifact[] {
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
  input: BuildExecutiveBriefingPackageInput,
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

function getUpstreamPackages(input: BuildExecutiveBriefingPackageInput): UpstreamPackage[] {
  return [
    ...getInputArray(input.auditResponsePackages),
    ...getInputArray(input.auditPackages),
    ...getInputArray(input.controllerReviewPackages),
  ];
}

function getObservationIds(observations: object[], propertyName: string): string[] {
  return uniqueStable(observations.flatMap((observation) => getStringProperty(observation, propertyName)));
}

function getAuditContractReferenceIds(input: BuildExecutiveBriefingPackageInput): string[] {
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

function getReferenceIds(input: BuildExecutiveBriefingPackageInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, singularName),
      ...getStringArrayProperty(artifact, arrayName),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, arrayName)),
    ...getUpstreamPackages(input).flatMap((auditPackage) => getStringArrayProperty(auditPackage, arrayName)),
  ]);
}

function getEvidenceReferenceIds(input: BuildExecutiveBriefingPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getInputArray(input.auditCandidates).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "evidenceReferenceIds")),
    ...getUpstreamPackages(input).flatMap((auditPackage) => auditPackage.evidenceReferenceIds),
  ]);
}

function getSourceReferenceIds(input: BuildExecutiveBriefingPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getInputArray(input.auditCandidates).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "sourceReferenceIds")),
    ...getUpstreamPackages(input).flatMap((auditPackage) => auditPackage.sourceReferenceIds),
  ]);
}

function getLineageReferenceIds(input: BuildExecutiveBriefingPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getInputArray(input.auditCandidates).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "lineageReferenceIds")),
    ...getUpstreamPackages(input).flatMap((auditPackage) => auditPackage.lineageReferenceIds),
  ]);
}

function getExecutiveBriefingObservationIds(input: BuildExecutiveBriefingPackageInput) {
  return {
    continuousAuditObservationIds: getObservationIds(getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"),
    continuousControllerObservationIds: getObservationIds(
      getInputArray(input.continuousControllerObservations),
      "continuousControllerObservationId",
    ),
    auditReadinessObservationIds: getObservationIds(getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"),
    trustVerificationObservationIds: getObservationIds(
      getInputArray(input.trustVerificationObservations),
      "trustVerificationObservationId",
    ),
    platformIntegrityObservationIds: getObservationIds(
      getInputArray(input.platformIntegrityObservations),
      "platformIntegrityObservationId",
    ),
    anomalyObservationIds: getObservationIds(getInputArray(input.anomalyObservations), "anomalyIntelligenceObservationId"),
    fluxObservationIds: getObservationIds(getInputArray(input.fluxObservations), "fluxIntelligenceObservationId"),
    materialityObservationIds: getObservationIds(getInputArray(input.materialityObservations), "materialityObservationId"),
    balanceSheetIntegrityObservationIds: getObservationIds(
      getInputArray(input.balanceSheetIntegrityObservations),
      "balanceSheetIntegrityObservationId",
    ),
    financialStatementRelationshipObservationIds: getObservationIds(
      getInputArray(input.financialStatementRelationshipObservations),
      "financialStatementRelationshipObservationId",
    ),
    auditCoverageObservationIds: getObservationIds(getInputArray(input.auditCoverageObservations), "auditCoverageObservationId"),
    evidenceSufficiencyObservationIds: getObservationIds(
      getInputArray(input.evidenceSufficiencyObservations),
      "evidenceSufficiencyObservationId",
    ),
    healthcarePpdObservationIds: getObservationIds(getInputArray(input.healthcarePpdObservations), "healthcarePpdObservationId"),
    payrollObservationIds: getObservationIds(getInputArray(input.payrollObservations), "payrollObservationId"),
    methodologyObservationIds: getObservationIds(getInputArray(input.methodologyObservations), "methodologyObservationId"),
  };
}

function getUpstreamObservationIds(input: BuildExecutiveBriefingPackageInput): string[] {
  const observationIds = getExecutiveBriefingObservationIds(input);
  return uniqueStable([
    ...observationIds.continuousAuditObservationIds,
    ...observationIds.continuousControllerObservationIds,
    ...observationIds.auditReadinessObservationIds,
    ...observationIds.trustVerificationObservationIds,
    ...observationIds.platformIntegrityObservationIds,
    ...observationIds.anomalyObservationIds,
    ...observationIds.fluxObservationIds,
    ...observationIds.materialityObservationIds,
    ...observationIds.balanceSheetIntegrityObservationIds,
    ...observationIds.financialStatementRelationshipObservationIds,
    ...observationIds.auditCoverageObservationIds,
    ...observationIds.evidenceSufficiencyObservationIds,
    ...observationIds.healthcarePpdObservationIds,
    ...observationIds.payrollObservationIds,
    ...observationIds.methodologyObservationIds,
    ...getUpstreamPackages(input).flatMap((auditPackage) => auditPackage.upstreamObservationIds),
  ]);
}

function getMaterialityMetadata(input: BuildExecutiveBriefingPackageInput): SyntheticAuditMaterialityCompatibility[] {
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

function buildPackageId(input: BuildExecutiveBriefingPackageInput): string {
  return `synthetic-executive-briefing-package:${stableSnapshotHash({
    packageKey: input.packageKey,
    packageCategory: input.packageCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    customerIsolation: input.auditContract ? buildCustomerIsolation(input.auditContract.scope) : null,
    firmIsolation: input.auditContract ? buildFirmIsolation(input.auditContract.scope) : null,
    clientIsolation: input.auditContract ? buildClientIsolation(input.auditContract.scope) : null,
    ...getExecutiveBriefingObservationIds(input),
    upstreamObservationIds: getUpstreamObservationIds(input),
    upstreamPackageIds: getUpstreamPackages(input).map((auditPackage) => auditPackage.packageId),
    auditContractReferenceIds: getAuditContractReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildExecutiveBriefingPackageInput): string[] {
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

function validateInput(input: BuildExecutiveBriefingPackageInput): string[] {
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
    ["continuousAuditObservations", getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"],
    ["continuousControllerObservations", getInputArray(input.continuousControllerObservations), "continuousControllerObservationId"],
    ["auditReadinessObservations", getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"],
    ["trustVerificationObservations", getInputArray(input.trustVerificationObservations), "trustVerificationObservationId"],
    ["platformIntegrityObservations", getInputArray(input.platformIntegrityObservations), "platformIntegrityObservationId"],
    ["anomalyObservations", getInputArray(input.anomalyObservations), "anomalyIntelligenceObservationId"],
    ["fluxObservations", getInputArray(input.fluxObservations), "fluxIntelligenceObservationId"],
    ["materialityObservations", getInputArray(input.materialityObservations), "materialityObservationId"],
    ["balanceSheetIntegrityObservations", getInputArray(input.balanceSheetIntegrityObservations), "balanceSheetIntegrityObservationId"],
    [
      "financialStatementRelationshipObservations",
      getInputArray(input.financialStatementRelationshipObservations),
      "financialStatementRelationshipObservationId",
    ],
    ["auditCoverageObservations", getInputArray(input.auditCoverageObservations), "auditCoverageObservationId"],
    ["evidenceSufficiencyObservations", getInputArray(input.evidenceSufficiencyObservations), "evidenceSufficiencyObservationId"],
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
    ["controllerReviewPackages", getInputArray(input.controllerReviewPackages)],
  ] as const) {
    values.forEach((auditPackage, index) => {
      if (!hasValue(auditPackage.packageId)) warnings.push(`${inputName}[${index}].packageId is required.`);
      if (!hasValue(auditPackage.companyId)) warnings.push(`${inputName}[${index}].companyId is required.`);
      if (auditPackage.companyId && auditPackage.companyId !== companyId) warnings.push(`${inputName}[${index}].companyId must match scope.companyId.`);
    });
  }

  return warnings;
}

export function buildExecutiveBriefingPackage(input: BuildExecutiveBriefingPackageInput): BuildExecutiveBriefingPackageResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      executiveBriefingPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const auditArtifacts = getAuditArtifacts(input);
  const domainObservations = getDomainObservations(input);
  const auditResponsePackages = getInputArray(input.auditResponsePackages);
  const auditPackages = getInputArray(input.auditPackages);
  const controllerReviewPackages = getInputArray(input.controllerReviewPackages);
  const upstreamPackages = getUpstreamPackages(input);
  const materialityMetadata = getMaterialityMetadata(input);
  const observationIds = getExecutiveBriefingObservationIds(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    executiveBriefingPackage: {
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
      continuousAuditObservationIds: observationIds.continuousAuditObservationIds,
      continuousControllerObservationIds: observationIds.continuousControllerObservationIds,
      auditReadinessObservationIds: observationIds.auditReadinessObservationIds,
      trustVerificationObservationIds: observationIds.trustVerificationObservationIds,
      platformIntegrityObservationIds: observationIds.platformIntegrityObservationIds,
      anomalyObservationIds: observationIds.anomalyObservationIds,
      fluxObservationIds: observationIds.fluxObservationIds,
      materialityObservationIds: observationIds.materialityObservationIds,
      balanceSheetIntegrityObservationIds: observationIds.balanceSheetIntegrityObservationIds,
      financialStatementRelationshipObservationIds: observationIds.financialStatementRelationshipObservationIds,
      auditCoverageObservationIds: observationIds.auditCoverageObservationIds,
      evidenceSufficiencyObservationIds: observationIds.evidenceSufficiencyObservationIds,
      upstreamPackageIds: uniqueStable([
        ...upstreamPackages.map((auditPackage) => auditPackage.packageId),
        ...upstreamPackages.flatMap((auditPackage) => auditPackage.upstreamPackageIds),
      ]),
      auditResponsePackageIds: auditResponsePackages.map((auditPackage) => auditPackage.packageId),
      auditPackageIds: auditPackages.map((auditPackage) => auditPackage.packageId),
      controllerReviewPackageIds: controllerReviewPackages.map((controllerReviewPackage) => controllerReviewPackage.packageId),
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
      continuousAuditObservations: getInputArray(input.continuousAuditObservations),
      continuousControllerObservations: getInputArray(input.continuousControllerObservations),
      auditReadinessObservations: getInputArray(input.auditReadinessObservations),
      trustVerificationObservations: getInputArray(input.trustVerificationObservations),
      platformIntegrityObservations: getInputArray(input.platformIntegrityObservations),
      anomalyObservations: getInputArray(input.anomalyObservations),
      fluxObservations: getInputArray(input.fluxObservations),
      materialityObservations: getInputArray(input.materialityObservations),
      balanceSheetIntegrityObservations: getInputArray(input.balanceSheetIntegrityObservations),
      financialStatementRelationshipObservations: getInputArray(input.financialStatementRelationshipObservations),
      auditCoverageObservations: getInputArray(input.auditCoverageObservations),
      evidenceSufficiencyObservations: getInputArray(input.evidenceSufficiencyObservations),
      auditResponsePackages,
      auditPackages,
      controllerReviewPackages,
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
