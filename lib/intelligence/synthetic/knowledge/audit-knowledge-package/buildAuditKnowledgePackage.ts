import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticKnowledgeConfidenceFloorMetadata,
  SyntheticKnowledgeDerivationMethod,
  SyntheticKnowledgeStaleMarker,
  SyntheticKnowledgeValidityWindow,
} from "../contracts";
import type { SyntheticHistoricalKnowledgePackage } from "../historical-knowledge-package";
import type { SyntheticHistoricalMethodologyPackage } from "../historical-methodology-package";
import type { SyntheticKnowledgeObject } from "../knowledge-object";
import type { SyntheticKnowledgeRelationship } from "../knowledge-relationship";
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
import type { SyntheticHistoricalAuditPackage } from "../../organizational-memory/historical-audit-package";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticOrganizationalMemoryArchive } from "../../organizational-memory/organizational-memory-archive";
import type { SyntheticOrganizationalMemoryGraph } from "../../organizational-memory/organizational-memory-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../../organizational-memory/organizational-memory-package";

export type SyntheticAuditKnowledgePackageCategory =
  | "audit_knowledge_package"
  | "audit_evidence_knowledge_package"
  | "audit_finding_knowledge_package"
  | "audit_confidence_knowledge_package"
  | "audit_surface_knowledge_package"
  | "audit_watchlist_knowledge_package"
  | "audit_briefing_knowledge_package";

export type SyntheticAuditKnowledgeSuggestedPersona = "auditor" | "audit_partner" | "controller" | "cfo";

export const SYNTHETIC_AUDIT_KNOWLEDGE_PACKAGE_CATEGORIES: SyntheticAuditKnowledgePackageCategory[] = [
  "audit_knowledge_package",
  "audit_evidence_knowledge_package",
  "audit_finding_knowledge_package",
  "audit_confidence_knowledge_package",
  "audit_surface_knowledge_package",
  "audit_watchlist_knowledge_package",
  "audit_briefing_knowledge_package",
];

export const SYNTHETIC_AUDIT_KNOWLEDGE_SUGGESTED_PERSONAS: SyntheticAuditKnowledgeSuggestedPersona[] = [
  "auditor",
  "audit_partner",
  "controller",
  "cfo",
];

