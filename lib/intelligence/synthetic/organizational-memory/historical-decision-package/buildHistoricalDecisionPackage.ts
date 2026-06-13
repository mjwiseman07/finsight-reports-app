import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticMemoryObject,
  SyntheticMemoryObjectIsolationDimension,
  SyntheticMemoryObjectSourceArtifact,
} from "../memory-object";
import type { SyntheticMemoryRelationship } from "../memory-relationship";
import type { SyntheticEvidenceLineageGraph } from "../evidence-lineage-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../organizational-memory-package";
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

export type SyntheticHistoricalDecisionPackageCategory =
  | "historical_decision_package"
  | "audit_historical_decision_package"
  | "controller_historical_decision_package"
  | "evidence_historical_decision_package"
  | "package_lineage_historical_decision_package"
  | "governance_historical_decision_package"
  | "cross_period_historical_decision_package"
  | "cross_entity_historical_decision_package"
  | "cross_function_historical_decision_package";

export const SYNTHETIC_HISTORICAL_DECISION_PACKAGE_CATEGORIES: SyntheticHistoricalDecisionPackageCategory[] = [
  "historical_decision_package",
  "audit_historical_decision_package",
  "controller_historical_decision_package",
  "evidence_historical_decision_package",
  "package_lineage_historical_decision_package",
  "governance_historical_decision_package",
  "cross_period_historical_decision_package",
  "cross_entity_historical_decision_package",
  "cross_function_historical_decision_package",
];

export interface BuildHistoricalDecisionPackageInput {
  auditContract: SyntheticAuditContract | null;
  packageCategory: SyntheticHistoricalDecisionPackageCategory;
  historicalDecisionReferenceIds?: string[];
  decisionLineageReferenceIds?: string[];
  decisionEvidenceReferenceIds?: string[];
  decisionSourceReferenceIds?: string[];
  memoryObjects?: SyntheticMemoryObject[];
  memoryRelationships?: SyntheticMemoryRelationship[];
  evidenceLineageGraphs?: SyntheticEvidenceLineageGraph[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  governanceMetadataReferences?: SyntheticAuditGovernanceMetadata[];
  auditArtifactReferences?: SyntheticMemoryObjectSourceArtifact[];
  packageLineageReferences?: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations?: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations?: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations?: SyntheticMemoryObjectSourceArtifact[];
}

export interface SyntheticHistoricalDecisionPackage {
  historicalDecisionPackageId: string;
  historicalDecisionPackageKey: string;
  packageCategory: SyntheticHistoricalDecisionPackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  historicalDecisionReferenceIds: string[];
  decisionLineageReferenceIds: string[];
  decisionEvidenceReferenceIds: string[];
  decisionSourceReferenceIds: string[];
  memoryObjectIds: string[];
  memoryRelationshipIds: string[];
  evidenceLineageGraphIds: string[];
  organizationalMemoryPackageIds: string[];
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
  memoryObjects: SyntheticMemoryObject[];
  memoryRelationships: SyntheticMemoryRelationship[];
  evidenceLineageGraphs: SyntheticEvidenceLineageGraph[];
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  governanceMetadataReferences: SyntheticAuditGovernanceMetadata[];
  auditArtifactReferences: SyntheticMemoryObjectSourceArtifact[];
  packageLineageReferences: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations: SyntheticMemoryObjectSourceArtifact[];
  warnings: string[];
}

export interface BuildHistoricalDecisionPackageResult {
  historicalDecisionPackage: SyntheticHistoricalDecisionPackage | null;
  skipped: boolean;
  warnings: string[];
}

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

function isSupportedPackageCategory(packageCategory: SyntheticHistoricalDecisionPackageCategory): boolean {
  return SYNTHETIC_HISTORICAL_DECISION_PACKAGE_CATEGORIES.includes(packageCategory);
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

function getMemoryObjects(input: BuildHistoricalDecisionPackageInput): SyntheticMemoryObject[] {
  return getInputArray(input.memoryObjects);
}

function getMemoryRelationships(input: BuildHistoricalDecisionPackageInput): SyntheticMemoryRelationship[] {
  return getInputArray(input.memoryRelationships);
}

function getEvidenceLineageGraphs(input: BuildHistoricalDecisionPackageInput): SyntheticEvidenceLineageGraph[] {
  return getInputArray(input.evidenceLineageGraphs);
}

function getOrganizationalMemoryPackages(input: BuildHistoricalDecisionPackageInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getReferenceArtifacts(input: BuildHistoricalDecisionPackageInput): SyntheticMemoryObjectSourceArtifact[] {
  return [
    ...getInputArray(input.auditArtifactReferences),
    ...getInputArray(input.packageLineageReferences),
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getAllMemoryArtifacts(
  input: BuildHistoricalDecisionPackageInput,
): Array<SyntheticMemoryObject | SyntheticMemoryRelationship | SyntheticEvidenceLineageGraph | SyntheticOrganizationalMemoryPackage> {
  return [
    ...getMemoryObjects(input),
    ...getMemoryRelationships(input),
    ...getEvidenceLineageGraphs(input),
    ...getOrganizationalMemoryPackages(input),
  ];
}

function getReferenceIds(input: BuildHistoricalDecisionPackageInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, singularName),
      ...getStringArrayProperty(referenceArtifact, arrayName),
    ]),
    ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => [
      ...getStringProperty(memoryArtifact, singularName),
      ...getStringArrayProperty(memoryArtifact, arrayName),
    ]),
  ]);
}

