import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticKnowledgeConfidenceFloorMetadata,
  SyntheticKnowledgeDerivationMethod,
  SyntheticKnowledgeStaleMarker,
  SyntheticKnowledgeValidityWindow,
  SyntheticMethodologyDerivationMethod,
  SyntheticMethodologyStaleMarker,
} from "../contracts";
import type { SyntheticKnowledgeObject } from "../knowledge-object";
import type { SyntheticKnowledgeRelationship } from "../knowledge-relationship";
import type { SyntheticMethodologyObject, SyntheticMethodologyRelationship } from "../methodology-object";
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
import type { SyntheticEnterpriseMemoryPackage } from "../../organizational-memory/enterprise-memory-package";
import type { SyntheticMemoryPreservationPackage } from "../../organizational-memory/memory-preservation-package";
import type { SyntheticOrganizationalMemoryArchive } from "../../organizational-memory/organizational-memory-archive";
import type { SyntheticOrganizationalMemoryGraph } from "../../organizational-memory/organizational-memory-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../../organizational-memory/organizational-memory-package";
import type { SyntheticPortfolioMemoryPackage } from "../../organizational-memory/portfolio-memory-package";

export type SyntheticOrganizationalKnowledgePackageCategory =
  | "organizational_knowledge_package"
  | "audit_knowledge_package"
  | "controller_knowledge_package"
  | "methodology_knowledge_package"
  | "enterprise_knowledge_package"
  | "portfolio_knowledge_package";

export const SYNTHETIC_ORGANIZATIONAL_KNOWLEDGE_PACKAGE_CATEGORIES: SyntheticOrganizationalKnowledgePackageCategory[] = [
  "organizational_knowledge_package",
  "audit_knowledge_package",
  "controller_knowledge_package",
  "methodology_knowledge_package",
  "enterprise_knowledge_package",
  "portfolio_knowledge_package",
];