export interface BuildAuditKnowledgePackageInput {
  packageCategory: SyntheticAuditKnowledgePackageCategory;
  knowledgeObjects?: SyntheticKnowledgeObject[];
  knowledgeRelationships?: SyntheticKnowledgeRelationship[];
  historicalKnowledgePackages?: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages?: SyntheticHistoricalMethodologyPackage[];
  organizationalKnowledgePackages?: SyntheticOrganizationalKnowledgePackage[];
  historicalAuditPackages?: SyntheticHistoricalAuditPackage[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryArchives?: SyntheticOrganizationalMemoryArchive[];
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface SyntheticAuditKnowledgePackage {
  auditKnowledgePackageId: string;
  auditKnowledgePackageKey: string;
  packageCategory: SyntheticAuditKnowledgePackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  knowledgeObjectIds: string[];
  knowledgeRelationshipIds: string[];
  historicalKnowledgePackageIds: string[];
  historicalMethodologyPackageIds: string[];
  organizationalKnowledgePackageIds: string[];
  historicalAuditPackageIds: string[];
  derivationLineageIds: string[];
  derivationMethod: SyntheticKnowledgeDerivationMethod;
  derivationHash: string;
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
  organizationalMemoryArchiveIds: string[];
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
  suggestedPersonaCategories: SyntheticAuditKnowledgeSuggestedPersona[];
  executable: false;
  actionReady: false;
  workflowReady: false;
  phase38Required: true;
  knowledgeObjects: SyntheticKnowledgeObject[];
  knowledgeRelationships: SyntheticKnowledgeRelationship[];
  historicalKnowledgePackages: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages: SyntheticHistoricalMethodologyPackage[];
  organizationalKnowledgePackages: SyntheticOrganizationalKnowledgePackage[];
  historicalAuditPackages: SyntheticHistoricalAuditPackage[];
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryArchives: SyntheticOrganizationalMemoryArchive[];
  warnings: string[];
}

export interface BuildAuditKnowledgePackageResult {
  auditKnowledgePackage: SyntheticAuditKnowledgePackage | null;
  skipped: boolean;
  warnings: string[];
}

type AuditKnowledgeSourceArtifact =
  | SyntheticKnowledgeObject
  | SyntheticKnowledgeRelationship
  | SyntheticHistoricalKnowledgePackage
  | SyntheticHistoricalMethodologyPackage
  | SyntheticOrganizationalKnowledgePackage
  | SyntheticHistoricalAuditPackage
  | SyntheticOrganizationalMemoryPackage
  | SyntheticOrganizationalMemoryGraph
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

function isSupportedPackageCategory(packageCategory: SyntheticAuditKnowledgePackageCategory): boolean {
  return SYNTHETIC_AUDIT_KNOWLEDGE_PACKAGE_CATEGORIES.includes(packageCategory);
}

function getKnowledgeObjects(input: BuildAuditKnowledgePackageInput): SyntheticKnowledgeObject[] {
  return getInputArray(input.knowledgeObjects);
}

function getKnowledgeRelationships(input: BuildAuditKnowledgePackageInput): SyntheticKnowledgeRelationship[] {
  return getInputArray(input.knowledgeRelationships);
}

function getHistoricalKnowledgePackages(input: BuildAuditKnowledgePackageInput): SyntheticHistoricalKnowledgePackage[] {
  return getInputArray(input.historicalKnowledgePackages);
}

function getHistoricalMethodologyPackages(input: BuildAuditKnowledgePackageInput): SyntheticHistoricalMethodologyPackage[] {
  return getInputArray(input.historicalMethodologyPackages);
}

function getOrganizationalKnowledgePackages(input: BuildAuditKnowledgePackageInput): SyntheticOrganizationalKnowledgePackage[] {
  return getInputArray(input.organizationalKnowledgePackages);
}

function getHistoricalAuditPackages(input: BuildAuditKnowledgePackageInput): SyntheticHistoricalAuditPackage[] {
  return getInputArray(input.historicalAuditPackages);
}

function getOrganizationalMemoryPackages(input: BuildAuditKnowledgePackageInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getOrganizationalMemoryGraphs(input: BuildAuditKnowledgePackageInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getOrganizationalMemoryArchives(input: BuildAuditKnowledgePackageInput): SyntheticOrganizationalMemoryArchive[] {
  return getInputArray(input.organizationalMemoryArchives);
}

function getSourceArtifacts(input: BuildAuditKnowledgePackageInput): AuditKnowledgeSourceArtifact[] {
  return [
    ...getKnowledgeObjects(input),
    ...getKnowledgeRelationships(input),
    ...getHistoricalKnowledgePackages(input),
    ...getHistoricalMethodologyPackages(input),
    ...getOrganizationalKnowledgePackages(input),
    ...getHistoricalAuditPackages(input),
    ...getOrganizationalMemoryPackages(input),
    ...getOrganizationalMemoryGraphs(input),
    ...getOrganizationalMemoryArchives(input),
  ];
}

function getPackageScope(input: BuildAuditKnowledgePackageInput): SyntheticAuditScope | null {
  return getSourceArtifacts(input)[0]?.scope ?? null;
}

function getPackageCustomerIsolation(input: BuildAuditKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.customerIsolation ?? null;
}

function getPackageFirmIsolation(input: BuildAuditKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.firmIsolation ?? null;
}

function getPackageClientIsolation(input: BuildAuditKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.clientIsolation ?? null;
}

function getKnowledgeObjectIds(input: BuildAuditKnowledgePackageInput): string[] {
  return [
    ...getKnowledgeObjects(input).map((artifact) => artifact.knowledgeObjectId),
    ...getKnowledgeRelationships(input).flatMap((artifact) => [artifact.sourceKnowledgeObjectId, artifact.targetKnowledgeObjectId]),
    ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeObjectIds),
    ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeObjectIds),
  ].filter(hasValue) as string[];
}

function getKnowledgeRelationshipIds(input: BuildAuditKnowledgePackageInput): string[] {
  return [
    ...getKnowledgeRelationships(input).map((artifact) => artifact.knowledgeRelationshipId),
    ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeRelationshipIds),
    ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeRelationshipIds),
  ].filter(hasValue) as string[];
}

