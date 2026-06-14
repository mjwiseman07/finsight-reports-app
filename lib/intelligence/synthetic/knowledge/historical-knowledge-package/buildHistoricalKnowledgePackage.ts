import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticKnowledgeConfidenceFloorMetadata,
  SyntheticKnowledgeDerivationMethod,
  SyntheticKnowledgeStaleMarker,
  SyntheticKnowledgeValidityWindow,
} from "../contracts";
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
import type { SyntheticHistoricalControllerPackage } from "../../organizational-memory/historical-controller-package";
import type { SyntheticHistoricalDecisionPackage } from "../../organizational-memory/historical-decision-package";
import type { SyntheticHistoricalOutcomePackage } from "../../organizational-memory/historical-outcome-package";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticOrganizationalMemoryArchive } from "../../organizational-memory/organizational-memory-archive";
import type { SyntheticOrganizationalMemoryGraph } from "../../organizational-memory/organizational-memory-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../../organizational-memory/organizational-memory-package";

export type SyntheticHistoricalKnowledgePackageCategory =
  | "historical_knowledge_package"
  | "historical_outcome_knowledge_package"
  | "historical_decision_knowledge_package"
  | "historical_audit_knowledge_package"
  | "historical_controller_knowledge_package"
  | "organizational_history_knowledge_package";

export const SYNTHETIC_HISTORICAL_KNOWLEDGE_PACKAGE_CATEGORIES: SyntheticHistoricalKnowledgePackageCategory[] = [
  "historical_knowledge_package",
  "historical_outcome_knowledge_package",
  "historical_decision_knowledge_package",
  "historical_audit_knowledge_package",
  "historical_controller_knowledge_package",
  "organizational_history_knowledge_package",
];