export interface BuildOrganizationalKnowledgePackageInput {
  packageCategory: SyntheticOrganizationalKnowledgePackageCategory;
  knowledgeObjects?: SyntheticKnowledgeObject[];
  knowledgeRelationships?: SyntheticKnowledgeRelationship[];
  methodologyObjects?: SyntheticMethodologyObject[];
  methodologyRelationships?: SyntheticMethodologyRelationship[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  enterpriseMemoryPackages?: SyntheticEnterpriseMemoryPackage[];
  portfolioMemoryPackages?: SyntheticPortfolioMemoryPackage[];
  organizationalMemoryArchives?: SyntheticOrganizationalMemoryArchive[];
  memoryPreservationPackages?: SyntheticMemoryPreservationPackage[];
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface SyntheticOrganizationalKnowledgePackage {
  organizationalKnowledgePackageId: string;
  organizationalKnowledgePackageKey: string;
  packageCategory: SyntheticOrganizationalKnowledgePackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  knowledgeObjectIds: string[];
  knowledgeRelationshipIds: string[];
  methodologyObjectIds: string[];
  methodologyRelationshipIds: string[];
  derivationLineageIds: string[];
  derivationMethod: SyntheticKnowledgeDerivationMethod;
  derivationHash: string;
  methodologyVersion: string[];
  methodologyAncestryIds: string[];
  methodologyDerivationMethod: SyntheticMethodologyDerivationMethod[];
  methodologyDerivationHash: string[];
  supersedesMethodologyIds: string[];
  supersededByMethodologyIds: string[];
  methodologyStaleMarker: SyntheticMethodologyStaleMarker[];
  knowledgeValidityWindow: SyntheticKnowledgeValidityWindow[];
  sourceMemorySnapshotIds: string[];
  supersedesKnowledgeIds: string[];
  supersededByKnowledgeIds: string[];
  staleMarker: SyntheticKnowledgeStaleMarker[];
  stalenessReasonReferenceIds: string[];
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  upstreamObservationIds: string[];
  upstreamPackageIds: string[];
  organizationalMemoryPackageIds: string[];
  organizationalMemoryGraphIds: string[];
  enterpriseMemoryPackageIds: string[];
  portfolioMemoryPackageIds: string[];
  organizationalMemoryArchiveIds: string[];
  memoryPreservationPackageIds: string[];
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
  knowledgeObjects: SyntheticKnowledgeObject[];
  knowledgeRelationships: SyntheticKnowledgeRelationship[];
  methodologyObjects: SyntheticMethodologyObject[];
  methodologyRelationships: SyntheticMethodologyRelationship[];
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  enterpriseMemoryPackages: SyntheticEnterpriseMemoryPackage[];
  portfolioMemoryPackages: SyntheticPortfolioMemoryPackage[];
  organizationalMemoryArchives: SyntheticOrganizationalMemoryArchive[];
  memoryPreservationPackages: SyntheticMemoryPreservationPackage[];
  warnings: string[];
}

export interface BuildOrganizationalKnowledgePackageResult {
  organizationalKnowledgePackage: SyntheticOrganizationalKnowledgePackage | null;
  skipped: boolean;
  warnings: string[];
}

type OrganizationalKnowledgeSourceArtifact =
  | SyntheticKnowledgeObject
  | SyntheticKnowledgeRelationship
  | SyntheticMethodologyObject
  | SyntheticMethodologyRelationship
  | SyntheticOrganizationalMemoryPackage
  | SyntheticOrganizationalMemoryGraph
  | SyntheticEnterpriseMemoryPackage
  | SyntheticPortfolioMemoryPackage
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

function isSupportedPackageCategory(packageCategory: SyntheticOrganizationalKnowledgePackageCategory): boolean {
  return SYNTHETIC_ORGANIZATIONAL_KNOWLEDGE_PACKAGE_CATEGORIES.includes(packageCategory);
}

function getKnowledgeObjects(input: BuildOrganizationalKnowledgePackageInput): SyntheticKnowledgeObject[] {
  return getInputArray(input.knowledgeObjects);
}

function getKnowledgeRelationships(input: BuildOrganizationalKnowledgePackageInput): SyntheticKnowledgeRelationship[] {
  return getInputArray(input.knowledgeRelationships);
}

function getMethodologyObjects(input: BuildOrganizationalKnowledgePackageInput): SyntheticMethodologyObject[] {
  return getInputArray(input.methodologyObjects);
}

function getMethodologyRelationships(input: BuildOrganizationalKnowledgePackageInput): SyntheticMethodologyRelationship[] {
  return getInputArray(input.methodologyRelationships);
}

function getOrganizationalMemoryPackages(input: BuildOrganizationalKnowledgePackageInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getOrganizationalMemoryGraphs(input: BuildOrganizationalKnowledgePackageInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getEnterpriseMemoryPackages(input: BuildOrganizationalKnowledgePackageInput): SyntheticEnterpriseMemoryPackage[] {
  return getInputArray(input.enterpriseMemoryPackages);
}

function getPortfolioMemoryPackages(input: BuildOrganizationalKnowledgePackageInput): SyntheticPortfolioMemoryPackage[] {
  return getInputArray(input.portfolioMemoryPackages);
}

function getOrganizationalMemoryArchives(input: BuildOrganizationalKnowledgePackageInput): SyntheticOrganizationalMemoryArchive[] {
  return getInputArray(input.organizationalMemoryArchives);
}

function getMemoryPreservationPackages(input: BuildOrganizationalKnowledgePackageInput): SyntheticMemoryPreservationPackage[] {
  return getInputArray(input.memoryPreservationPackages);
}

function getSourceArtifacts(input: BuildOrganizationalKnowledgePackageInput): OrganizationalKnowledgeSourceArtifact[] {
  return [
    ...getKnowledgeObjects(input),
    ...getKnowledgeRelationships(input),
    ...getMethodologyObjects(input),
    ...getMethodologyRelationships(input),
    ...getOrganizationalMemoryPackages(input),
    ...getOrganizationalMemoryGraphs(input),
    ...getEnterpriseMemoryPackages(input),
    ...getPortfolioMemoryPackages(input),
    ...getOrganizationalMemoryArchives(input),
    ...getMemoryPreservationPackages(input),
  ];
}

function getPackageScope(input: BuildOrganizationalKnowledgePackageInput): SyntheticAuditScope | null {
  return getSourceArtifacts(input)[0]?.scope ?? null;
}

function getPackageCustomerIsolation(input: BuildOrganizationalKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.customerIsolation ?? null;
}

function getPackageFirmIsolation(input: BuildOrganizationalKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.firmIsolation ?? null;
}

function getPackageClientIsolation(input: BuildOrganizationalKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.clientIsolation ?? null;
}

function getKnowledgeObjectIds(input: BuildOrganizationalKnowledgePackageInput): string[] {
  return [
    ...getKnowledgeObjects(input).map((artifact) => artifact.knowledgeObjectId),
    ...getKnowledgeRelationships(input).flatMap((artifact) => [artifact.sourceKnowledgeObjectId, artifact.targetKnowledgeObjectId]),
    ...getMethodologyObjects(input).flatMap((artifact) => artifact.knowledgeObjectIds),
    ...getMethodologyRelationships(input).flatMap((artifact) => artifact.knowledgeObjectIds),
  ].filter(hasValue) as string[];
}

function getKnowledgeRelationshipIds(input: BuildOrganizationalKnowledgePackageInput): string[] {
  return [
    ...getKnowledgeRelationships(input).map((artifact) => artifact.knowledgeRelationshipId),
    ...getMethodologyObjects(input).flatMap((artifact) => artifact.knowledgeRelationshipIds),
    ...getMethodologyRelationships(input).flatMap((artifact) => artifact.knowledgeRelationshipIds),
  ].filter(hasValue) as string[];
}

function getMethodologyObjectIds(input: BuildOrganizationalKnowledgePackageInput): string[] {
  return [
    ...getMethodologyObjects(input).map((artifact) => artifact.methodologyObjectId),
    ...getMethodologyRelationships(input).flatMap((artifact) => [artifact.sourceMethodologyObjectId, artifact.targetMethodologyObjectId]),
  ].filter(hasValue) as string[];
}

function getMethodologyRelationshipIds(input: BuildOrganizationalKnowledgePackageInput): string[] {
  return getMethodologyRelationships(input).map((artifact) => artifact.methodologyRelationshipId).filter(hasValue);
}

function getOrganizationalMemoryPackageIds(input: BuildOrganizationalKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryPackages(input).map((artifact) => artifact.organizationalMemoryPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryPackageIds")),
    ...getKnowledgeObjects(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
    ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
    ...getMethodologyObjects(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
    ...getMethodologyRelationships(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryGraphIds(input: BuildOrganizationalKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
    ...getKnowledgeObjects(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryGraphIds),
    ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryGraphIds),
  ].filter(hasValue) as string[];
}

function getEnterpriseMemoryPackageIds(input: BuildOrganizationalKnowledgePackageInput): string[] {
  return [
    ...getEnterpriseMemoryPackages(input).map((artifact) => artifact.enterpriseMemoryPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "enterpriseMemoryPackageIds")),
  ].filter(hasValue) as string[];
}

function getPortfolioMemoryPackageIds(input: BuildOrganizationalKnowledgePackageInput): string[] {
  return [
    ...getPortfolioMemoryPackages(input).map((artifact) => artifact.portfolioMemoryPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "portfolioMemoryPackageIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryArchiveIds(input: BuildOrganizationalKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryArchives(input).map((artifact) => artifact.organizationalMemoryArchiveId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryArchiveIds")),
  ].filter(hasValue) as string[];
}

function getMemoryPreservationPackageIds(input: BuildOrganizationalKnowledgePackageInput): string[] {
  return [
    ...getMemoryPreservationPackages(input).map((artifact) => artifact.memoryPreservationPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "memoryPreservationPackageIds")),
  ].filter(hasValue) as string[];
}

function getReferenceIds(input: BuildOrganizationalKnowledgePackageInput, singularName: string, arrayName: string): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, singularName)),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function getDerivationLineageIds(input: BuildOrganizationalKnowledgePackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "derivationLineageIds")),
    ...getKnowledgeObjectIds(input),
    ...getKnowledgeRelationshipIds(input),
    ...getMethodologyObjectIds(input),
    ...getMethodologyRelationshipIds(input),
    ...getOrganizationalMemoryPackageIds(input),
    ...getOrganizationalMemoryGraphIds(input),
    ...getEnterpriseMemoryPackageIds(input),
    ...getPortfolioMemoryPackageIds(input),
    ...getOrganizationalMemoryArchiveIds(input),
    ...getMemoryPreservationPackageIds(input),
  ];
}

