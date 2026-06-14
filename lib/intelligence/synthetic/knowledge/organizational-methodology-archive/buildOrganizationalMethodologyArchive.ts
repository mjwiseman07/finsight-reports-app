import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticKnowledgeConfidenceFloorMetadata,
  SyntheticKnowledgeDerivationMethod,
  SyntheticMethodologyDerivationMethod,
  SyntheticMethodologyStaleMarker,
} from "../contracts/knowledgeContracts";
import type { SyntheticEnterpriseKnowledgePackage } from "../enterprise-knowledge-package";
import type { SyntheticHistoricalMethodologyPackage } from "../historical-methodology-package";
import type { SyntheticMethodologyObject, SyntheticMethodologyRelationship } from "../methodology-object";
import type { SyntheticOrganizationalKnowledgeGraph } from "../organizational-knowledge-graph";
import type { SyntheticOrganizationalKnowledgePackage } from "../organizational-knowledge-package";
import type { SyntheticPortfolioKnowledgePackage } from "../portfolio-knowledge-package";
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
import type { SyntheticOrganizationalMemoryArchive } from "../../organizational-memory/organizational-memory-archive";

export type SyntheticOrganizationalMethodologyArchiveCategory =
  | "organizational_methodology_archive"
  | "enterprise_methodology_archive"
  | "portfolio_methodology_archive"
  | "historical_methodology_archive"
  | "methodology_lineage_archive";

export const SYNTHETIC_ORGANIZATIONAL_METHODOLOGY_ARCHIVE_CATEGORIES: SyntheticOrganizationalMethodologyArchiveCategory[] = [
  "organizational_methodology_archive",
  "enterprise_methodology_archive",
  "portfolio_methodology_archive",
  "historical_methodology_archive",
  "methodology_lineage_archive",
];

export type SyntheticOrganizationalMethodologyArchiveStatus =
  | "archive_snapshot"
  | "archive_locked"
  | "archive_reference_only"
  | "archive_handoff_ready";

export const SYNTHETIC_ORGANIZATIONAL_METHODOLOGY_ARCHIVE_STATUSES: SyntheticOrganizationalMethodologyArchiveStatus[] = [
  "archive_snapshot",
  "archive_locked",
  "archive_reference_only",
  "archive_handoff_ready",
];

