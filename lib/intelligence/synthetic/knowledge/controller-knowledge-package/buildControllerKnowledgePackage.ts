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
import type { SyntheticHistoricalControllerPackage } from "../../organizational-memory/historical-controller-package";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticOrganizationalMemoryArchive } from "../../organizational-memory/organizational-memory-archive";
import type { SyntheticOrganizationalMemoryGraph } from "../../organizational-memory/organizational-memory-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../../organizational-memory/organizational-memory-package";

export type SyntheticControllerKnowledgePackageCategory =
  | "controller_knowledge_package"
  | "controller_review_knowledge_package"
  | "executive_briefing_knowledge_package"
  | "close_context_knowledge_package"
  | "close_support_knowledge_package"
  | "firm_controller_knowledge_package";

export type SyntheticControllerKnowledgeSuggestedPersona =
  | "controller"
  | "accounting_manager"
  | "finance_director"
  | "cfo"
  | "executive";

export const SYNTHETIC_CONTROLLER_KNOWLEDGE_PACKAGE_CATEGORIES: SyntheticControllerKnowledgePackageCategory[] = [
  "controller_knowledge_package",
  "controller_review_knowledge_package",
  "executive_briefing_knowledge_package",
  "close_context_knowledge_package",
  "close_support_knowledge_package",
  "firm_controller_knowledge_package",
];

export const SYNTHETIC_CONTROLLER_KNOWLEDGE_SUGGESTED_PERSONAS: SyntheticControllerKnowledgeSuggestedPersona[] = [
  "controller",
  "accounting_manager",
  "finance_director",
  "cfo",
  "executive",
];

export interface BuildControllerKnowledgePackageInput {
  packageCategory: SyntheticControllerKnowledgePackageCategory;
  knowledgeObjects?: SyntheticKnowledgeObject[];
  knowledgeRelationships?: SyntheticKnowledgeRelationship[];
  historicalKnowledgePackages?: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages?: SyntheticHistoricalMethodologyPackage[];
  organizationalKnowledgePackages?: SyntheticOrganizationalKnowledgePackage[];
  historicalControllerPackages?: SyntheticHistoricalControllerPackage[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryArchives?: SyntheticOrganizationalMemoryArchive[];
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface SyntheticControllerKnowledgePackage {
  controllerKnowledgePackageId: string;
  controllerKnowledgePackageKey: string;
  packageCategory: SyntheticControllerKnowledgePackageCategory;
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
  historicalControllerPackageIds: string[];
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
  suggestedPersonaCategories: SyntheticControllerKnowledgeSuggestedPersona[];
  executable: false;
  actionReady: false;
  workflowReady: false;
  phase38Required: true;
  knowledgeObjects: SyntheticKnowledgeObject[];
  knowledgeRelationships: SyntheticKnowledgeRelationship[];
  historicalKnowledgePackages: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages: SyntheticHistoricalMethodologyPackage[];
  organizationalKnowledgePackages: SyntheticOrganizationalKnowledgePackage[];
  historicalControllerPackages: SyntheticHistoricalControllerPackage[];
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryArchives: SyntheticOrganizationalMemoryArchive[];
  warnings: string[];
}

export interface BuildControllerKnowledgePackageResult {
  controllerKnowledgePackage: SyntheticControllerKnowledgePackage | null;
  skipped: boolean;
  warnings: string[];
}

type ControllerKnowledgeSourceArtifact =
  | SyntheticKnowledgeObject
  | SyntheticKnowledgeRelationship
  | SyntheticHistoricalKnowledgePackage
  | SyntheticHistoricalMethodologyPackage
  | SyntheticOrganizationalKnowledgePackage
  | SyntheticHistoricalControllerPackage
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

function isSupportedPackageCategory(packageCategory: SyntheticControllerKnowledgePackageCategory): boolean {
  return SYNTHETIC_CONTROLLER_KNOWLEDGE_PACKAGE_CATEGORIES.includes(packageCategory);
}

function getKnowledgeObjects(input: BuildControllerKnowledgePackageInput): SyntheticKnowledgeObject[] {
  return getInputArray(input.knowledgeObjects);
}

function getKnowledgeRelationships(input: BuildControllerKnowledgePackageInput): SyntheticKnowledgeRelationship[] {
  return getInputArray(input.knowledgeRelationships);
}

function getHistoricalKnowledgePackages(input: BuildControllerKnowledgePackageInput): SyntheticHistoricalKnowledgePackage[] {
  return getInputArray(input.historicalKnowledgePackages);
}

function getHistoricalMethodologyPackages(input: BuildControllerKnowledgePackageInput): SyntheticHistoricalMethodologyPackage[] {
  return getInputArray(input.historicalMethodologyPackages);
}

function getOrganizationalKnowledgePackages(input: BuildControllerKnowledgePackageInput): SyntheticOrganizationalKnowledgePackage[] {
  return getInputArray(input.organizationalKnowledgePackages);
}

function getHistoricalControllerPackages(input: BuildControllerKnowledgePackageInput): SyntheticHistoricalControllerPackage[] {
  return getInputArray(input.historicalControllerPackages);
}

function getOrganizationalMemoryPackages(input: BuildControllerKnowledgePackageInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getOrganizationalMemoryGraphs(input: BuildControllerKnowledgePackageInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getOrganizationalMemoryArchives(input: BuildControllerKnowledgePackageInput): SyntheticOrganizationalMemoryArchive[] {
  return getInputArray(input.organizationalMemoryArchives);
}

function getSourceArtifacts(input: BuildControllerKnowledgePackageInput): ControllerKnowledgeSourceArtifact[] {
  return [
    ...getKnowledgeObjects(input),
    ...getKnowledgeRelationships(input),
    ...getHistoricalKnowledgePackages(input),
    ...getHistoricalMethodologyPackages(input),
    ...getOrganizationalKnowledgePackages(input),
    ...getHistoricalControllerPackages(input),
    ...getOrganizationalMemoryPackages(input),
    ...getOrganizationalMemoryGraphs(input),
    ...getOrganizationalMemoryArchives(input),
  ];
}

function getPackageScope(input: BuildControllerKnowledgePackageInput): SyntheticAuditScope | null {
  return getSourceArtifacts(input)[0]?.scope ?? null;
}

function getPackageCustomerIsolation(input: BuildControllerKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.customerIsolation ?? null;
}

function getPackageFirmIsolation(input: BuildControllerKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.firmIsolation ?? null;
}

function getPackageClientIsolation(input: BuildControllerKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.clientIsolation ?? null;
}

function getKnowledgeObjectIds(input: BuildControllerKnowledgePackageInput): string[] {
  return [
    ...getKnowledgeObjects(input).map((artifact) => artifact.knowledgeObjectId),
    ...getKnowledgeRelationships(input).flatMap((artifact) => [artifact.sourceKnowledgeObjectId, artifact.targetKnowledgeObjectId]),
    ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeObjectIds),
    ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeObjectIds),
  ].filter(hasValue) as string[];
}

function getKnowledgeRelationshipIds(input: BuildControllerKnowledgePackageInput): string[] {
  return [
    ...getKnowledgeRelationships(input).map((artifact) => artifact.knowledgeRelationshipId),
    ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeRelationshipIds),
    ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeRelationshipIds),
  ].filter(hasValue) as string[];
}

