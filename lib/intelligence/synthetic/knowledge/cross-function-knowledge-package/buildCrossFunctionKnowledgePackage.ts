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
import type { SyntheticCrossEntityKnowledgePackage } from "../cross-entity-knowledge-package";
import type { SyntheticCrossPeriodKnowledgePackage } from "../cross-period-knowledge-package";
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
import type { SyntheticCrossFunctionMemoryPackage } from "../../organizational-memory/cross-function-memory-package";
import type { SyntheticEnterpriseMemoryPackage } from "../../organizational-memory/enterprise-memory-package";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticOrganizationalMemoryGraph } from "../../organizational-memory/organizational-memory-graph";
import type { SyntheticPortfolioMemoryPackage } from "../../organizational-memory/portfolio-memory-package";

export type SyntheticCrossFunctionKnowledgePackageCategory =
  | "cross_function_knowledge_package"
  | "audit_controller_knowledge_package"
  | "close_management_knowledge_package"
  | "reconciliation_knowledge_package"
  | "evidence_review_knowledge_package"
  | "finance_operations_knowledge_package";

export const SYNTHETIC_CROSS_FUNCTION_KNOWLEDGE_PACKAGE_CATEGORIES: SyntheticCrossFunctionKnowledgePackageCategory[] = [
  "cross_function_knowledge_package",
  "audit_controller_knowledge_package",
  "close_management_knowledge_package",
  "reconciliation_knowledge_package",
  "evidence_review_knowledge_package",
  "finance_operations_knowledge_package",
];