export interface BuildOrganizationalMethodologyArchiveInput {
  archiveCategory: SyntheticOrganizationalMethodologyArchiveCategory;
  archiveStatus: SyntheticOrganizationalMethodologyArchiveStatus;
  methodologyObjects?: SyntheticMethodologyObject[];
  methodologyRelationships?: SyntheticMethodologyRelationship[];
  historicalMethodologyPackages?: SyntheticHistoricalMethodologyPackage[];
  organizationalKnowledgePackages?: SyntheticOrganizationalKnowledgePackage[];
  organizationalKnowledgeGraphs?: SyntheticOrganizationalKnowledgeGraph[];
  enterpriseKnowledgePackages?: SyntheticEnterpriseKnowledgePackage[];
  portfolioKnowledgePackages?: SyntheticPortfolioKnowledgePackage[];
  organizationalMemoryArchives?: SyntheticOrganizationalMemoryArchive[];
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface SyntheticOrganizationalMethodologyArchive {
  organizationalMethodologyArchiveId: string;
  organizationalMethodologyArchiveKey: string;
  archiveCategory: SyntheticOrganizationalMethodologyArchiveCategory;
  archiveStatus: SyntheticOrganizationalMethodologyArchiveStatus;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  methodologyObjectIds: string[];
  methodologyRelationshipIds: string[];
  historicalMethodologyPackageIds: string[];
  organizationalKnowledgePackageIds: string[];
  organizationalKnowledgeGraphIds: string[];
  enterpriseKnowledgePackageIds: string[];
  portfolioKnowledgePackageIds: string[];
  organizationalMemoryArchiveIds: string[];
  methodologyVersion: string[];
  methodologyAncestryIds: string[];
  methodologyDerivationMethod: SyntheticMethodologyDerivationMethod[];
  methodologyDerivationHash: string[];
  supersedesMethodologyIds: string[];
  supersededByMethodologyIds: string[];
  methodologyStaleMarker: SyntheticMethodologyStaleMarker[];
  methodologyStalenessReasonReferenceIds: string[];
  derivationLineageIds: string[];
  derivationMethod: SyntheticKnowledgeDerivationMethod;
  derivationHash: string;
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  upstreamObservationIds: string[];
  upstreamPackageIds: string[];
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
  knowledgePackageHandle: string;
  methodologyPackageHandle: string;
  knowledgeGraphSnapshotHash: string;
  methodologySnapshotHash: string;
  sourceKnowledgeObjectIds: string[];
  sourceMethodologyObjectIds: string[];
  sourceMemoryObjectIds: string[];
  sourceEvidenceLineageGraphIds: string[];
  healthcarePpdObservationIds: string[];
  payrollObservationIds: string[];
  methodologyObservationIds: string[];
  methodologyObjects: SyntheticMethodologyObject[];
  methodologyRelationships: SyntheticMethodologyRelationship[];
  historicalMethodologyPackages: SyntheticHistoricalMethodologyPackage[];
  organizationalKnowledgePackages: SyntheticOrganizationalKnowledgePackage[];
  organizationalKnowledgeGraphs: SyntheticOrganizationalKnowledgeGraph[];
  enterpriseKnowledgePackages: SyntheticEnterpriseKnowledgePackage[];
  portfolioKnowledgePackages: SyntheticPortfolioKnowledgePackage[];
  organizationalMemoryArchives: SyntheticOrganizationalMemoryArchive[];
  warnings: string[];
}

export interface BuildOrganizationalMethodologyArchiveResult {
  organizationalMethodologyArchive: SyntheticOrganizationalMethodologyArchive | null;
  skipped: boolean;
  warnings: string[];
}

type OrganizationalMethodologyArchiveSourceArtifact =
  | SyntheticMethodologyObject
  | SyntheticMethodologyRelationship
  | SyntheticHistoricalMethodologyPackage
  | SyntheticOrganizationalKnowledgePackage
  | SyntheticOrganizationalKnowledgeGraph
  | SyntheticEnterpriseKnowledgePackage
  | SyntheticPortfolioKnowledgePackage
  | SyntheticOrganizationalMemoryArchive;

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

function isSupportedArchiveCategory(archiveCategory: SyntheticOrganizationalMethodologyArchiveCategory): boolean {
  return SYNTHETIC_ORGANIZATIONAL_METHODOLOGY_ARCHIVE_CATEGORIES.includes(archiveCategory);
}

function isSupportedArchiveStatus(archiveStatus: SyntheticOrganizationalMethodologyArchiveStatus): boolean {
  return SYNTHETIC_ORGANIZATIONAL_METHODOLOGY_ARCHIVE_STATUSES.includes(archiveStatus);
}

function getMethodologyObjects(input: BuildOrganizationalMethodologyArchiveInput): SyntheticMethodologyObject[] {
  return getInputArray(input.methodologyObjects);
}

function getMethodologyRelationships(input: BuildOrganizationalMethodologyArchiveInput): SyntheticMethodologyRelationship[] {
  return getInputArray(input.methodologyRelationships);
}

function getHistoricalMethodologyPackages(input: BuildOrganizationalMethodologyArchiveInput): SyntheticHistoricalMethodologyPackage[] {
  return getInputArray(input.historicalMethodologyPackages);
}

function getOrganizationalKnowledgePackages(input: BuildOrganizationalMethodologyArchiveInput): SyntheticOrganizationalKnowledgePackage[] {
  return getInputArray(input.organizationalKnowledgePackages);
}

function getOrganizationalKnowledgeGraphs(input: BuildOrganizationalMethodologyArchiveInput): SyntheticOrganizationalKnowledgeGraph[] {
  return getInputArray(input.organizationalKnowledgeGraphs);
}

function getEnterpriseKnowledgePackages(input: BuildOrganizationalMethodologyArchiveInput): SyntheticEnterpriseKnowledgePackage[] {
  return getInputArray(input.enterpriseKnowledgePackages);
}

function getPortfolioKnowledgePackages(input: BuildOrganizationalMethodologyArchiveInput): SyntheticPortfolioKnowledgePackage[] {
  return getInputArray(input.portfolioKnowledgePackages);
}

function getOrganizationalMemoryArchives(input: BuildOrganizationalMethodologyArchiveInput): SyntheticOrganizationalMemoryArchive[] {
  return getInputArray(input.organizationalMemoryArchives);
}

function getSourceArtifacts(input: BuildOrganizationalMethodologyArchiveInput): OrganizationalMethodologyArchiveSourceArtifact[] {
  return [
    ...getMethodologyObjects(input),
    ...getMethodologyRelationships(input),
    ...getHistoricalMethodologyPackages(input),
    ...getOrganizationalKnowledgePackages(input),
    ...getOrganizationalKnowledgeGraphs(input),
    ...getEnterpriseKnowledgePackages(input),
    ...getPortfolioKnowledgePackages(input),
    ...getOrganizationalMemoryArchives(input),
  ];
}

function getArchiveScope(input: BuildOrganizationalMethodologyArchiveInput): SyntheticAuditScope | null {
  return getSourceArtifacts(input)[0]?.scope ?? null;
}

function getArchiveCustomerIsolation(input: BuildOrganizationalMethodologyArchiveInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.customerIsolation ?? null;
}

function getArchiveFirmIsolation(input: BuildOrganizationalMethodologyArchiveInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.firmIsolation ?? null;
}

function getArchiveClientIsolation(input: BuildOrganizationalMethodologyArchiveInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.clientIsolation ?? null;
}

function getMethodologyObjectIds(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  return [
    ...getMethodologyObjects(input).map((artifact) => artifact.methodologyObjectId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyObjectIds")),
  ].filter(hasValue) as string[];
}

function getMethodologyRelationshipIds(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  return [
    ...getMethodologyRelationships(input).map((artifact) => artifact.methodologyRelationshipId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyRelationshipIds")),
  ].filter(hasValue) as string[];
}

function getHistoricalMethodologyPackageIds(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  return getHistoricalMethodologyPackages(input).map((artifact) => artifact.historicalMethodologyPackageId).filter(hasValue);
}

function getOrganizationalKnowledgePackageIds(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  return [
    ...getOrganizationalKnowledgePackages(input).map((artifact) => artifact.organizationalKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalKnowledgeGraphIds(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  return [
    ...getOrganizationalKnowledgeGraphs(input).map((artifact) => artifact.organizationalKnowledgeGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalKnowledgeGraphIds")),
  ].filter(hasValue) as string[];
}

function getEnterpriseKnowledgePackageIds(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  return getEnterpriseKnowledgePackages(input).map((artifact) => artifact.enterpriseKnowledgePackageId).filter(hasValue);
}

function getPortfolioKnowledgePackageIds(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  return getPortfolioKnowledgePackages(input).map((artifact) => artifact.portfolioKnowledgePackageId).filter(hasValue);
}

function getOrganizationalMemoryArchiveIds(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  return getOrganizationalMemoryArchives(input).map((artifact) => artifact.organizationalMemoryArchiveId).filter(hasValue);
}

function getReferenceIds(input: BuildOrganizationalMethodologyArchiveInput, singularName: string, arrayName: string): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, singularName)),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function getSourceKnowledgeObjectIds(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "knowledgeObjectIds")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "sourceKnowledgeObjectIds")),
  ].filter(hasValue) as string[];
}

function getSourceMethodologyObjectIds(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  return [
    ...getMethodologyObjects(input).map((artifact) => artifact.methodologyObjectId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyObjectIds")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "sourceMethodologyObjectIds")),
  ].filter(hasValue) as string[];
}

function getSourceMemoryObjectIds(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "memoryObjectIds")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "sourceMemoryObjectIds")),
  ].filter(hasValue) as string[];
}

