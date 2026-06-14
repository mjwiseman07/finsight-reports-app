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
import type { SyntheticOrganizationalMethodologyArchive } from "../organizational-methodology-archive";
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
import type { SyntheticMemoryPreservationPackage } from "../../organizational-memory/memory-preservation-package";
import type { SyntheticOrganizationalMemoryArchive } from "../../organizational-memory/organizational-memory-archive";

export type SyntheticMethodologyPreservationPackageCategory =
  | "methodology_preservation_package"
  | "organizational_methodology_preservation_package"
  | "enterprise_methodology_preservation_package"
  | "portfolio_methodology_preservation_package"
  | "methodology_continuity_preservation_package";

export const SYNTHETIC_METHODOLOGY_PRESERVATION_PACKAGE_CATEGORIES: SyntheticMethodologyPreservationPackageCategory[] = [
  "methodology_preservation_package",
  "organizational_methodology_preservation_package",
  "enterprise_methodology_preservation_package",
  "portfolio_methodology_preservation_package",
  "methodology_continuity_preservation_package",
];

export type SyntheticMethodologyPreservationCategory =
  | "methodology_archive_continuity"
  | "methodology_version_continuity"
  | "methodology_ancestry_continuity"
  | "methodology_supersession_continuity"
  | "organizational_change_continuity"
  | "system_transition_continuity"
  | "staffing_transition_continuity"
  | "department_transition_continuity"
  | "fiscal_period_transition_continuity";

export const SYNTHETIC_METHODOLOGY_PRESERVATION_CATEGORIES: SyntheticMethodologyPreservationCategory[] = [
  "methodology_archive_continuity",
  "methodology_version_continuity",
  "methodology_ancestry_continuity",
  "methodology_supersession_continuity",
  "organizational_change_continuity",
  "system_transition_continuity",
  "staffing_transition_continuity",
  "department_transition_continuity",
  "fiscal_period_transition_continuity",
];