export interface BuildCrossFunctionKnowledgePackageInput {
  packageCategory: SyntheticCrossFunctionKnowledgePackageCategory;
  organizationalKnowledgeGraphs?: SyntheticOrganizationalKnowledgeGraph[];
  crossPeriodKnowledgePackages?: SyntheticCrossPeriodKnowledgePackage[];
  crossEntityKnowledgePackages?: SyntheticCrossEntityKnowledgePackage[];
  historicalKnowledgePackages?: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages?: SyntheticHistoricalMethodologyPackage[];
  auditKnowledgePackages?: SyntheticAuditKnowledgePackage[];
  controllerKnowledgePackages?: SyntheticControllerKnowledgePackage[];
  organizationalKnowledgePackages?: SyntheticOrganizationalKnowledgePackage[];
  crossFunctionMemoryPackages?: SyntheticCrossFunctionMemoryPackage[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  enterpriseMemoryPackages?: SyntheticEnterpriseMemoryPackage[];
  portfolioMemoryPackages?: SyntheticPortfolioMemoryPackage[];
  functionReferenceIds?: string[];
  sourceFunctionReferenceIds?: string[];
  targetFunctionReferenceIds?: string[];
  functionLineageReferenceIds?: string[];
  healthcarePpdObservationIds?: string[];
  payrollObservationIds?: string[];
  methodologyObservationIds?: string[];
}

export interface SyntheticCrossFunctionKnowledgePackage {
  crossFunctionKnowledgePackageId: string;
  crossFunctionKnowledgePackageKey: string;
  packageCategory: SyntheticCrossFunctionKnowledgePackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  functionReferenceIds: string[];
  sourceFunctionReferenceIds: string[];
  targetFunctionReferenceIds: string[];
  functionLineageReferenceIds: string[];
  organizationalKnowledgeGraphIds: string[];
  crossPeriodKnowledgePackageIds: string[];
  crossEntityKnowledgePackageIds: string[];
  historicalKnowledgePackageIds: string[];
  historicalMethodologyPackageIds: string[];
  auditKnowledgePackageIds: string[];
  controllerKnowledgePackageIds: string[];
  crossFunctionMemoryPackageIds: string[];
  organizationalMemoryGraphIds: string[];
  enterpriseMemoryPackageIds: string[];
  portfolioMemoryPackageIds: string[];
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
  crossPeriodKnowledgePackages: SyntheticCrossPeriodKnowledgePackage[];
  crossEntityKnowledgePackages: SyntheticCrossEntityKnowledgePackage[];
  historicalKnowledgePackages: SyntheticHistoricalKnowledgePackage[];
  historicalMethodologyPackages: SyntheticHistoricalMethodologyPackage[];
  auditKnowledgePackages: SyntheticAuditKnowledgePackage[];
  controllerKnowledgePackages: SyntheticControllerKnowledgePackage[];
  organizationalKnowledgePackages: SyntheticOrganizationalKnowledgePackage[];
  crossFunctionMemoryPackages: SyntheticCrossFunctionMemoryPackage[];
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  enterpriseMemoryPackages: SyntheticEnterpriseMemoryPackage[];
  portfolioMemoryPackages: SyntheticPortfolioMemoryPackage[];
  warnings: string[];
}

export interface BuildCrossFunctionKnowledgePackageResult {
  crossFunctionKnowledgePackage: SyntheticCrossFunctionKnowledgePackage | null;
  skipped: boolean;
  warnings: string[];
}

type CrossFunctionKnowledgeSourceArtifact =
  | SyntheticOrganizationalKnowledgeGraph
  | SyntheticCrossPeriodKnowledgePackage
  | SyntheticCrossEntityKnowledgePackage
  | SyntheticHistoricalKnowledgePackage
  | SyntheticHistoricalMethodologyPackage
  | SyntheticAuditKnowledgePackage
  | SyntheticControllerKnowledgePackage
  | SyntheticOrganizationalKnowledgePackage
  | SyntheticCrossFunctionMemoryPackage
  | SyntheticOrganizationalMemoryGraph
  | SyntheticEnterpriseMemoryPackage
  | SyntheticPortfolioMemoryPackage;

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

function isSupportedPackageCategory(packageCategory: SyntheticCrossFunctionKnowledgePackageCategory): boolean {
  return SYNTHETIC_CROSS_FUNCTION_KNOWLEDGE_PACKAGE_CATEGORIES.includes(packageCategory);
}

function getOrganizationalKnowledgeGraphs(input: BuildCrossFunctionKnowledgePackageInput): SyntheticOrganizationalKnowledgeGraph[] {
  return getInputArray(input.organizationalKnowledgeGraphs);
}

function getCrossPeriodKnowledgePackages(input: BuildCrossFunctionKnowledgePackageInput): SyntheticCrossPeriodKnowledgePackage[] {
  return getInputArray(input.crossPeriodKnowledgePackages);
}

function getCrossEntityKnowledgePackages(input: BuildCrossFunctionKnowledgePackageInput): SyntheticCrossEntityKnowledgePackage[] {
  return getInputArray(input.crossEntityKnowledgePackages);
}

function getHistoricalKnowledgePackages(input: BuildCrossFunctionKnowledgePackageInput): SyntheticHistoricalKnowledgePackage[] {
  return getInputArray(input.historicalKnowledgePackages);
}

function getHistoricalMethodologyPackages(input: BuildCrossFunctionKnowledgePackageInput): SyntheticHistoricalMethodologyPackage[] {
  return getInputArray(input.historicalMethodologyPackages);
}

function getAuditKnowledgePackages(input: BuildCrossFunctionKnowledgePackageInput): SyntheticAuditKnowledgePackage[] {
  return getInputArray(input.auditKnowledgePackages);
}

function getControllerKnowledgePackages(input: BuildCrossFunctionKnowledgePackageInput): SyntheticControllerKnowledgePackage[] {
  return getInputArray(input.controllerKnowledgePackages);
}

function getOrganizationalKnowledgePackages(input: BuildCrossFunctionKnowledgePackageInput): SyntheticOrganizationalKnowledgePackage[] {
  return getInputArray(input.organizationalKnowledgePackages);
}

function getCrossFunctionMemoryPackages(input: BuildCrossFunctionKnowledgePackageInput): SyntheticCrossFunctionMemoryPackage[] {
  return getInputArray(input.crossFunctionMemoryPackages);
}

function getOrganizationalMemoryGraphs(input: BuildCrossFunctionKnowledgePackageInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getEnterpriseMemoryPackages(input: BuildCrossFunctionKnowledgePackageInput): SyntheticEnterpriseMemoryPackage[] {
  return getInputArray(input.enterpriseMemoryPackages);
}

function getPortfolioMemoryPackages(input: BuildCrossFunctionKnowledgePackageInput): SyntheticPortfolioMemoryPackage[] {
  return getInputArray(input.portfolioMemoryPackages);
}

function getSourceArtifacts(input: BuildCrossFunctionKnowledgePackageInput): CrossFunctionKnowledgeSourceArtifact[] {
  return [
    ...getOrganizationalKnowledgeGraphs(input),
    ...getCrossPeriodKnowledgePackages(input),
    ...getCrossEntityKnowledgePackages(input),
    ...getHistoricalKnowledgePackages(input),
    ...getHistoricalMethodologyPackages(input),
    ...getAuditKnowledgePackages(input),
    ...getControllerKnowledgePackages(input),
    ...getOrganizationalKnowledgePackages(input),
    ...getCrossFunctionMemoryPackages(input),
    ...getOrganizationalMemoryGraphs(input),
    ...getEnterpriseMemoryPackages(input),
    ...getPortfolioMemoryPackages(input),
  ];
}

function getPackageScope(input: BuildCrossFunctionKnowledgePackageInput): SyntheticAuditScope | null {
  return getSourceArtifacts(input)[0]?.scope ?? null;
}

function getPackageCustomerIsolation(input: BuildCrossFunctionKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.customerIsolation ?? null;
}

function getPackageFirmIsolation(input: BuildCrossFunctionKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.firmIsolation ?? null;
}

function getPackageClientIsolation(input: BuildCrossFunctionKnowledgePackageInput): SyntheticMemoryObjectIsolationDimension | null {
  return getSourceArtifacts(input)[0]?.clientIsolation ?? null;
}

function getPreservedReferenceIds(input: BuildCrossFunctionKnowledgePackageInput, inputName: keyof BuildCrossFunctionKnowledgePackageInput): string[] {
  const values = input[inputName];
  return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string" && hasValue(value)) : [];
}

function getFunctionReferenceIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return [
    ...getPreservedReferenceIds(input, "functionReferenceIds"),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "functionReferenceIds")),
  ].filter(hasValue) as string[];
}

function getSourceFunctionReferenceIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return [
    ...getPreservedReferenceIds(input, "sourceFunctionReferenceIds"),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "sourceFunctionReferenceIds")),
  ].filter(hasValue) as string[];
}

function getTargetFunctionReferenceIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return [
    ...getPreservedReferenceIds(input, "targetFunctionReferenceIds"),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "targetFunctionReferenceIds")),
  ].filter(hasValue) as string[];
}

function getFunctionLineageReferenceIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return [
    ...getPreservedReferenceIds(input, "functionLineageReferenceIds"),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "functionLineageReferenceIds")),
  ].filter(hasValue) as string[];
}

function getOrganizationalKnowledgeGraphIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalKnowledgeGraphs(input).map((artifact) => artifact.organizationalKnowledgeGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalKnowledgeGraphIds")),
  ].filter(hasValue) as string[];
}

function getCrossPeriodKnowledgePackageIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return [
    ...getCrossPeriodKnowledgePackages(input).map((artifact) => artifact.crossPeriodKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "crossPeriodKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getCrossEntityKnowledgePackageIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return getCrossEntityKnowledgePackages(input).map((artifact) => artifact.crossEntityKnowledgePackageId).filter(hasValue);
}

function getHistoricalKnowledgePackageIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return [
    ...getHistoricalKnowledgePackages(input).map((artifact) => artifact.historicalKnowledgePackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalKnowledgePackageIds")),
  ].filter(hasValue) as string[];
}

function getHistoricalMethodologyPackageIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return [
    ...getHistoricalMethodologyPackages(input).map((artifact) => artifact.historicalMethodologyPackageId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "historicalMethodologyPackageIds")),
  ].filter(hasValue) as string[];
}

function getAuditKnowledgePackageIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return getAuditKnowledgePackages(input).map((artifact) => artifact.auditKnowledgePackageId).filter(hasValue);
}

function getControllerKnowledgePackageIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return getControllerKnowledgePackages(input).map((artifact) => artifact.controllerKnowledgePackageId).filter(hasValue);
}

function getCrossFunctionMemoryPackageIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return [
    ...getCrossFunctionMemoryPackages(input).map((artifact) => artifact.crossFunctionMemoryPackageId),
    ...getEnterpriseMemoryPackages(input).flatMap((artifact) => artifact.crossFunctionMemoryPackageIds),
    ...getPortfolioMemoryPackages(input).flatMap((artifact) => artifact.crossFunctionMemoryPackageIds),
  ].filter(hasValue) as string[];
}

function getOrganizationalMemoryGraphIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return [
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "organizationalMemoryGraphIds")),
  ].filter(hasValue) as string[];
}

function getEnterpriseMemoryPackageIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return [
    ...getEnterpriseMemoryPackages(input).map((artifact) => artifact.enterpriseMemoryPackageId),
    ...getPortfolioMemoryPackages(input).flatMap((artifact) => artifact.enterpriseMemoryPackageIds),
  ].filter(hasValue) as string[];
}

function getPortfolioMemoryPackageIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return getPortfolioMemoryPackages(input).map((artifact) => artifact.portfolioMemoryPackageId).filter(hasValue);
}

function getReferenceIds(input: BuildCrossFunctionKnowledgePackageInput, singularName: string, arrayName: string): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringProperty(artifact, singularName)),
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, arrayName)),
  ].filter(hasValue) as string[];
}