function getSourceEvidenceLineageGraphIds(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "evidenceLineageGraphIds")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "sourceEvidenceLineageGraphIds")),
  ].filter(hasValue) as string[];
}

function getDerivationLineageIds(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "derivationLineageIds")),
    ...getMethodologyObjectIds(input),
    ...getMethodologyRelationshipIds(input),
    ...getHistoricalMethodologyPackageIds(input),
    ...getOrganizationalKnowledgePackageIds(input),
    ...getOrganizationalKnowledgeGraphIds(input),
    ...getEnterpriseKnowledgePackageIds(input),
    ...getPortfolioKnowledgePackageIds(input),
    ...getOrganizationalMemoryArchiveIds(input),
  ];
}

function getMethodologyVersion(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, "methodologyVersion")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyVersion")),
  ].filter(hasValue) as string[];
}

function getMethodologyDerivationMethod(input: BuildOrganizationalMethodologyArchiveInput): SyntheticMethodologyDerivationMethod[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, "methodologyDerivationMethod")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyDerivationMethod")),
  ].filter(hasValue) as SyntheticMethodologyDerivationMethod[];
}

function getMethodologyDerivationHash(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, "methodologyDerivationHash")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyDerivationHash")),
  ].filter(hasValue) as string[];
}

function getMethodologyStaleMarker(input: BuildOrganizationalMethodologyArchiveInput): SyntheticMethodologyStaleMarker[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, "methodologyStaleMarker")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyStaleMarker")),
  ].filter(hasValue) as SyntheticMethodologyStaleMarker[];
}

