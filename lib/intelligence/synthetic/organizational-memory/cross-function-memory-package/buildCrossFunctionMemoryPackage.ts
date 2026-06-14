import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticCrossEntityMemoryPackage } from "../cross-entity-memory-package";
import type { SyntheticCrossPeriodMemoryPackage } from "../cross-period-memory-package";
import type { SyntheticOrganizationalMemoryGraph } from "../organizational-memory-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../organizational-memory-package";
import type { SyntheticHistoricalOutcomePackage } from "../historical-outcome-package";
import type { SyntheticHistoricalDecisionPackage } from "../historical-decision-package";
import type { SyntheticHistoricalAuditPackage } from "../historical-audit-package";
import type { SyntheticHistoricalControllerPackage } from "../historical-controller-package";
import type { SyntheticMemoryObjectIsolationDimension, SyntheticMemoryObjectSourceArtifact } from "../memory-object";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditContract,
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

export type SyntheticCrossFunctionMemoryPackageCategory =
  | "cross_function_memory_package"
  | "audit_controller_function_memory_package"
  | "executive_function_memory_package"
  | "close_management_function_memory_package"
  | "reconciliation_function_memory_package"
  | "schedule_function_memory_package"
  | "tie_out_function_memory_package"
  | "evidence_review_function_memory_package";

export const SYNTHETIC_CROSS_FUNCTION_MEMORY_PACKAGE_CATEGORIES: SyntheticCrossFunctionMemoryPackageCategory[] = [
  "cross_function_memory_package",
  "audit_controller_function_memory_package",
  "executive_function_memory_package",
  "close_management_function_memory_package",
  "reconciliation_function_memory_package",
  "schedule_function_memory_package",
  "tie_out_function_memory_package",
  "evidence_review_function_memory_package",
];