export interface BuildMethodologyPreservationPackageInput {
  packageCategory: SyntheticMethodologyPreservationPackageCategory;
  preservationCategory: SyntheticMethodologyPreservationCategory;
  methodologyObjects?: SyntheticMethodologyObject[];
  methodologyRelationships?: SyntheticMethodologyRelationship[];
  organizationalMethodologyArchives?: SyntheticOrganizationalMethodologyArchive[];
  historicalMethodologyPackages?: SyntheticHistoricalMethodologyPackage[];
  organizationalKnowledgePackages?: SyntheticOrganizationalKnowledgePackage[];
  organizationalKnowledgeGraphs?: SyntheticOrganizationalKnowledgeGraph[];
  enterpriseKnowledgePackages?: SyntheticEnterpriseKnowledgePackage[];
  portfolioKnowledgePackages?: SyntheticPortfolioKnowledgePackage[];
  organizationalMemoryArchives?: SyntheticOrganizationalMemoryArchive[];
  memoryPreservationPackages?: SyntheticMemoryPreservationPackage[];
  preservationReferenceIds?: string[];
  preservationLineageReferenceIds?: string[];
  continuityReferenceIds?: string[];
  continuityEventReferenceIds?: string[];
  methodologyContinuityReferenceIds?: string[];
  methodologyArchiveContinuityReferenceIds?: string[];
  methodologyVersionContinuityReferenceIds?: string[];
  methodologyAncestryContinuityReferenceIds?: string[];
  methodologySupersessionContinuityReferenceIds?: string[];
  systemMigrationReferenceIds?: string[];
  staffingTurnoverReferenceIds?: string[];
  departmentRestructureReferenceIds?: string[];
  fiscalPeriodTransitionReferenceIds?: string[];
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface SyntheticMethodologyPreservationPackage {
  methodologyPreservationPackageId: string;
  methodologyPreservationPackageKey: string;
  packageCategory: SyntheticMethodologyPreservationPackageCategory;
  preservationCategory: SyntheticMethodologyPreservationCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  methodologyObjectIds: string[];
  methodologyRelationshipIds: string[];
  organizationalMethodologyArchiveIds: string[];
  historicalMethodologyPackageIds: string[];
  organizationalKnowledgePackageIds: string[];
  organizationalKnowledgeGraphIds: string[];
  enterpriseKnowledgePackageIds: string[];
  portfolioKnowledgePackageIds: string[];
  organizationalMemoryArchiveIds: string[];
  memoryPreservationPackageIds: string[];
  methodologyVersion: string[];
  methodologyAncestryIds: string[];
  methodologyDerivationMethod: SyntheticMethodologyDerivationMethod[];
  methodologyDerivationHash: string[];
  supersedesMethodologyIds: string[];
  supersededByMethodologyIds: string[];
  methodologyStaleMarker: SyntheticMethodologyStaleMarker[];
  methodologyStalenessReasonReferenceIds: string[];
  preservationReferenceIds: string[];
  preservationLineageReferenceIds: string[];
  continuityReferenceIds: string[];
  continuityEventReferenceIds: string[];
  methodologyContinuityReferenceIds: string[];
  methodologyArchiveContinuityReferenceIds: string[];
  methodologyVersionContinuityReferenceIds: string[];
  methodologyAncestryContinuityReferenceIds: string[];
  methodologySupersessionContinuityReferenceIds: string[];
  systemMigrationReferenceIds: string[];
  staffingTurnoverReferenceIds: string[];
  departmentRestructureReferenceIds: string[];
  fiscalPeriodTransitionReferenceIds: string[];
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
  organizationalMethodologyArchives: SyntheticOrganizationalMethodologyArchive[];
  historicalMethodologyPackages: SyntheticHistoricalMethodologyPackage[];
  organizationalKnowledgePackages: SyntheticOrganizationalKnowledgePackage[];
  organizationalKnowledgeGraphs: SyntheticOrganizationalKnowledgeGraph[];
  enterpriseKnowledgePackages: SyntheticEnterpriseKnowledgePackage[];
  portfolioKnowledgePackages: SyntheticPortfolioKnowledgePackage[];
  organizationalMemoryArchives: SyntheticOrganizationalMemoryArchive[];
  memoryPreservationPackages: SyntheticMemoryPreservationPackage[];
  warnings: string[];
}

export interface BuildMethodologyPreservationPackageResult {
  methodologyPreservationPackage: SyntheticMethodologyPreservationPackage | null;
  skipped: boolean;
  warnings: string[];
}

type MethodologyPreservationSourceArtifact =
  | SyntheticMethodologyObject
  | SyntheticMethodologyRelationship
  | SyntheticOrganizationalMethodologyArchive
  | SyntheticHistoricalMethodologyPackage
  | SyntheticOrganizationalKnowledgePackage
  | SyntheticOrganizationalKnowledgeGraph
  | SyntheticEnterpriseKnowledgePackage
  | SyntheticPortfolioKnowledgePackage
  | SyntheticOrganizationalMemoryArchive
  | SyntheticMemoryPreservationPackage;

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

function isSupportedPackageCategory(packageCategory: SyntheticMethodologyPreservationPackageCategory): boolean {
  return SYNTHETIC_METHODOLOGY_PRESERVATION_PACKAGE_CATEGORIES.includes(packageCategory);
}

function isSupportedPreservationCategory(preservationCategory: SyntheticMethodologyPreservationCategory): boolean {
  return SYNTHETIC_METHODOLOGY_PRESERVATION_CATEGORIES.includes(preservationCategory);
}

function getMethodologyObjects(input: BuildMethodologyPreservationPackageInput): SyntheticMethodologyObject[] {
  return getInputArray(input.methodologyObjects);
}

function getMethodologyRelationships(input: BuildMethodologyPreservationPackageInput): SyntheticMethodologyRelationship[] {
  return getInputArray(input.methodologyRelationships);
}

function getOrganizationalMethodologyArchives(
  input: BuildMethodologyPreservationPackageInput,
): SyntheticOrganizationalMethodologyArchive[] {
  return getInputArray(input.organizationalMethodologyArchives);
}

function getHistoricalMethodologyPackages(input: BuildMethodologyPreservationPackageInput): SyntheticHistoricalMethodologyPackage[] {
  return getInputArray(input.historicalMethodologyPackages);
}

function getOrganizationalKnowledgePackages(input: BuildMethodologyPreservationPackageInput): SyntheticOrganizationalKnowledgePackage[] {
  return getInputArray(input.organizationalKnowledgePackages);
}

function getOrganizationalKnowledgeGraphs(input: BuildMethodologyPreservationPackageInput): SyntheticOrganizationalKnowledgeGraph[] {
  return getInputArray(input.organizationalKnowledgeGraphs);
}

function getEnterpriseKnowledgePackages(input: BuildMethodologyPreservationPackageInput): SyntheticEnterpriseKnowledgePackage[] {
  return getInputArray(input.enterpriseKnowledgePackages);
}

function getPortfolioKnowledgePackages(input: BuildMethodologyPreservationPackageInput): SyntheticPortfolioKnowledgePackage[] {
  return getInputArray(input.portfolioKnowledgePackages);
}

function getOrganizationalMemoryArchives(input: BuildMethodologyPreservationPackageInput): SyntheticOrganizationalMemoryArchive[] {
  return getInputArray(input.organizationalMemoryArchives);
}

function getMemoryPreservationPackages(input: BuildMethodologyPreservationPackageInput): SyntheticMemoryPreservationPackage[] {
  return getInputArray(input.memoryPreservationPackages);
}

function getSourceArtifacts(input: BuildMethodologyPreservationPackageInput): MethodologyPreservationSourceArtifact[] {
  return [
    ...getMethodologyObjects(input),
    ...getMethodologyRelationships(input),
    ...getOrganizationalMethodologyArchives(input),
    ...getHistoricalMethodologyPackages(input),
    ...getOrganizationalKnowledgePackages(input),
    ...getOrganizationalKnowledgeGraphs(input),
    ...getEnterpriseKnowledgePackages(input),
    ...getPortfolioKnowledgePackages(input),
    ...getOrganizationalMemoryArchives(input),
    ...getMemoryPreservationPackages(input),
  ];
}

function getPackageScope(input: BuildMethodologyPreservationPackageInput): SyntheticAuditScope | null {
  return getSourceArtifacts(input)[0]?.scope ?? null;
}

function getPackageCustomerIsolation(input: BuildMethodologyPreservationPackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.customerIsolation ?? null;
}

function getPackageFirmIsolation(input: BuildMethodologyPreservationPackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.firmIsolation ?? null;
}

function getPackageClientIsolation(input: BuildMethodologyPreservationPackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.clientIsolation ?? null;
}

function getMethodologyObjectIds(input: BuildMethodologyPreservationPackageInput): string[] {
  return [
    ...getMethodologyObjects(input).map((artifact) => artifact.methodologyObjectId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyObjectIds")),
  ].filter(hasValue) as string[];
}

function getMethodologyRelationshipIds(input: BuildMethodologyPreservationPackageInput): string[] {
  return [
    ...getMethodologyRelationships(input).map((artifact) => artifact.methodologyRelationshipId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyRelationshipIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalMethodologyArchiveIds(input: BuildMethodologyPreservationPackageInput): string[] {
  return [
    ...getOrganizationalMethodologyArchives(input).map((artifact) => artifact.organizationalMethodologyArchiveId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMethodologyArchiveIds")),
  ].filter(hasValue) as string[];
}

function getHistoricalMethodologyPackageIds(input: BuildMethodologyPreservationPackageInput): string[] {
  return [
    ...getHistoricalMethodologyPackages(input).map((artifact) => artifact.historicalMethodologyPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalMethodologyPackageIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalKnowledgePackageIds(input: BuildMethodologyPreservationPackageInput): string[] {
  return [
    ...getOrganizationalKnowledgePackages(input).map((artifact) => artifact.organizationalKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalKnowledgeGraphIds(input: BuildMethodologyPreservationPackageInput): string[] {
  return [
    ...getOrganizationalKnowledgeGraphs(input).map((artifact) => artifact.organizationalKnowledgeGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalKnowledgeGraphIds")),
  ].filter(hasValue) as string[];
}

function getEnterpriseKnowledgePackageIds(input: BuildMethodologyPreservationPackageInput): string[] {
  return getEnterpriseKnowledgePackages(input).map((artifact) => artifact.enterpriseKnowledgePackageId).filter(hasValue);
}

function getPortfolioKnowledgePackageIds(input: BuildMethodologyPreservationPackageInput): string[] {
  return getPortfolioKnowledgePackages(input).map((artifact) => artifact.portfolioKnowledgePackageId).filter(hasValue);
}

function getOrganizationalMemoryArchiveIds(input: BuildMethodologyPreservationPackageInput): string[] {
  return getOrganizationalMemoryArchives(input).map((artifact) => artifact.organizationalMemoryArchiveId).filter(hasValue);
}

function getMemoryPreservationPackageIds(input: BuildMethodologyPreservationPackageInput): string[] {
  return getMemoryPreservationPackages(input).map((artifact) => artifact.memoryPreservationPackageId).filter(hasValue);
}

function getReferenceIds(input: BuildMethodologyPreservationPackageInput, explicitValues: string[] | undefined, arrayName: string): string[] {
  return [
    ...getInputArray(explicitValues),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function getSourceReferenceIds(input: BuildMethodologyPreservationPackageInput, singularName: string, arrayName: string): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, singularName)),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function getSourceKnowledgeObjectIds(input: BuildMethodologyPreservationPackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "knowledgeObjectIds")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "sourceKnowledgeObjectIds")),
  ].filter(hasValue) as string[];
}

function getSourceMethodologyObjectIds(input: BuildMethodologyPreservationPackageInput): string[] {
  return [
    ...getMethodologyObjects(input).map((artifact) => artifact.methodologyObjectId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyObjectIds")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "sourceMethodologyObjectIds")),
  ].filter(hasValue) as string[];
}

function getSourceMemoryObjectIds(input: BuildMethodologyPreservationPackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "memoryObjectIds")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "sourceMemoryObjectIds")),
  ].filter(hasValue) as string[];
}

function getSourceEvidenceLineageGraphIds(input: BuildMethodologyPreservationPackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "evidenceLineageGraphIds")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "sourceEvidenceLineageGraphIds")),
  ].filter(hasValue) as string[];
}

function getDerivationLineageIds(input: BuildMethodologyPreservationPackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "derivationLineageIds")),
    ...getMethodologyObjectIds(input),
    ...getMethodologyRelationshipIds(input),
    ...getOrganizationalMethodologyArchiveIds(input),
    ...getHistoricalMethodologyPackageIds(input),
    ...getOrganizationalKnowledgePackageIds(input),
    ...getOrganizationalKnowledgeGraphIds(input),
    ...getEnterpriseKnowledgePackageIds(input),
    ...getPortfolioKnowledgePackageIds(input),
    ...getOrganizationalMemoryArchiveIds(input),
    ...getMemoryPreservationPackageIds(input),
  ];
}

