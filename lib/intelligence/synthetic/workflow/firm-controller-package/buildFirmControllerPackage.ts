import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticAnomalyIntelligenceObservation } from "../../audit/anomaly-intelligence";
import type { SyntheticAuditReadinessObservation } from "../../audit/audit-readiness";
import type { SyntheticBalanceSheetIntegrityObservation } from "../../audit/balance-sheet-integrity";
import type { SyntheticAuditBriefing } from "../../audit/briefings";
import type { SyntheticAuditCandidate } from "../../audit/candidates";
import type { SyntheticAuditConfidence } from "../../audit/confidence";
import type { SyntheticContinuousAuditObservation } from "../../audit/continuous-audit";
import type { SyntheticContinuousControllerObservation } from "../../audit/continuous-controller";
import type { SyntheticAuditEvidencePackage } from "../../audit/evidence";
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
import type { SyntheticClientPortfolioPackage } from "../client-portfolio-package";
import type { SyntheticCloseHealthPackage } from "../close-health-package";
import type { SyntheticCloseReadinessPackage } from "../close-readiness-package";
import type { SyntheticCloseRiskPackage } from "../close-risk-package";
import type { SyntheticCloseSupportPackage } from "../close-support-package";
import type { SyntheticControllerReviewPackage } from "../controller-review-package";
import type { SyntheticExecutiveBriefingPackage } from "../executive-briefing-package";

export type SyntheticFirmControllerPackageCategory =
  | "firm_controller_package"
  | "firm_controller_close_context_package"
  | "firm_controller_health_context_package"
  | "firm_controller_risk_context_package"
  | "firm_controller_support_context_package"
  | "firm_controller_client_portfolio_lineage_package"
  | "firm_controller_trust_integrity_context_package";

export const SYNTHETIC_FIRM_CONTROLLER_PACKAGE_CATEGORIES: SyntheticFirmControllerPackageCategory[] = [
  "firm_controller_package",
  "firm_controller_close_context_package",
  "firm_controller_health_context_package",
  "firm_controller_risk_context_package",
  "firm_controller_support_context_package",
  "firm_controller_client_portfolio_lineage_package",
  "firm_controller_trust_integrity_context_package",
];

export interface SyntheticFirmControllerPackageIsolationDimension {
  required: boolean;
  referenceIds: string[];
}