function getHistoricalDecisionReferenceIds(input: BuildHistoricalDecisionPackageInput): string[] {
  return uniqueStable(getInputArray(input.historicalDecisionReferenceIds));
}

function getDecisionLineageReferenceIds(input: BuildHistoricalDecisionPackageInput): string[] {
  return uniqueStable([
    ...getInputArray(input.decisionLineageReferenceIds),
    ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.lineageReferenceIds),
  ]);
}

function getDecisionEvidenceReferenceIds(input: BuildHistoricalDecisionPackageInput): string[] {
  return uniqueStable([
    ...getInputArray(input.decisionEvidenceReferenceIds),
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.evidenceReferenceIds),
  ]);
}

function getDecisionSourceReferenceIds(input: BuildHistoricalDecisionPackageInput): string[] {
  return uniqueStable([
    ...getInputArray(input.decisionSourceReferenceIds),
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.sourceReferenceIds),
  ]);
}

function getMemoryObjectIds(input: BuildHistoricalDecisionPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.supportingMemoryIds ?? []),
    ...getMemoryObjects(input).map((memoryObject) => memoryObject.memoryObjectId),
    ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.memoryObjectIds),
    ...getEvidenceLineageGraphs(input).flatMap((evidenceLineageGraph) => evidenceLineageGraph.memoryObjectIds),
    ...getOrganizationalMemoryPackages(input).flatMap((organizationalMemoryPackage) => organizationalMemoryPackage.memoryObjectIds),
  ]);
}

function getMemoryRelationshipIds(input: BuildHistoricalDecisionPackageInput): string[] {
  return uniqueStable([
    ...getMemoryRelationships(input).map((memoryRelationship) => memoryRelationship.memoryRelationshipId),
    ...getEvidenceLineageGraphs(input).flatMap((evidenceLineageGraph) => evidenceLineageGraph.memoryRelationshipIds),
    ...getOrganizationalMemoryPackages(input).flatMap((organizationalMemoryPackage) => organizationalMemoryPackage.memoryRelationshipIds),
  ]);
}

function getEvidenceLineageGraphIds(input: BuildHistoricalDecisionPackageInput): string[] {
  return uniqueStable([
    ...getEvidenceLineageGraphs(input).map((evidenceLineageGraph) => evidenceLineageGraph.evidenceLineageGraphId),
    ...getOrganizationalMemoryPackages(input).flatMap((organizationalMemoryPackage) => organizationalMemoryPackage.evidenceLineageGraphIds),
  ]);
}

function getOrganizationalMemoryPackageIds(input: BuildHistoricalDecisionPackageInput): string[] {
  return uniqueStable(
    getOrganizationalMemoryPackages(input).map((organizationalMemoryPackage) => organizationalMemoryPackage.organizationalMemoryPackageId),
  );
}

function getUpstreamObservationIds(input: BuildHistoricalDecisionPackageInput): string[] {
  return uniqueStable([
    input.auditContract?.observationMetadata?.auditObservationId,
    ...(input.auditContract?.evidence.supportingObservationIds ?? []),
    ...getReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "observationId"),
      ...(referenceArtifact.upstreamObservationIds ?? []),
    ]),
    ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.upstreamObservationIds),
  ].filter((value): value is string => value !== undefined));
}

function getUpstreamPackageIds(input: BuildHistoricalDecisionPackageInput): string[] {
  return uniqueStable([
    ...getReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "packageId"),
      ...(referenceArtifact.upstreamPackageIds ?? []),
    ]),
    ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.upstreamPackageIds),
  ]);
}