function getHistoricalKnowledgePackageIds(input: BuildControllerKnowledgePackageInput): string[] {
  return [
    ...getHistoricalKnowledgePackages(input).map((artifact) => artifact.historicalKnowledgePackageId),
    ...getHistoricalMethodologyPackages(input).flatMap((artifact) => artifact.historicalKnowledgePackageIds),
  ].filter(hasValue) as string[];
}

function getHistoricalMethodologyPackageIds(input: BuildControllerKnowledgePackageInput): string[] {
  return getHistoricalMethodologyPackages(input).map((artifact) => artifact.historicalMethodologyPackageId).filter(hasValue);
}

function getOrganizationalKnowledgePackageIds(input: BuildControllerKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalKnowledgePackages(input).map((artifact) => artifact.organizationalKnowledgePackageId),
    ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.organizationalKnowledgePackageIds),
    ...getHistoricalMethodologyPackages(input).flatMap((artifact) => artifact.organizationalKnowledgePackageIds),
  ].filter(hasValue) as string[];
}

function getHistoricalControllerPackageIds(input: BuildControllerKnowledgePackageInput): string[] {
  return [
    ...getHistoricalControllerPackages(input).map((artifact) => artifact.historicalControllerPackageId),
    ...getHistoricalKnowledgePackages(input).flatMap((artifact) => artifact.historicalControllerPackageIds),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalControllerPackageIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryPackageIds(input: BuildControllerKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryPackages(input).map((artifact) => artifact.organizationalMemoryPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryPackageIds")),
    ...getKnowledgeObjects(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
    ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryGraphIds(input: BuildControllerKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
    ...getKnowledgeObjects(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryGraphIds),
    ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryGraphIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryArchiveIds(input: BuildControllerKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryArchives(input).map((artifact) => artifact.organizationalMemoryArchiveId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryArchiveIds")),
  ].filter(hasValue) as string[];
}

function getReferenceIds(input: BuildControllerKnowledgePackageInput, singularName: string, arrayName: string): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, singularName)),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function getEvidenceReferenceIds(input: BuildControllerKnowledgePackageInput): string[] {
  return [
    ...getReferenceIds(input, "evidenceReferenceId", "evidenceReferenceIds"),
    ...getReferenceIds(input, "controllerEvidenceReferenceId", "controllerEvidenceReferenceIds"),
  ];
}

function getSourceReferenceIds(input: BuildControllerKnowledgePackageInput): string[] {
  return [
    ...getReferenceIds(input, "sourceReferenceId", "sourceReferenceIds"),
    ...getReferenceIds(input, "controllerSourceReferenceId", "controllerSourceReferenceIds"),
  ];
}

function getLineageReferenceIds(input: BuildControllerKnowledgePackageInput): string[] {
  return [
    ...getReferenceIds(input, "lineageReferenceId", "lineageReferenceIds"),
    ...getReferenceIds(input, "controllerLineageReferenceId", "controllerLineageReferenceIds"),
  ];
}

function getDerivationLineageIds(input: BuildControllerKnowledgePackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "derivationLineageIds")),
    ...getKnowledgeObjectIds(input),
    ...getKnowledgeRelationshipIds(input),
    ...getHistoricalKnowledgePackageIds(input),
    ...getHistoricalMethodologyPackageIds(input),
    ...getOrganizationalKnowledgePackageIds(input),
    ...getHistoricalControllerPackageIds(input),
    ...getOrganizationalMemoryPackageIds(input),
    ...getOrganizationalMemoryGraphIds(input),
    ...getOrganizationalMemoryArchiveIds(input),
  ];
}

function buildDerivationHash(input: BuildControllerKnowledgePackageInput): string {
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    derivationLineageIds: getDerivationLineageIds(input),
    knowledgeObjectIds: getKnowledgeObjectIds(input),
    knowledgeRelationshipIds: getKnowledgeRelationshipIds(input),
    historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
    historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    historicalControllerPackageIds: getHistoricalControllerPackageIds(input),
  });
}