function buildDerivationHash(input: BuildOrganizationalKnowledgePackageInput): string {
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    derivationLineageIds: getDerivationLineageIds(input),
    knowledgeObjectIds: getKnowledgeObjectIds(input),
    knowledgeRelationshipIds: getKnowledgeRelationshipIds(input),
    methodologyObjectIds: getMethodologyObjectIds(input),
    methodologyRelationshipIds: getMethodologyRelationshipIds(input),
  });
}

function buildOrganizationalKnowledgePackageKey(input: BuildOrganizationalKnowledgePackageInput): string {
  const scope = getPackageScope(input);
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    companyId: scope?.companyId ?? null,
    scope,
    customerIsolation: getPackageCustomerIsolation(input),
    firmIsolation: getPackageFirmIsolation(input),
    clientIsolation: getPackageClientIsolation(input),
    knowledgeObjectIds: getKnowledgeObjectIds(input),
    knowledgeRelationshipIds: getKnowledgeRelationshipIds(input),
    methodologyObjectIds: getMethodologyObjectIds(input),
    methodologyRelationshipIds: getMethodologyRelationshipIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
    enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
    portfolioMemoryPackageIds: getPortfolioMemoryPackageIds(input),
    organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
    memoryPreservationPackageIds: getMemoryPreservationPackageIds(input),
  });
}