export interface BuildCrossFunctionMemoryPackageInput {
  auditContract: SyntheticAuditContract | null;
  packageCategory: SyntheticCrossFunctionMemoryPackageCategory;
  functionReferenceIds?: string[];
  sourceFunctionReferenceIds?: string[];
  targetFunctionReferenceIds?: string[];
  functionLineageReferenceIds?: string[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  crossPeriodMemoryPackages?: SyntheticCrossPeriodMemoryPackage[];
  crossEntityMemoryPackages?: SyntheticCrossEntityMemoryPackage[];
  historicalOutcomePackages?: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages?: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages?: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages?: SyntheticHistoricalControllerPackage[];
  auditResponsePackages?: SyntheticMemoryObjectSourceArtifact[];
  auditPackages?: SyntheticMemoryObjectSourceArtifact[];
  controllerReviewPackages?: SyntheticMemoryObjectSourceArtifact[];
  executiveBriefingPackages?: SyntheticMemoryObjectSourceArtifact[];
  closeReadinessPackages?: SyntheticMemoryObjectSourceArtifact[];
  closeHealthPackages?: SyntheticMemoryObjectSourceArtifact[];
  closeRiskPackages?: SyntheticMemoryObjectSourceArtifact[];
  closeSupportPackages?: SyntheticMemoryObjectSourceArtifact[];
  reconciliationReviewPackages?: SyntheticMemoryObjectSourceArtifact[];
  scheduleReviewPackages?: SyntheticMemoryObjectSourceArtifact[];
  tieOutReviewPackages?: SyntheticMemoryObjectSourceArtifact[];
  evidenceReviewPackages?: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations?: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations?: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations?: SyntheticMemoryObjectSourceArtifact[];
}

export interface SyntheticCrossFunctionMemoryPackage {
  crossFunctionMemoryPackageId: string;
  crossFunctionMemoryPackageKey: string;
  packageCategory: SyntheticCrossFunctionMemoryPackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  functionReferenceIds: string[];
  sourceFunctionReferenceIds: string[];
  targetFunctionReferenceIds: string[];
  functionLineageReferenceIds: string[];
  organizationalMemoryGraphIds: string[];
  organizationalMemoryPackageIds: string[];
  crossPeriodMemoryPackageIds: string[];
  crossEntityMemoryPackageIds: string[];
  historicalOutcomePackageIds: string[];
  historicalDecisionPackageIds: string[];
  historicalAuditPackageIds: string[];
  historicalControllerPackageIds: string[];
  auditResponsePackageIds: string[];
  auditPackageIds: string[];
  controllerReviewPackageIds: string[];
  executiveBriefingPackageIds: string[];
  closeReadinessPackageIds: string[];
  closeHealthPackageIds: string[];
  closeRiskPackageIds: string[];
  closeSupportPackageIds: string[];
  reconciliationReviewPackageIds: string[];
  scheduleReviewPackageIds: string[];
  tieOutReviewPackageIds: string[];
  evidenceReviewPackageIds: string[];
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  upstreamObservationIds: string[];
  upstreamPackageIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  healthcarePpdObservationIds: string[];
  payrollObservationIds: string[];
  methodologyObservationIds: string[];
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
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  crossPeriodMemoryPackages: SyntheticCrossPeriodMemoryPackage[];
  crossEntityMemoryPackages: SyntheticCrossEntityMemoryPackage[];
  historicalOutcomePackages: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages: SyntheticHistoricalControllerPackage[];
  auditResponsePackages: SyntheticMemoryObjectSourceArtifact[];
  auditPackages: SyntheticMemoryObjectSourceArtifact[];
  controllerReviewPackages: SyntheticMemoryObjectSourceArtifact[];
  executiveBriefingPackages: SyntheticMemoryObjectSourceArtifact[];
  closeReadinessPackages: SyntheticMemoryObjectSourceArtifact[];
  closeHealthPackages: SyntheticMemoryObjectSourceArtifact[];
  closeRiskPackages: SyntheticMemoryObjectSourceArtifact[];
  closeSupportPackages: SyntheticMemoryObjectSourceArtifact[];
  reconciliationReviewPackages: SyntheticMemoryObjectSourceArtifact[];
  scheduleReviewPackages: SyntheticMemoryObjectSourceArtifact[];
  tieOutReviewPackages: SyntheticMemoryObjectSourceArtifact[];
  evidenceReviewPackages: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations: SyntheticMemoryObjectSourceArtifact[];
  warnings: string[];
}

export interface BuildCrossFunctionMemoryPackageResult {
  crossFunctionMemoryPackage: SyntheticCrossFunctionMemoryPackage | null;
  skipped: boolean;
  warnings: string[];
}

type CrossFunctionSourceArtifact =
  | SyntheticOrganizationalMemoryGraph
  | SyntheticOrganizationalMemoryPackage
  | SyntheticCrossPeriodMemoryPackage
  | SyntheticCrossEntityMemoryPackage
  | SyntheticHistoricalOutcomePackage
  | SyntheticHistoricalDecisionPackage
  | SyntheticHistoricalAuditPackage
  | SyntheticHistoricalControllerPackage;

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
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

function isSupportedPackageCategory(packageCategory: SyntheticCrossFunctionMemoryPackageCategory): boolean {
  return SYNTHETIC_CROSS_FUNCTION_MEMORY_PACKAGE_CATEGORIES.includes(packageCategory);
}

function buildCustomerIsolation(scope: SyntheticAuditScope): SyntheticMemoryObjectIsolationDimension {
  return { required: scope.customerIsolationRequired, referenceIds: uniqueStable([scope.companyId, ...scope.isolationBoundaryIds]) };
}

function buildFirmIsolation(scope: SyntheticAuditScope): SyntheticMemoryObjectIsolationDimension {
  return {
    required: scope.firmIsolationRequired,
    referenceIds: uniqueStable([scope.firmId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function buildClientIsolation(scope: SyntheticAuditScope): SyntheticMemoryObjectIsolationDimension {
  return {
    required: scope.clientIsolationRequired,
    referenceIds: uniqueStable([scope.clientId, ...scope.isolationBoundaryIds].filter((value): value is string => value !== undefined)),
  };
}

function getOrganizationalMemoryGraphs(input: BuildCrossFunctionMemoryPackageInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getOrganizationalMemoryPackages(input: BuildCrossFunctionMemoryPackageInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getCrossPeriodMemoryPackages(input: BuildCrossFunctionMemoryPackageInput): SyntheticCrossPeriodMemoryPackage[] {
  return getInputArray(input.crossPeriodMemoryPackages);
}

function getCrossEntityMemoryPackages(input: BuildCrossFunctionMemoryPackageInput): SyntheticCrossEntityMemoryPackage[] {
  return getInputArray(input.crossEntityMemoryPackages);
}

function getHistoricalOutcomePackages(input: BuildCrossFunctionMemoryPackageInput): SyntheticHistoricalOutcomePackage[] {
  return getInputArray(input.historicalOutcomePackages);
}

function getHistoricalDecisionPackages(input: BuildCrossFunctionMemoryPackageInput): SyntheticHistoricalDecisionPackage[] {
  return getInputArray(input.historicalDecisionPackages);
}

function getHistoricalAuditPackages(input: BuildCrossFunctionMemoryPackageInput): SyntheticHistoricalAuditPackage[] {
  return getInputArray(input.historicalAuditPackages);
}

function getHistoricalControllerPackages(input: BuildCrossFunctionMemoryPackageInput): SyntheticHistoricalControllerPackage[] {
  return getInputArray(input.historicalControllerPackages);
}

function getPhase35PackageReferences(input: BuildCrossFunctionMemoryPackageInput): SyntheticMemoryObjectSourceArtifact[] {
  return [
    ...getInputArray(input.auditResponsePackages),
    ...getInputArray(input.auditPackages),
    ...getInputArray(input.controllerReviewPackages),
    ...getInputArray(input.executiveBriefingPackages),
    ...getInputArray(input.closeReadinessPackages),
    ...getInputArray(input.closeHealthPackages),
    ...getInputArray(input.closeRiskPackages),
    ...getInputArray(input.closeSupportPackages),
    ...getInputArray(input.reconciliationReviewPackages),
    ...getInputArray(input.scheduleReviewPackages),
    ...getInputArray(input.tieOutReviewPackages),
    ...getInputArray(input.evidenceReviewPackages),
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getSourceArtifacts(input: BuildCrossFunctionMemoryPackageInput): CrossFunctionSourceArtifact[] {
  return [
    ...getOrganizationalMemoryGraphs(input),
    ...getOrganizationalMemoryPackages(input),
    ...getCrossPeriodMemoryPackages(input),
    ...getCrossEntityMemoryPackages(input),
    ...getHistoricalOutcomePackages(input),
    ...getHistoricalDecisionPackages(input),
    ...getHistoricalAuditPackages(input),
    ...getHistoricalControllerPackages(input),
  ];
}

function getReferenceIds(input: BuildCrossFunctionMemoryPackageInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, singularName),
      ...getStringArrayProperty(referenceArtifact, arrayName),
    ]),
    ...getSourceArtifacts(input).flatMap((sourceArtifact) => [
      ...getStringProperty(sourceArtifact, singularName),
      ...getStringArrayProperty(sourceArtifact, arrayName),
    ]),
  ]);
}

function getPackageIds(
  input: BuildCrossFunctionMemoryPackageInput,
  packageInputs: SyntheticMemoryObjectSourceArtifact[] | undefined,
  singularName: string,
  arrayName: string,
): string[] {
  return uniqueStable([
    ...getInputArray(packageInputs).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, singularName),
      ...getStringArrayProperty(referenceArtifact, arrayName),
      ...getStringProperty(referenceArtifact, "packageId"),
    ]),
    ...getReferenceIds(input, singularName, arrayName),
  ]);
}

function getOrganizationalMemoryGraphIds(input: BuildCrossFunctionMemoryPackageInput): string[] {
  return uniqueStable(getOrganizationalMemoryGraphs(input).map((memoryGraph) => memoryGraph.organizationalMemoryGraphId));
}

function getOrganizationalMemoryPackageIds(input: BuildCrossFunctionMemoryPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.organizationalMemoryPackageIds),
    ...getOrganizationalMemoryPackages(input).map((memoryPackage) => memoryPackage.organizationalMemoryPackageId),
    ...getCrossPeriodMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.organizationalMemoryPackageIds),
    ...getCrossEntityMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.organizationalMemoryPackageIds),
    ...getHistoricalPackages(input).flatMap((historicalPackage) => historicalPackage.organizationalMemoryPackageIds),
  ]);
}