function buildDerivationHash(input: BuildOrganizationalMethodologyArchiveInput): string {
  return stableSnapshotHash({
    archiveCategory: input.archiveCategory,
    archiveStatus: input.archiveStatus,
    derivationLineageIds: getDerivationLineageIds(input),
    methodologyObjectIds: getMethodologyObjectIds(input),
    methodologyRelationshipIds: getMethodologyRelationshipIds(input),
  });
}

function buildOrganizationalMethodologyArchiveKey(input: BuildOrganizationalMethodologyArchiveInput): string {
  const scope = getArchiveScope(input);
  return stableSnapshotHash({
    archiveCategory: input.archiveCategory,
    archiveStatus: input.archiveStatus,
    companyId: scope?.companyId ?? null,
    scope,
    customerIsolation: getArchiveCustomerIsolation(input),
    firmIsolation: getArchiveFirmIsolation(input),
    clientIsolation: getArchiveClientIsolation(input),
    methodologyObjectIds: getMethodologyObjectIds(input),
    methodologyRelationshipIds: getMethodologyRelationshipIds(input),
    historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
    enterpriseKnowledgePackageIds: getEnterpriseKnowledgePackageIds(input),
    portfolioKnowledgePackageIds: getPortfolioKnowledgePackageIds(input),
    organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
  });
}

function buildOrganizationalMethodologyArchiveId(input: BuildOrganizationalMethodologyArchiveInput): string {
  return `synthetic-organizational-methodology-archive:${stableSnapshotHash({
    organizationalMethodologyArchiveKey: buildOrganizationalMethodologyArchiveKey(input),
    archiveCategory: input.archiveCategory,
    archiveStatus: input.archiveStatus,
    companyId: getArchiveScope(input)?.companyId ?? null,
  })}`;
}

function buildKnowledgeGraphSnapshotHash(input: BuildOrganizationalMethodologyArchiveInput): string {
  return stableSnapshotHash({
    organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    sourceKnowledgeObjectIds: getSourceKnowledgeObjectIds(input),
  });
}

function buildMethodologySnapshotHash(input: BuildOrganizationalMethodologyArchiveInput): string {
  return stableSnapshotHash({
    methodologyObjectIds: getMethodologyObjectIds(input),
    methodologyRelationshipIds: getMethodologyRelationshipIds(input),
    methodologyAncestryIds: getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyAncestryIds")),
  });
}

function buildKnowledgePackageHandle(input: BuildOrganizationalMethodologyArchiveInput): string {
  return `phase38-knowledge-package:${stableSnapshotHash({
    organizationalMethodologyArchiveKey: buildOrganizationalMethodologyArchiveKey(input),
    knowledgeGraphSnapshotHash: buildKnowledgeGraphSnapshotHash(input),
  })}`;
}