function getHistoricalKnowledgePackageIds(input: BuildAuditKnowledgePackageInput): string[] {
  return [
    ...getHistoricalKnowledgePackages(input).map((artifact) => artifact.historicalKnowledgePackageId),
    ...getHistoricalMethodologyPackages(input).flatMap((artifact) => artifact.historicalKnowledgePackageIds),
  ].filter(hasValue) as string[];
}

function getHistoricalMethodologyPackageIds(input: BuildAuditKnowledgePackageInput): string[] {
  return getHistoricalMethodologyPackages(input).map((artifact) => artifact.historicalMethodologyPackageId).filter(hasValue);
}

function getOrganizationalKnowledgePackageIds(input: BuildAuditKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalKnowledgePackages(input).map((artifact) => artifact.organizationalKnowledgePackageId),
    ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.organizationalKnowledgePackageIds),
    ...getHistoricalMethodologyPackages(input).flatMap((artifact) => artifact.organizationalKnowledgePackageIds),
  ].filter(hasValue) as string[];
}

function getHistoricalAuditPackageIds(input: BuildAuditKnowledgePackageInput): string[] {
  return [
    ...getHistoricalAuditPackages(input).map((artifact) => artifact.historicalAuditPackageId),
    ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.historicalAuditPackageIds),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalAuditPackageIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryPackageIds(input: BuildAuditKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryPackages(input).map((artifact) => artifact.organizationalMemoryPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryPackageIds")),
    ...getKnowledgeObjects(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
    ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryGraphIds(input: BuildAuditKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
    ...getKnowledgeObjects(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryGraphIds),
    ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryGraphIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryArchiveIds(input: BuildAuditKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryArchives(input).map((artifact) => artifact.organizationalMemoryArchiveId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryArchiveIds")),
  ].filter(hasValue) as string[];
}

function getReferenceIds(input: BuildAuditKnowledgePackageInput, singularName: string, arrayName: string): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, singularName)),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function getEvidenceReferenceIds(input: BuildAuditKnowledgePackageInput): string[] {
  return [
    ...getReferenceIds(input, "evidenceReferenceId", "evidenceReferenceIds"),
    ...getReferenceIds(input, "auditEvidenceReferenceId", "auditEvidenceReferenceIds"),
  ];
}

function getSourceReferenceIds(input: BuildAuditKnowledgePackageInput): string[] {
  return [
    ...getReferenceIds(input, "sourceReferenceId", "sourceReferenceIds"),
    ...getReferenceIds(input, "auditSourceReferenceId", "auditSourceReferenceIds"),
  ];
}

function getLineageReferenceIds(input: BuildAuditKnowledgePackageInput): string[] {
  return [
    ...getReferenceIds(input, "lineageReferenceId", "lineageReferenceIds"),
    ...getReferenceIds(input, "auditLineageReferenceId", "auditLineageReferenceIds"),
  ];
}

function getDerivationLineageIds(input: BuildAuditKnowledgePackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "derivationLineageIds")),
    ...getKnowledgeObjectIds(input),
    ...getKnowledgeRelationshipIds(input),
    ...getHistoricalKnowledgePackageIds(input),
    ...getHistoricalMethodologyPackageIds(input),
    ...getOrganizationalKnowledgePackageIds(input),
    ...getHistoricalAuditPackageIds(input),
    ...getOrganizationalMemoryPackageIds(input),
    ...getOrganizationalMemoryGraphIds(input),
    ...getOrganizationalMemoryArchiveIds(input),
  ];
}