function getCrossPeriodMemoryPackageIds(input: BuildCrossFunctionMemoryPackageInput): string[] {
  return uniqueStable([
    ...getCrossPeriodMemoryPackages(input).map((memoryPackage) => memoryPackage.crossPeriodMemoryPackageId),
    ...getCrossEntityMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.crossPeriodMemoryPackageIds),
  ]);
}

function getCrossEntityMemoryPackageIds(input: BuildCrossFunctionMemoryPackageInput): string[] {
  return uniqueStable(getCrossEntityMemoryPackages(input).map((memoryPackage) => memoryPackage.crossEntityMemoryPackageId));
}

function getHistoricalOutcomePackageIds(input: BuildCrossFunctionMemoryPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.historicalOutcomePackageIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.historicalOutcomePackageIds),
    ...getCrossEntityMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.historicalOutcomePackageIds),
    ...getHistoricalOutcomePackages(input).map((historicalPackage) => historicalPackage.historicalOutcomePackageId),
    ...getHistoricalAuditPackages(input).flatMap((historicalPackage) => historicalPackage.historicalOutcomePackageIds),
    ...getHistoricalControllerPackages(input).flatMap((historicalPackage) => historicalPackage.historicalOutcomePackageIds),
  ]);
}

function getHistoricalDecisionPackageIds(input: BuildCrossFunctionMemoryPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.historicalDecisionPackageIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.historicalDecisionPackageIds),
    ...getCrossEntityMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.historicalDecisionPackageIds),
    ...getHistoricalDecisionPackages(input).map((historicalPackage) => historicalPackage.historicalDecisionPackageId),
    ...getHistoricalAuditPackages(input).flatMap((historicalPackage) => historicalPackage.historicalDecisionPackageIds),
    ...getHistoricalControllerPackages(input).flatMap((historicalPackage) => historicalPackage.historicalDecisionPackageIds),
  ]);
}