function buildControllerKnowledgePackageKey(input: BuildControllerKnowledgePackageInput): string {
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
    historicalControllerPackageIds: getHistoricalControllerPackageIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
    organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
  });
}

function buildControllerKnowledgePackageId(input: BuildControllerKnowledgePackageInput): string {
  return `synthetic-controller-knowledge-package:${stableSnapshotHash({
    controllerKnowledgePackageKey: buildControllerKnowledgePackageKey(input),
    packageCategory: input.packageCategory,
    companyId: getPackageScope(input)?.companyId ?? null,
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildControllerKnowledgePackageInput): string[] {
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

function validateInput(input: BuildControllerKnowledgePackageInput): string[] {
  const warnings: string[] = [];
  const sourceArtifacts = getSourceArtifacts(input);
  const scope = getPackageScope(input);
  const companyId = scope?.companyId;

  if (!hasValue(input.packageCategory)) warnings.push("packageCategory is required.");
  if (!isSupportedPackageCategory(input.packageCategory)) warnings.push("packageCategory must be supported.");
  if (sourceArtifacts.length === 0) warnings.push("at least one controller knowledge source artifact is required.");
  if (!scope) warnings.push("source scope is required.");
  if (!companyId) warnings.push("source companyId is required.");
  if (!getPackageCustomerIsolation(input)) warnings.push("customerIsolation is required.");
  if (!getPackageFirmIsolation(input)) warnings.push("firmIsolation is required.");
  if (!getPackageClientIsolation(input)) warnings.push("clientIsolation is required.");
  if (getKnowledgeObjectIds(input).length === 0) warnings.push("at least one knowledgeObjectId is required.");
  if (getHistoricalControllerPackageIds(input).length === 0) warnings.push("at least one historicalControllerPackageId is required.");

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
    ["historicalControllerPackages", getHistoricalControllerPackages(input), "historicalControllerPackageId", "historicalControllerPackageKey"],
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

export function buildControllerKnowledgePackage(input: BuildControllerKnowledgePackageInput): BuildControllerKnowledgePackageResult {
  const fatalWarnings = validateInput(input);
  const scope = getPackageScope(input);
  const customerIsolation = getPackageCustomerIsolation(input);
  const firmIsolation = getPackageFirmIsolation(input);
  const clientIsolation = getPackageClientIsolation(input);

  if (fatalWarnings.length > 0 || !scope || !customerIsolation || !firmIsolation || !clientIsolation) {
    return {
      controllerKnowledgePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceArtifacts = getSourceArtifacts(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    controllerKnowledgePackage: {
      controllerKnowledgePackageId: buildControllerKnowledgePackageId(input),
      controllerKnowledgePackageKey: buildControllerKnowledgePackageKey(input),
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
      historicalControllerPackageIds: getHistoricalControllerPackageIds(input),
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
      suggestedPersonaCategories: SYNTHETIC_CONTROLLER_KNOWLEDGE_SUGGESTED_PERSONAS,
      executable: false,
      actionReady: false,
      workflowReady: false,
      phase38Required: true,
      knowledgeObjects: getKnowledgeObjects(input),
      knowledgeRelationships: getKnowledgeRelationships(input),
      historicalKnowledgePackages: getHistoricalKnowledgePackages(input),
      historicalMethodologyPackages: getHistoricalMethodologyPackages(input),
      organizationalKnowledgePackages: getOrganizationalKnowledgePackages(input),
      historicalControllerPackages: getHistoricalControllerPackages(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      organizationalMemoryArchives: getOrganizationalMemoryArchives(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