function buildDerivationHash(input: BuildAuditKnowledgePackageInput): string {
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    derivationLineageIds: getDerivationLineageIds(input),
    knowledgeObjectIds: getKnowledgeObjectIds(input),
    knowledgeRelationshipIds: getKnowledgeRelationshipIds(input),
    historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
    historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    historicalAuditPackageIds: getHistoricalAuditPackageIds(input),
  });
}

function buildAuditKnowledgePackageKey(input: BuildAuditKnowledgePackageInput): string {
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
    historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
    historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    historicalAuditPackageIds: getHistoricalAuditPackageIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
    organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
  });
}

function buildAuditKnowledgePackageId(input: BuildAuditKnowledgePackageInput): string {
  return `synthetic-audit-knowledge-package:${stableSnapshotHash({
    auditKnowledgePackageKey: buildAuditKnowledgePackageKey(input),
    packageCategory: input.packageCategory,
    companyId: getPackageScope(input)?.companyId ?? null,
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildAuditKnowledgePackageInput): string[] {
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

function validateInput(input: BuildAuditKnowledgePackageInput): string[] {
  const warnings: string[] = [];
  const sourceArtifacts = getSourceArtifacts(input);
  const scope = getPackageScope(input);
  const companyId = scope?.companyId;

  if (!hasValue(input.packageCategory)) warnings.push("packageCategory is required.");
  if (!isSupportedPackageCategory(input.packageCategory)) warnings.push("packageCategory must be supported.");
  if (sourceArtifacts.length === 0) warnings.push("at least one audit knowledge source artifact is required.");
  if (!scope) warnings.push("source scope is required.");
  if (!companyId) warnings.push("source companyId is required.");
  if (!getPackageCustomerIsolation(input)) warnings.push("customerIsolation is required.");
  if (!getPackageFirmIsolation(input)) warnings.push("firmIsolation is required.");
  if (!getPackageClientIsolation(input)) warnings.push("clientIsolation is required.");
  if (getKnowledgeObjectIds(input).length === 0) warnings.push("at least one knowledgeObjectId is required.");
  if (getHistoricalAuditPackageIds(input).length === 0) warnings.push("at least one historicalAuditPackageId is required.");

  sourceArtifacts.forEach((artifact, index) => {
    if (!hasValue(artifact.companyId)) warnings.push(`sourceArtifacts[${index}].companyId is required.`);
    if (companyId && artifact.companyId !== companyId) warnings.push(`sourceArtifacts[${index}].companyId must equal source companyId.`);
  });

  for (const [inputName, values, idName, keyName] of [
    ["knowledgeObjects", getKnowledgeObjects(input), "knowledgeObjectId", "knowledgeObjectKey"],
    ["knowledgeRelationships", getKnowledgeRelationships(input), "knowledgeRelationshipId", "knowledgeRelationshipKey"],
    ["historicalKnowledgePackages", getHistoricalKnowledgePackages(input), "historicalKnowledgePackageId", "historicalKnowledgePackageKey"],
    ["historicalMethodologyPackages", getHistoricalMethodologyPackages(input), "historicalMethodologyPackageId", "historicalMethodologyPackageKey"],
    ["organizationalKnowledgePackages", getOrganizationalKnowledgePackages(input), "organizationalKnowledgePackageId", "organizationalKnowledgePackageKey"],
    ["historicalAuditPackages", getHistoricalAuditPackages(input), "historicalAuditPackageId", "historicalAuditPackageKey"],
    ["organizationalMemoryPackages", getOrganizationalMemoryPackages(input), "organizationalMemoryPackageId", "organizationalMemoryPackageKey"],
    ["organizationalMemoryGraphs", getOrganizationalMemoryGraphs(input), "organizationalMemoryGraphId", "organizationalMemoryGraphKey"],
    ["organizationalMemoryArchives", getOrganizationalMemoryArchives(input), "organizationalMemoryArchiveId", "organizationalMemoryArchiveKey"],
  ] as const) {
    values.forEach((artifact, index) => {
      if (!hasValue((artifact as unknown as ReferenceRecord)[idName])) warnings.push(`${inputName}[${index}].${idName} is required.`);
      if (!hasValue((artifact as unknown as ReferenceRecord)[keyName])) warnings.push(`${inputName}[${index}].${keyName} is required.`);
    });
  }

  return warnings;
}

export function buildAuditKnowledgePackage(input: BuildAuditKnowledgePackageInput): BuildAuditKnowledgePackageResult {
  const fatalWarnings = validateInput(input);
  const scope = getPackageScope(input);
  const customerIsolation = getPackageCustomerIsolation(input);
  const firmIsolation = getPackageFirmIsolation(input);
  const clientIsolation = getPackageClientIsolation(input);

  if (fatalWarnings.length > 0 || !scope || !customerIsolation || !firmIsolation || !clientIsolation) {
    return {
      auditKnowledgePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceArtifacts = getSourceArtifacts(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    auditKnowledgePackage: {
      auditKnowledgePackageId: buildAuditKnowledgePackageId(input),
      auditKnowledgePackageKey: buildAuditKnowledgePackageKey(input),
      packageCategory: input.packageCategory,
      companyId: scope.companyId,
      scope,
      customerIsolation,
      firmIsolation,
      clientIsolation,
      knowledgeObjectIds: getKnowledgeObjectIds(input),
      knowledgeRelationshipIds: getKnowledgeRelationshipIds(input),
      historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
      historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
      organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
      historicalAuditPackageIds: getHistoricalAuditPackageIds(input),
      derivationLineageIds: getDerivationLineageIds(input),
      derivationMethod: "historical_context_preservation",
      derivationHash: buildDerivationHash(input),
      knowledgeValidityWindow: [
        ...getKnowledgeObjects(input).map((artifact) => artifact.knowledgeValidityWindow),
        ...getKnowledgeRelationships(input).map((artifact) => artifact.knowledgeValidityWindow),
        ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeValidityWindow),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeValidityWindow),
      ],
      sourceMemorySnapshotIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.sourceMemorySnapshotIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.sourceMemorySnapshotIds),
        ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.sourceMemorySnapshotIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.sourceMemorySnapshotIds),
      ],
      supersedesKnowledgeIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.supersedesKnowledgeIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.supersedesKnowledgeIds),
        ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.supersedesKnowledgeIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.supersedesKnowledgeIds),
      ],
      supersededByKnowledgeIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.supersededByKnowledgeIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.supersededByKnowledgeIds),
        ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.supersededByKnowledgeIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.supersededByKnowledgeIds),
      ],
      staleMarker: [
        ...getKnowledgeObjects(input).map((artifact) => artifact.staleMarker),
        ...getKnowledgeRelationships(input).map((artifact) => artifact.staleMarker),
        ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.staleMarker),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.staleMarker),
      ],
      stalenessReasonReferenceIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.stalenessReasonReferenceIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.stalenessReasonReferenceIds),
        ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.stalenessReasonReferenceIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.stalenessReasonReferenceIds),
      ],
      confidenceFloorMetadata: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticKnowledgeConfidenceFloorMetadata>(artifact, "confidenceFloorMetadata"),
      ),
      sourceConfidenceReferenceIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "sourceConfidenceReferenceIds")),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      sourceReferenceIds: getSourceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      upstreamObservationIds: getReferenceIds(input, "upstreamObservationId", "upstreamObservationIds"),
      upstreamPackageIds: getReferenceIds(input, "upstreamPackageId", "upstreamPackageIds"),
      organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
      organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
      organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
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
      suggestedPersonaCategories: SYNTHETIC_AUDIT_KNOWLEDGE_SUGGESTED_PERSONAS,
      executable: false,
      actionReady: false,
      workflowReady: false,
      phase38Required: true,
      knowledgeObjects: getKnowledgeObjects(input),
      knowledgeRelationships: getKnowledgeRelationships(input),
      historicalKnowledgePackages: getHistoricalKnowledgePackages(input),
      historicalMethodologyPackages: getHistoricalMethodologyPackages(input),
      organizationalKnowledgePackages: getOrganizationalKnowledgePackages(input),
      historicalAuditPackages: getHistoricalAuditPackages(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      organizationalMemoryArchives: getOrganizationalMemoryArchives(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