export interface SyntheticFirmControllerForwardCompatibleObservation {
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

export interface BuildFirmControllerPackageInput {
  auditContract: SyntheticAuditContract | null;
  packageKey: string;
  packageCategory: SyntheticFirmControllerPackageCategory;
  continuousControllerObservations?: SyntheticContinuousControllerObservation[];
  continuousAuditObservations?: SyntheticContinuousAuditObservation[];
  trustVerificationObservations?: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations?: SyntheticPlatformIntegrityObservation[];
  anomalyObservations?: SyntheticAnomalyIntelligenceObservation[];
  fluxObservations?: SyntheticFluxIntelligenceObservation[];
  materialityObservations?: SyntheticMaterialityObservation[];
  auditReadinessObservations?: SyntheticAuditReadinessObservation[];
  balanceSheetIntegrityObservations?: SyntheticBalanceSheetIntegrityObservation[];
  financialStatementRelationshipObservations?: SyntheticFinancialStatementRelationshipObservation[];
  controllerReviewPackages?: SyntheticControllerReviewPackage[];
  executiveBriefingPackages?: SyntheticExecutiveBriefingPackage[];
  closeReadinessPackages?: SyntheticCloseReadinessPackage[];
  closeHealthPackages?: SyntheticCloseHealthPackage[];
  closeRiskPackages?: SyntheticCloseRiskPackage[];
  closeSupportPackages?: SyntheticCloseSupportPackage[];
  clientPortfolioPackages?: SyntheticClientPortfolioPackage[];
  healthcarePpdObservations?: SyntheticFirmControllerForwardCompatibleObservation[];
  payrollObservations?: SyntheticFirmControllerForwardCompatibleObservation[];
  methodologyObservations?: SyntheticFirmControllerForwardCompatibleObservation[];
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticFirmControllerPackage {
  packageId: string;
  packageKey: string;
  packageCategory: SyntheticFirmControllerPackageCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticFirmControllerPackageIsolationDimension;
  firmIsolation: SyntheticFirmControllerPackageIsolationDimension;
  clientIsolation: SyntheticFirmControllerPackageIsolationDimension;
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
  trustVerificationObservationIds: string[];
  platformIntegrityObservationIds: string[];
  anomalyObservationIds: string[];
  fluxObservationIds: string[];
  materialityObservationIds: string[];
  auditReadinessObservationIds: string[];
  balanceSheetIntegrityObservationIds: string[];
  financialStatementRelationshipObservationIds: string[];
  upstreamPackageIds: string[];
  controllerReviewPackageIds: string[];
  executiveBriefingPackageIds: string[];
  closeReadinessPackageIds: string[];
  closeHealthPackageIds: string[];
  closeRiskPackageIds: string[];
  closeSupportPackageIds: string[];
  clientPortfolioPackageIds: string[];
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
  trustVerificationObservations: SyntheticTrustVerificationObservation[];
  platformIntegrityObservations: SyntheticPlatformIntegrityObservation[];
  anomalyObservations: SyntheticAnomalyIntelligenceObservation[];
  fluxObservations: SyntheticFluxIntelligenceObservation[];
  materialityObservations: SyntheticMaterialityObservation[];
  auditReadinessObservations: SyntheticAuditReadinessObservation[];
  balanceSheetIntegrityObservations: SyntheticBalanceSheetIntegrityObservation[];
  financialStatementRelationshipObservations: SyntheticFinancialStatementRelationshipObservation[];
  controllerReviewPackages: SyntheticControllerReviewPackage[];
  executiveBriefingPackages: SyntheticExecutiveBriefingPackage[];
  closeReadinessPackages: SyntheticCloseReadinessPackage[];
  closeHealthPackages: SyntheticCloseHealthPackage[];
  closeRiskPackages: SyntheticCloseRiskPackage[];
  closeSupportPackages: SyntheticCloseSupportPackage[];
  clientPortfolioPackages: SyntheticClientPortfolioPackage[];
  healthcarePpdObservations: SyntheticFirmControllerForwardCompatibleObservation[];
  payrollObservations: SyntheticFirmControllerForwardCompatibleObservation[];
  methodologyObservations: SyntheticFirmControllerForwardCompatibleObservation[];
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildFirmControllerPackageResult {
  firmControllerPackage: SyntheticFirmControllerPackage | null;
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

type UpstreamPackage =
  | SyntheticControllerReviewPackage
  | SyntheticExecutiveBriefingPackage
  | SyntheticCloseReadinessPackage
  | SyntheticCloseHealthPackage
  | SyntheticCloseRiskPackage
  | SyntheticCloseSupportPackage
  | SyntheticClientPortfolioPackage;

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

function isSupportedPackageCategory(category: SyntheticFirmControllerPackageCategory): boolean {
  return SYNTHETIC_FIRM_CONTROLLER_PACKAGE_CATEGORIES.includes(category);
}

function buildCustomerIsolation(scope: SyntheticAuditScope): SyntheticFirmControllerPackageIsolationDimension {
  return { required: true, referenceIds: uniqueStable([scope.companyId, ...scope.isolationBoundaryIds]) };
}

function buildFirmIsolation(scope: SyntheticAuditScope): SyntheticFirmControllerPackageIsolationDimension {
  return {
    required: true,
    referenceIds: uniqueStable([scope.firmId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function getUpstreamPackages(input: BuildFirmControllerPackageInput): UpstreamPackage[] {
  return [
    ...getInputArray(input.controllerReviewPackages),
    ...getInputArray(input.executiveBriefingPackages),
    ...getInputArray(input.closeReadinessPackages),
    ...getInputArray(input.closeHealthPackages),
    ...getInputArray(input.closeRiskPackages),
    ...getInputArray(input.closeSupportPackages),
    ...getInputArray(input.clientPortfolioPackages),
  ];
}

function buildClientIsolation(input: BuildFirmControllerPackageInput, scope: SyntheticAuditScope): SyntheticFirmControllerPackageIsolationDimension {
  return {
    required: false,
    referenceIds: uniqueStable([
      scope.clientId,
      ...getUpstreamPackages(input).flatMap((firmPackage) => firmPackage.clientIsolation.referenceIds),
    ].filter((value): value is string => value !== undefined)),
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

function getDomainObservations(input: BuildFirmControllerPackageInput): object[] {
  return [
    ...getInputArray(input.continuousControllerObservations),
    ...getInputArray(input.continuousAuditObservations),
    ...getInputArray(input.trustVerificationObservations),
    ...getInputArray(input.platformIntegrityObservations),
    ...getInputArray(input.anomalyObservations),
    ...getInputArray(input.fluxObservations),
    ...getInputArray(input.materialityObservations),
    ...getInputArray(input.auditReadinessObservations),
    ...getInputArray(input.balanceSheetIntegrityObservations),
    ...getInputArray(input.financialStatementRelationshipObservations),
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getAuditArtifacts(input: BuildFirmControllerPackageInput): AuditArtifact[] {
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

function getObservationIds(observations: object[], propertyName: string): string[] {
  return uniqueStable(observations.flatMap((observation) => getStringProperty(observation, propertyName)));
}

function getFirmControllerObservationIds(input: BuildFirmControllerPackageInput) {
  return {
    continuousControllerObservationIds: getObservationIds(
      getInputArray(input.continuousControllerObservations),
      "continuousControllerObservationId",
    ),
    continuousAuditObservationIds: getObservationIds(getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"),
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
    auditReadinessObservationIds: getObservationIds(getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"),
    balanceSheetIntegrityObservationIds: getObservationIds(
      getInputArray(input.balanceSheetIntegrityObservations),
      "balanceSheetIntegrityObservationId",
    ),
    financialStatementRelationshipObservationIds: getObservationIds(
      getInputArray(input.financialStatementRelationshipObservations),
      "financialStatementRelationshipObservationId",
    ),
    healthcarePpdObservationIds: getObservationIds(getInputArray(input.healthcarePpdObservations), "healthcarePpdObservationId"),
    payrollObservationIds: getObservationIds(getInputArray(input.payrollObservations), "payrollObservationId"),
    methodologyObservationIds: getObservationIds(getInputArray(input.methodologyObservations), "methodologyObservationId"),
  };
}

function getUpstreamObservationIds(input: BuildFirmControllerPackageInput): string[] {
  const observationIds = getFirmControllerObservationIds(input);
  return uniqueStable([
    ...observationIds.continuousControllerObservationIds,
    ...observationIds.continuousAuditObservationIds,
    ...observationIds.trustVerificationObservationIds,
    ...observationIds.platformIntegrityObservationIds,
    ...observationIds.anomalyObservationIds,
    ...observationIds.fluxObservationIds,
    ...observationIds.materialityObservationIds,
    ...observationIds.auditReadinessObservationIds,
    ...observationIds.balanceSheetIntegrityObservationIds,
    ...observationIds.financialStatementRelationshipObservationIds,
    ...observationIds.healthcarePpdObservationIds,
    ...observationIds.payrollObservationIds,
    ...observationIds.methodologyObservationIds,
    ...getUpstreamPackages(input).flatMap((firmPackage) => firmPackage.upstreamObservationIds),
  ]);
}

function getAuditContractReferenceIds(input: BuildFirmControllerPackageInput): string[] {
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
    ...getUpstreamPackages(input).flatMap((firmPackage) => firmPackage.auditContractReferenceIds),
  ].filter((value): value is string => value !== undefined));
}

function getReferenceIds(input: BuildFirmControllerPackageInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, singularName),
      ...getStringArrayProperty(artifact, arrayName),
    ]),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, arrayName)),
    ...getUpstreamPackages(input).flatMap((firmPackage) => getStringArrayProperty(firmPackage, arrayName)),
  ]);
}

function getEvidenceReferenceIds(input: BuildFirmControllerPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getInputArray(input.auditCandidates).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getInputArray(input.auditEvidencePackages).flatMap((auditEvidencePackage) => auditEvidencePackage.evidenceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "evidenceReferenceIds")),
    ...getUpstreamPackages(input).flatMap((firmPackage) => firmPackage.evidenceReferenceIds),
  ]);
}

function getSourceReferenceIds(input: BuildFirmControllerPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getInputArray(input.auditCandidates).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getInputArray(input.auditEvidencePackages).flatMap((auditEvidencePackage) => auditEvidencePackage.sourceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "sourceReferenceIds")),
    ...getUpstreamPackages(input).flatMap((firmPackage) => firmPackage.sourceReferenceIds),
  ]);
}