function getMethodologyVersion(input: BuildMethodologyPreservationPackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, "methodologyVersion")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyVersion")),
  ].filter(hasValue) as string[];
}

function getMethodologyDerivationMethod(input: BuildMethodologyPreservationPackageInput): SyntheticMethodologyDerivationMethod[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, "methodologyDerivationMethod")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyDerivationMethod")),
  ].filter(hasValue) as SyntheticMethodologyDerivationMethod[];
}

function getMethodologyDerivationHash(input: BuildMethodologyPreservationPackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, "methodologyDerivationHash")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyDerivationHash")),
  ].filter(hasValue) as string[];
}

function getMethodologyStaleMarker(input: BuildMethodologyPreservationPackageInput): SyntheticMethodologyStaleMarker[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, "methodologyStaleMarker")),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyStaleMarker")),
  ].filter(hasValue) as SyntheticMethodologyStaleMarker[];
}

function buildDerivationHash(input: BuildMethodologyPreservationPackageInput): string {
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    preservationCategory: input.preservationCategory,
    derivationLineageIds: getDerivationLineageIds(input),
    methodologyObjectIds: getMethodologyObjectIds(input),
    methodologyRelationshipIds: getMethodologyRelationshipIds(input),
  });
}

function buildMethodologyPreservationPackageKey(input: BuildMethodologyPreservationPackageInput): string {
  const scope = getPackageScope(input);
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    preservationCategory: input.preservationCategory,
    companyId: scope?.companyId ?? null,
    scope,
    customerIsolation: getPackageCustomerIsolation(input),
    firmIsolation: getPackageFirmIsolation(input),
    clientIsolation: getPackageClientIsolation(input),
    methodologyObjectIds: getMethodologyObjectIds(input),
    methodologyRelationshipIds: getMethodologyRelationshipIds(input),
    organizationalMethodologyArchiveIds: getOrganizationalMethodologyArchiveIds(input),
    historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
    enterpriseKnowledgePackageIds: getEnterpriseKnowledgePackageIds(input),
    portfolioKnowledgePackageIds: getPortfolioKnowledgePackageIds(input),
    organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
    memoryPreservationPackageIds: getMemoryPreservationPackageIds(input),
    preservationReferenceIds: getReferenceIds(input, input.preservationReferenceIds, "preservationReferenceIds"),
    continuityReferenceIds: getReferenceIds(input, input.continuityReferenceIds, "continuityReferenceIds"),
  });
}