function getHistoricalAuditPackageIds(input: BuildCrossFunctionMemoryPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.historicalAuditPackageIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.historicalAuditPackageIds),
    ...getCrossEntityMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.historicalAuditPackageIds),
    ...getHistoricalAuditPackages(input).map((historicalPackage) => historicalPackage.historicalAuditPackageId),
  ]);
}

function getHistoricalControllerPackageIds(input: BuildCrossFunctionMemoryPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.historicalControllerPackageIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.historicalControllerPackageIds),
    ...getCrossEntityMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.historicalControllerPackageIds),
    ...getHistoricalControllerPackages(input).map((historicalPackage) => historicalPackage.historicalControllerPackageId),
  ]);
}

function getHistoricalPackages(
  input: BuildCrossFunctionMemoryPackageInput,
): Array<
  | SyntheticHistoricalOutcomePackage
  | SyntheticHistoricalDecisionPackage
  | SyntheticHistoricalAuditPackage
  | SyntheticHistoricalControllerPackage
> {
  return [
    ...getHistoricalOutcomePackages(input),
    ...getHistoricalDecisionPackages(input),
    ...getHistoricalAuditPackages(input),
    ...getHistoricalControllerPackages(input),
  ];
}

function getEvidenceReferenceIds(input: BuildCrossFunctionMemoryPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => referenceArtifact.evidenceReferenceIds ?? []),
    ...getOrganizationalMemoryGraphs(input).flatMap((sourceArtifact) => sourceArtifact.evidenceReferenceIds),
    ...getOrganizationalMemoryPackages(input).flatMap((sourceArtifact) => sourceArtifact.evidenceReferenceIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((sourceArtifact) => sourceArtifact.evidenceReferenceIds),
    ...getCrossEntityMemoryPackages(input).flatMap((sourceArtifact) => sourceArtifact.evidenceReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((sourceArtifact) => sourceArtifact.outcomeEvidenceReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((sourceArtifact) => sourceArtifact.decisionEvidenceReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((sourceArtifact) => sourceArtifact.auditEvidenceReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap((sourceArtifact) => sourceArtifact.controllerEvidenceReferenceIds),
  ]);
}

function getSourceReferenceIds(input: BuildCrossFunctionMemoryPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => referenceArtifact.sourceReferenceIds ?? []),
    ...getOrganizationalMemoryGraphs(input).flatMap((sourceArtifact) => sourceArtifact.sourceReferenceIds),
    ...getOrganizationalMemoryPackages(input).flatMap((sourceArtifact) => sourceArtifact.sourceReferenceIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((sourceArtifact) => sourceArtifact.sourceReferenceIds),
    ...getCrossEntityMemoryPackages(input).flatMap((sourceArtifact) => sourceArtifact.sourceReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((sourceArtifact) => sourceArtifact.outcomeSourceReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((sourceArtifact) => sourceArtifact.decisionSourceReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((sourceArtifact) => sourceArtifact.auditSourceReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap((sourceArtifact) => sourceArtifact.controllerSourceReferenceIds),
  ]);
}

function getLineageReferenceIds(input: BuildCrossFunctionMemoryPackageInput): string[] {
  return uniqueStable([
    ...getInputArray(input.functionLineageReferenceIds),
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => referenceArtifact.lineageReferenceIds ?? []),
    ...getOrganizationalMemoryGraphs(input).flatMap((sourceArtifact) => sourceArtifact.lineageReferenceIds),
    ...getOrganizationalMemoryPackages(input).flatMap((sourceArtifact) => sourceArtifact.lineageReferenceIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((sourceArtifact) => sourceArtifact.lineageReferenceIds),
    ...getCrossEntityMemoryPackages(input).flatMap((sourceArtifact) => sourceArtifact.lineageReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((sourceArtifact) => sourceArtifact.outcomeLineageReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((sourceArtifact) => sourceArtifact.decisionLineageReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((sourceArtifact) => sourceArtifact.auditLineageReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap((sourceArtifact) => sourceArtifact.controllerLineageReferenceIds),
  ]);
}

function getUpstreamObservationIds(input: BuildCrossFunctionMemoryPackageInput): string[] {
  return uniqueStable([
    input.auditContract?.observationMetadata?.auditObservationId,
    ...(input.auditContract?.evidence.supportingObservationIds ?? []),
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "observationId"),
      ...(referenceArtifact.upstreamObservationIds ?? []),
    ]),
    ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.upstreamObservationIds),
  ].filter((value): value is string => value !== undefined));
}

function getUpstreamPackageIds(input: BuildCrossFunctionMemoryPackageInput): string[] {
  return uniqueStable([
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "packageId"),
      ...(referenceArtifact.upstreamPackageIds ?? []),
    ]),
    ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.upstreamPackageIds),
  ]);
}

