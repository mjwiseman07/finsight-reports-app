import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticKnowledgeConfidenceFloorMetadata,
  SyntheticMethodologyDerivationMethod,
  SyntheticMethodologyStaleMarker,
} from "../contracts";
import type { SyntheticHistoricalKnowledgePackage } from "../historical-knowledge-package";
import type { SyntheticMethodologyObject, SyntheticMethodologyRelationship } from "../methodology-object";
import type { SyntheticOrganizationalKnowledgePackage } from "../organizational-knowledge-package";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditLearningCompatibility,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditMemoryCompatibility,
  SyntheticAuditPackageCompatibility,
  SyntheticAuditPersonaCompatibility,
  SyntheticAuditScope,
  SyntheticAuditSurfaceCompatibility,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticMemoryPreservationPackage } from "../../organizational-memory/memory-preservation-package";
import type { SyntheticOrganizationalMemoryArchive } from "../../organizational-memory/organizational-memory-archive";
import type { SyntheticOrganizationalMemoryGraph } from "../../organizational-memory/organizational-memory-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../../organizational-memory/organizational-memory-package";

export type SyntheticHistoricalMethodologyPackageCategory =
  | "historical_methodology_package"
  | "historical_procedure_methodology_package"
  | "historical_approach_methodology_package"
  | "historical_review_methodology_package"
  | "historical_operating_methodology_package"
  | "historical_lineage_methodology_package";

export const SYNTHETIC_HISTORICAL_METHODOLOGY_PACKAGE_CATEGORIES: SyntheticHistoricalMethodologyPackageCategory[] = [
  "historical_methodology_package",
  "historical_procedure_methodology_package",
  "historical_approach_methodology_package",
  "historical_review_methodology_package",
  "historical_operating_methodology_package",
  "historical_lineage_methodology_package",
];