function buildMethodologyPreservationPackageId(input: BuildMethodologyPreservationPackageInput): string {
  return `synthetic-methodology-preservation-package:${stableSnapshotHash({
    methodologyPreservationPackageKey: buildMethodologyPreservationPackageKey(input),
    packageCategory: input.packageCategory,
    preservationCategory: input.preservationCategory,
    companyId: getPackageScope(input)?.companyId ?? null,
  })}`;
}

function buildKnowledgeGraphSnapshotHash(input: BuildMethodologyPreservationPackageInput): string {
  return stableSnapshotHash({
    organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    sourceKnowledgeObjectIds: getSourceKnowledgeObjectIds(input),
  });
}

function buildMethodologySnapshotHash(input: BuildMethodologyPreservationPackageInput): string {
  return stableSnapshotHash({
    methodologyObjectIds: getMethodologyObjectIds(input),
    methodologyRelationshipIds: getMethodologyRelationshipIds(input),
    methodologyAncestryIds: getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "methodologyAncestryIds")),
  });
}

function buildKnowledgePackageHandle(input: BuildMethodologyPreservationPackageInput): string {
  return `phase38-knowledge-package:${stableSnapshotHash({
    methodologyPreservationPackageKey: buildMethodologyPreservationPackageKey(input),
    knowledgeGraphSnapshotHash: buildKnowledgeGraphSnapshotHash(input),
  })}`;
}

