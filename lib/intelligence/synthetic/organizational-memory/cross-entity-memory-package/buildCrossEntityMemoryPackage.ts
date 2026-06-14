import { stableSnapshotHash } from "../../../core/hash";
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

export type SyntheticCrossEntityMemoryPackageCategory =
  | "cross_entity_memory_package"
  | "cross_client_memory_package"
  | "cross_business_unit_memory_package"
  | "cross_firm_memory_package"
  | "cross_department_memory_package"
  | "cross_scope_memory_package";

export const SYNTHETIC_CROSS_ENTITY_MEMORY_PACKAGE_CATEGORIES: SyntheticCrossEntityMemoryPackageCategory[] = [
  "cross_entity_memory_package",
  "cross_client_memory_package",
  "cross_business_unit_memory_package",
  "cross_firm_memory_package",
  "cross_department_memory_package",
  "cross_scope_memory_package",
];

export interface BuildCrossEntityMemoryPackageInput {
  auditContract: SyntheticAuditContract | null;
  packageCategory: SyntheticCrossEntityMemoryPackageCategory;
  crossScopeReference?: boolean;
  sourceCustomerIsolation?: SyntheticMemoryObjectIsolationDimension;
  sourceFirmIsolation?: SyntheticMemoryObjectIsolationDimension;
  sourceClientIsolation?: SyntheticMemoryObjectIsolationDimension;
  targetCustomerIsolation?: SyntheticMemoryObjectIsolationDimension;
  targetFirmIsolation?: SyntheticMemoryObjectIsolationDimension;
  targetClientIsolation?: SyntheticMemoryObjectIsolationDimension;
  entityReferenceIds?: string[];
  sourceEntityReferenceIds?: string[];
  targetEntityReferenceIds?: string[];
  entityLineageReferenceIds?: string[];
  clientReferenceIds?: string[];
  sourceClientReferenceIds?: string[];
  targetClientReferenceIds?: string[];
  firmReferenceIds?: string[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  crossPeriodMemoryPackages?: SyntheticCrossPeriodMemoryPackage[];
  historicalOutcomePackages?: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages?: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages?: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages?: SyntheticHistoricalControllerPackage[];
  clientPortfolioPackages?: SyntheticMemoryObjectSourceArtifact[];
  firmAuditPackages?: SyntheticMemoryObjectSourceArtifact[];
  firmControllerPackages?: SyntheticMemoryObjectSourceArtifact[];
  multiClientRiskReadinessPackages?: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations?: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations?: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations?: SyntheticMemoryObjectSourceArtifact[];
}

export interface SyntheticCrossEntityMemoryPackage {
  crossEntityMemoryPackageId: string;
  crossEntityMemoryPackageKey: string;
  packageCategory: SyntheticCrossEntityMemoryPackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  crossScopeReference: boolean;
  sourceCustomerIsolation: SyntheticMemoryObjectIsolationDimension;
  sourceFirmIsolation: SyntheticMemoryObjectIsolationDimension;
  sourceClientIsolation: SyntheticMemoryObjectIsolationDimension;
  targetCustomerIsolation: SyntheticMemoryObjectIsolationDimension;
  targetFirmIsolation: SyntheticMemoryObjectIsolationDimension;
  targetClientIsolation: SyntheticMemoryObjectIsolationDimension;
  entityReferenceIds: string[];
  sourceEntityReferenceIds: string[];
  targetEntityReferenceIds: string[];
  entityLineageReferenceIds: string[];
  clientReferenceIds: string[];
  sourceClientReferenceIds: string[];
  targetClientReferenceIds: string[];
  firmReferenceIds: string[];
  organizationalMemoryGraphIds: string[];
  organizationalMemoryPackageIds: string[];
  crossPeriodMemoryPackageIds: string[];
  historicalOutcomePackageIds: string[];
  historicalDecisionPackageIds: string[];
  historicalAuditPackageIds: string[];
  historicalControllerPackageIds: string[];
  clientPortfolioPackageIds: string[];
  firmAuditPackageIds: string[];
  firmControllerPackageIds: string[];
  multiClientRiskReadinessPackageIds: string[];
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
  historicalOutcomePackages: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages: SyntheticHistoricalControllerPackage[];
  clientPortfolioPackages: SyntheticMemoryObjectSourceArtifact[];
  firmAuditPackages: SyntheticMemoryObjectSourceArtifact[];
  firmControllerPackages: SyntheticMemoryObjectSourceArtifact[];
  multiClientRiskReadinessPackages: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations: SyntheticMemoryObjectSourceArtifact[];
  warnings: string[];
}

export interface BuildCrossEntityMemoryPackageResult {
  crossEntityMemoryPackage: SyntheticCrossEntityMemoryPackage | null;
  skipped: boolean;
  warnings: string[];
}

type CrossEntitySourceArtifact =
  | SyntheticOrganizationalMemoryGraph
  | SyntheticOrganizationalMemoryPackage
  | SyntheticCrossPeriodMemoryPackage
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

function isSupportedPackageCategory(packageCategory: SyntheticCrossEntityMemoryPackageCategory): boolean {
  return SYNTHETIC_CROSS_ENTITY_MEMORY_PACKAGE_CATEGORIES.includes(packageCategory);
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

function getRelationshipCustomerIsolation(input: BuildCrossEntityMemoryPackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return input.auditContract?.scope ? buildCustomerIsolation(input.auditContract.scope) : null;
}

function getRelationshipFirmIsolation(input: BuildCrossEntityMemoryPackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return input.auditContract?.scope ? buildFirmIsolation(input.auditContract.scope) : null;
}

function getRelationshipClientIsolation(input: BuildCrossEntityMemoryPackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return input.auditContract?.scope ? buildClientIsolation(input.auditContract.scope) : null;
}

function getSourceCustomerIsolation(input: BuildCrossEntityMemoryPackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return input.sourceCustomerIsolation ?? getRelationshipCustomerIsolation(input);
}

function getSourceFirmIsolation(input: BuildCrossEntityMemoryPackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return input.sourceFirmIsolation ?? getRelationshipFirmIsolation(input);
}

function getSourceClientIsolation(input: BuildCrossEntityMemoryPackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return input.sourceClientIsolation ?? getRelationshipClientIsolation(input);
}

function getTargetCustomerIsolation(input: BuildCrossEntityMemoryPackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return input.targetCustomerIsolation ?? getRelationshipCustomerIsolation(input);
}

function getTargetFirmIsolation(input: BuildCrossEntityMemoryPackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return input.targetFirmIsolation ?? getRelationshipFirmIsolation(input);
}

function getTargetClientIsolation(input: BuildCrossEntityMemoryPackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return input.targetClientIsolation ?? getRelationshipClientIsolation(input);
}

function areIsolationDimensionsEqual(
  sourceIsolation: SyntheticMemoryObjectIsolationDimension,
  targetIsolation: SyntheticMemoryObjectIsolationDimension,
): boolean {
  return stableSnapshotHash(sourceIsolation) === stableSnapshotHash(targetIsolation);
}

function hasCrossScopeIsolation(input: BuildCrossEntityMemoryPackageInput): boolean {
  const sourceCustomerIsolation = getSourceCustomerIsolation(input);
  const sourceFirmIsolation = getSourceFirmIsolation(input);
  const sourceClientIsolation = getSourceClientIsolation(input);
  const targetCustomerIsolation = getTargetCustomerIsolation(input);
  const targetFirmIsolation = getTargetFirmIsolation(input);
  const targetClientIsolation = getTargetClientIsolation(input);

  if (
    !sourceCustomerIsolation ||
    !sourceFirmIsolation ||
    !sourceClientIsolation ||
    !targetCustomerIsolation ||
    !targetFirmIsolation ||
    !targetClientIsolation
  ) {
    return false;
  }

  return (
    !areIsolationDimensionsEqual(sourceCustomerIsolation, targetCustomerIsolation) ||
    !areIsolationDimensionsEqual(sourceFirmIsolation, targetFirmIsolation) ||
    !areIsolationDimensionsEqual(sourceClientIsolation, targetClientIsolation)
  );
}

function getOrganizationalMemoryGraphs(input: BuildCrossEntityMemoryPackageInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getOrganizationalMemoryPackages(input: BuildCrossEntityMemoryPackageInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getCrossPeriodMemoryPackages(input: BuildCrossEntityMemoryPackageInput): SyntheticCrossPeriodMemoryPackage[] {
  return getInputArray(input.crossPeriodMemoryPackages);
}

function getHistoricalOutcomePackages(input: BuildCrossEntityMemoryPackageInput): SyntheticHistoricalOutcomePackage[] {
  return getInputArray(input.historicalOutcomePackages);
}

function getHistoricalDecisionPackages(input: BuildCrossEntityMemoryPackageInput): SyntheticHistoricalDecisionPackage[] {
  return getInputArray(input.historicalDecisionPackages);
}

function getHistoricalAuditPackages(input: BuildCrossEntityMemoryPackageInput): SyntheticHistoricalAuditPackage[] {
  return getInputArray(input.historicalAuditPackages);
}

function getHistoricalControllerPackages(input: BuildCrossEntityMemoryPackageInput): SyntheticHistoricalControllerPackage[] {
  return getInputArray(input.historicalControllerPackages);
}

function getPhase35PackageReferences(input: BuildCrossEntityMemoryPackageInput): SyntheticMemoryObjectSourceArtifact[] {
  return [
    ...getInputArray(input.clientPortfolioPackages),
    ...getInputArray(input.firmAuditPackages),
    ...getInputArray(input.firmControllerPackages),
    ...getInputArray(input.multiClientRiskReadinessPackages),
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getSourceArtifacts(input: BuildCrossEntityMemoryPackageInput): CrossEntitySourceArtifact[] {
  return [
    ...getOrganizationalMemoryGraphs(input),
    ...getOrganizationalMemoryPackages(input),
    ...getCrossPeriodMemoryPackages(input),
    ...getHistoricalOutcomePackages(input),
    ...getHistoricalDecisionPackages(input),
    ...getHistoricalAuditPackages(input),
    ...getHistoricalControllerPackages(input),
  ];
}

function getReferenceIds(input: BuildCrossEntityMemoryPackageInput, singularName: string, arrayName: string): string[] {
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
  input: BuildCrossEntityMemoryPackageInput,
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

function getOrganizationalMemoryGraphIds(input: BuildCrossEntityMemoryPackageInput): string[] {
  return uniqueStable(getOrganizationalMemoryGraphs(input).map((memoryGraph) => memoryGraph.organizationalMemoryGraphId));
}

function getOrganizationalMemoryPackageIds(input: BuildCrossEntityMemoryPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.organizationalMemoryPackageIds),
    ...getOrganizationalMemoryPackages(input).map((memoryPackage) => memoryPackage.organizationalMemoryPackageId),
    ...getCrossPeriodMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.organizationalMemoryPackageIds),
    ...getHistoricalPackages(input).flatMap((historicalPackage) => historicalPackage.organizationalMemoryPackageIds),
  ]);
}

function getCrossPeriodMemoryPackageIds(input: BuildCrossEntityMemoryPackageInput): string[] {
  return uniqueStable(getCrossPeriodMemoryPackages(input).map((memoryPackage) => memoryPackage.crossPeriodMemoryPackageId));
}

function getHistoricalOutcomePackageIds(input: BuildCrossEntityMemoryPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.historicalOutcomePackageIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.historicalOutcomePackageIds),
    ...getHistoricalOutcomePackages(input).map((historicalPackage) => historicalPackage.historicalOutcomePackageId),
    ...getHistoricalAuditPackages(input).flatMap((historicalPackage) => historicalPackage.historicalOutcomePackageIds),
    ...getHistoricalControllerPackages(input).flatMap((historicalPackage) => historicalPackage.historicalOutcomePackageIds),
  ]);
}