export interface BuildHistoricalMethodologyPackageInput {
  packageCategory: SyntheticHistoricalMethodologyPackageCategory;
  methodologyObjects?: SyntheticMethodologyObject[];
  methodologyRelationships?: SyntheticMethodologyRelationship[];
  historicalKnowledgePackages?: SyntheticHistoricalKnowledgePackage[];
  organizationalKnowledgePackages?: SyntheticOrganizationalKnowledgePackage[];
  memoryPreservationPackages?: SyntheticMemoryPreservationPackage[];
  organizationalMemoryArchives?: SyntheticOrganizationalMemoryArchive[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface SyntheticHistoricalMethodologyPackage {
  historicalMethodologyPackageId: string;
  historicalMethodologyPackageKey: string;
  packageCategory: SyntheticHistoricalMethodologyPackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  methodologyObjectIds: string[];
  methodologyRelationshipIds: string[];
  methodologyVersion: string[];
  methodologyAncestryIds: string[];
  methodologyDerivationMethod: SyntheticMethodologyDerivationMethod[];
  methodologyDerivationHash: string[];
  supersedesMethodologyIds: string[];
  supersededByMethodologyIds: string[];
  methodologyStaleMarker: SyntheticMethodologyStaleMarker[];
  methodologyStalenessReasonReferenceIds: string[];
  methodologyLineageReferenceIds: string[];
  methodologyEvidenceReferenceIds: string[];
  methodologySourceReferenceIds: string[];
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  upstreamObservationIds: string[];
  upstreamPackageIds: string[];
  historicalKnowledgePackageIds: string[];
  organizationalKnowledgePackageIds: string[];
  memoryPreservationPackageIds: string[];
  organizationalMemoryArchiveIds: string[];
  organizationalMemoryPackageIds: string[];
  organizationalMemoryGraphIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  healthcarePpdObservationIds: string[];
  payrollObservationIds: string[];
  methodologyObservationIds: string[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
  personaCompatibility: SyntheticAuditPersonaCompatibility[];
  packageCompatibility: SyntheticAuditPackageCompatibility[];
  memoryCompatibility: SyntheticAuditMemoryCompatibility[];
  learningCompatibility: SyntheticAuditLearningCompatibility[];
  surfaceCompatibility: SyntheticAuditSurfaceCompatibility[];
  executable: false;
  actionReady: false;
  workflowReady: false;
  phase38Required: true;
  methodologyObjects: SyntheticMethodologyObject[];
  methodologyRelationships: SyntheticMethodologyRelationship[];
  historicalKnowledgePackages: SyntheticHistoricalKnowledgePackage[];
  organizationalKnowledgePackages: SyntheticOrganizationalKnowledgePackage[];
  memoryPreservationPackages: SyntheticMemoryPreservationPackage[];
  organizationalMemoryArchives: SyntheticOrganizationalMemoryArchive[];
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  warnings: string[];
}

export interface BuildHistoricalMethodologyPackageResult {
  historicalMethodologyPackage: SyntheticHistoricalMethodologyPackage | null;
  skipped: boolean;
  warnings: string[];
}

type HistoricalMethodologySourceArtifact =
  | SyntheticMethodologyObject
  | SyntheticMethodologyRelationship
  | SyntheticHistoricalKnowledgePackage
  | SyntheticOrganizationalKnowledgePackage
  | SyntheticMemoryPreservationPackage
  | SyntheticOrganizationalMemoryArchive
  | SyntheticOrganizationalMemoryPackage
  | SyntheticOrganizationalMemoryGraph;

type ReferenceRecord = Record<string, unknown>;

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getStringProperty(value: object, propertyName: string): string[] {
  const property = (value as ReferenceRecord)[propertyName];
  return typeof property === "string" ? [property] : [];
}

function getStringArrayProperty(value: object, propertyName: string): string[] {
  const property = (value as ReferenceRecord)[propertyName];
  return Array.isArray(property) ? property.filter((item): item is string => typeof item === "string") : [];
}

function getObjectArrayProperty<T>(value: object, propertyName: string): T[] {
  const property = (value as ReferenceRecord)[propertyName];
  return Array.isArray(property) ? (property as T[]) : [];
}

function isSupportedPackageCategory(packageCategory: SyntheticHistoricalMethodologyPackageCategory): boolean {
  return SYNTHETIC_HISTORICAL_METHODOLOGY_PACKAGE_CATEGORIES.includes(packageCategory);
}

function getMethodologyObjects(input: BuildHistoricalMethodologyPackageInput): SyntheticMethodologyObject[] {
  return getInputArray(input.methodologyObjects);
}

function getMethodologyRelationships(input: BuildHistoricalMethodologyPackageInput): SyntheticMethodologyRelationship[] {
  return getInputArray(input.methodologyRelationships);
}

function getHistoricalKnowledgePackages(input: BuildHistoricalMethodologyPackageInput): SyntheticHistoricalKnowledgePackage[] {
  return getInputArray(input.historicalKnowledgePackages);
}

function getOrganizationalKnowledgePackages(input: BuildHistoricalMethodologyPackageInput): SyntheticOrganizationalKnowledgePackage[] {
  return getInputArray(input.organizationalKnowledgePackages);
}

function getMemoryPreservationPackages(input: BuildHistoricalMethodologyPackageInput): SyntheticMemoryPreservationPackage[] {
  return getInputArray(input.memoryPreservationPackages);
}

function getOrganizationalMemoryArchives(input: BuildHistoricalMethodologyPackageInput): SyntheticOrganizationalMemoryArchive[] {
  return getInputArray(input.organizationalMemoryArchives);
}

function getOrganizationalMemoryPackages(input: BuildHistoricalMethodologyPackageInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getOrganizationalMemoryGraphs(input: BuildHistoricalMethodologyPackageInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getSourceArtifacts(input: BuildHistoricalMethodologyPackageInput): HistoricalMethodologySourceArtifact[] {
  return [
    ...getMethodologyObjects(input),
    ...getMethodologyRelationships(input),
    ...getHistoricalKnowledgePackages(input),
    ...getOrganizationalKnowledgePackages(input),
    ...getMemoryPreservationPackages(input),
    ...getOrganizationalMemoryArchives(input),
    ...getOrganizationalMemoryPackages(input),
    ...getOrganizationalMemoryGraphs(input),
  ];
}

function getPackageScope(input: BuildHistoricalMethodologyPackageInput): SyntheticAuditScope | null {
  return getSourceArtifacts(input)[0]?.scope ?? null;
}

function getPackageCustomerIsolation(input: BuildHistoricalMethodologyPackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.customerIsolation ?? null;
}

function getPackageFirmIsolation(input: BuildHistoricalMethodologyPackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.firmIsolation ?? null;
}

function getPackageClientIsolation(input: BuildHistoricalMethodologyPackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.clientIsolation ?? null;
}

function getMethodologyObjectIds(input: BuildHistoricalMethodologyPackageInput): string[] {
  return [
    ...getMethodologyObjects(input).map((artifact) => artifact.methodologyObjectId),
    ...getMethodologyRelationships(input).flatMap((artifact) => [
      artifact.sourceMethodologyObjectId,
      artifact.targetMethodologyObjectId,
    ]),
    ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.methodologyObjectIds),
  ].filter(hasValue) as string[];
}

function getMethodologyRelationshipIds(input: BuildHistoricalMethodologyPackageInput): string[] {
  return [
    ...getMethodologyRelationships(input).map((artifact) => artifact.methodologyRelationshipId),
    ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.methodologyRelationshipIds),
  ].filter(hasValue) as string[];
}

function getHistoricalKnowledgePackageIds(input: BuildHistoricalMethodologyPackageInput): string[] {
  return getHistoricalKnowledgePackages(input).map((artifact) => artifact.historicalKnowledgePackageId).filter(hasValue);
}

function getOrganizationalKnowledgePackageIds(input: BuildHistoricalMethodologyPackageInput): string[] {
  return [
    ...getOrganizationalKnowledgePackages(input).map((artifact) => artifact.organizationalKnowledgePackageId),
    ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.organizationalKnowledgePackageIds),
  ].filter(hasValue) as string[];
}

function getMemoryPreservationPackageIds(input: BuildHistoricalMethodologyPackageInput): string[] {
  return [
    ...getMemoryPreservationPackages(input).map((artifact) => artifact.memoryPreservationPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "memoryPreservationPackageIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryArchiveIds(input: BuildHistoricalMethodologyPackageInput): string[] {
  return [
    ...getOrganizationalMemoryArchives(input).map((artifact) => artifact.organizationalMemoryArchiveId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryArchiveIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryPackageIds(input: BuildHistoricalMethodologyPackageInput): string[] {
  return [
    ...getOrganizationalMemoryPackages(input).map((artifact) => artifact.organizationalMemoryPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryPackageIds")),
    ...getMethodologyObjects(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
    ...getMethodologyRelationships(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryGraphIds(input: BuildHistoricalMethodologyPackageInput): string[] {
  return [
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
  ].filter(hasValue) as string[];
}

function getReferenceIds(input: BuildHistoricalMethodologyPackageInput, singularName: string, arrayName: string): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, singularName)),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function getMethodologyLineageReferenceIds(input: BuildHistoricalMethodologyPackageInput): string[] {
  return [
    ...getReferenceIds(input, "methodologyLineageReferenceId", "methodologyLineageReferenceIds"),
    ...getReferenceIds(input, "lineageReferenceId", "lineageReferenceIds"),
    ...getReferenceIds(input, "preservationLineageReferenceId", "preservationLineageReferenceIds"),
    ...getReferenceIds(input, "archiveLineageReferenceId", "archiveLineageReferenceIds"),
  ];
}

function getMethodologyEvidenceReferenceIds(input: BuildHistoricalMethodologyPackageInput): string[] {
  return [
    ...getReferenceIds(input, "methodologyEvidenceReferenceId", "methodologyEvidenceReferenceIds"),
    ...getReferenceIds(input, "evidenceReferenceId", "evidenceReferenceIds"),
  ];
}

function getMethodologySourceReferenceIds(input: BuildHistoricalMethodologyPackageInput): string[] {
  return [
    ...getReferenceIds(input, "methodologySourceReferenceId", "methodologySourceReferenceIds"),
    ...getReferenceIds(input, "sourceReferenceId", "sourceReferenceIds"),
  ];
}

function buildHistoricalMethodologyPackageKey(input: BuildHistoricalMethodologyPackageInput): string {
  const scope = getPackageScope(input);
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    companyId: scope?.companyId ?? null,
    scope,
    customerIsolation: getPackageCustomerIsolation(input),
    firmIsolation: getPackageFirmIsolation(input),
    clientIsolation: getPackageClientIsolation(input),
    methodologyObjectIds: getMethodologyObjectIds(input),
    methodologyRelationshipIds: getMethodologyRelationshipIds(input),
    historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    memoryPreservationPackageIds: getMemoryPreservationPackageIds(input),
    organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
  });
}

function buildHistoricalMethodologyPackageId(input: BuildHistoricalMethodologyPackageInput): string {
  return `synthetic-historical-methodology-package:${stableSnapshotHash({
    historicalMethodologyPackageKey: buildHistoricalMethodologyPackageKey(input),
    packageCategory: input.packageCategory,
    companyId: getPackageScope(input)?.companyId ?? null,
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildHistoricalMethodologyPackageInput): string[] {
  return [
    ...(getInputArray(input.healthcarePpdObservationIds).length > 0
      ? ["healthcare PPD observation ids are forward-compatible references."]
      : []),
    ...(getInputArray(input.payrollObservationIds).length > 0 ? ["payroll observation ids are forward-compatible references."] : []),
    ...(getInputArray(input.methodologyObservationIds).length > 0
      ? ["methodology observation ids are Phase 37 reference-only inputs."]
      : []),
  ];
}

function validateInput(input: BuildHistoricalMethodologyPackageInput): string[] {
  const warnings: string[] = [];
  const sourceArtifacts = getSourceArtifacts(input);
  const scope = getPackageScope(input);
  const companyId = scope?.companyId;

  if (!hasValue(input.packageCategory)) warnings.push("packageCategory is required.");
  if (!isSupportedPackageCategory(input.packageCategory)) warnings.push("packageCategory must be supported.");
  if (sourceArtifacts.length === 0) warnings.push("at least one historical methodology source artifact is required.");
  if (!scope) warnings.push("source scope is required.");
  if (!companyId) warnings.push("source companyId is required.");
  if (!getPackageCustomerIsolation(input)) warnings.push("customerIsolation is required.");
  if (!getPackageFirmIsolation(input)) warnings.push("firmIsolation is required.");
  if (!getPackageClientIsolation(input)) warnings.push("clientIsolation is required.");
  if (getMethodologyObjectIds(input).length === 0) warnings.push("at least one methodologyObjectId is required.");

  sourceArtifacts.forEach((artifact, index) => {
    if (!hasValue(artifact.companyId)) warnings.push(`sourceArtifacts[${index}].companyId is required.`);
    if (companyId && artifact.companyId !== companyId) warnings.push(`sourceArtifacts[${index}].companyId must equal source companyId.`);
  });

  for (const [inputName, values, idName, keyName] of [
    ["methodologyObjects", getMethodologyObjects(input), "methodologyObjectId", "methodologyObjectKey"],
    ["methodologyRelationships", getMethodologyRelationships(input), "methodologyRelationshipId", "methodologyRelationshipKey"],
    ["historicalKnowledgePackages", getHistoricalKnowledgePackages(input), "historicalKnowledgePackageId", "historicalKnowledgePackageKey"],
    ["organizationalKnowledgePackages", getOrganizationalKnowledgePackages(input), "organizationalKnowledgePackageId", "organizationalKnowledgePackageKey"],
    ["memoryPreservationPackages", getMemoryPreservationPackages(input), "memoryPreservationPackageId", "memoryPreservationPackageKey"],
    ["organizationalMemoryArchives", getOrganizationalMemoryArchives(input), "organizationalMemoryArchiveId", "organizationalMemoryArchiveKey"],
    ["organizationalMemoryPackages", getOrganizationalMemoryPackages(input), "organizationalMemoryPackageId", "organizationalMemoryPackageKey"],
    ["organizationalMemoryGraphs", getOrganizationalMemoryGraphs(input), "organizationalMemoryGraphId", "organizationalMemoryGraphKey"],
  ] as const) {
    values.forEach((artifact, index) => {
      if (!hasValue((artifact as unknown as ReferenceRecord)[idName])) warnings.push(`${inputName}[${index}].${idName} is required.`);
      if (!hasValue((artifact as unknown as ReferenceRecord)[keyName])) warnings.push(`${inputName}[${index}].${keyName} is required.`);
    });
  }

  return warnings;
}

export function buildHistoricalMethodologyPackage(
  input: BuildHistoricalMethodologyPackageInput,
): BuildHistoricalMethodologyPackageResult {
  const fatalWarnings = validateInput(input);
  const scope = getPackageScope(input);
  const customerIsolation = getPackageCustomerIsolation(input);
  const firmIsolation = getPackageFirmIsolation(input);
  const clientIsolation = getPackageClientIsolation(input);

  if (fatalWarnings.length > 0 || !scope || !customerIsolation || !firmIsolation || !clientIsolation) {
    return {
      historicalMethodologyPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceArtifacts = getSourceArtifacts(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    historicalMethodologyPackage: {
      historicalMethodologyPackageId: buildHistoricalMethodologyPackageId(input),
      historicalMethodologyPackageKey: buildHistoricalMethodologyPackageKey(input),
      packageCategory: input.packageCategory,
      companyId: scope.companyId,
      scope,
      customerIsolation,
      firmIsolation,
      clientIsolation,
      methodologyObjectIds: getMethodologyObjectIds(input),
      methodologyRelationshipIds: getMethodologyRelationshipIds(input),
      methodologyVersion: [
        ...getMethodologyObjects(input).map((artifact) => artifact.methodologyVersion),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.methodologyVersion),
      ],
      methodologyAncestryIds: [
        ...getMethodologyObjects(input).flatMap((artifact) => artifact.methodologyAncestryIds),
        ...getMethodologyRelationships(input).flatMap((artifact) => artifact.methodologyAncestryIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.methodologyAncestryIds),
      ],
      methodologyDerivationMethod: [
        ...getMethodologyObjects(input).map((artifact) => artifact.methodologyDerivationMethod),
        ...getMethodologyRelationships(input).map((artifact) => artifact.methodologyDerivationMethod),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.methodologyDerivationMethod),
      ],
      methodologyDerivationHash: [
        ...getMethodologyObjects(input).map((artifact) => artifact.methodologyDerivationHash),
        ...getMethodologyRelationships(input).map((artifact) => artifact.methodologyDerivationHash),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.methodologyDerivationHash),
      ],
      supersedesMethodologyIds: [
        ...getMethodologyObjects(input).flatMap((artifact) => artifact.supersedesMethodologyIds),
        ...getMethodologyRelationships(input).flatMap((artifact) => artifact.supersedesMethodologyIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.supersedesMethodologyIds),
      ],
      supersededByMethodologyIds: [
        ...getMethodologyObjects(input).flatMap((artifact) => artifact.supersededByMethodologyIds),
        ...getMethodologyRelationships(input).flatMap((artifact) => artifact.supersededByMethodologyIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.supersededByMethodologyIds),
      ],
      methodologyStaleMarker: [
        ...getMethodologyObjects(input).map((artifact) => artifact.methodologyStaleMarker),
        ...getMethodologyRelationships(input).map((artifact) => artifact.methodologyStaleMarker),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.methodologyStaleMarker),
      ],
      methodologyStalenessReasonReferenceIds: [
        ...getMethodologyObjects(input).flatMap((artifact) => artifact.methodologyStalenessReasonReferenceIds),
        ...getMethodologyRelationships(input).flatMap((artifact) => artifact.methodologyStalenessReasonReferenceIds),
      ],
      methodologyLineageReferenceIds: getMethodologyLineageReferenceIds(input),
      methodologyEvidenceReferenceIds: getMethodologyEvidenceReferenceIds(input),
      methodologySourceReferenceIds: getMethodologySourceReferenceIds(input),
      confidenceFloorMetadata: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticKnowledgeConfidenceFloorMetadata>(artifact, "confidenceFloorMetadata"),
      ),
      sourceConfidenceReferenceIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "sourceConfidenceReferenceIds")),
      evidenceReferenceIds: getReferenceIds(input, "evidenceReferenceId", "evidenceReferenceIds"),
      sourceReferenceIds: getReferenceIds(input, "sourceReferenceId", "sourceReferenceIds"),
      lineageReferenceIds: getReferenceIds(input, "lineageReferenceId", "lineageReferenceIds"),
      upstreamObservationIds: getReferenceIds(input, "upstreamObservationId", "upstreamObservationIds"),
      upstreamPackageIds: getReferenceIds(input, "upstreamPackageId", "upstreamPackageIds"),
      historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
      organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
      memoryPreservationPackageIds: getMemoryPreservationPackageIds(input),
      organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
      organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
      organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
      auditContractReferenceIds: getReferenceIds(input, "auditContractReferenceId", "auditContractReferenceIds"),
      auditCandidateIds: getReferenceIds(input, "auditCandidateId", "auditCandidateIds"),
      auditEvidencePackageIds: getReferenceIds(input, "auditEvidencePackageId", "auditEvidencePackageIds"),
      auditFindingArtifactIds: getReferenceIds(input, "auditFindingArtifactId", "auditFindingArtifactIds"),
      auditConfidenceIds: getReferenceIds(input, "auditConfidenceId", "auditConfidenceIds"),
      auditSurfaceIds: getReferenceIds(input, "auditSurfaceId", "auditSurfaceIds"),
      auditWatchlistIds: getReferenceIds(input, "auditWatchlistId", "auditWatchlistIds"),
      auditBriefingIds: getReferenceIds(input, "auditBriefingId", "auditBriefingIds"),
      healthcarePpdObservationIds: getInputArray(input.healthcarePpdObservationIds),
      payrollObservationIds: getInputArray(input.payrollObservationIds),
      methodologyObservationIds: getInputArray(input.methodologyObservationIds),
      trustMetadata: sourceArtifacts.flatMap((artifact) => artifact.trustMetadata),
      confidenceMetadata: sourceArtifacts.flatMap((artifact) => artifact.confidenceMetadata),
      governanceMetadata: sourceArtifacts.flatMap((artifact) => artifact.governanceMetadata),
      materialityMetadata: sourceArtifacts.flatMap((artifact) => artifact.materialityMetadata),
      personaCompatibility: sourceArtifacts.flatMap((artifact) => artifact.personaCompatibility),
      packageCompatibility: sourceArtifacts.flatMap((artifact) => artifact.packageCompatibility),
      memoryCompatibility: sourceArtifacts.flatMap((artifact) => artifact.memoryCompatibility),
      learningCompatibility: sourceArtifacts.flatMap((artifact) => artifact.learningCompatibility),
      surfaceCompatibility: sourceArtifacts.flatMap((artifact) => artifact.surfaceCompatibility),
      executable: false,
      actionReady: false,
      workflowReady: false,
      phase38Required: true,
      methodologyObjects: getMethodologyObjects(input),
      methodologyRelationships: getMethodologyRelationships(input),
      historicalKnowledgePackages: getHistoricalKnowledgePackages(input),
      organizationalKnowledgePackages: getOrganizationalKnowledgePackages(input),
      memoryPreservationPackages: getMemoryPreservationPackages(input),
      organizationalMemoryArchives: getOrganizationalMemoryArchives(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
