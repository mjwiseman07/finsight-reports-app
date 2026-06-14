import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticKnowledgeConfidenceFloorMetadata,
  SyntheticKnowledgeDerivationMethod,
  SyntheticKnowledgeStaleMarker,
  SyntheticKnowledgeValidityWindow,
  SyntheticMethodologyDerivationMethod,
  SyntheticMethodologyStaleMarker,
} from "../contracts/knowledgeContracts";
import type { SyntheticAuditKnowledgePackage } from "../audit-knowledge-package";
import type { SyntheticControllerKnowledgePackage } from "../controller-knowledge-package";
import type { SyntheticHistoricalKnowledgePackage } from "../historical-knowledge-package";
import type { SyntheticHistoricalMethodologyPackage } from "../historical-methodology-package";
import type { SyntheticOrganizationalKnowledgeGraph } from "../organizational-knowledge-graph";
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
import type { SyntheticCrossPeriodMemoryPackage } from "../../organizational-memory/cross-period-memory-package";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticOrganizationalMemoryGraph } from "../../organizational-memory/organizational-memory-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../../organizational-memory/organizational-memory-package";

export type SyntheticCrossPeriodKnowledgePackageCategory =
  | "cross_period_knowledge_package"
  | "accounting_period_knowledge_package"
  | "reporting_period_knowledge_package"
  | "audit_period_knowledge_package"
  | "review_period_knowledge_package"
  | "historical_period_knowledge_package";

export const SYNTHETIC_CROSS_PERIOD_KNOWLEDGE_PACKAGE_CATEGORIES: SyntheticCrossPeriodKnowledgePackageCategory[] = [
  "cross_period_knowledge_package",
  "accounting_period_knowledge_package",
  "reporting_period_knowledge_package",
  "audit_period_knowledge_package",
  "review_period_knowledge_package",
  "historical_period_knowledge_package",
];

