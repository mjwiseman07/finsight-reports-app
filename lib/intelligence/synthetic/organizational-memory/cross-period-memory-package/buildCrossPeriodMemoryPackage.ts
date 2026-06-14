import { stableSnapshotHash } from "../../../core/hash";
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

export type SyntheticCrossPeriodMemoryPackageCategory =
  | "cross_period_memory_package"
  | "accounting_period_memory_package"
  | "reporting_period_memory_package"
  | "audit_period_memory_package"
  | "review_period_memory_package"
  | "historical_period_memory_package";

export const SYNTHETIC_CROSS_PERIOD_MEMORY_PACKAGE_CATEGORIES: SyntheticCrossPeriodMemoryPackageCategory[] = [
  "cross_period_memory_package",
  "accounting_period_memory_package",
  "reporting_period_memory_package",
  "audit_period_memory_package",
  "review_period_memory_package",
  "historical_period_memory_package",
];

export interface BuildCrossPeriodMemoryPackageInput {
  auditContract: SyntheticAuditContract | null;
  packageCategory: SyntheticCrossPeriodMemoryPackageCategory;
  periodReferenceIds?: string[];
  priorPeriodReferenceIds?: string[];
  currentPeriodReferenceIds?: string[];
  periodLineageReferenceIds?: string[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  historicalOutcomePackages?: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages?: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages?: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages?: SyntheticHistoricalControllerPackage[];
  healthcarePpdObservations?: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations?: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations?: SyntheticMemoryObjectSourceArtifact[];
}

export interface SyntheticCrossPeriodMemoryPackage {
  crossPeriodMemoryPackageId: string;
  crossPeriodMemoryPackageKey: string;
  packageCategory: SyntheticCrossPeriodMemoryPackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  periodReferenceIds: string[];
  priorPeriodReferenceIds: string[];
  currentPeriodReferenceIds: string[];
  periodLineageReferenceIds: string[];
  organizationalMemoryGraphIds: string[];
  organizationalMemoryPackageIds: string[];
  historicalOutcomePackageIds: string[];
  historicalDecisionPackageIds: string[];
  historicalAuditPackageIds: string[];
  historicalControllerPackageIds: string[];
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
  historicalOutcomePackages: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages: SyntheticHistoricalControllerPackage[];
  healthcarePpdObservations: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations: SyntheticMemoryObjectSourceArtifact[];
  warnings: string[];
}

export interface BuildCrossPeriodMemoryPackageResult {
  crossPeriodMemoryPackage: SyntheticCrossPeriodMemoryPackage | null;
  skipped: boolean;
  warnings: string[];
}

type CrossPeriodSourceArtifact =
  | SyntheticOrganizationalMemoryGraph
  | SyntheticOrganizationalMemoryPackage
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

function isSupportedPackageCategory(packageCategory: SyntheticCrossPeriodMemoryPackageCategory): boolean {
  return SYNTHETIC_CROSS_PERIOD_MEMORY_PACKAGE_CATEGORIES.includes(packageCategory);
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

function getOrganizationalMemoryGraphs(input: BuildCrossPeriodMemoryPackageInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getOrganizationalMemoryPackages(input: BuildCrossPeriodMemoryPackageInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getHistoricalOutcomePackages(input: BuildCrossPeriodMemoryPackageInput): SyntheticHistoricalOutcomePackage[] {
  return getInputArray(input.historicalOutcomePackages);
}

function getHistoricalDecisionPackages(input: BuildCrossPeriodMemoryPackageInput): SyntheticHistoricalDecisionPackage[] {
  return getInputArray(input.historicalDecisionPackages);
}

function getHistoricalAuditPackages(input: BuildCrossPeriodMemoryPackageInput): SyntheticHistoricalAuditPackage[] {
  return getInputArray(input.historicalAuditPackages);
}

function getHistoricalControllerPackages(input: BuildCrossPeriodMemoryPackageInput): SyntheticHistoricalControllerPackage[] {
  return getInputArray(input.historicalControllerPackages);
}

function getForwardCompatibleReferences(input: BuildCrossPeriodMemoryPackageInput): SyntheticMemoryObjectSourceArtifact[] {
  return [
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getSourceArtifacts(input: BuildCrossPeriodMemoryPackageInput): CrossPeriodSourceArtifact[] {
  return [
    ...getOrganizationalMemoryGraphs(input),
    ...getOrganizationalMemoryPackages(input),
    ...getHistoricalOutcomePackages(input),
    ...getHistoricalDecisionPackages(input),
    ...getHistoricalAuditPackages(input),
    ...getHistoricalControllerPackages(input),
  ];
}

function getReferenceIds(input: BuildCrossPeriodMemoryPackageInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, singularName),
      ...getStringArrayProperty(referenceArtifact, arrayName),
    ]),
    ...getSourceArtifacts(input).flatMap((sourceArtifact) => [
      ...getStringProperty(sourceArtifact, singularName),
      ...getStringArrayProperty(sourceArtifact, arrayName),
    ]),
  ]);
}

function getOrganizationalMemoryGraphIds(input: BuildCrossPeriodMemoryPackageInput): string[] {
  return uniqueStable(getOrganizationalMemoryGraphs(input).map((memoryGraph) => memoryGraph.organizationalMemoryGraphId));
}

function getOrganizationalMemoryPackageIds(input: BuildCrossPeriodMemoryPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.organizationalMemoryPackageIds),
    ...getOrganizationalMemoryPackages(input).map((memoryPackage) => memoryPackage.organizationalMemoryPackageId),
    ...getHistoricalPackages(input).flatMap((historicalPackage) => historicalPackage.organizationalMemoryPackageIds),
  ]);
}