function getHistoricalDecisionPackageIds(input: BuildCrossEntityMemoryPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.historicalDecisionPackageIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.historicalDecisionPackageIds),
    ...getHistoricalDecisionPackages(input).map((historicalPackage) => historicalPackage.historicalDecisionPackageId),
    ...getHistoricalAuditPackages(input).flatMap((historicalPackage) => historicalPackage.historicalDecisionPackageIds),
    ...getHistoricalControllerPackages(input).flatMap((historicalPackage) => historicalPackage.historicalDecisionPackageIds),
  ]);
}

function getHistoricalAuditPackageIds(input: BuildCrossEntityMemoryPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.historicalAuditPackageIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.historicalAuditPackageIds),
    ...getHistoricalAuditPackages(input).map((historicalPackage) => historicalPackage.historicalAuditPackageId),
  ]);
}

function getHistoricalControllerPackageIds(input: BuildCrossEntityMemoryPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.historicalControllerPackageIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.historicalControllerPackageIds),
    ...getHistoricalControllerPackages(input).map((historicalPackage) => historicalPackage.historicalControllerPackageId),
  ]);
}

function getHistoricalPackages(
  input: BuildCrossEntityMemoryPackageInput,
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

function getEvidenceReferenceIds(input: BuildCrossEntityMemoryPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => referenceArtifact.evidenceReferenceIds ?? []),
    ...getOrganizationalMemoryGraphs(input).flatMap((sourceArtifact) => sourceArtifact.evidenceReferenceIds),
    ...getOrganizationalMemoryPackages(input).flatMap((sourceArtifact) => sourceArtifact.evidenceReferenceIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((sourceArtifact) => sourceArtifact.evidenceReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((sourceArtifact) => sourceArtifact.outcomeEvidenceReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((sourceArtifact) => sourceArtifact.decisionEvidenceReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((sourceArtifact) => sourceArtifact.auditEvidenceReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap((sourceArtifact) => sourceArtifact.controllerEvidenceReferenceIds),
  ]);
}

function getSourceReferenceIds(input: BuildCrossEntityMemoryPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => referenceArtifact.sourceReferenceIds ?? []),
    ...getOrganizationalMemoryGraphs(input).flatMap((sourceArtifact) => sourceArtifact.sourceReferenceIds),
    ...getOrganizationalMemoryPackages(input).flatMap((sourceArtifact) => sourceArtifact.sourceReferenceIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((sourceArtifact) => sourceArtifact.sourceReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((sourceArtifact) => sourceArtifact.outcomeSourceReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((sourceArtifact) => sourceArtifact.decisionSourceReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((sourceArtifact) => sourceArtifact.auditSourceReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap((sourceArtifact) => sourceArtifact.controllerSourceReferenceIds),
  ]);
}

function getLineageReferenceIds(input: BuildCrossEntityMemoryPackageInput): string[] {
  return uniqueStable([
    ...getInputArray(input.entityLineageReferenceIds),
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => referenceArtifact.lineageReferenceIds ?? []),
    ...getOrganizationalMemoryGraphs(input).flatMap((sourceArtifact) => sourceArtifact.lineageReferenceIds),
    ...getOrganizationalMemoryPackages(input).flatMap((sourceArtifact) => sourceArtifact.lineageReferenceIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((sourceArtifact) => sourceArtifact.lineageReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((sourceArtifact) => sourceArtifact.outcomeLineageReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((sourceArtifact) => sourceArtifact.decisionLineageReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((sourceArtifact) => sourceArtifact.auditLineageReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap((sourceArtifact) => sourceArtifact.controllerLineageReferenceIds),
  ]);
}

function getUpstreamObservationIds(input: BuildCrossEntityMemoryPackageInput): string[] {
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

function getUpstreamPackageIds(input: BuildCrossEntityMemoryPackageInput): string[] {
  return uniqueStable([
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "packageId"),
      ...(referenceArtifact.upstreamPackageIds ?? []),
    ]),
    ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.upstreamPackageIds),
  ]);
}

function getAuditContractReferenceIds(input: BuildCrossEntityMemoryPackageInput): string[] {
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

function buildCrossEntityMemoryPackageKey(input: BuildCrossEntityMemoryPackageInput): string {
  const scope = input.auditContract?.scope;

  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    companyId: scope?.companyId ?? null,
    scope: scope ?? null,
    customerIsolation: scope ? buildCustomerIsolation(scope) : null,
    firmIsolation: scope ? buildFirmIsolation(scope) : null,
    clientIsolation: scope ? buildClientIsolation(scope) : null,
    crossScopeReference: input.crossScopeReference === true,
    entityReferenceIds: uniqueStable(getInputArray(input.entityReferenceIds)),
    sourceEntityReferenceIds: uniqueStable(getInputArray(input.sourceEntityReferenceIds)),
    targetEntityReferenceIds: uniqueStable(getInputArray(input.targetEntityReferenceIds)),
    entityLineageReferenceIds: uniqueStable(getInputArray(input.entityLineageReferenceIds)),
    clientReferenceIds: uniqueStable(getInputArray(input.clientReferenceIds)),
    sourceClientReferenceIds: uniqueStable(getInputArray(input.sourceClientReferenceIds)),
    targetClientReferenceIds: uniqueStable(getInputArray(input.targetClientReferenceIds)),
    firmReferenceIds: uniqueStable(getInputArray(input.firmReferenceIds)),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
    crossPeriodMemoryPackageIds: getCrossPeriodMemoryPackageIds(input),
    historicalOutcomePackageIds: getHistoricalOutcomePackageIds(input),
    historicalDecisionPackageIds: getHistoricalDecisionPackageIds(input),
    historicalAuditPackageIds: getHistoricalAuditPackageIds(input),
    historicalControllerPackageIds: getHistoricalControllerPackageIds(input),
    clientPortfolioPackageIds: getPackageIds(input, input.clientPortfolioPackages, "clientPortfolioPackageId", "clientPortfolioPackageIds"),
    firmAuditPackageIds: getPackageIds(input, input.firmAuditPackages, "firmAuditPackageId", "firmAuditPackageIds"),
    firmControllerPackageIds: getPackageIds(input, input.firmControllerPackages, "firmControllerPackageId", "firmControllerPackageIds"),
    multiClientRiskReadinessPackageIds: getPackageIds(
      input,
      input.multiClientRiskReadinessPackages,
      "multiClientRiskReadinessPackageId",
      "multiClientRiskReadinessPackageIds",
    ),
  });
}

function buildCrossEntityMemoryPackageId(input: BuildCrossEntityMemoryPackageInput): string {
  return `synthetic-cross-entity-memory-package:${stableSnapshotHash({
    crossEntityMemoryPackageKey: buildCrossEntityMemoryPackageKey(input),
    packageCategory: input.packageCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
  })}`;
}

function getMaterialityMetadata(input: BuildCrossEntityMemoryPackageInput): SyntheticAuditMaterialityCompatibility[] {
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

function getForwardCompatibilityWarnings(input: BuildCrossEntityMemoryPackageInput): string[] {
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

function validateInput(input: BuildCrossEntityMemoryPackageInput): string[] {
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

  if (hasCrossScopeIsolation(input) && input.crossScopeReference !== true) {
    warnings.push("crossScopeReference must be true when source and target isolation differ.");
  }

  if (input.crossScopeReference === true) {
    if (!getSourceCustomerIsolation(input)) warnings.push("sourceCustomerIsolation is required for cross-scope references.");
    if (!getSourceFirmIsolation(input)) warnings.push("sourceFirmIsolation is required for cross-scope references.");
    if (!getSourceClientIsolation(input)) warnings.push("sourceClientIsolation is required for cross-scope references.");
    if (!getTargetCustomerIsolation(input)) warnings.push("targetCustomerIsolation is required for cross-scope references.");
    if (!getTargetFirmIsolation(input)) warnings.push("targetFirmIsolation is required for cross-scope references.");
    if (!getTargetClientIsolation(input)) warnings.push("targetClientIsolation is required for cross-scope references.");
  }

  const companyId = auditContract.scope.companyId;
  for (const [inputName, values] of [
    ["clientPortfolioPackages", getInputArray(input.clientPortfolioPackages)],
    ["firmAuditPackages", getInputArray(input.firmAuditPackages)],
    ["firmControllerPackages", getInputArray(input.firmControllerPackages)],
    ["multiClientRiskReadinessPackages", getInputArray(input.multiClientRiskReadinessPackages)],
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

export function buildCrossEntityMemoryPackage(input: BuildCrossEntityMemoryPackageInput): BuildCrossEntityMemoryPackageResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      crossEntityMemoryPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const relationshipCustomerIsolation = buildCustomerIsolation(auditContract.scope);
  const relationshipFirmIsolation = buildFirmIsolation(auditContract.scope);
  const relationshipClientIsolation = buildClientIsolation(auditContract.scope);
  const organizationalMemoryGraphIds = getOrganizationalMemoryGraphIds(input);
  const organizationalMemoryPackageIds = getOrganizationalMemoryPackageIds(input);
  const crossPeriodMemoryPackageIds = getCrossPeriodMemoryPackageIds(input);
  const historicalOutcomePackageIds = getHistoricalOutcomePackageIds(input);
  const historicalDecisionPackageIds = getHistoricalDecisionPackageIds(input);
  const historicalAuditPackageIds = getHistoricalAuditPackageIds(input);
  const historicalControllerPackageIds = getHistoricalControllerPackageIds(input);
  const materialityMetadata = getMaterialityMetadata(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    crossEntityMemoryPackage: {
      crossEntityMemoryPackageId: buildCrossEntityMemoryPackageId(input),
      crossEntityMemoryPackageKey: buildCrossEntityMemoryPackageKey(input),
      packageCategory: input.packageCategory,
      companyId: auditContract.scope.companyId,
      scope: auditContract.scope,
      customerIsolation: relationshipCustomerIsolation,
      firmIsolation: relationshipFirmIsolation,
      clientIsolation: relationshipClientIsolation,
      crossScopeReference: input.crossScopeReference === true,
      sourceCustomerIsolation: getSourceCustomerIsolation(input) ?? relationshipCustomerIsolation,
      sourceFirmIsolation: getSourceFirmIsolation(input) ?? relationshipFirmIsolation,
      sourceClientIsolation: getSourceClientIsolation(input) ?? relationshipClientIsolation,
      targetCustomerIsolation: getTargetCustomerIsolation(input) ?? relationshipCustomerIsolation,
      targetFirmIsolation: getTargetFirmIsolation(input) ?? relationshipFirmIsolation,
      targetClientIsolation: getTargetClientIsolation(input) ?? relationshipClientIsolation,
      entityReferenceIds: uniqueStable(getInputArray(input.entityReferenceIds)),
      sourceEntityReferenceIds: uniqueStable(getInputArray(input.sourceEntityReferenceIds)),
      targetEntityReferenceIds: uniqueStable(getInputArray(input.targetEntityReferenceIds)),
      entityLineageReferenceIds: uniqueStable(getInputArray(input.entityLineageReferenceIds)),
      clientReferenceIds: uniqueStable(getInputArray(input.clientReferenceIds)),
      sourceClientReferenceIds: uniqueStable(getInputArray(input.sourceClientReferenceIds)),
      targetClientReferenceIds: uniqueStable(getInputArray(input.targetClientReferenceIds)),
      firmReferenceIds: uniqueStable(getInputArray(input.firmReferenceIds)),
      organizationalMemoryGraphIds,
      organizationalMemoryPackageIds,
      crossPeriodMemoryPackageIds,
      historicalOutcomePackageIds,
      historicalDecisionPackageIds,
      historicalAuditPackageIds,
      historicalControllerPackageIds,
      clientPortfolioPackageIds: getPackageIds(input, input.clientPortfolioPackages, "clientPortfolioPackageId", "clientPortfolioPackageIds"),
      firmAuditPackageIds: getPackageIds(input, input.firmAuditPackages, "firmAuditPackageId", "firmAuditPackageIds"),
      firmControllerPackageIds: getPackageIds(input, input.firmControllerPackages, "firmControllerPackageId", "firmControllerPackageIds"),
      multiClientRiskReadinessPackageIds: getPackageIds(
        input,
        input.multiClientRiskReadinessPackages,
        "multiClientRiskReadinessPackageId",
        "multiClientRiskReadinessPackageIds",
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
      historicalOutcomePackages: getHistoricalOutcomePackages(input),
      historicalDecisionPackages: getHistoricalDecisionPackages(input),
      historicalAuditPackages: getHistoricalAuditPackages(input),
      historicalControllerPackages: getHistoricalControllerPackages(input),
      clientPortfolioPackages: getInputArray(input.clientPortfolioPackages),
      firmAuditPackages: getInputArray(input.firmAuditPackages),
      firmControllerPackages: getInputArray(input.firmControllerPackages),
      multiClientRiskReadinessPackages: getInputArray(input.multiClientRiskReadinessPackages),
      healthcarePpdObservations: getInputArray(input.healthcarePpdObservations),
      payrollObservations: getInputArray(input.payrollObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