export interface BuildCrossPeriodKnowledgePackageInput {
  packageCategory: SyntheticCrossPeriodKnowledgePackageCategory;
  organizationalKnowledgeGraphs?: SyntheticOrganizationalKnowledgeGraph[];
  historicalKnowledgePackages?: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages?: SyntheticHistoricalMethodologyPackage[];
  auditKnowledgePackages?: SyntheticAuditKnowledgePackage[];
  controllerKnowledgePackages?: SyntheticControllerKnowledgePackage[];
  organizationalKnowledgePackages?: SyntheticOrganizationalKnowledgePackage[];
  crossPeriodMemoryPackages?: SyntheticCrossPeriodMemoryPackage[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  periodReferenceIds?: string[];
  priorPeriodReferenceIds?: string[];
  currentPeriodReferenceIds?: string[];
  periodLineageReferenceIds?: string[];
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface SyntheticCrossPeriodKnowledgePackage {
  crossPeriodKnowledgePackageId: string;
  crossPeriodKnowledgePackageKey: string;
  packageCategory: SyntheticCrossPeriodKnowledgePackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  periodReferenceIds: string[];
  priorPeriodReferenceIds: string[];
  currentPeriodReferenceIds: string[];
  periodLineageReferenceIds: string[];
  organizationalKnowledgeGraphIds: string[];
  organizationalKnowledgePackageIds: string[];
  historicalKnowledgePackageIds: string[];
  historicalMethodologyPackageIds: string[];
  auditKnowledgePackageIds: string[];
  controllerKnowledgePackageIds: string[];
  crossPeriodMemoryPackageIds: string[];
  organizationalMemoryGraphIds: string[];
  organizationalMemoryPackageIds: string[];
  derivationLineageIds: string[];
  derivationMethod: SyntheticKnowledgeDerivationMethod;
  derivationHash: string;
  knowledgeValidityWindow: SyntheticKnowledgeValidityWindow[];
  sourceMemorySnapshotIds: string[];
  supersedesKnowledgeIds: string[];
  supersededByKnowledgeIds: string[];
  staleMarker: SyntheticKnowledgeStaleMarker[];
  stalenessReasonReferenceIds: string[];
  methodologyVersion: string[];
  methodologyAncestryIds: string[];
  methodologyDerivationMethod: SyntheticMethodologyDerivationMethod[];
  methodologyDerivationHash: string[];
  supersedesMethodologyIds: string[];
  supersededByMethodologyIds: string[];
  methodologyStaleMarker: SyntheticMethodologyStaleMarker[];
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  upstreamObservationIds: string[];
  upstreamPackageIds: string[];
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
  organizationalKnowledgeGraphs: SyntheticOrganizationalKnowledgeGraph[];
  historicalKnowledgePackages: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages: SyntheticHistoricalMethodologyPackage[];
  auditKnowledgePackages: SyntheticAuditKnowledgePackage[];
  controllerKnowledgePackages: SyntheticControllerKnowledgePackage[];
  organizationalKnowledgePackages: SyntheticOrganizationalKnowledgePackage[];
  crossPeriodMemoryPackages: SyntheticCrossPeriodMemoryPackage[];
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  warnings: string[];
}

export interface BuildCrossPeriodKnowledgePackageResult {
  crossPeriodKnowledgePackage: SyntheticCrossPeriodKnowledgePackage | null;
  skipped: boolean;
  warnings: string[];
}

type CrossPeriodKnowledgeSourceArtifact =
  | SyntheticOrganizationalKnowledgeGraph
  | SyntheticHistoricalKnowledgePackage
  | SyntheticHistoricalMethodologyPackage
  | SyntheticAuditKnowledgePackage
  | SyntheticControllerKnowledgePackage
  | SyntheticOrganizationalKnowledgePackage
  | SyntheticCrossPeriodMemoryPackage
  | SyntheticOrganizationalMemoryGraph
  | SyntheticOrganizationalMemoryPackage;

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

function isSupportedPackageCategory(packageCategory: SyntheticCrossPeriodKnowledgePackageCategory): boolean {
  return SYNTHETIC_CROSS_PERIOD_KNOWLEDGE_PACKAGE_CATEGORIES.includes(packageCategory);
}

function getOrganizationalKnowledgeGraphs(input: BuildCrossPeriodKnowledgePackageInput): SyntheticOrganizationalKnowledgeGraph[] {
  return getInputArray(input.organizationalKnowledgeGraphs);
}

function getHistoricalKnowledgePackages(input: BuildCrossPeriodKnowledgePackageInput): SyntheticHistoricalKnowledgePackage[] {
  return getInputArray(input.historicalKnowledgePackages);
}

function getHistoricalMethodologyPackages(input: BuildCrossPeriodKnowledgePackageInput): SyntheticHistoricalMethodologyPackage[] {
  return getInputArray(input.historicalMethodologyPackages);
}

function getAuditKnowledgePackages(input: BuildCrossPeriodKnowledgePackageInput): SyntheticAuditKnowledgePackage[] {
  return getInputArray(input.auditKnowledgePackages);
}

function getControllerKnowledgePackages(input: BuildCrossPeriodKnowledgePackageInput): SyntheticControllerKnowledgePackage[] {
  return getInputArray(input.controllerKnowledgePackages);
}

function getOrganizationalKnowledgePackages(input: BuildCrossPeriodKnowledgePackageInput): SyntheticOrganizationalKnowledgePackage[] {
  return getInputArray(input.organizationalKnowledgePackages);
}

function getCrossPeriodMemoryPackages(input: BuildCrossPeriodKnowledgePackageInput): SyntheticCrossPeriodMemoryPackage[] {
  return getInputArray(input.crossPeriodMemoryPackages);
}

function getOrganizationalMemoryGraphs(input: BuildCrossPeriodKnowledgePackageInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getOrganizationalMemoryPackages(input: BuildCrossPeriodKnowledgePackageInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getSourceArtifacts(input: BuildCrossPeriodKnowledgePackageInput): CrossPeriodKnowledgeSourceArtifact[] {
  return [
    ...getOrganizationalKnowledgeGraphs(input),
    ...getHistoricalKnowledgePackages(input),
    ...getHistoricalMethodologyPackages(input),
    ...getAuditKnowledgePackages(input),
    ...getControllerKnowledgePackages(input),
    ...getOrganizationalKnowledgePackages(input),
    ...getCrossPeriodMemoryPackages(input),
    ...getOrganizationalMemoryGraphs(input),
    ...getOrganizationalMemoryPackages(input),
  ];
}

function getPackageScope(input: BuildCrossPeriodKnowledgePackageInput): SyntheticAuditScope | null {
  return getSourceArtifacts(input)[0]?.scope ?? null;
}

function getPackageCustomerIsolation(input: BuildCrossPeriodKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.customerIsolation ?? null;
}

function getPackageFirmIsolation(input: BuildCrossPeriodKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.firmIsolation ?? null;
}

function getPackageClientIsolation(input: BuildCrossPeriodKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.clientIsolation ?? null;
}

function getPeriodReferenceIds(input: BuildCrossPeriodKnowledgePackageInput): string[] {
  return [
    ...getInputArray(input.periodReferenceIds),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "periodReferenceIds")),
  ].filter(hasValue) as string[];
}

function getPriorPeriodReferenceIds(input: BuildCrossPeriodKnowledgePackageInput): string[] {
  return [
    ...getInputArray(input.priorPeriodReferenceIds),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "priorPeriodReferenceIds")),
  ].filter(hasValue) as string[];
}