function getHistoricalOutcomePackageIds(input: BuildCrossPeriodMemoryPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.historicalOutcomePackageIds),
    ...getHistoricalOutcomePackages(input).map((historicalPackage) => historicalPackage.historicalOutcomePackageId),
    ...getHistoricalAuditPackages(input).flatMap((historicalPackage) => historicalPackage.historicalOutcomePackageIds),
    ...getHistoricalControllerPackages(input).flatMap((historicalPackage) => historicalPackage.historicalOutcomePackageIds),
  ]);
}

function getHistoricalDecisionPackageIds(input: BuildCrossPeriodMemoryPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.historicalDecisionPackageIds),
    ...getHistoricalDecisionPackages(input).map((historicalPackage) => historicalPackage.historicalDecisionPackageId),
    ...getHistoricalAuditPackages(input).flatMap((historicalPackage) => historicalPackage.historicalDecisionPackageIds),
    ...getHistoricalControllerPackages(input).flatMap((historicalPackage) => historicalPackage.historicalDecisionPackageIds),
  ]);
}

function getHistoricalAuditPackageIds(input: BuildCrossPeriodMemoryPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.historicalAuditPackageIds),
    ...getHistoricalAuditPackages(input).map((historicalPackage) => historicalPackage.historicalAuditPackageId),
  ]);
}

function getHistoricalControllerPackageIds(input: BuildCrossPeriodMemoryPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.historicalControllerPackageIds),
    ...getHistoricalControllerPackages(input).map((historicalPackage) => historicalPackage.historicalControllerPackageId),
  ]);
}

function getHistoricalPackages(
  input: BuildCrossPeriodMemoryPackageInput,
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

function getEvidenceReferenceIds(input: BuildCrossPeriodMemoryPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => referenceArtifact.evidenceReferenceIds ?? []),
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.evidenceReferenceIds),
    ...getOrganizationalMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.evidenceReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((historicalPackage) => historicalPackage.outcomeEvidenceReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((historicalPackage) => historicalPackage.decisionEvidenceReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((historicalPackage) => historicalPackage.auditEvidenceReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap((historicalPackage) => historicalPackage.controllerEvidenceReferenceIds),
  ]);
}