function getLineageReferenceIds(input: BuildFirmControllerPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getInputArray(input.auditCandidates).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getInputArray(input.auditEvidencePackages).flatMap((auditEvidencePackage) => auditEvidencePackage.lineageReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => getStringArrayProperty(observation, "lineageReferenceIds")),
    ...getUpstreamPackages(input).flatMap((firmPackage) => firmPackage.lineageReferenceIds),
  ]);
}

function getMaterialityMetadata(input: BuildFirmControllerPackageInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getAuditArtifacts(input).map((artifact) => artifact.materialityCompatibility),
    ...getDomainObservations(input).flatMap((observation) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(observation, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(observation, "materialityCompatibility"),
    ]),
    ...getUpstreamPackages(input).flatMap((firmPackage) => [
      ...firmPackage.materialityMetadata,
      ...firmPackage.materialityCompatibility,
    ]),
  ]);
}

function buildPackageId(input: BuildFirmControllerPackageInput): string {
  return `synthetic-firm-controller-package:${stableSnapshotHash({
    packageKey: input.packageKey,
    packageCategory: input.packageCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    customerIsolation: input.auditContract ? buildCustomerIsolation(input.auditContract.scope) : null,
    firmIsolation: input.auditContract ? buildFirmIsolation(input.auditContract.scope) : null,
    clientIsolation: input.auditContract ? buildClientIsolation(input, input.auditContract.scope) : null,
    ...getFirmControllerObservationIds(input),
    upstreamObservationIds: getUpstreamObservationIds(input),
    upstreamPackageIds: getUpstreamPackages(input).map((firmPackage) => firmPackage.packageId),
    auditContractReferenceIds: getAuditContractReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildFirmControllerPackageInput): string[] {
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

function validateInput(input: BuildFirmControllerPackageInput): string[] {
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
  if (!hasValue(auditContract.scope.firmId)) warnings.push("scope.firmId is required for firm controller isolation.");
  if (!hasArrayValue(auditContract.scope.isolationBoundaryIds)) warnings.push("scope.isolationBoundaryIds must include at least one value.");
  if (!hasArrayValue(auditContract.evidence.evidenceIds)) warnings.push("evidence.evidenceIds must include at least one value.");
  if (!hasArrayValue(auditContract.evidence.sourceReferenceIds)) warnings.push("evidence.sourceReferenceIds must include at least one value.");
  if (!hasArrayValue(auditContract.evidence.lineageReferenceIds)) warnings.push("evidence.lineageReferenceIds must include at least one value.");

  const companyId = auditContract.scope.companyId;
  for (const [inputName, values, idField] of [
    ["continuousControllerObservations", getInputArray(input.continuousControllerObservations), "continuousControllerObservationId"],
    ["continuousAuditObservations", getInputArray(input.continuousAuditObservations), "continuousAuditObservationId"],
    ["trustVerificationObservations", getInputArray(input.trustVerificationObservations), "trustVerificationObservationId"],
    ["platformIntegrityObservations", getInputArray(input.platformIntegrityObservations), "platformIntegrityObservationId"],
    ["anomalyObservations", getInputArray(input.anomalyObservations), "anomalyIntelligenceObservationId"],
    ["fluxObservations", getInputArray(input.fluxObservations), "fluxIntelligenceObservationId"],
    ["materialityObservations", getInputArray(input.materialityObservations), "materialityObservationId"],
    ["auditReadinessObservations", getInputArray(input.auditReadinessObservations), "auditReadinessObservationId"],
    ["balanceSheetIntegrityObservations", getInputArray(input.balanceSheetIntegrityObservations), "balanceSheetIntegrityObservationId"],
    [
      "financialStatementRelationshipObservations",
      getInputArray(input.financialStatementRelationshipObservations),
      "financialStatementRelationshipObservationId",
    ],
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
    ["controllerReviewPackages", getInputArray(input.controllerReviewPackages)],
    ["executiveBriefingPackages", getInputArray(input.executiveBriefingPackages)],
    ["closeReadinessPackages", getInputArray(input.closeReadinessPackages)],
    ["closeHealthPackages", getInputArray(input.closeHealthPackages)],
    ["closeRiskPackages", getInputArray(input.closeRiskPackages)],
    ["closeSupportPackages", getInputArray(input.closeSupportPackages)],
    ["clientPortfolioPackages", getInputArray(input.clientPortfolioPackages)],
  ] as const) {
    values.forEach((firmPackage, index) => {
      if (!hasValue(firmPackage.packageId)) warnings.push(`${inputName}[${index}].packageId is required.`);
      if (!hasValue(firmPackage.companyId)) warnings.push(`${inputName}[${index}].companyId is required.`);
      if (firmPackage.companyId && firmPackage.companyId !== companyId) warnings.push(`${inputName}[${index}].companyId must match scope.companyId.`);
    });
  }

  return warnings;
}

export function buildFirmControllerPackage(input: BuildFirmControllerPackageInput): BuildFirmControllerPackageResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      firmControllerPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const auditArtifacts = getAuditArtifacts(input);
  const domainObservations = getDomainObservations(input);
  const controllerReviewPackages = getInputArray(input.controllerReviewPackages);
  const executiveBriefingPackages = getInputArray(input.executiveBriefingPackages);
  const closeReadinessPackages = getInputArray(input.closeReadinessPackages);
  const closeHealthPackages = getInputArray(input.closeHealthPackages);
  const closeRiskPackages = getInputArray(input.closeRiskPackages);
  const closeSupportPackages = getInputArray(input.closeSupportPackages);
  const clientPortfolioPackages = getInputArray(input.clientPortfolioPackages);
  const upstreamPackages = getUpstreamPackages(input);
  const materialityMetadata = getMaterialityMetadata(input);
  const observationIds = getFirmControllerObservationIds(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    firmControllerPackage: {
      packageId: buildPackageId(input),
      packageKey: input.packageKey,
      packageCategory: input.packageCategory,
      companyId: auditContract.scope.companyId,
      auditCategory: getAuditCategory(auditContract),
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(input, auditContract.scope),
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
      trustVerificationObservationIds: observationIds.trustVerificationObservationIds,
      platformIntegrityObservationIds: observationIds.platformIntegrityObservationIds,
      anomalyObservationIds: observationIds.anomalyObservationIds,
      fluxObservationIds: observationIds.fluxObservationIds,
      materialityObservationIds: observationIds.materialityObservationIds,
      auditReadinessObservationIds: observationIds.auditReadinessObservationIds,
      balanceSheetIntegrityObservationIds: observationIds.balanceSheetIntegrityObservationIds,
      financialStatementRelationshipObservationIds: observationIds.financialStatementRelationshipObservationIds,
      upstreamPackageIds: uniqueStable([
        ...upstreamPackages.map((firmPackage) => firmPackage.packageId),
        ...upstreamPackages.flatMap((firmPackage) => firmPackage.upstreamPackageIds),
      ]),
      controllerReviewPackageIds: controllerReviewPackages.map((controllerReviewPackage) => controllerReviewPackage.packageId),
      executiveBriefingPackageIds: executiveBriefingPackages.map((executiveBriefingPackage) => executiveBriefingPackage.packageId),
      closeReadinessPackageIds: closeReadinessPackages.map((closeReadinessPackage) => closeReadinessPackage.packageId),
      closeHealthPackageIds: closeHealthPackages.map((closeHealthPackage) => closeHealthPackage.packageId),
      closeRiskPackageIds: closeRiskPackages.map((closeRiskPackage) => closeRiskPackage.packageId),
      closeSupportPackageIds: closeSupportPackages.map((closeSupportPackage) => closeSupportPackage.packageId),
      clientPortfolioPackageIds: clientPortfolioPackages.map((clientPortfolioPackage) => clientPortfolioPackage.packageId),
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
        ...upstreamPackages.flatMap((firmPackage) => firmPackage.trustMetadata),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...auditArtifacts.map((artifact) => artifact.confidenceMetadata),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(observation, "confidenceMetadata"),
        ),
        ...upstreamPackages.flatMap((firmPackage) => firmPackage.confidenceMetadata),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...auditArtifacts.map((artifact) => artifact.governanceMetadata),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(observation, "governanceMetadata"),
        ),
        ...upstreamPackages.flatMap((firmPackage) => firmPackage.governanceMetadata),
      ]),
      materialityMetadata,
      materialityCompatibility: materialityMetadata,
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...auditArtifacts.map((artifact) => artifact.personaCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(observation, "personaCompatibility"),
        ),
        ...upstreamPackages.flatMap((firmPackage) => firmPackage.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...auditArtifacts.map((artifact) => artifact.packageCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(observation, "packageCompatibility"),
        ),
        ...upstreamPackages.flatMap((firmPackage) => firmPackage.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...auditArtifacts.map((artifact) => artifact.memoryCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(observation, "memoryCompatibility"),
        ),
        ...upstreamPackages.flatMap((firmPackage) => firmPackage.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...auditArtifacts.map((artifact) => artifact.learningCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(observation, "learningCompatibility"),
        ),
        ...upstreamPackages.flatMap((firmPackage) => firmPackage.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...auditArtifacts.map((artifact) => artifact.surfaceCompatibility),
        ...domainObservations.flatMap((observation) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(observation, "surfaceCompatibility"),
        ),
        ...upstreamPackages.flatMap((firmPackage) => firmPackage.surfaceCompatibility),
      ]),
      auditContract,
      continuousControllerObservations: getInputArray(input.continuousControllerObservations),
      continuousAuditObservations: getInputArray(input.continuousAuditObservations),
      trustVerificationObservations: getInputArray(input.trustVerificationObservations),
      platformIntegrityObservations: getInputArray(input.platformIntegrityObservations),
      anomalyObservations: getInputArray(input.anomalyObservations),
      fluxObservations: getInputArray(input.fluxObservations),
      materialityObservations: getInputArray(input.materialityObservations),
      auditReadinessObservations: getInputArray(input.auditReadinessObservations),
      balanceSheetIntegrityObservations: getInputArray(input.balanceSheetIntegrityObservations),
      financialStatementRelationshipObservations: getInputArray(input.financialStatementRelationshipObservations),
      controllerReviewPackages,
      executiveBriefingPackages,
      closeReadinessPackages,
      closeHealthPackages,
      closeRiskPackages,
      closeSupportPackages,
      clientPortfolioPackages,
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