function getAuditContractReferenceIds(input: BuildHistoricalDecisionPackageInput): string[] {
  const auditContract = input.auditContract;
  return uniqueStable([
    auditContract?.observationMetadata?.auditObservationId,
    auditContract?.findingMetadata?.auditFindingId,
    auditContract?.exceptionMetadata?.auditExceptionId,
    auditContract?.riskMetadata?.auditRiskId,
    ...(auditContract?.evidence.sourceReferenceIds ?? []),
    ...(auditContract?.evidence.lineageReferenceIds ?? []),
    ...getReferenceArtifacts(input).flatMap((referenceArtifact) => referenceArtifact.auditContractReferenceIds ?? []),
    ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.auditContractReferenceIds),
  ].filter((value): value is string => value !== undefined));
}

function buildHistoricalDecisionPackageKey(input: BuildHistoricalDecisionPackageInput): string {
  const scope = input.auditContract?.scope;

  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    companyId: scope?.companyId ?? null,
    scope: scope ?? null,
    customerIsolation: scope ? buildCustomerIsolation(scope) : null,
    firmIsolation: scope ? buildFirmIsolation(scope) : null,
    clientIsolation: scope ? buildClientIsolation(scope) : null,
    historicalDecisionReferenceIds: getHistoricalDecisionReferenceIds(input),
    decisionLineageReferenceIds: getDecisionLineageReferenceIds(input),
    decisionEvidenceReferenceIds: getDecisionEvidenceReferenceIds(input),
    decisionSourceReferenceIds: getDecisionSourceReferenceIds(input),
    memoryObjectIds: getMemoryObjectIds(input),
    memoryRelationshipIds: getMemoryRelationshipIds(input),
    evidenceLineageGraphIds: getEvidenceLineageGraphIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
  });
}

function buildHistoricalDecisionPackageId(input: BuildHistoricalDecisionPackageInput): string {
  return `synthetic-historical-decision-package:${stableSnapshotHash({
    historicalDecisionPackageKey: buildHistoricalDecisionPackageKey(input),
    packageCategory: input.packageCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
  })}`;
}

function getMaterialityMetadata(input: BuildHistoricalDecisionPackageInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getReferenceArtifacts(input).flatMap((referenceArtifact) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityCompatibility"),
    ]),
    ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => [
      ...memoryArtifact.materialityMetadata,
      ...memoryArtifact.materialityCompatibility,
    ]),
  ]);
}

function getGovernanceMetadata(input: BuildHistoricalDecisionPackageInput): SyntheticAuditGovernanceMetadata[] {
  return compactDefined([
    input.auditContract?.governanceMetadata,
    ...getInputArray(input.governanceMetadataReferences),
    ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
      getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(referenceArtifact, "governanceMetadata"),
    ),
    ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.governanceMetadata),
  ]);
}