function getSourceReferenceIds(input: BuildCrossPeriodMemoryPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => referenceArtifact.sourceReferenceIds ?? []),
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.sourceReferenceIds),
    ...getOrganizationalMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.sourceReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((historicalPackage) => historicalPackage.outcomeSourceReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((historicalPackage) => historicalPackage.decisionSourceReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((historicalPackage) => historicalPackage.auditSourceReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap((historicalPackage) => historicalPackage.controllerSourceReferenceIds),
  ]);
}

function getLineageReferenceIds(input: BuildCrossPeriodMemoryPackageInput): string[] {
  return uniqueStable([
    ...getInputArray(input.periodLineageReferenceIds),
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => referenceArtifact.lineageReferenceIds ?? []),
    ...getOrganizationalMemoryGraphs(input).flatMap((memoryGraph) => memoryGraph.lineageReferenceIds),
    ...getOrganizationalMemoryPackages(input).flatMap((memoryPackage) => memoryPackage.lineageReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((historicalPackage) => historicalPackage.outcomeLineageReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((historicalPackage) => historicalPackage.decisionLineageReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((historicalPackage) => historicalPackage.auditLineageReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap((historicalPackage) => historicalPackage.controllerLineageReferenceIds),
  ]);
}

function getUpstreamObservationIds(input: BuildCrossPeriodMemoryPackageInput): string[] {
  return uniqueStable([
    input.auditContract?.observationMetadata?.auditObservationId,
    ...(input.auditContract?.evidence.supportingObservationIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "observationId"),
      ...(referenceArtifact.upstreamObservationIds ?? []),
    ]),
    ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.upstreamObservationIds),
  ].filter((value): value is string => value !== undefined));
}

function getUpstreamPackageIds(input: BuildCrossPeriodMemoryPackageInput): string[] {
  return uniqueStable([
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "packageId"),
      ...(referenceArtifact.upstreamPackageIds ?? []),
    ]),
    ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.upstreamPackageIds),
  ]);
}

function getAuditContractReferenceIds(input: BuildCrossPeriodMemoryPackageInput): string[] {
  const auditContract = input.auditContract;
  return uniqueStable([
    auditContract?.observationMetadata?.auditObservationId,
    auditContract?.findingMetadata?.auditFindingId,
    auditContract?.exceptionMetadata?.auditExceptionId,
    auditContract?.riskMetadata?.auditRiskId,
    ...(auditContract?.evidence.sourceReferenceIds ?? []),
    ...(auditContract?.evidence.lineageReferenceIds ?? []),
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => referenceArtifact.auditContractReferenceIds ?? []),
    ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.auditContractReferenceIds),
  ].filter((value): value is string => value !== undefined));
}

function buildCrossPeriodMemoryPackageKey(input: BuildCrossPeriodMemoryPackageInput): string {
  const scope = input.auditContract?.scope;

  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    companyId: scope?.companyId ?? null,
    scope: scope ?? null,
    customerIsolation: scope ? buildCustomerIsolation(scope) : null,
    firmIsolation: scope ? buildFirmIsolation(scope) : null,
    clientIsolation: scope ? buildClientIsolation(scope) : null,
    periodReferenceIds: uniqueStable(getInputArray(input.periodReferenceIds)),
    priorPeriodReferenceIds: uniqueStable(getInputArray(input.priorPeriodReferenceIds)),
    currentPeriodReferenceIds: uniqueStable(getInputArray(input.currentPeriodReferenceIds)),
    periodLineageReferenceIds: uniqueStable(getInputArray(input.periodLineageReferenceIds)),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
    historicalOutcomePackageIds: getHistoricalOutcomePackageIds(input),
    historicalDecisionPackageIds: getHistoricalDecisionPackageIds(input),
    historicalAuditPackageIds: getHistoricalAuditPackageIds(input),
    historicalControllerPackageIds: getHistoricalControllerPackageIds(input),
  });
}