function buildMethodologyPackageHandle(input: BuildOrganizationalMethodologyArchiveInput): string {
  return `phase38-methodology-package:${stableSnapshotHash({
    organizationalMethodologyArchiveKey: buildOrganizationalMethodologyArchiveKey(input),
    methodologySnapshotHash: buildMethodologySnapshotHash(input),
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildOrganizationalMethodologyArchiveInput): string[] {
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

function validateInput(input: BuildOrganizationalMethodologyArchiveInput): string[] {
  const warnings: string[] = [];
  const sourceArtifacts = getSourceArtifacts(input);
  const scope = getArchiveScope(input);
  const companyId = scope?.companyId;

  if (!hasValue(input.archiveCategory)) warnings.push("archiveCategory is required.");
  if (!isSupportedArchiveCategory(input.archiveCategory)) warnings.push("archiveCategory must be supported.");
  if (!hasValue(input.archiveStatus)) warnings.push("archiveStatus is required.");
  if (!isSupportedArchiveStatus(input.archiveStatus)) warnings.push("archiveStatus must be supported.");
  if (sourceArtifacts.length === 0) warnings.push("at least one methodology archive source artifact is required.");
  if (!scope) warnings.push("source scope is required.");
  if (!companyId) warnings.push("source companyId is required.");
  if (!getArchiveCustomerIsolation(input)) warnings.push("customerIsolation is required.");
  if (!getArchiveFirmIsolation(input)) warnings.push("firmIsolation is required.");
  if (!getArchiveClientIsolation(input)) warnings.push("clientIsolation is required.");

  sourceArtifacts.forEach((artifact, index) => {
    if (!hasValue(artifact.companyId)) warnings.push(`sourceArtifacts[${index}].companyId is required.`);
    if (companyId && artifact.companyId !== companyId) warnings.push(`sourceArtifacts[${index}].companyId must equal source companyId.`);
  });

  for (const [inputName, values, idName, keyName] of [
    ["methodologyObjects", getMethodologyObjects(input), "methodologyObjectId", "methodologyObjectKey"],
    ["methodologyRelationships", getMethodologyRelationships(input), "methodologyRelationshipId", "methodologyRelationshipKey"],
    ["historicalMethodologyPackages", getHistoricalMethodologyPackages(input), "historicalMethodologyPackageId", "historicalMethodologyPackageKey"],
    ["organizationalKnowledgePackages", getOrganizationalKnowledgePackages(input), "organizationalKnowledgePackageId", "organizationalKnowledgePackageKey"],
    ["organizationalKnowledgeGraphs", getOrganizationalKnowledgeGraphs(input), "organizationalKnowledgeGraphId", "organizationalKnowledgeGraphKey"],
    ["enterpriseKnowledgePackages", getEnterpriseKnowledgePackages(input), "enterpriseKnowledgePackageId", "enterpriseKnowledgePackageKey"],
    ["portfolioKnowledgePackages", getPortfolioKnowledgePackages(input), "portfolioKnowledgePackageId", "portfolioKnowledgePackageKey"],
    ["organizationalMemoryArchives", getOrganizationalMemoryArchives(input), "organizationalMemoryArchiveId", "organizationalMemoryArchiveKey"],
  ] as const) {
    values.forEach((artifact, index) => {
      if (!hasValue((artifact as unknown as ReferenceRecord)[idName])) warnings.push(`${inputName}[${index}].${idName} is required.`);
      if (!hasValue((artifact as unknown as ReferenceRecord)[keyName])) warnings.push(`${inputName}[${index}].${keyName} is required.`);
    });
  }

  return warnings;
}

export function buildOrganizationalMethodologyArchive(
  input: BuildOrganizationalMethodologyArchiveInput,
): BuildOrganizationalMethodologyArchiveResult {
  const fatalWarnings = validateInput(input);
  const scope = getArchiveScope(input);
  const customerIsolation = getArchiveCustomerIsolation(input);
  const firmIsolation = getArchiveFirmIsolation(input);
  const clientIsolation = getArchiveClientIsolation(input);

  if (fatalWarnings.length > 0 || !scope || !customerIsolation || !firmIsolation || !clientIsolation) {
    return {
      organizationalMethodologyArchive: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceArtifacts = getSourceArtifacts(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    organizationalMethodologyArchive: {
      organizationalMethodologyArchiveId: buildOrganizationalMethodologyArchiveId(input),
      organizationalMethodologyArchiveKey: buildOrganizationalMethodologyArchiveKey(input),
      archiveCategory: input.archiveCategory,
      archiveStatus: input.archiveStatus,
      companyId: scope.companyId,
      scope,
      customerIsolation,
      firmIsolation,
      clientIsolation,
      methodologyObjectIds: getMethodologyObjectIds(input),
      methodologyRelationshipIds: getMethodologyRelationshipIds(input),
      historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
      organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
      organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
      enterpriseKnowledgePackageIds: getEnterpriseKnowledgePackageIds(input),
      portfolioKnowledgePackageIds: getPortfolioKnowledgePackageIds(input),
      organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
      methodologyVersion: getMethodologyVersion(input),
      methodologyAncestryIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "methodologyAncestryIds")),
      methodologyDerivationMethod: getMethodologyDerivationMethod(input),
      methodologyDerivationHash: getMethodologyDerivationHash(input),
      supersedesMethodologyIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "supersedesMethodologyIds")),
      supersededByMethodologyIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "supersededByMethodologyIds")),
      methodologyStaleMarker: getMethodologyStaleMarker(input),
      methodologyStalenessReasonReferenceIds: sourceArtifacts.flatMap((artifact) =>
        getStringArrayProperty(artifact, "methodologyStalenessReasonReferenceIds"),
      ),
      derivationLineageIds: getDerivationLineageIds(input),
      derivationMethod: "methodology_context_preservation",
      derivationHash: buildDerivationHash(input),
      confidenceFloorMetadata: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticKnowledgeConfidenceFloorMetadata>(artifact, "confidenceFloorMetadata"),
      ),
      sourceConfidenceReferenceIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "sourceConfidenceReferenceIds")),
      evidenceReferenceIds: getReferenceIds(input, "evidenceReferenceId", "evidenceReferenceIds"),
      sourceReferenceIds: getReferenceIds(input, "sourceReferenceId", "sourceReferenceIds"),
      lineageReferenceIds: getReferenceIds(input, "lineageReferenceId", "lineageReferenceIds"),
      upstreamObservationIds: getReferenceIds(input, "upstreamObservationId", "upstreamObservationIds"),
      upstreamPackageIds: getReferenceIds(input, "upstreamPackageId", "upstreamPackageIds"),
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
      knowledgePackageHandle: buildKnowledgePackageHandle(input),
      methodologyPackageHandle: buildMethodologyPackageHandle(input),
      knowledgeGraphSnapshotHash: buildKnowledgeGraphSnapshotHash(input),
      methodologySnapshotHash: buildMethodologySnapshotHash(input),
      sourceKnowledgeObjectIds: getSourceKnowledgeObjectIds(input),
      sourceMethodologyObjectIds: getSourceMethodologyObjectIds(input),
      sourceMemoryObjectIds: getSourceMemoryObjectIds(input),
      sourceEvidenceLineageGraphIds: getSourceEvidenceLineageGraphIds(input),
      healthcarePpdObservationIds: getInputArray(input.healthcarePpdObservationIds),
      payrollObservationIds: getInputArray(input.payrollObservationIds),
      methodologyObservationIds: getInputArray(input.methodologyObservationIds),
      methodologyObjects: getMethodologyObjects(input),
      methodologyRelationships: getMethodologyRelationships(input),
      historicalMethodologyPackages: getHistoricalMethodologyPackages(input),
      organizationalKnowledgePackages: getOrganizationalKnowledgePackages(input),
      organizationalKnowledgeGraphs: getOrganizationalKnowledgeGraphs(input),
      enterpriseKnowledgePackages: getEnterpriseKnowledgePackages(input),
      portfolioKnowledgePackages: getPortfolioKnowledgePackages(input),
      organizationalMemoryArchives: getOrganizationalMemoryArchives(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