function getAuditContractReferenceIds(input: BuildCrossFunctionMemoryPackageInput): string[] {
  const auditContract = input.auditContract;
  return uniqueStable([
    auditContract?.observationMetadata?.auditObservationId,
    auditContract?.findingMetadata?.auditFindingId,
    auditContract?.exceptionMetadata?.auditExceptionId,
    auditContract?.riskMetadata?.auditRiskId,
    ...(auditContract?.evidence.sourceReferenceIds ?? []),
    ...(auditContract?.evidence.lineageReferenceIds ?? []),
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => referenceArtifact.auditContractReferenceIds ?? []),
    ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.auditContractReferenceIds),
  ].filter((value): value is string => value !== undefined));
}

function buildCrossFunctionMemoryPackageKey(input: BuildCrossFunctionMemoryPackageInput): string {
  const scope = input.auditContract?.scope;

  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    companyId: scope?.companyId ?? null,
    scope: scope ?? null,
    customerIsolation: scope ? buildCustomerIsolation(scope) : null,
    firmIsolation: scope ? buildFirmIsolation(scope) : null,
    clientIsolation: scope ? buildClientIsolation(scope) : null,
    functionReferenceIds: uniqueStable(getInputArray(input.functionReferenceIds)),
    sourceFunctionReferenceIds: uniqueStable(getInputArray(input.sourceFunctionReferenceIds)),
    targetFunctionReferenceIds: uniqueStable(getInputArray(input.targetFunctionReferenceIds)),
    functionLineageReferenceIds: uniqueStable(getInputArray(input.functionLineageReferenceIds)),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
    crossPeriodMemoryPackageIds: getCrossPeriodMemoryPackageIds(input),
    crossEntityMemoryPackageIds: getCrossEntityMemoryPackageIds(input),
    historicalOutcomePackageIds: getHistoricalOutcomePackageIds(input),
    historicalDecisionPackageIds: getHistoricalDecisionPackageIds(input),
    historicalAuditPackageIds: getHistoricalAuditPackageIds(input),
    historicalControllerPackageIds: getHistoricalControllerPackageIds(input),
  });
}

function buildCrossFunctionMemoryPackageId(input: BuildCrossFunctionMemoryPackageInput): string {
  return `synthetic-cross-function-memory-package:${stableSnapshotHash({
    crossFunctionMemoryPackageKey: buildCrossFunctionMemoryPackageKey(input),
    packageCategory: input.packageCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
  })}`;
}

function getMaterialityMetadata(input: BuildCrossFunctionMemoryPackageInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityCompatibility"),
    ]),
    ...getSourceArtifacts(input).flatMap((sourceArtifact) => [
      ...sourceArtifact.materialityMetadata,
      ...sourceArtifact.materialityCompatibility,
    ]),
  ]);
}

function getForwardCompatibilityWarnings(input: BuildCrossFunctionMemoryPackageInput): string[] {
  return [
    ...(getInputArray(input.healthcarePpdObservations).length > 0
      ? ["healthcare PPD observations are forward-compatible references."]
      : []),
    ...(getInputArray(input.payrollObservations).length > 0 ? ["payroll observations are forward-compatible references."] : []),
    ...(getInputArray(input.methodologyObservations).length > 0
      ? ["methodology observations are Phase 37 reference-only inputs."]
      : []),
  ];
}