function buildCrossPeriodMemoryPackageId(input: BuildCrossPeriodMemoryPackageInput): string {
  return `synthetic-cross-period-memory-package:${stableSnapshotHash({
    crossPeriodMemoryPackageKey: buildCrossPeriodMemoryPackageKey(input),
    packageCategory: input.packageCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
  })}`;
}

function getMaterialityMetadata(input: BuildCrossPeriodMemoryPackageInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityCompatibility"),
    ]),
    ...getSourceArtifacts(input).flatMap((sourceArtifact) => [
      ...sourceArtifact.materialityMetadata,
      ...sourceArtifact.materialityCompatibility,
    ]),
  ]);
}

function getForwardCompatibilityWarnings(input: BuildCrossPeriodMemoryPackageInput): string[] {
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

function validateInput(input: BuildCrossPeriodMemoryPackageInput): string[] {
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

export function buildCrossPeriodMemoryPackage(input: BuildCrossPeriodMemoryPackageInput): BuildCrossPeriodMemoryPackageResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      crossPeriodMemoryPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const organizationalMemoryGraphIds = getOrganizationalMemoryGraphIds(input);
  const organizationalMemoryPackageIds = getOrganizationalMemoryPackageIds(input);
  const historicalOutcomePackageIds = getHistoricalOutcomePackageIds(input);
  const historicalDecisionPackageIds = getHistoricalDecisionPackageIds(input);
  const historicalAuditPackageIds = getHistoricalAuditPackageIds(input);
  const historicalControllerPackageIds = getHistoricalControllerPackageIds(input);
  const materialityMetadata = getMaterialityMetadata(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    crossPeriodMemoryPackage: {
      crossPeriodMemoryPackageId: buildCrossPeriodMemoryPackageId(input),
      crossPeriodMemoryPackageKey: buildCrossPeriodMemoryPackageKey(input),
      packageCategory: input.packageCategory,
      companyId: auditContract.scope.companyId,
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      periodReferenceIds: uniqueStable(getInputArray(input.periodReferenceIds)),
      priorPeriodReferenceIds: uniqueStable(getInputArray(input.priorPeriodReferenceIds)),
      currentPeriodReferenceIds: uniqueStable(getInputArray(input.currentPeriodReferenceIds)),
      periodLineageReferenceIds: uniqueStable(getInputArray(input.periodLineageReferenceIds)),
      organizationalMemoryGraphIds,
      organizationalMemoryPackageIds,
      historicalOutcomePackageIds,
      historicalDecisionPackageIds,
      historicalAuditPackageIds,
      historicalControllerPackageIds,
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
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditObservationMetadata>(referenceArtifact, "observationMetadata"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.observationMetadata),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditFindingMetadata>(referenceArtifact, "findingMetadata"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.findingMetadata),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditExceptionMetadata>(referenceArtifact, "exceptionMetadata"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.exceptionMetadata),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditRiskMetadata>(referenceArtifact, "riskMetadata"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.riskMetadata),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditTrustMetadata>(referenceArtifact, "trustMetadata"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.trustMetadata),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(referenceArtifact, "confidenceMetadata"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.confidenceMetadata),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(referenceArtifact, "governanceMetadata"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.governanceMetadata),
      ]),
      materialityMetadata,
      materialityCompatibility: materialityMetadata,
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(referenceArtifact, "personaCompatibility"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(referenceArtifact, "packageCompatibility"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(referenceArtifact, "memoryCompatibility"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(referenceArtifact, "learningCompatibility"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...getForwardCompatibleReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(referenceArtifact, "surfaceCompatibility"),
        ),
        ...getSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.surfaceCompatibility),
      ]),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      historicalOutcomePackages: getHistoricalOutcomePackages(input),
      historicalDecisionPackages: getHistoricalDecisionPackages(input),
      historicalAuditPackages: getHistoricalAuditPackages(input),
      historicalControllerPackages: getHistoricalControllerPackages(input),
      healthcarePpdObservations: getInputArray(input.healthcarePpdObservations),
      payrollObservations: getInputArray(input.payrollObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