function getCurrentPeriodReferenceIds(input: BuildCrossPeriodKnowledgePackageInput): string[] {
  return [
    ...getInputArray(input.currentPeriodReferenceIds),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "currentPeriodReferenceIds")),
  ].filter(hasValue) as string[];
}

function getPeriodLineageReferenceIds(input: BuildCrossPeriodKnowledgePackageInput): string[] {
  return [
    ...getInputArray(input.periodLineageReferenceIds),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "periodLineageReferenceIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalKnowledgeGraphIds(input: BuildCrossPeriodKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalKnowledgeGraphs(input).map((artifact) => artifact.organizationalKnowledgeGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalKnowledgeGraphIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalKnowledgePackageIds(input: BuildCrossPeriodKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalKnowledgePackages(input).map((artifact) => artifact.organizationalKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getHistoricalKnowledgePackageIds(input: BuildCrossPeriodKnowledgePackageInput): string[] {
  return [
    ...getHistoricalKnowledgePackages(input).map((artifact) => artifact.historicalKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getHistoricalMethodologyPackageIds(input: BuildCrossPeriodKnowledgePackageInput): string[] {
  return [
    ...getHistoricalMethodologyPackages(input).map((artifact) => artifact.historicalMethodologyPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalMethodologyPackageIds")),
  ].filter(hasValue) as string[];
}

function getAuditKnowledgePackageIds(input: BuildCrossPeriodKnowledgePackageInput): string[] {
  return getAuditKnowledgePackages(input).map((artifact) => artifact.auditKnowledgePackageId).filter(hasValue);
}

function getControllerKnowledgePackageIds(input: BuildCrossPeriodKnowledgePackageInput): string[] {
  return getControllerKnowledgePackages(input).map((artifact) => artifact.controllerKnowledgePackageId).filter(hasValue);
}

function getCrossPeriodMemoryPackageIds(input: BuildCrossPeriodKnowledgePackageInput): string[] {
  return getCrossPeriodMemoryPackages(input).map((artifact) => artifact.crossPeriodMemoryPackageId).filter(hasValue);
}

function getOrganizationalMemoryGraphIds(input: BuildCrossPeriodKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryPackageIds(input: BuildCrossPeriodKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryPackages(input).map((artifact) => artifact.organizationalMemoryPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryPackageIds")),
  ].filter(hasValue) as string[];
}

function getReferenceIds(input: BuildCrossPeriodKnowledgePackageInput, singularName: string, arrayName: string): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, singularName)),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function getDerivationLineageIds(input: BuildCrossPeriodKnowledgePackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "derivationLineageIds")),
    ...getPeriodReferenceIds(input),
    ...getPriorPeriodReferenceIds(input),
    ...getCurrentPeriodReferenceIds(input),
    ...getPeriodLineageReferenceIds(input),
    ...getOrganizationalKnowledgeGraphIds(input),
    ...getOrganizationalKnowledgePackageIds(input),
    ...getHistoricalKnowledgePackageIds(input),
    ...getHistoricalMethodologyPackageIds(input),
    ...getAuditKnowledgePackageIds(input),
    ...getControllerKnowledgePackageIds(input),
    ...getCrossPeriodMemoryPackageIds(input),
    ...getOrganizationalMemoryGraphIds(input),
    ...getOrganizationalMemoryPackageIds(input),
  ];
}

function buildDerivationHash(input: BuildCrossPeriodKnowledgePackageInput): string {
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    derivationLineageIds: getDerivationLineageIds(input),
    periodReferenceIds: getPeriodReferenceIds(input),
    priorPeriodReferenceIds: getPriorPeriodReferenceIds(input),
    currentPeriodReferenceIds: getCurrentPeriodReferenceIds(input),
    periodLineageReferenceIds: getPeriodLineageReferenceIds(input),
  });
}