function validateInput(input: BuildCrossFunctionMemoryPackageInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) warnings.push("auditContract is required.");
  if (!auditContract) return warnings;

  if (!hasValue(input.packageCategory)) warnings.push("packageCategory is required.");
  if (!isSupportedPackageCategory(input.packageCategory)) warnings.push("packageCategory must be supported.");
  if (!auditContract.scope) warnings.push("auditContract.scope is required.");
  if (!auditContract.evidence) warnings.push("auditContract.evidence is required.");
  if (!auditContract.scope || !auditContract.evidence) return warnings;

  if (!hasValue(auditContract.scope.companyId)) warnings.push("scope.companyId is required.");

  const companyId = auditContract.scope.companyId;
  for (const [inputName, values] of [
    ["auditResponsePackages", getInputArray(input.auditResponsePackages)],
    ["auditPackages", getInputArray(input.auditPackages)],
    ["controllerReviewPackages", getInputArray(input.controllerReviewPackages)],
    ["executiveBriefingPackages", getInputArray(input.executiveBriefingPackages)],
    ["closeReadinessPackages", getInputArray(input.closeReadinessPackages)],
    ["closeHealthPackages", getInputArray(input.closeHealthPackages)],
    ["closeRiskPackages", getInputArray(input.closeRiskPackages)],
    ["closeSupportPackages", getInputArray(input.closeSupportPackages)],
    ["reconciliationReviewPackages", getInputArray(input.reconciliationReviewPackages)],
    ["scheduleReviewPackages", getInputArray(input.scheduleReviewPackages)],
    ["tieOutReviewPackages", getInputArray(input.tieOutReviewPackages)],
    ["evidenceReviewPackages", getInputArray(input.evidenceReviewPackages)],
    ["healthcarePpdObservations", getInputArray(input.healthcarePpdObservations)],
    ["payrollObservations", getInputArray(input.payrollObservations)],
    ["methodologyObservations", getInputArray(input.methodologyObservations)],
  ] as const) {
    values.forEach((referenceArtifact, index) => {
      if (!hasValue(referenceArtifact.companyId)) warnings.push(`${inputName}[${index}].companyId is required.`);
      if (referenceArtifact.companyId && referenceArtifact.companyId !== companyId) {
        warnings.push(`${inputName}[${index}].companyId must equal scope.companyId.`);
      }
    });
  }

  getOrganizationalMemoryGraphs(input).forEach((memoryGraph, index) => {
    if (!hasValue(memoryGraph.organizationalMemoryGraphId)) warnings.push(`organizationalMemoryGraphs[${index}].organizationalMemoryGraphId is required.`);
    if (!hasValue(memoryGraph.organizationalMemoryGraphKey)) warnings.push(`organizationalMemoryGraphs[${index}].organizationalMemoryGraphKey is required.`);
    if (memoryGraph.companyId !== companyId) warnings.push(`organizationalMemoryGraphs[${index}].companyId must equal scope.companyId.`);
  });

  getOrganizationalMemoryPackages(input).forEach((memoryPackage, index) => {
    if (!hasValue(memoryPackage.organizationalMemoryPackageId)) warnings.push(`organizationalMemoryPackages[${index}].organizationalMemoryPackageId is required.`);
    if (!hasValue(memoryPackage.organizationalMemoryPackageKey)) warnings.push(`organizationalMemoryPackages[${index}].organizationalMemoryPackageKey is required.`);
    if (memoryPackage.companyId !== companyId) warnings.push(`organizationalMemoryPackages[${index}].companyId must equal scope.companyId.`);
  });

  getCrossPeriodMemoryPackages(input).forEach((memoryPackage, index) => {
    if (!hasValue(memoryPackage.crossPeriodMemoryPackageId)) warnings.push(`crossPeriodMemoryPackages[${index}].crossPeriodMemoryPackageId is required.`);
    if (!hasValue(memoryPackage.crossPeriodMemoryPackageKey)) warnings.push(`crossPeriodMemoryPackages[${index}].crossPeriodMemoryPackageKey is required.`);
    if (memoryPackage.companyId !== companyId) warnings.push(`crossPeriodMemoryPackages[${index}].companyId must equal scope.companyId.`);
  });

  getCrossEntityMemoryPackages(input).forEach((memoryPackage, index) => {
    if (!hasValue(memoryPackage.crossEntityMemoryPackageId)) warnings.push(`crossEntityMemoryPackages[${index}].crossEntityMemoryPackageId is required.`);
    if (!hasValue(memoryPackage.crossEntityMemoryPackageKey)) warnings.push(`crossEntityMemoryPackages[${index}].crossEntityMemoryPackageKey is required.`);
    if (memoryPackage.companyId !== companyId) warnings.push(`crossEntityMemoryPackages[${index}].companyId must equal scope.companyId.`);
  });

  getHistoricalOutcomePackages(input).forEach((historicalPackage, index) => {
    if (!hasValue(historicalPackage.historicalOutcomePackageId)) warnings.push(`historicalOutcomePackages[${index}].historicalOutcomePackageId is required.`);
    if (!hasValue(historicalPackage.historicalOutcomePackageKey)) warnings.push(`historicalOutcomePackages[${index}].historicalOutcomePackageKey is required.`);
    if (historicalPackage.companyId !== companyId) warnings.push(`historicalOutcomePackages[${index}].companyId must equal scope.companyId.`);
  });

  getHistoricalDecisionPackages(input).forEach((historicalPackage, index) => {
    if (!hasValue(historicalPackage.historicalDecisionPackageId)) warnings.push(`historicalDecisionPackages[${index}].historicalDecisionPackageId is required.`);
    if (!hasValue(historicalPackage.historicalDecisionPackageKey)) warnings.push(`historicalDecisionPackages[${index}].historicalDecisionPackageKey is required.`);
    if (historicalPackage.companyId !== companyId) warnings.push(`historicalDecisionPackages[${index}].companyId must equal scope.companyId.`);
  });

  getHistoricalAuditPackages(input).forEach((historicalPackage, index) => {
    if (!hasValue(historicalPackage.historicalAuditPackageId)) warnings.push(`historicalAuditPackages[${index}].historicalAuditPackageId is required.`);
    if (!hasValue(historicalPackage.historicalAuditPackageKey)) warnings.push(`historicalAuditPackages[${index}].historicalAuditPackageKey is required.`);
    if (historicalPackage.companyId !== companyId) warnings.push(`historicalAuditPackages[${index}].companyId must equal scope.companyId.`);
  });

  getHistoricalControllerPackages(input).forEach((historicalPackage, index) => {
    if (!hasValue(historicalPackage.historicalControllerPackageId)) warnings.push(`historicalControllerPackages[${index}].historicalControllerPackageId is required.`);
    if (!hasValue(historicalPackage.historicalControllerPackageKey)) warnings.push(`historicalControllerPackages[${index}].historicalControllerPackageKey is required.`);
    if (historicalPackage.companyId !== companyId) warnings.push(`historicalControllerPackages[${index}].companyId must equal scope.companyId.`);
  });

  return warnings;
}