export interface BuildHistoricalKnowledgePackageInput {
  packageCategory: SyntheticHistoricalKnowledgePackageCategory;
  knowledgeObjects?: SyntheticKnowledgeObject[];
  knowledgeRelationships?: SyntheticKnowledgeRelationship[];
  organizationalKnowledgePackages?: SyntheticOrganizationalKnowledgePackage[];
  historicalOutcomePackages?: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages?: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages?: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages?: SyntheticHistoricalControllerPackage[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryArchives?: SyntheticOrganizationalMemoryArchive[];
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface SyntheticHistoricalKnowledgePackage {
  historicalKnowledgePackageId: string;
  historicalKnowledgePackageKey: string;
  packageCategory: SyntheticHistoricalKnowledgePackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  knowledgeObjectIds: string[];
  knowledgeRelationshipIds: string[];
  organizationalKnowledgePackageIds: string[];
  historicalOutcomePackageIds: string[];
  historicalDecisionPackageIds: string[];
  historicalAuditPackageIds: string[];
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
  executable: false;
  actionReady: false;
  workflowReady: false;
  phase38Required: true;
  knowledgeObjects: SyntheticKnowledgeObject[];
  knowledgeRelationships: SyntheticKnowledgeRelationship[];
  organizationalKnowledgePackages: SyntheticOrganizationalKnowledgePackage[];
  historicalOutcomePackages: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages: SyntheticHistoricalControllerPackage[];
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryArchives: SyntheticOrganizationalMemoryArchive[];
  warnings: string[];
}

export interface BuildHistoricalKnowledgePackageResult {
  historicalKnowledgePackage: SyntheticHistoricalKnowledgePackage | null;
  skipped: boolean;
  warnings: string[];
}

type HistoricalKnowledgeSourceArtifact =
  | SyntheticKnowledgeObject
  | SyntheticKnowledgeRelationship
  | SyntheticOrganizationalKnowledgePackage
  | SyntheticHistoricalOutcomePackage
  | SyntheticHistoricalDecisionPackage
  | SyntheticHistoricalAuditPackage
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

function isSupportedPackageCategory(packageCategory: SyntheticHistoricalKnowledgePackageCategory): boolean {
  return SYNTHETIC_HISTORICAL_KNOWLEDGE_PACKAGE_CATEGORIES.includes(packageCategory);
}

function getKnowledgeObjects(input: BuildHistoricalKnowledgePackageInput): SyntheticKnowledgeObject[] {
  return getInputArray(input.knowledgeObjects);
}

function getKnowledgeRelationships(input: BuildHistoricalKnowledgePackageInput): SyntheticKnowledgeRelationship[] {
  return getInputArray(input.knowledgeRelationships);
}

function getOrganizationalKnowledgePackages(input: BuildHistoricalKnowledgePackageInput): SyntheticOrganizationalKnowledgePackage[] {
  return getInputArray(input.organizationalKnowledgePackages);
}

function getHistoricalOutcomePackages(input: BuildHistoricalKnowledgePackageInput): SyntheticHistoricalOutcomePackage[] {
  return getInputArray(input.historicalOutcomePackages);
}

function getHistoricalDecisionPackages(input: BuildHistoricalKnowledgePackageInput): SyntheticHistoricalDecisionPackage[] {
  return getInputArray(input.historicalDecisionPackages);
}

function getHistoricalAuditPackages(input: BuildHistoricalKnowledgePackageInput): SyntheticHistoricalAuditPackage[] {
  return getInputArray(input.historicalAuditPackages);
}

function getHistoricalControllerPackages(input: BuildHistoricalKnowledgePackageInput): SyntheticHistoricalControllerPackage[] {
  return getInputArray(input.historicalControllerPackages);
}

function getOrganizationalMemoryPackages(input: BuildHistoricalKnowledgePackageInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getOrganizationalMemoryGraphs(input: BuildHistoricalKnowledgePackageInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getOrganizationalMemoryArchives(input: BuildHistoricalKnowledgePackageInput): SyntheticOrganizationalMemoryArchive[] {
  return getInputArray(input.organizationalMemoryArchives);
}

function getSourceArtifacts(input: BuildHistoricalKnowledgePackageInput): HistoricalKnowledgeSourceArtifact[] {
  return [
    ...getKnowledgeObjects(input),
    ...getKnowledgeRelationships(input),
    ...getOrganizationalKnowledgePackages(input),
    ...getHistoricalOutcomePackages(input),
    ...getHistoricalDecisionPackages(input),
    ...getHistoricalAuditPackages(input),
    ...getHistoricalControllerPackages(input),
    ...getOrganizationalMemoryPackages(input),
    ...getOrganizationalMemoryGraphs(input),
    ...getOrganizationalMemoryArchives(input),
  ];
}

function getPackageScope(input: BuildHistoricalKnowledgePackageInput): SyntheticAuditScope | null {
  return getSourceArtifacts(input)[0]?.scope ?? null;
}

function getPackageCustomerIsolation(input: BuildHistoricalKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.customerIsolation ?? null;
}

function getPackageFirmIsolation(input: BuildHistoricalKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.firmIsolation ?? null;
}

function getPackageClientIsolation(input: BuildHistoricalKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.clientIsolation ?? null;
}

function getKnowledgeObjectIds(input: BuildHistoricalKnowledgePackageInput): string[] {
  return [
    ...getKnowledgeObjects(input).map((artifact) => artifact.knowledgeObjectId),
    ...getKnowledgeRelationships(input).flatMap((artifact) => [artifact.sourceKnowledgeObjectId, artifact.targetKnowledgeObjectId]),
    ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeObjectIds),
  ].filter(hasValue) as string[];
}

function getKnowledgeRelationshipIds(input: BuildHistoricalKnowledgePackageInput): string[] {
  return [
    ...getKnowledgeRelationships(input).map((artifact) => artifact.knowledgeRelationshipId),
    ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeRelationshipIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalKnowledgePackageIds(input: BuildHistoricalKnowledgePackageInput): string[] {
  return getOrganizationalKnowledgePackages(input)
    .map((artifact) => artifact.organizationalKnowledgePackageId)
    .filter(hasValue);
}

function getHistoricalOutcomePackageIds(input: BuildHistoricalKnowledgePackageInput): string[] {
  return [
    ...getHistoricalOutcomePackages(input).map((artifact) => artifact.historicalOutcomePackageId),
    ...getHistoricalAuditPackages(input).flatMap((artifact) => artifact.historicalOutcomePackageIds),
    ...getHistoricalControllerPackages(input).flatMap((artifact) => artifact.historicalOutcomePackageIds),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalOutcomePackageIds")),
  ].filter(hasValue) as string[];
}

function getHistoricalDecisionPackageIds(input: BuildHistoricalKnowledgePackageInput): string[] {
  return [
    ...getHistoricalDecisionPackages(input).map((artifact) => artifact.historicalDecisionPackageId),
    ...getHistoricalAuditPackages(input).flatMap((artifact) => artifact.historicalDecisionPackageIds),
    ...getHistoricalControllerPackages(input).flatMap((artifact) => artifact.historicalDecisionPackageIds),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalDecisionPackageIds")),
  ].filter(hasValue) as string[];
}

function getHistoricalAuditPackageIds(input: BuildHistoricalKnowledgePackageInput): string[] {
  return getHistoricalAuditPackages(input).map((artifact) => artifact.historicalAuditPackageId).filter(hasValue);
}

function getHistoricalControllerPackageIds(input: BuildHistoricalKnowledgePackageInput): string[] {
  return getHistoricalControllerPackages(input).map((artifact) => artifact.historicalControllerPackageId).filter(hasValue);
}

function getOrganizationalMemoryPackageIds(input: BuildHistoricalKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryPackages(input).map((artifact) => artifact.organizationalMemoryPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryPackageIds")),
    ...getKnowledgeObjects(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
    ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryPackageIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryGraphIds(input: BuildHistoricalKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
    ...getKnowledgeObjects(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryGraphIds),
    ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.sourceOrganizationalMemoryGraphIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryArchiveIds(input: BuildHistoricalKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryArchives(input).map((artifact) => artifact.organizationalMemoryArchiveId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryArchiveIds")),
  ].filter(hasValue) as string[];
}

function getReferenceIds(input: BuildHistoricalKnowledgePackageInput, singularName: string, arrayName: string): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, singularName)),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function getEvidenceReferenceIds(input: BuildHistoricalKnowledgePackageInput): string[] {
  return [
    ...getReferenceIds(input, "evidenceReferenceId", "evidenceReferenceIds"),
    ...getReferenceIds(input, "outcomeEvidenceReferenceId", "outcomeEvidenceReferenceIds"),
    ...getReferenceIds(input, "decisionEvidenceReferenceId", "decisionEvidenceReferenceIds"),
    ...getReferenceIds(input, "auditEvidenceReferenceId", "auditEvidenceReferenceIds"),
    ...getReferenceIds(input, "controllerEvidenceReferenceId", "controllerEvidenceReferenceIds"),
  ];
}

function getSourceReferenceIds(input: BuildHistoricalKnowledgePackageInput): string[] {
  return [
    ...getReferenceIds(input, "sourceReferenceId", "sourceReferenceIds"),
    ...getReferenceIds(input, "outcomeSourceReferenceId", "outcomeSourceReferenceIds"),
    ...getReferenceIds(input, "decisionSourceReferenceId", "decisionSourceReferenceIds"),
    ...getReferenceIds(input, "auditSourceReferenceId", "auditSourceReferenceIds"),
    ...getReferenceIds(input, "controllerSourceReferenceId", "controllerSourceReferenceIds"),
  ];
}

function getLineageReferenceIds(input: BuildHistoricalKnowledgePackageInput): string[] {
  return [
    ...getReferenceIds(input, "lineageReferenceId", "lineageReferenceIds"),
    ...getReferenceIds(input, "outcomeLineageReferenceId", "outcomeLineageReferenceIds"),
    ...getReferenceIds(input, "decisionLineageReferenceId", "decisionLineageReferenceIds"),
    ...getReferenceIds(input, "auditLineageReferenceId", "auditLineageReferenceIds"),
    ...getReferenceIds(input, "controllerLineageReferenceId", "controllerLineageReferenceIds"),
  ];
}

function getDerivationLineageIds(input: BuildHistoricalKnowledgePackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "derivationLineageIds")),
    ...getKnowledgeObjectIds(input),
    ...getKnowledgeRelationshipIds(input),
    ...getOrganizationalKnowledgePackageIds(input),
    ...getHistoricalOutcomePackageIds(input),
    ...getHistoricalDecisionPackageIds(input),
    ...getHistoricalAuditPackageIds(input),
    ...getHistoricalControllerPackageIds(input),
    ...getOrganizationalMemoryPackageIds(input),
    ...getOrganizationalMemoryGraphIds(input),
    ...getOrganizationalMemoryArchiveIds(input),
  ];
}

function buildDerivationHash(input: BuildHistoricalKnowledgePackageInput): string {
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    derivationLineageIds: getDerivationLineageIds(input),
    knowledgeObjectIds: getKnowledgeObjectIds(input),
    knowledgeRelationshipIds: getKnowledgeRelationshipIds(input),
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    historicalOutcomePackageIds: getHistoricalOutcomePackageIds(input),
    historicalDecisionPackageIds: getHistoricalDecisionPackageIds(input),
    historicalAuditPackageIds: getHistoricalAuditPackageIds(input),
    historicalControllerPackageIds: getHistoricalControllerPackageIds(input),
  });
}

function buildHistoricalKnowledgePackageKey(input: BuildHistoricalKnowledgePackageInput): string {
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
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    historicalOutcomePackageIds: getHistoricalOutcomePackageIds(input),
    historicalDecisionPackageIds: getHistoricalDecisionPackageIds(input),
    historicalAuditPackageIds: getHistoricalAuditPackageIds(input),
    historicalControllerPackageIds: getHistoricalControllerPackageIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
    organizationalMemoryArchiveIds: getOrganizationalMemoryArchiveIds(input),
  });
}