function buildMethodologyPackageHandle(input: BuildMethodologyPreservationPackageInput): string {
  return `phase38-methodology-package:${stableSnapshotHash({
    methodologyPreservationPackageKey: buildMethodologyPreservationPackageKey(input),
    methodologySnapshotHash: buildMethodologySnapshotHash(input),
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildMethodologyPreservationPackageInput): string[] {
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

function validateInput(input: BuildMethodologyPreservationPackageInput): string[] {
  const warnings: string[] = [];
  const sourceArtifacts = getSourceArtifacts(input);
  const scope = getPackageScope(input);
  const companyId = scope?.companyId;

  if (!hasValue(input.packageCategory)) warnings.push("packageCategory is required.");
  if (!isSupportedPackageCategory(input.packageCategory)) warnings.push("packageCategory must be supported.");
  if (!hasValue(input.preservationCategory)) warnings.push("preservationCategory is required.");
  if (!isSupportedPreservationCategory(input.preservationCategory)) warnings.push("preservationCategory must be supported.");
  if (sourceArtifacts.length === 0) warnings.push("at least one methodology preservation source artifact is required.");
  if (!scope) warnings.push("source scope is required.");
  if (!companyId) warnings.push("source companyId is required.");
  if (!getPackageCustomerIsolation(input)) warnings.push("customerIsolation is required.");
  if (!getPackageFirmIsolation(input)) warnings.push("firmIsolation is required.");
  if (!getPackageClientIsolation(input)) warnings.push("clientIsolation is required.");

  sourceArtifacts.forEach((artifact, index) => {
    if (!hasValue(artifact.companyId)) warnings.push(`sourceArtifacts[${index}].companyId is required.`);
    if (companyId && artifact.companyId !== companyId) warnings.push(`sourceArtifacts[${index}].companyId must equal source companyId.`);
  });

  for (const [inputName, values, idName, keyName] of [
    ["methodologyObjects", getMethodologyObjects(input), "methodologyObjectId", "methodologyObjectKey"],
    ["methodologyRelationships", getMethodologyRelationships(input), "methodologyRelationshipId", "methodologyRelationshipKey"],
    ["organizationalMethodologyArchives", getOrganizationalMethodologyArchives(input), "organizationalMethodologyArchiveId", "organizationalMethodologyArchiveKey"],
    ["historicalMethodologyPackages", getHistoricalMethodologyPackages(input), "historicalMethodologyPackageId", "historicalMethodologyPackageKey"],
    ["organizationalKnowledgePackages", getOrganizationalKnowledgePackages(input), "organizationalKnowledgePackageId", "organizationalKnowledgePackageKey"],
    ["organizationalKnowledgeGraphs", getOrganizationalKnowledgeGraphs(input), "organizationalKnowledgeGraphId", "organizationalKnowledgeGraphKey"],
    ["enterpriseKnowledgePackages", getEnterpriseKnowledgePackages(input), "enterpriseKnowledgePackageId", "enterpriseKnowledgePackageKey"],
    ["portfolioKnowledgePackages", getPortfolioKnowledgePackages(input), "portfolioKnowledgePackageId", "portfolioKnowledgePackageKey"],
    ["organizationalMemoryArchives", getOrganizationalMemoryArchives(input), "organizationalMemoryArchiveId", "organizationalMemoryArchiveKey"],
    ["memoryPreservationPackages", getMemoryPreservationPackages(input), "memoryPreservationPackageId", "memoryPreservationPackageKey"],
  ] as const) {
    values.forEach((artifact, index) => {
      if (!hasValue((artifact as unknown as ReferenceRecord)[idName])) warnings.push(`${inputName}[${index}].${idName} is required.`);
      if (!hasValue((artifact as unknown as ReferenceRecord)[keyName])) warnings.push(`${inputName}[${index}].${keyName} is required.`);
    });
  }

  return warnings;
}

export function buildMethodologyPreservationPackage(
  input: BuildMethodologyPreservationPackageInput,
): BuildMethodologyPreservationPackageResult {
  const fatalWarnings = validateInput(input);
  const scope = getPackageScope(input);
  const customerIsolation = getPackageCustomerIsolation(input);
  const firmIsolation = getPackageFirmIsolation(input);
  const clientIsolation = getPackageClientIsolation(input);

  if (fatalWarnings.length > 0 || !scope || !customerIsolation || !firmIsolation || !clientIsolation) {
    return {
      methodologyPreservationPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceArtifacts = getSourceArtifacts(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    methodologyPreservationPackage: {
      methodologyPreservationPackageId: buildMethodologyPreservationPackageId(input),
      methodologyPreservationPackageKey: buildMethodologyPreservationPackageKey(input),
      packageCategory: input.packageCategory,
      preservationCategory: input.preservationCategory,
      companyId: scope.companyId,
      scope,
      customerIsolation,
      firmIsolation,
      clientIsolation,
      methodologyObjectIds: getMethodologyObjectIds(input),
      methodologyRelationshipIds: getMethodologyRelationshipIds(input),
      organizationalMethodologyArchiveIds: getOrganizationalMethodologyArchiveIds(input),
      historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
      organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
      organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
      enterpriseKnowledgePackageIds: getEnterpriseKnowledgePackageIds(input),
      portfolioKnowledgePackageIds: getPortfolioKnowledgePackageIds(input),
      organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
      memoryPreservationPackageIds: getMemoryPreservationPackageIds(input),
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
      preservationReferenceIds: getReferenceIds(input, input.preservationReferenceIds, "preservationReferenceIds"),
      preservationLineageReferenceIds: getReferenceIds(input, input.preservationLineageReferenceIds, "preservationLineageReferenceIds"),
      continuityReferenceIds: getReferenceIds(input, input.continuityReferenceIds, "continuityReferenceIds"),
      continuityEventReferenceIds: getReferenceIds(input, input.continuityEventReferenceIds, "continuityEventReferenceIds"),
      methodologyContinuityReferenceIds: getReferenceIds(input, input.methodologyContinuityReferenceIds, "methodologyContinuityReferenceIds"),
      methodologyArchiveContinuityReferenceIds: getReferenceIds(
        input,
        input.methodologyArchiveContinuityReferenceIds,
        "methodologyArchiveContinuityReferenceIds",
      ),
      methodologyVersionContinuityReferenceIds: getReferenceIds(
        input,
        input.methodologyVersionContinuityReferenceIds,
        "methodologyVersionContinuityReferenceIds",
      ),
      methodologyAncestryContinuityReferenceIds: getReferenceIds(
        input,
        input.methodologyAncestryContinuityReferenceIds,
        "methodologyAncestryContinuityReferenceIds",
      ),
      methodologySupersessionContinuityReferenceIds: getReferenceIds(
        input,
        input.methodologySupersessionContinuityReferenceIds,
        "methodologySupersessionContinuityReferenceIds",
      ),
      systemMigrationReferenceIds: getReferenceIds(input, input.systemMigrationReferenceIds, "systemMigrationReferenceIds"),
      staffingTurnoverReferenceIds: getReferenceIds(input, input.staffingTurnoverReferenceIds, "staffingTurnoverReferenceIds"),
      departmentRestructureReferenceIds: getReferenceIds(input, input.departmentRestructureReferenceIds, "departmentRestructureReferenceIds"),
      fiscalPeriodTransitionReferenceIds: getReferenceIds(input, input.fiscalPeriodTransitionReferenceIds, "fiscalPeriodTransitionReferenceIds"),
      derivationLineageIds: getDerivationLineageIds(input),
      derivationMethod: "methodology_context_preservation",
      derivationHash: buildDerivationHash(input),
      confidenceFloorMetadata: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticKnowledgeConfidenceFloorMetadata>(artifact, "confidenceFloorMetadata"),
      ),
      sourceConfidenceReferenceIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "sourceConfidenceReferenceIds")),
      evidenceReferenceIds: getSourceReferenceIds(input, "evidenceReferenceId", "evidenceReferenceIds"),
      sourceReferenceIds: getSourceReferenceIds(input, "sourceReferenceId", "sourceReferenceIds"),
      lineageReferenceIds: getSourceReferenceIds(input, "lineageReferenceId", "lineageReferenceIds"),
      upstreamObservationIds: getSourceReferenceIds(input, "upstreamObservationId", "upstreamObservationIds"),
      upstreamPackageIds: getSourceReferenceIds(input, "upstreamPackageId", "upstreamPackageIds"),
      trustMetadata: sourceArtifacts.flatMap((artifact) => getObjectArrayProperty<SyntheticAuditTrustMetadata>(artifact, "trustMetadata")),
      confidenceMetadata: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(artifact, "confidenceMetadata"),
      ),
      governanceMetadata: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(artifact, "governanceMetadata"),
      ),
      materialityMetadata: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(artifact, "materialityMetadata"),
      ),
      personaCompatibility: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(artifact, "personaCompatibility"),
      ),
      packageCompatibility: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticAuditPackageCompatibility>(artifact, "packageCompatibility"),
      ),
      memoryCompatibility: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(artifact, "memoryCompatibility"),
      ),
      learningCompatibility: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticAuditLearningCompatibility>(artifact, "learningCompatibility"),
      ),
      surfaceCompatibility: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(artifact, "surfaceCompatibility"),
      ),
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
      organizationalMethodologyArchives: getOrganizationalMethodologyArchives(input),
      historicalMethodologyPackages: getHistoricalMethodologyPackages(input),
      organizationalKnowledgePackages: getOrganizationalKnowledgePackages(input),
      organizationalKnowledgeGraphs: getOrganizationalKnowledgeGraphs(input),
      enterpriseKnowledgePackages: getEnterpriseKnowledgePackages(input),
      portfolioKnowledgePackages: getPortfolioKnowledgePackages(input),
      organizationalMemoryArchives: getOrganizationalMemoryArchives(input),
      memoryPreservationPackages: getMemoryPreservationPackages(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