export function buildCrossFunctionMemoryPackage(input: BuildCrossFunctionMemoryPackageInput): BuildCrossFunctionMemoryPackageResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      crossFunctionMemoryPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const organizationalMemoryGraphIds = getOrganizationalMemoryGraphIds(input);
  const organizationalMemoryPackageIds = getOrganizationalMemoryPackageIds(input);
  const crossPeriodMemoryPackageIds = getCrossPeriodMemoryPackageIds(input);
  const crossEntityMemoryPackageIds = getCrossEntityMemoryPackageIds(input);
  const historicalOutcomePackageIds = getHistoricalOutcomePackageIds(input);
  const historicalDecisionPackageIds = getHistoricalDecisionPackageIds(input);
  const historicalAuditPackageIds = getHistoricalAuditPackageIds(input);
  const historicalControllerPackageIds = getHistoricalControllerPackageIds(input);
  const materialityMetadata = getMaterialityMetadata(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    crossFunctionMemoryPackage: {
      crossFunctionMemoryPackageId: buildCrossFunctionMemoryPackageId(input),
      crossFunctionMemoryPackageKey: buildCrossFunctionMemoryPackageKey(input),
      packageCategory: input.packageCategory,
      companyId: auditContract.scope.companyId,
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      functionReferenceIds: uniqueStable(getInputArray(input.functionReferenceIds)),
      sourceFunctionReferenceIds: uniqueStable(getInputArray(input.sourceFunctionReferenceIds)),
      targetFunctionReferenceIds: uniqueStable(getInputArray(input.targetFunctionReferenceIds)),
      functionLineageReferenceIds: uniqueStable(getInputArray(input.functionLineageReferenceIds)),
      organizationalMemoryGraphIds,
      organizationalMemoryPackageIds,
      crossPeriodMemoryPackageIds,
      crossEntityMemoryPackageIds,
      historicalOutcomePackageIds,
      historicalDecisionPackageIds,
      historicalAuditPackageIds,
      historicalControllerPackageIds,
      auditResponsePackageIds: getPackageIds(input, input.auditResponsePackages, "auditResponsePackageId", "auditResponsePackageIds"),
      auditPackageIds: getPackageIds(input, input.auditPackages, "auditPackageId", "auditPackageIds"),
      controllerReviewPackageIds: getPackageIds(
        input,
        input.controllerReviewPackages,
        "controllerReviewPackageId",
        "controllerReviewPackageIds",
      ),
      executiveBriefingPackageIds: getPackageIds(
        input,
        input.executiveBriefingPackages,
        "executiveBriefingPackageId",
        "executiveBriefingPackageIds",
      ),
      closeReadinessPackageIds: getPackageIds(
        input,
        input.closeReadinessPackages,
        "closeReadinessPackageId",
        "closeReadinessPackageIds",
      ),
      closeHealthPackageIds: getPackageIds(input, input.closeHealthPackages, "closeHealthPackageId", "closeHealthPackageIds"),
      closeRiskPackageIds: getPackageIds(input, input.closeRiskPackages, "closeRiskPackageId", "closeRiskPackageIds"),
      closeSupportPackageIds: getPackageIds(input, input.closeSupportPackages, "closeSupportPackageId", "closeSupportPackageIds"),
      reconciliationReviewPackageIds: getPackageIds(
        input,
        input.reconciliationReviewPackages,
        "reconciliationReviewPackageId",
        "reconciliationReviewPackageIds",
      ),
      scheduleReviewPackageIds: getPackageIds(
        input,
        input.scheduleReviewPackages,
        "scheduleReviewPackageId",
        "scheduleReviewPackageIds",
      ),
      tieOutReviewPackageIds: getPackageIds(input, input.tieOutReviewPackages, "tieOutReviewPackageId", "tieOutReviewPackageIds"),
      evidenceReviewPackageIds: getPackageIds(
        input,
        input.evidenceReviewPackages,
        "evidenceReviewPackageId",
        "evidenceReviewPackageIds",
      ),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      sourceReferenceIds: getSourceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      upstreamObservationIds: getUpstreamObservationIds(input),
      upstreamPackageIds: getUpstreamPackageIds(input),
      auditContractReferenceIds: getAuditContractReferenceIds(input),
      auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
      auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
      auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
      auditFindingIds: getReferenceIds(input, "auditFindingId", "auditFindingIds"),
      auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
      auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
      auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
      auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
      healthcarePpdObservationIds: getReferenceIds(input, "healthcarePpdObservationId", "healthcarePpdObservationIds"),
      payrollObservationIds: getReferenceIds(input, "payrollObservationId", "payrollObservationIds"),
      methodologyObservationIds: getReferenceIds(input, "methodologyObservationId", "methodologyObservationIds"),
      observationMetadata: compactDefined([
        auditContract.observationMetadata,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditObservationMetadata>(referenceArtifact, "observationMetadata"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.observationMetadata),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditFindingMetadata>(referenceArtifact, "findingMetadata"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.findingMetadata),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditExceptionMetadata>(referenceArtifact, "exceptionMetadata"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.exceptionMetadata),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditRiskMetadata>(referenceArtifact, "riskMetadata"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.riskMetadata),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditTrustMetadata>(referenceArtifact, "trustMetadata"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.trustMetadata),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(referenceArtifact, "confidenceMetadata"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.confidenceMetadata),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(referenceArtifact, "governanceMetadata"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.governanceMetadata),
      ]),
      materialityMetadata,
      materialityCompatibility: materialityMetadata,
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(referenceArtifact, "personaCompatibility"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(referenceArtifact, "packageCompatibility"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(referenceArtifact, "memoryCompatibility"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(referenceArtifact, "learningCompatibility"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(referenceArtifact, "surfaceCompatibility"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.surfaceCompatibility),
      ]),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      crossPeriodMemoryPackages: getCrossPeriodMemoryPackages(input),
      crossEntityMemoryPackages: getCrossEntityMemoryPackages(input),
      historicalOutcomePackages: getHistoricalOutcomePackages(input),
      historicalDecisionPackages: getHistoricalDecisionPackages(input),
      historicalAuditPackages: getHistoricalAuditPackages(input),
      historicalControllerPackages: getHistoricalControllerPackages(input),
      auditResponsePackages: getInputArray(input.auditResponsePackages),
      auditPackages: getInputArray(input.auditPackages),
      controllerReviewPackages: getInputArray(input.controllerReviewPackages),
      executiveBriefingPackages: getInputArray(input.executiveBriefingPackages),
      closeReadinessPackages: getInputArray(input.closeReadinessPackages),
      closeHealthPackages: getInputArray(input.closeHealthPackages),
      closeRiskPackages: getInputArray(input.closeRiskPackages),
      closeSupportPackages: getInputArray(input.closeSupportPackages),
      reconciliationReviewPackages: getInputArray(input.reconciliationReviewPackages),
      scheduleReviewPackages: getInputArray(input.scheduleReviewPackages),
      tieOutReviewPackages: getInputArray(input.tieOutReviewPackages),
      evidenceReviewPackages: getInputArray(input.evidenceReviewPackages),
      healthcarePpdObservations: getInputArray(input.healthcarePpdObservations),
      payrollObservations: getInputArray(input.payrollObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