function getDerivationLineageIds(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  return [
    ...getSourceArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "derivationLineageIds")),
    ...getFunctionReferenceIds(input),
    ...getSourceFunctionReferenceIds(input),
    ...getTargetFunctionReferenceIds(input),
    ...getFunctionLineageReferenceIds(input),
    ...getOrganizationalKnowledgeGraphIds(input),
    ...getCrossPeriodKnowledgePackageIds(input),
    ...getCrossEntityKnowledgePackageIds(input),
    ...getHistoricalKnowledgePackageIds(input),
    ...getHistoricalMethodologyPackageIds(input),
    ...getAuditKnowledgePackageIds(input),
    ...getControllerKnowledgePackageIds(input),
    ...getCrossFunctionMemoryPackageIds(input),
    ...getOrganizationalMemoryGraphIds(input),
    ...getEnterpriseMemoryPackageIds(input),
    ...getPortfolioMemoryPackageIds(input),
  ];
}

function buildDerivationHash(input: BuildCrossFunctionKnowledgePackageInput): string {
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    derivationLineageIds: getDerivationLineageIds(input),
    functionReferenceIds: getFunctionReferenceIds(input),
    sourceFunctionReferenceIds: getSourceFunctionReferenceIds(input),
    targetFunctionReferenceIds: getTargetFunctionReferenceIds(input),
    functionLineageReferenceIds: getFunctionLineageReferenceIds(input),
  });
}

function buildCrossFunctionKnowledgePackageKey(input: BuildCrossFunctionKnowledgePackageInput): string {
  const scope = getPackageScope(input);
  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    companyId: scope?.companyId ?? null,
    scope,
    customerIsolation: getPackageCustomerIsolation(input),
    firmIsolation: getPackageFirmIsolation(input),
    clientIsolation: getPackageClientIsolation(input),
    functionReferenceIds: getFunctionReferenceIds(input),
    sourceFunctionReferenceIds: getSourceFunctionReferenceIds(input),
    targetFunctionReferenceIds: getTargetFunctionReferenceIds(input),
    functionLineageReferenceIds: getFunctionLineageReferenceIds(input),
    organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
    crossPeriodKnowledgePackageIds: getCrossPeriodKnowledgePackageIds(input),
    crossEntityKnowledgePackageIds: getCrossEntityKnowledgePackageIds(input),
    historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
    historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
    auditKnowledgePackageIds: getAuditKnowledgePackageIds(input),
    controllerKnowledgePackageIds: getControllerKnowledgePackageIds(input),
    crossFunctionMemoryPackageIds: getCrossFunctionMemoryPackageIds(input),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
    enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
    portfolioMemoryPackageIds: getPortfolioMemoryPackageIds(input),
  });
}

function buildCrossFunctionKnowledgePackageId(input: BuildCrossFunctionKnowledgePackageInput): string {
  return `synthetic-cross-function-knowledge-package:${stableSnapshotHash({
    crossFunctionKnowledgePackageKey: buildCrossFunctionKnowledgePackageKey(input),
    packageCategory: input.packageCategory,
    companyId: getPackageScope(input)?.companyId ?? null,
  })}`;
}