function buildHistoricalKnowledgePackageId(input: BuildHistoricalKnowledgePackageInput): string {
  return `synthetic-historical-knowledge-package:${stableSnapshotHash({
    historicalKnowledgePackageKey: buildHistoricalKnowledgePackageKey(input),
    packageCategory: input.packageCategory,
    companyId: getPackageScope(input)?.companyId ?? null,
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildHistoricalKnowledgePackageInput): string[] {
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

function validateInput(input: BuildHistoricalKnowledgePackageInput): string[] {
  const warnings: string[] = [];
  const sourceArtifacts = getSourceArtifacts(input);
  const scope = getPackageScope(input);
  const companyId = scope?.companyId;

  if (!hasValue(input.packageCategory)) warnings.push("packageCategory is required.");
  if (!isSupportedPackageCategory(input.packageCategory)) warnings.push("packageCategory must be supported.");
  if (sourceArtifacts.length === 0) warnings.push("at least one historical knowledge source artifact is required.");
  if (!scope) warnings.push("source scope is required.");
  if (!companyId) warnings.push("source companyId is required.");
  if (!getPackageCustomerIsolation(input)) warnings.push("customerIsolation is required.");
  if (!getPackageFirmIsolation(input)) warnings.push("firmIsolation is required.");
  if (!getPackageClientIsolation(input)) warnings.push("clientIsolation is required.");
  if (getKnowledgeObjectIds(input).length === 0) warnings.push("at least one knowledgeObjectId is required.");
  if (
    getHistoricalOutcomePackageIds(input).length === 0 &&
    getHistoricalDecisionPackageIds(input).length === 0 &&
    getHistoricalAuditPackageIds(input).length === 0 &&
    getHistoricalControllerPackageIds(input).length === 0
  ) {
    warnings.push("at least one historical Phase 36 package id is required.");
  }

  sourceArtifacts.forEach((artifact, index) => {
    if (!hasValue(artifact.companyId)) warnings.push(`sourceArtifacts[${index}].companyId is required.`);
    if (companyId && artifact.companyId !== companyId) warnings.push(`sourceArtifacts[${index}].companyId must equal source companyId.`);
  });

  for (const [inputName, values, idName, keyName] of [
    ["knowledgeObjects", getKnowledgeObjects(input), "knowledgeObjectId", "knowledgeObjectKey"],
    ["knowledgeRelationships", getKnowledgeRelationships(input), "knowledgeRelationshipId", "knowledgeRelationshipKey"],
    ["organizationalKnowledgePackages", getOrganizationalKnowledgePackages(input), "organizationalKnowledgePackageId", "organizationalKnowledgePackageKey"],
    ["historicalOutcomePackages", getHistoricalOutcomePackages(input), "historicalOutcomePackageId", "historicalOutcomePackageKey"],
    ["historicalDecisionPackages", getHistoricalDecisionPackages(input), "historicalDecisionPackageId", "historicalDecisionPackageKey"],
    ["historicalAuditPackages", getHistoricalAuditPackages(input), "historicalAuditPackageId", "historicalAuditPackageKey"],
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

export function buildHistoricalKnowledgePackage(input: BuildHistoricalKnowledgePackageInput): BuildHistoricalKnowledgePackageResult {
  const fatalWarnings = validateInput(input);
  const scope = getPackageScope(input);
  const customerIsolation = getPackageCustomerIsolation(input);
  const firmIsolation = getPackageFirmIsolation(input);
  const clientIsolation = getPackageClientIsolation(input);

  if (fatalWarnings.length > 0 || !scope || !customerIsolation || !firmIsolation || !clientIsolation) {
    return {
      historicalKnowledgePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceArtifacts = getSourceArtifacts(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    historicalKnowledgePackage: {
      historicalKnowledgePackageId: buildHistoricalKnowledgePackageId(input),
      historicalKnowledgePackageKey: buildHistoricalKnowledgePackageKey(input),
      packageCategory: input.packageCategory,
      companyId: scope.companyId,
      scope,
      customerIsolation,
      firmIsolation,
      clientIsolation,
      knowledgeObjectIds: getKnowledgeObjectIds(input),
      knowledgeRelationshipIds: getKnowledgeRelationshipIds(input),
      organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
      historicalOutcomePackageIds: getHistoricalOutcomePackageIds(input),
      historicalDecisionPackageIds: getHistoricalDecisionPackageIds(input),
      historicalAuditPackageIds: getHistoricalAuditPackageIds(input),
      historicalControllerPackageIds: getHistoricalControllerPackageIds(input),
      derivationLineageIds: getDerivationLineageIds(input),
      derivationMethod: "historical_context_preservation",
      derivationHash: buildDerivationHash(input),
      knowledgeValidityWindow: [
        ...getKnowledgeObjects(input).map((artifact) => artifact.knowledgeValidityWindow),
        ...getKnowledgeRelationships(input).map((artifact) => artifact.knowledgeValidityWindow),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.knowledgeValidityWindow),
      ],
      sourceMemorySnapshotIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.sourceMemorySnapshotIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.sourceMemorySnapshotIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.sourceMemorySnapshotIds),
      ],
      supersedesKnowledgeIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.supersedesKnowledgeIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.supersedesKnowledgeIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.supersedesKnowledgeIds),
      ],
      supersededByKnowledgeIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.supersededByKnowledgeIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.supersededByKnowledgeIds),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.supersededByKnowledgeIds),
      ],
      staleMarker: [
        ...getKnowledgeObjects(input).map((artifact) => artifact.staleMarker),
        ...getKnowledgeRelationships(input).map((artifact) => artifact.staleMarker),
        ...getOrganizationalKnowledgePackages(input).flatMap((artifact) => artifact.staleMarker),
      ],
      stalenessReasonReferenceIds: [
        ...getKnowledgeObjects(input).flatMap((artifact) => artifact.stalenessReasonReferenceIds),
        ...getKnowledgeRelationships(input).flatMap((artifact) => artifact.stalenessReasonReferenceIds),
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
      executable: false,
      actionReady: false,
      workflowReady: false,
      phase38Required: true,
      knowledgeObjects: getKnowledgeObjects(input),
      knowledgeRelationships: getKnowledgeRelationships(input),
      organizationalKnowledgePackages: getOrganizationalKnowledgePackages(input),
      historicalOutcomePackages: getHistoricalOutcomePackages(input),
      historicalDecisionPackages: getHistoricalDecisionPackages(input),
      historicalAuditPackages: getHistoricalAuditPackages(input),
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