function buildOrganizationalKnowledgePackageId(input: BuildOrganizationalKnowledgePackageInput): string {
  return `synthetic-organizational-knowledge-package:${stableSnapshotHash({
    organizationalKnowledgePackageKey: buildOrganizationalKnowledgePackageKey(input),
    packageCategory: input.packageCategory,
    companyId: getPackageScope(input)?.companyId ?? null,
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildOrganizationalKnowledgePackageInput): string[] {
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

function validateInput(input: BuildOrganizationalKnowledgePackageInput): string[] {
  const warnings: string[] = [];
  const sourceArtifacts = getSourceArtifacts(input);
  const scope = getPackageScope(input);
  const companyId = scope?.companyId;

  if (!hasValue(input.packageCategory)) warnings.push("packageCategory is required.");
  if (!isSupportedPackageCategory(input.packageCategory)) warnings.push("packageCategory must be supported.");
  if (sourceArtifacts.length === 0) warnings.push("at least one knowledge, methodology, or memory artifact is required.");
  if (!scope) warnings.push("source scope is required.");
  if (!companyId) warnings.push("source companyId is required.");
  if (!getPackageCustomerIsolation(input)) warnings.push("customerIsolation is required.");
  if (!getPackageFirmIsolation(input)) warnings.push("firmIsolation is required.");
  if (!getPackageClientIsolation(input)) warnings.push("clientIsolation is required.");
  if (getKnowledgeObjectIds(input).length === 0) warnings.push("at least one knowledgeObjectId is required.");

  sourceArtifacts.forEach((artifact, index) => {
    if (!hasValue(artifact.companyId)) warnings.push(`sourceArtifacts[${index}].companyId is required.`);
    if (companyId && artifact.companyId !== companyId) warnings.push(`sourceArtifacts[${index}].companyId must equal source companyId.`);
  });

  for (const [inputName, values, idName, keyName] of [
    ["knowledgeObjects", getKnowledgeObjects(input), "knowledgeObjectId", "knowledgeObjectKey"],
    ["knowledgeRelationships", getKnowledgeRelationships(input), "knowledgeRelationshipId", "knowledgeRelationshipKey"],
    ["methodologyObjects", getMethodologyObjects(input), "methodologyObjectId", "methodologyObjectKey"],
    ["methodologyRelationships", getMethodologyRelationships(input), "methodologyRelationshipId", "methodologyRelationshipKey"],
    ["organizationalMemoryPackages", getOrganizationalMemoryPackages(input), "organizationalMemoryPackageId", "organizationalMemoryPackageKey"],
    ["organizationalMemoryGraphs", getOrganizationalMemoryGraphs(input), "organizationalMemoryGraphId", "organizationalMemoryGraphKey"],
    ["enterpriseMemoryPackages", getEnterpriseMemoryPackages(input), "enterpriseMemoryPackageId", "enterpriseMemoryPackageKey"],
    ["portfolioMemoryPackages", getPortfolioMemoryPackages(input), "portfolioMemoryPackageId", "portfolioMemoryPackageKey"],
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

export function buildOrganizationalKnowledgePackage(
  input: BuildOrganizationalKnowledgePackageInput,
): BuildOrganizationalKnowledgePackageResult {
  const fatalWarnings = validateInput(input);
  const scope = getPackageScope(input);
  const customerIsolation = getPackageCustomerIsolation(input);
  const firmIsolation = getPackageFirmIsolation(input);
  const clientIsolation = getPackageClientIsolation(input);

  if (fatalWarnings.length > 0 || !scope || !customerIsolation || !firmIsolation || !clientIsolation) {
    return {
      organizationalKnowledgePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceArtifacts = getSourceArtifacts(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    organizationalKnowledgePackage: {
      organizationalKnowledgePackageId: buildOrganizationalKnowledgePackageId(input),
      organizationalKnowledgePackageKey: buildOrganizationalKnowledgePackageKey(input),
      packageCategory: input.packageCategory,
      companyId: scope.companyId,
      scope,
      customerIsolation,
      firmIsolation,
      clientIsolation,
      knowledgeObjectIds: getKnowledgeObjectIds(input),
      knowledgeRelationshipIds: getKnowledgeRelationshipIds(input),
      methodologyObjectIds: getMethodologyObjectIds(input),
      methodologyRelationshipIds: getMethodologyRelationshipIds(input),
      derivationLineageIds: getDerivationLineageIds(input),
      derivationMethod: "aggregation",
      derivationHash: buildDerivationHash(input),
      methodologyVersion: getMethodologyObjects(input).map((artifact) => artifact.methodologyVersion),
      methodologyAncestryIds: [
        ...getMethodologyObjects(input).flatMap((artifact) => artifact.methodologyAncestryIds),
        ...getMethodologyRelationships(input).flatMap((artifact) => artifact.methodologyAncestryIds),
      ],
      methodologyDerivationMethod: [
        ...getMethodologyObjects(input).map((artifact) => artifact.methodologyDerivationMethod),
        ...getMethodologyRelationships(input).map((artifact) => artifact.methodologyDerivationMethod),
      ],
      methodologyDerivationHash: [
        ...getMethodologyObjects(input).map((artifact) => artifact.methodologyDerivationHash),
        ...getMethodologyRelationships(input).map((artifact) => artifact.methodologyDerivationHash),
      ],
      supersedesMethodologyIds: [
        ...getMethodologyObjects(input).flatMap((artifact) => artifact.supersedesMethodologyIds),
        ...getMethodologyRelationships(input).flatMap((artifact) => artifact.supersedesMethodologyIds),
      ],
      supersededByMethodologyIds: [
        ...getMethodologyObjects(input).flatMap((artifact) => artifact.supersededByMethodologyIds),
        ...getMethodologyRelationships(input).flatMap((artifact) => artifact.supersededByMethodologyIds),
      ],
      methodologyStaleMarker: [
        ...getMethodologyObjects(input).map((artifact) => artifact.methodologyStaleMarker),
        ...getMethodologyRelationships(input).map((artifact) => artifact.methodologyStaleMarker),
      ],
      knowledgeValidityWindow: [
        ...getKnowledgeObjects(input).map((artifact) => artifact.knowledgeValidityWindow),
        ...getKnowledgeRelationships(input).map((artifact) => artifact.knowledgeValidityWindow),
      ],
      sourceMemorySnapshotIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.sourceMemorySnapshotIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.sourceMemorySnapshotIds),
      ],
      supersedesKnowledgeIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.supersedesKnowledgeIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.supersedesKnowledgeIds),
      ],
      supersededByKnowledgeIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.supersededByKnowledgeIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.supersededByKnowledgeIds),
      ],
      staleMarker: [
        ...getKnowledgeObjects(input).map((artifact) => artifact.staleMarker),
        ...getKnowledgeRelationships(input).map((artifact) => artifact.staleMarker),
      ],
      stalenessReasonReferenceIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.stalenessReasonReferenceIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.stalenessReasonReferenceIds),
      ],
      confidenceFloorMetadata: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticKnowledgeConfidenceFloorMetadata>(artifact, "confidenceFloorMetadata"),
      ),
      sourceConfidenceReferenceIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "sourceConfidenceReferenceIds")),
      evidenceReferenceIds: getReferenceIds(input, "evidenceReferenceId", "evidenceReferenceIds"),
      sourceReferenceIds: getReferenceIds(input, "sourceReferenceId", "sourceReferenceIds"),
      lineageReferenceIds: getReferenceIds(input, "lineageReferenceId", "lineageReferenceIds"),
      upstreamObservationIds: getReferenceIds(input, "upstreamObservationId", "upstreamObservationIds"),
      upstreamPackageIds: getReferenceIds(input, "upstreamPackageId", "upstreamPackageIds"),
      organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
      organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
      enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
      portfolioMemoryPackageIds: getPortfolioMemoryPackageIds(input),
      organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
      memoryPreservationPackageIds: getMemoryPreservationPackageIds(input),
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
      knowledgeObjects: getKnowledgeObjects(input),
      knowledgeRelationships: getKnowledgeRelationships(input),
      methodologyObjects: getMethodologyObjects(input),
      methodologyRelationships: getMethodologyRelationships(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      enterpriseMemoryPackages: getEnterpriseMemoryPackages(input),
      portfolioMemoryPackages: getPortfolioMemoryPackages(input),
      organizationalMemoryArchives: getOrganizationalMemoryArchives(input),
      memoryPreservationPackages: getMemoryPreservationPackages(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