function getForwardCompatibilityWarnings(input: BuildCrossFunctionKnowledgePackageInput): string[] {
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

function validateInput(input: BuildCrossFunctionKnowledgePackageInput): string[] {
  const warnings: string[] = [];
  const sourceArtifacts = getSourceArtifacts(input);
  const scope = getPackageScope(input);
  const companyId = scope?.companyId;

  if (!hasValue(input.packageCategory)) warnings.push("packageCategory is required.");
  if (!isSupportedPackageCategory(input.packageCategory)) warnings.push("packageCategory must be supported.");
  if (sourceArtifacts.length === 0) warnings.push("at least one cross-function knowledge source artifact is required.");
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
    ["crossPeriodKnowledgePackages", getCrossPeriodKnowledgePackages(input), "crossPeriodKnowledgePackageId", "crossPeriodKnowledgePackageKey"],
    ["crossEntityKnowledgePackages", getCrossEntityKnowledgePackages(input), "crossEntityKnowledgePackageId", "crossEntityKnowledgePackageKey"],
    ["historicalKnowledgePackages", getHistoricalKnowledgePackages(input), "historicalKnowledgePackageId", "historicalKnowledgePackageKey"],
    ["historicalMethodologyPackages", getHistoricalMethodologyPackages(input), "historicalMethodologyPackageId", "historicalMethodologyPackageKey"],
    ["auditKnowledgePackages", getAuditKnowledgePackages(input), "auditKnowledgePackageId", "auditKnowledgePackageKey"],
    ["controllerKnowledgePackages", getControllerKnowledgePackages(input), "controllerKnowledgePackageId", "controllerKnowledgePackageKey"],
    ["organizationalKnowledgePackages", getOrganizationalKnowledgePackages(input), "organizationalKnowledgePackageId", "organizationalKnowledgePackageKey"],
    ["crossFunctionMemoryPackages", getCrossFunctionMemoryPackages(input), "crossFunctionMemoryPackageId", "crossFunctionMemoryPackageKey"],
    ["organizationalMemoryGraphs", getOrganizationalMemoryGraphs(input), "organizationalMemoryGraphId", "organizationalMemoryGraphKey"],
    ["enterpriseMemoryPackages", getEnterpriseMemoryPackages(input), "enterpriseMemoryPackageId", "enterpriseMemoryPackageKey"],
    ["portfolioMemoryPackages", getPortfolioMemoryPackages(input), "portfolioMemoryPackageId", "portfolioMemoryPackageKey"],
  ] as const) {
    values.forEach((artifact, index) => {
      if (!hasValue((artifact as unknown as ReferenceRecord)[idName])) warnings.push(`${inputName}[${index}].${idName} is required.`);
      if (!hasValue((artifact as unknown as ReferenceRecord)[keyName])) warnings.push(`${inputName}[${index}].${keyName} is required.`);
    });
  }

  return warnings;
}

export function buildCrossFunctionKnowledgePackage(
  input: BuildCrossFunctionKnowledgePackageInput,
): BuildCrossFunctionKnowledgePackageResult {
  const fatalWarnings = validateInput(input);
  const scope = getPackageScope(input);
  const customerIsolation = getPackageCustomerIsolation(input);
  const firmIsolation = getPackageFirmIsolation(input);
  const clientIsolation = getPackageClientIsolation(input);

  if (fatalWarnings.length > 0 || !scope || !customerIsolation || !firmIsolation || !clientIsolation) {
    return {
      crossFunctionKnowledgePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const sourceArtifacts = getSourceArtifacts(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    crossFunctionKnowledgePackage: {
      crossFunctionKnowledgePackageId: buildCrossFunctionKnowledgePackageId(input),
      crossFunctionKnowledgePackageKey: buildCrossFunctionKnowledgePackageKey(input),
      packageCategory: input.packageCategory,
      companyId: scope.companyId,
      scope,
      customerIsolation,
      firmIsolation,
      clientIsolation,
      functionReferenceIds: getFunctionReferenceIds(input),
      sourceFunctionReferenceIds: getSourceFunctionReferenceIds(input),
      targetFunctionReferenceIds: getTargetFunctionReferenceIds(input),
      functionLineageReferenceIds: getFunctionLineageReferenceIds(input),
      organizationalKnowledgeGraphIds: getOrganizationalKnowledgeGraphIds(input),
      crossPeriodKnowledgePackageIds: getCrossPeriodKnowledgePackageIds(input),
      crossEntityKnowledgePackageIds: getCrossEntityKnowledgePackageIds(input),
      historicalKnowledgePackageIds: getHistoricalKnowledgePackageIds(input),
      historicalMethodologyPackageIds: getHistoricalMethodologyPackageIds(input),
      auditKnowledgePackageIds: getAuditKnowledgePackageIds(input),
      controllerKnowledgePackageIds: getControllerKnowledgePackageIds(input),
      crossFunctionMemoryPackageIds: getCrossFunctionMemoryPackageIds(input),
      organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
      enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
      portfolioMemoryPackageIds: getPortfolioMemoryPackageIds(input),
      derivationLineageIds: getDerivationLineageIds(input),
      derivationMethod: "relationship_preservation",
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
      crossPeriodKnowledgePackages: getCrossPeriodKnowledgePackages(input),
      crossEntityKnowledgePackages: getCrossEntityKnowledgePackages(input),
      historicalKnowledgePackages: getHistoricalKnowledgePackages(input),
      historicalMethodologyPackages: getHistoricalMethodologyPackages(input),
      auditKnowledgePackages: getAuditKnowledgePackages(input),
      controllerKnowledgePackages: getControllerKnowledgePackages(input),
      organizationalKnowledgePackages: getOrganizationalKnowledgePackages(input),
      crossFunctionMemoryPackages: getCrossFunctionMemoryPackages(input),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      enterpriseMemoryPackages: getEnterpriseMemoryPackages(input),
      portfolioMemoryPackages: getPortfolioMemoryPackages(input),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