function getForwardCompatibilityWarnings(input: BuildHistoricalDecisionPackageInput): string[] {
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

function validateInput(input: BuildHistoricalDecisionPackageInput): string[] {
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
    ["auditArtifactReferences", getInputArray(input.auditArtifactReferences)],
    ["packageLineageReferences", getInputArray(input.packageLineageReferences)],
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

  getMemoryObjects(input).forEach((memoryObject, index) => {
    if (!hasValue(memoryObject.memoryObjectId)) warnings.push(`memoryObjects[${index}].memoryObjectId is required.`);
    if (!hasValue(memoryObject.memoryObjectKey)) warnings.push(`memoryObjects[${index}].memoryObjectKey is required.`);
    if (memoryObject.companyId !== companyId) warnings.push(`memoryObjects[${index}].companyId must equal scope.companyId.`);
  });

  getMemoryRelationships(input).forEach((memoryRelationship, index) => {
    if (!hasValue(memoryRelationship.memoryRelationshipId)) {
      warnings.push(`memoryRelationships[${index}].memoryRelationshipId is required.`);
    }
    if (!hasValue(memoryRelationship.memoryRelationshipKey)) {
      warnings.push(`memoryRelationships[${index}].memoryRelationshipKey is required.`);
    }
    if (memoryRelationship.companyId !== companyId) warnings.push(`memoryRelationships[${index}].companyId must equal scope.companyId.`);
  });

  getEvidenceLineageGraphs(input).forEach((evidenceLineageGraph, index) => {
    if (!hasValue(evidenceLineageGraph.evidenceLineageGraphId)) {
      warnings.push(`evidenceLineageGraphs[${index}].evidenceLineageGraphId is required.`);
    }
    if (!hasValue(evidenceLineageGraph.evidenceLineageGraphKey)) {
      warnings.push(`evidenceLineageGraphs[${index}].evidenceLineageGraphKey is required.`);
    }
    if (evidenceLineageGraph.companyId !== companyId) warnings.push(`evidenceLineageGraphs[${index}].companyId must equal scope.companyId.`);
  });

  getOrganizationalMemoryPackages(input).forEach((organizationalMemoryPackage, index) => {
    if (!hasValue(organizationalMemoryPackage.organizationalMemoryPackageId)) {
      warnings.push(`organizationalMemoryPackages[${index}].organizationalMemoryPackageId is required.`);
    }
    if (!hasValue(organizationalMemoryPackage.organizationalMemoryPackageKey)) {
      warnings.push(`organizationalMemoryPackages[${index}].organizationalMemoryPackageKey is required.`);
    }
    if (organizationalMemoryPackage.companyId !== companyId) {
      warnings.push(`organizationalMemoryPackages[${index}].companyId must equal scope.companyId.`);
    }
  });

  return warnings;
}

export function buildHistoricalDecisionPackage(input: BuildHistoricalDecisionPackageInput): BuildHistoricalDecisionPackageResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      historicalDecisionPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const historicalDecisionReferenceIds = getHistoricalDecisionReferenceIds(input);
  const decisionLineageReferenceIds = getDecisionLineageReferenceIds(input);
  const decisionEvidenceReferenceIds = getDecisionEvidenceReferenceIds(input);
  const decisionSourceReferenceIds = getDecisionSourceReferenceIds(input);
  const memoryObjectIds = getMemoryObjectIds(input);
  const memoryRelationshipIds = getMemoryRelationshipIds(input);
  const evidenceLineageGraphIds = getEvidenceLineageGraphIds(input);
  const organizationalMemoryPackageIds = getOrganizationalMemoryPackageIds(input);
  const materialityMetadata = getMaterialityMetadata(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    historicalDecisionPackage: {
      historicalDecisionPackageId: buildHistoricalDecisionPackageId(input),
      historicalDecisionPackageKey: buildHistoricalDecisionPackageKey(input),
      packageCategory: input.packageCategory,
      companyId: auditContract.scope.companyId,
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      historicalDecisionReferenceIds,
      decisionLineageReferenceIds,
      decisionEvidenceReferenceIds,
      decisionSourceReferenceIds,
      memoryObjectIds,
      memoryRelationshipIds,
      evidenceLineageGraphIds,
      organizationalMemoryPackageIds,
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
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditObservationMetadata>(referenceArtifact, "observationMetadata"),
        ),
        ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.observationMetadata),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditFindingMetadata>(referenceArtifact, "findingMetadata"),
        ),
        ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.findingMetadata),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditExceptionMetadata>(referenceArtifact, "exceptionMetadata"),
        ),
        ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.exceptionMetadata),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditRiskMetadata>(referenceArtifact, "riskMetadata"),
        ),
        ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.riskMetadata),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditTrustMetadata>(referenceArtifact, "trustMetadata"),
        ),
        ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.trustMetadata),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(referenceArtifact, "confidenceMetadata"),
        ),
        ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.confidenceMetadata),
      ]),
      governanceMetadata: getGovernanceMetadata(input),
      materialityMetadata,
      materialityCompatibility: materialityMetadata,
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(referenceArtifact, "personaCompatibility"),
        ),
        ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(referenceArtifact, "packageCompatibility"),
        ),
        ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(referenceArtifact, "memoryCompatibility"),
        ),
        ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(referenceArtifact, "learningCompatibility"),
        ),
        ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...getReferenceArtifacts(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(referenceArtifact, "surfaceCompatibility"),
        ),
        ...getAllMemoryArtifacts(input).flatMap((memoryArtifact) => memoryArtifact.surfaceCompatibility),
      ]),
      memoryObjects: getMemoryObjects(input),
      memoryRelationships: getMemoryRelationships(input),
      evidenceLineageGraphs: getEvidenceLineageGraphs(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      governanceMetadataReferences: getInputArray(input.governanceMetadataReferences),
      auditArtifactReferences: getInputArray(input.auditArtifactReferences),
      packageLineageReferences: getInputArray(input.packageLineageReferences),
      healthcarePpdObservations: getInputArray(input.healthcarePpdObservations),
      payrollObservations: getInputArray(input.payrollObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