function buildCrossPeriodKnowledgePackageKey(input: BuildCrossPeriodKnowledgePackageInput): string {
  const scope = getPackageScope(input);
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    companyId: scope?.companyId ?? null,
    scope,
    customerIsolation: getPackageCustomerIsolation(input),
    firmIsolation: getPackageFirmIsolation(input),
    clientIsolation: getPackageClientIsolation(input),
    periodReferenceIds: getPeriodReferenceIds(input),
    priorPeriodReferenceIds: getPriorPeriodReferenceIds(input),
    currentPeriodReferenceIds: getCurrentPeriodReferenceIds(input),
    periodLineageReferenceIds: getPeriodLineageReferenceIds(input),
    organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
    organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
    historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
    historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
    auditKnowledgePackageIds: getAuditKnowledgePackageIds(input),
    controllerKnowledgePackageIds: getControllerKnowledgePackageIds(input),
    crossPeriodMemoryPackageIds: getCrossPeriodMemoryPackageIds(input),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
  });
}

function buildCrossPeriodKnowledgePackageId(input: BuildCrossPeriodKnowledgePackageInput): string {
  return `synthetic-cross-period-knowledge-package:${stableSnapshotHash({
    crossPeriodKnowledgePackageKey: buildCrossPeriodKnowledgePackageKey(input),
    packageCategory: input.packageCategory,
    companyId: getPackageScope(input)?.companyId ?? null,
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildCrossPeriodKnowledgePackageInput): string[] {
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

function validateInput(input: BuildCrossPeriodKnowledgePackageInput): string[] {
  const warnings: string[] = [];
  const sourceArtifacts = getSourceArtifacts(input);
  const scope = getPackageScope(input);
  const companyId = scope?.companyId;

  if (!hasValue(input.packageCategory)) warnings.push("packageCategory is required.");
  if (!isSupportedPackageCategory(input.packageCategory)) warnings.push("packageCategory must be supported.");
  if (sourceArtifacts.length === 0) warnings.push("at least one cross-period knowledge source artifact is required.");
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
    ["organizationalKnowledgeGraphs", getOrganizationalKnowledgeGraphs(input), "organizationalKnowledgeGraphId", "organizationalKnowledgeGraphKey"],
    ["historicalKnowledgePackages", getHistoricalKnowledgePackages(input), "historicalKnowledgePackageId", "historicalKnowledgePackageKey"],
    ["historicalMethodologyPackages", getHistoricalMethodologyPackages(input), "historicalMethodologyPackageId", "historicalMethodologyPackageKey"],
    ["auditKnowledgePackages", getAuditKnowledgePackages(input), "auditKnowledgePackageId", "auditKnowledgePackageKey"],
    ["controllerKnowledgePackages", getControllerKnowledgePackages(input), "controllerKnowledgePackageId", "controllerKnowledgePackageKey"],
    ["organizationalKnowledgePackages", getOrganizationalKnowledgePackages(input), "organizationalKnowledgePackageId", "organizationalKnowledgePackageKey"],
    ["crossPeriodMemoryPackages", getCrossPeriodMemoryPackages(input), "crossPeriodMemoryPackageId", "crossPeriodMemoryPackageKey"],
    ["organizationalMemoryGraphs", getOrganizationalMemoryGraphs(input), "organizationalMemoryGraphId", "organizationalMemoryGraphKey"],
    ["organizationalMemoryPackages", getOrganizationalMemoryPackages(input), "organizationalMemoryPackageId", "organizationalMemoryPackageKey"],
  ] as const) {
    values.forEach((artifact, index) => {
      if (!hasValue((artifact as unknown as ReferenceRecord)[idName])) warnings.push(`${inputName}[${index}].${idName} is required.`);
      if (!hasValue((artifact as unknown as ReferenceRecord)[keyName])) warnings.push(`${inputName}[${index}].${keyName} is required.`);
    });
  }

  return warnings;
}

export function buildCrossPeriodKnowledgePackage(
  input: BuildCrossPeriodKnowledgePackageInput,
): BuildCrossPeriodKnowledgePackageResult {
  const fatalWarnings = validateInput(input);
  const scope = getPackageScope(input);
  const customerIsolation = getPackageCustomerIsolation(input);
  const firmIsolation = getPackageFirmIsolation(input);
  const clientIsolation = getPackageClientIsolation(input);

  if (fatalWarnings.length > 0 || !scope || !customerIsolation || !firmIsolation || !clientIsolation) {
    return {
      crossPeriodKnowledgePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceArtifacts = getSourceArtifacts(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    crossPeriodKnowledgePackage: {
      crossPeriodKnowledgePackageId: buildCrossPeriodKnowledgePackageId(input),
      crossPeriodKnowledgePackageKey: buildCrossPeriodKnowledgePackageKey(input),
      packageCategory: input.packageCategory,
      companyId: scope.companyId,
      scope,
      customerIsolation,
      firmIsolation,
      clientIsolation,
      periodReferenceIds: getPeriodReferenceIds(input),
      priorPeriodReferenceIds: getPriorPeriodReferenceIds(input),
      currentPeriodReferenceIds: getCurrentPeriodReferenceIds(input),
      periodLineageReferenceIds: getPeriodLineageReferenceIds(input),
      organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
      organizationalKnowledgePackageIds: getOrganizationalKnowledgePackageIds(input),
      historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
      historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
      auditKnowledgePackageIds: getAuditKnowledgePackageIds(input),
      controllerKnowledgePackageIds: getControllerKnowledgePackageIds(input),
      crossPeriodMemoryPackageIds: getCrossPeriodMemoryPackageIds(input),
      organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
      organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
      derivationLineageIds: getDerivationLineageIds(input),
      derivationMethod: "historical_context_preservation",
      derivationHash: buildDerivationHash(input),
      knowledgeValidityWindow: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticKnowledgeValidityWindow>(artifact, "knowledgeValidityWindow"),
      ),
      sourceMemorySnapshotIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "sourceMemorySnapshotIds")),
      supersedesKnowledgeIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "supersedesKnowledgeIds")),
      supersededByKnowledgeIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "supersededByKnowledgeIds")),
      staleMarker: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "staleMarker") as SyntheticKnowledgeStaleMarker[]),
      stalenessReasonReferenceIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "stalenessReasonReferenceIds")),
      methodologyVersion: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "methodologyVersion")),
      methodologyAncestryIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "methodologyAncestryIds")),
      methodologyDerivationMethod: sourceArtifacts.flatMap(
        (artifact) => getStringArrayProperty(artifact, "methodologyDerivationMethod") as SyntheticMethodologyDerivationMethod[],
      ),
      methodologyDerivationHash: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "methodologyDerivationHash")),
      supersedesMethodologyIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "supersedesMethodologyIds")),
      supersededByMethodologyIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "supersededByMethodologyIds")),
      methodologyStaleMarker: sourceArtifacts.flatMap(
        (artifact) => getStringArrayProperty(artifact, "methodologyStaleMarker") as SyntheticMethodologyStaleMarker[],
      ),
      confidenceFloorMetadata: sourceArtifacts.flatMap((artifact) =>
        getObjectArrayProperty<SyntheticKnowledgeConfidenceFloorMetadata>(artifact, "confidenceFloorMetadata"),
      ),
      sourceConfidenceReferenceIds: sourceArtifacts.flatMap((artifact) => getStringArrayProperty(artifact, "sourceConfidenceReferenceIds")),
      evidenceReferenceIds: getReferenceIds(input, "evidenceReferenceId", "evidenceReferenceIds"),
      sourceReferenceIds: getReferenceIds(input, "sourceReferenceId", "sourceReferenceIds"),
      lineageReferenceIds: getReferenceIds(input, "lineageReferenceId", "lineageReferenceIds"),
      upstreamObservationIds: getReferenceIds(input, "upstreamObservationId", "upstreamObservationIds"),
      upstreamPackageIds: getReferenceIds(input, "upstreamPackageId", "upstreamPackageIds"),
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
      organizationalKnowledgeGraphs: getOrganizationalKnowledgeGraphs(input),
      historicalKnowledgePackages: getHistoricalKnowledgePackages(input),
      historicalMethodologyPackages: getHistoricalMethodologyPackages(input),
      auditKnowledgePackages: getAuditKnowledgePackages(input),
      controllerKnowledgePackages: getControllerKnowledgePackages(input),
      organizationalKnowledgePackages: getOrganizationalKnowledgePackages(input),
      crossPeriodMemoryPackages: getCrossPeriodMemoryPackages(input),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
