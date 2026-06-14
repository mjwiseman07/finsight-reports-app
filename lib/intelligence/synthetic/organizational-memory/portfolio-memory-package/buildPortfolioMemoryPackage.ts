import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticEnterpriseMemoryPackage } from "../enterprise-memory-package";
import type { SyntheticCrossEntityMemoryPackage } from "../cross-entity-memory-package";
import type { SyntheticCrossFunctionMemoryPackage } from "../cross-function-memory-package";
import type { SyntheticCrossPeriodMemoryPackage } from "../cross-period-memory-package";
import type { SyntheticOrganizationalMemoryGraph } from "../organizational-memory-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../organizational-memory-package";
import type { SyntheticHistoricalOutcomePackage } from "../historical-outcome-package";
import type { SyntheticHistoricalDecisionPackage } from "../historical-decision-package";
import type { SyntheticHistoricalAuditPackage } from "../historical-audit-package";
import type { SyntheticHistoricalControllerPackage } from "../historical-controller-package";
import type { SyntheticMemoryObjectIsolationDimension, SyntheticMemoryObjectSourceArtifact } from "../memory-object";
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

export type SyntheticPortfolioMemoryPackageCategory =
  | "portfolio_memory_package"
  | "firm_portfolio_memory_package"
  | "client_portfolio_memory_package"
  | "audit_portfolio_memory_package"
  | "controller_portfolio_memory_package"
  | "executive_portfolio_memory_package";

export const SYNTHETIC_PORTFOLIO_MEMORY_PACKAGE_CATEGORIES: SyntheticPortfolioMemoryPackageCategory[] = [
  "portfolio_memory_package",
  "firm_portfolio_memory_package",
  "client_portfolio_memory_package",
  "audit_portfolio_memory_package",
  "controller_portfolio_memory_package",
  "executive_portfolio_memory_package",
];

export type SyntheticPortfolioMemorySuggestedPersona = "firm_admin" | "audit_partner" | "controller" | "cfo" | "executive";

export const SYNTHETIC_PORTFOLIO_MEMORY_SUGGESTED_PERSONAS: SyntheticPortfolioMemorySuggestedPersona[] = [
  "firm_admin",
  "audit_partner",
  "controller",
  "cfo",
  "executive",
];

export interface BuildPortfolioMemoryPackageInput {
  auditContract: SyntheticAuditContract | null;
  packageCategory: SyntheticPortfolioMemoryPackageCategory;
  enterpriseMemoryPackages?: SyntheticEnterpriseMemoryPackage[];
  crossEntityMemoryPackages?: SyntheticCrossEntityMemoryPackage[];
  crossPeriodMemoryPackages?: SyntheticCrossPeriodMemoryPackage[];
  crossFunctionMemoryPackages?: SyntheticCrossFunctionMemoryPackage[];
  organizationalMemoryGraphs?: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  historicalOutcomePackages?: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages?: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages?: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages?: SyntheticHistoricalControllerPackage[];
  clientPortfolioPackages?: SyntheticMemoryObjectSourceArtifact[];
  firmAuditPackages?: SyntheticMemoryObjectSourceArtifact[];
  firmControllerPackages?: SyntheticMemoryObjectSourceArtifact[];
  multiClientRiskReadinessPackages?: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations?: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations?: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations?: SyntheticMemoryObjectSourceArtifact[];
}

export interface SyntheticPortfolioMemoryPackage {
  portfolioMemoryPackageId: string;
  portfolioMemoryPackageKey: string;
  packageCategory: SyntheticPortfolioMemoryPackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  enterpriseMemoryPackageIds: string[];
  crossEntityMemoryPackageIds: string[];
  crossPeriodMemoryPackageIds: string[];
  crossFunctionMemoryPackageIds: string[];
  organizationalMemoryGraphIds: string[];
  organizationalMemoryPackageIds: string[];
  historicalOutcomePackageIds: string[];
  historicalDecisionPackageIds: string[];
  historicalAuditPackageIds: string[];
  historicalControllerPackageIds: string[];
  clientPortfolioPackageIds: string[];
  firmAuditPackageIds: string[];
  firmControllerPackageIds: string[];
  multiClientRiskReadinessPackageIds: string[];
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
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
  suggestedPersonaCategories: SyntheticPortfolioMemorySuggestedPersona[];
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
  enterpriseMemoryPackages: SyntheticEnterpriseMemoryPackage[];
  crossEntityMemoryPackages: SyntheticCrossEntityMemoryPackage[];
  crossPeriodMemoryPackages: SyntheticCrossPeriodMemoryPackage[];
  crossFunctionMemoryPackages: SyntheticCrossFunctionMemoryPackage[];
  organizationalMemoryGraphs: SyntheticOrganizationalMemoryGraph[];
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  historicalOutcomePackages: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages: SyntheticHistoricalDecisionPackage[];
  historicalAuditPackages: SyntheticHistoricalAuditPackage[];
  historicalControllerPackages: SyntheticHistoricalControllerPackage[];
  clientPortfolioPackages: SyntheticMemoryObjectSourceArtifact[];
  firmAuditPackages: SyntheticMemoryObjectSourceArtifact[];
  firmControllerPackages: SyntheticMemoryObjectSourceArtifact[];
  multiClientRiskReadinessPackages: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations: SyntheticMemoryObjectSourceArtifact[];
  warnings: string[];
}

export interface BuildPortfolioMemoryPackageResult {
  portfolioMemoryPackage: SyntheticPortfolioMemoryPackage | null;
  skipped: boolean;
  warnings: string[];
}

type PortfolioNetworkArtifact =
  | SyntheticEnterpriseMemoryPackage
  | SyntheticCrossEntityMemoryPackage
  | SyntheticCrossPeriodMemoryPackage
  | SyntheticCrossFunctionMemoryPackage
  | SyntheticOrganizationalMemoryGraph
  | SyntheticOrganizationalMemoryPackage;

type PortfolioHistoricalArtifact =
  | SyntheticHistoricalOutcomePackage
  | SyntheticHistoricalDecisionPackage
  | SyntheticHistoricalAuditPackage
  | SyntheticHistoricalControllerPackage;

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

function isSupportedPackageCategory(packageCategory: SyntheticPortfolioMemoryPackageCategory): boolean {
  return SYNTHETIC_PORTFOLIO_MEMORY_PACKAGE_CATEGORIES.includes(packageCategory);
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

function getEnterpriseMemoryPackages(input: BuildPortfolioMemoryPackageInput): SyntheticEnterpriseMemoryPackage[] {
  return getInputArray(input.enterpriseMemoryPackages);
}

function getCrossEntityMemoryPackages(input: BuildPortfolioMemoryPackageInput): SyntheticCrossEntityMemoryPackage[] {
  return getInputArray(input.crossEntityMemoryPackages);
}

function getCrossPeriodMemoryPackages(input: BuildPortfolioMemoryPackageInput): SyntheticCrossPeriodMemoryPackage[] {
  return getInputArray(input.crossPeriodMemoryPackages);
}

function getCrossFunctionMemoryPackages(input: BuildPortfolioMemoryPackageInput): SyntheticCrossFunctionMemoryPackage[] {
  return getInputArray(input.crossFunctionMemoryPackages);
}

function getOrganizationalMemoryGraphs(input: BuildPortfolioMemoryPackageInput): SyntheticOrganizationalMemoryGraph[] {
  return getInputArray(input.organizationalMemoryGraphs);
}

function getOrganizationalMemoryPackages(input: BuildPortfolioMemoryPackageInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getHistoricalOutcomePackages(input: BuildPortfolioMemoryPackageInput): SyntheticHistoricalOutcomePackage[] {
  return getInputArray(input.historicalOutcomePackages);
}

function getHistoricalDecisionPackages(input: BuildPortfolioMemoryPackageInput): SyntheticHistoricalDecisionPackage[] {
  return getInputArray(input.historicalDecisionPackages);
}

function getHistoricalAuditPackages(input: BuildPortfolioMemoryPackageInput): SyntheticHistoricalAuditPackage[] {
  return getInputArray(input.historicalAuditPackages);
}

function getHistoricalControllerPackages(input: BuildPortfolioMemoryPackageInput): SyntheticHistoricalControllerPackage[] {
  return getInputArray(input.historicalControllerPackages);
}

function getPhase35PackageReferences(input: BuildPortfolioMemoryPackageInput): SyntheticMemoryObjectSourceArtifact[] {
  return [
    ...getInputArray(input.clientPortfolioPackages),
    ...getInputArray(input.firmAuditPackages),
    ...getInputArray(input.firmControllerPackages),
    ...getInputArray(input.multiClientRiskReadinessPackages),
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getNetworkArtifacts(input: BuildPortfolioMemoryPackageInput): PortfolioNetworkArtifact[] {
  return [
    ...getEnterpriseMemoryPackages(input),
    ...getCrossEntityMemoryPackages(input),
    ...getCrossPeriodMemoryPackages(input),
    ...getCrossFunctionMemoryPackages(input),
    ...getOrganizationalMemoryGraphs(input),
    ...getOrganizationalMemoryPackages(input),
  ];
}

function getHistoricalArtifacts(input: BuildPortfolioMemoryPackageInput): PortfolioHistoricalArtifact[] {
  return [
    ...getHistoricalOutcomePackages(input),
    ...getHistoricalDecisionPackages(input),
    ...getHistoricalAuditPackages(input),
    ...getHistoricalControllerPackages(input),
  ];
}

function getAllArtifacts(input: BuildPortfolioMemoryPackageInput): Array<PortfolioNetworkArtifact | PortfolioHistoricalArtifact> {
  return [...getNetworkArtifacts(input), ...getHistoricalArtifacts(input)];
}

function getReferenceIds(input: BuildPortfolioMemoryPackageInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, singularName),
      ...getStringArrayProperty(referenceArtifact, arrayName),
    ]),
    ...getAllArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, singularName),
      ...getStringArrayProperty(artifact, arrayName),
    ]),
  ]);
}

function getPackageIds(
  input: BuildPortfolioMemoryPackageInput,
  packageInputs: SyntheticMemoryObjectSourceArtifact[] | undefined,
  singularName: string,
  arrayName: string,
): string[] {
  return uniqueStable([
    ...getInputArray(packageInputs).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, singularName),
      ...getStringArrayProperty(referenceArtifact, arrayName),
      ...getStringProperty(referenceArtifact, "packageId"),
    ]),
    ...getReferenceIds(input, singularName, arrayName),
  ]);
}

function getEnterpriseMemoryPackageIds(input: BuildPortfolioMemoryPackageInput): string[] {
  return uniqueStable(getEnterpriseMemoryPackages(input).map((artifact) => artifact.enterpriseMemoryPackageId));
}

function getCrossEntityMemoryPackageIds(input: BuildPortfolioMemoryPackageInput): string[] {
  return uniqueStable([
    ...getEnterpriseMemoryPackages(input).flatMap((artifact) => artifact.crossEntityMemoryPackageIds),
    ...getCrossEntityMemoryPackages(input).map((artifact) => artifact.crossEntityMemoryPackageId),
    ...getCrossFunctionMemoryPackages(input).flatMap((artifact) => artifact.crossEntityMemoryPackageIds),
  ]);
}

function getCrossPeriodMemoryPackageIds(input: BuildPortfolioMemoryPackageInput): string[] {
  return uniqueStable([
    ...getEnterpriseMemoryPackages(input).flatMap((artifact) => artifact.crossPeriodMemoryPackageIds),
    ...getCrossEntityMemoryPackages(input).flatMap((artifact) => artifact.crossPeriodMemoryPackageIds),
    ...getCrossPeriodMemoryPackages(input).map((artifact) => artifact.crossPeriodMemoryPackageId),
    ...getCrossFunctionMemoryPackages(input).flatMap((artifact) => artifact.crossPeriodMemoryPackageIds),
  ]);
}

function getCrossFunctionMemoryPackageIds(input: BuildPortfolioMemoryPackageInput): string[] {
  return uniqueStable([
    ...getEnterpriseMemoryPackages(input).flatMap((artifact) => artifact.crossFunctionMemoryPackageIds),
    ...getCrossFunctionMemoryPackages(input).map((artifact) => artifact.crossFunctionMemoryPackageId),
  ]);
}

function getOrganizationalMemoryGraphIds(input: BuildPortfolioMemoryPackageInput): string[] {
  return uniqueStable([
    ...getEnterpriseMemoryPackages(input).flatMap((artifact) => artifact.organizationalMemoryGraphIds),
    ...getOrganizationalMemoryGraphs(input).map((artifact) => artifact.organizationalMemoryGraphId),
  ]);
}

function getOrganizationalMemoryPackageIds(input: BuildPortfolioMemoryPackageInput): string[] {
  return uniqueStable([
    ...getEnterpriseMemoryPackages(input).flatMap((artifact) => artifact.organizationalMemoryPackageIds),
    ...getCrossEntityMemoryPackages(input).flatMap((artifact) => artifact.organizationalMemoryPackageIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((artifact) => artifact.organizationalMemoryPackageIds),
    ...getCrossFunctionMemoryPackages(input).flatMap((artifact) => artifact.organizationalMemoryPackageIds),
    ...getOrganizationalMemoryGraphs(input).flatMap((artifact) => artifact.organizationalMemoryPackageIds),
    ...getOrganizationalMemoryPackages(input).map((artifact) => artifact.organizationalMemoryPackageId),
    ...getHistoricalArtifacts(input).flatMap((artifact) => artifact.organizationalMemoryPackageIds),
  ]);
}

function getHistoricalOutcomePackageIds(input: BuildPortfolioMemoryPackageInput): string[] {
  return uniqueStable([
    ...getEnterpriseMemoryPackages(input).flatMap((artifact) => artifact.historicalOutcomePackageIds),
    ...getCrossEntityMemoryPackages(input).flatMap((artifact) => artifact.historicalOutcomePackageIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((artifact) => artifact.historicalOutcomePackageIds),
    ...getCrossFunctionMemoryPackages(input).flatMap((artifact) => artifact.historicalOutcomePackageIds),
    ...getOrganizationalMemoryGraphs(input).flatMap((artifact) => artifact.historicalOutcomePackageIds),
    ...getHistoricalOutcomePackages(input).map((artifact) => artifact.historicalOutcomePackageId),
    ...getHistoricalAuditPackages(input).flatMap((artifact) => artifact.historicalOutcomePackageIds),
    ...getHistoricalControllerPackages(input).flatMap((artifact) => artifact.historicalOutcomePackageIds),
  ]);
}

function getHistoricalDecisionPackageIds(input: BuildPortfolioMemoryPackageInput): string[] {
  return uniqueStable([
    ...getEnterpriseMemoryPackages(input).flatMap((artifact) => artifact.historicalDecisionPackageIds),
    ...getCrossEntityMemoryPackages(input).flatMap((artifact) => artifact.historicalDecisionPackageIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((artifact) => artifact.historicalDecisionPackageIds),
    ...getCrossFunctionMemoryPackages(input).flatMap((artifact) => artifact.historicalDecisionPackageIds),
    ...getOrganizationalMemoryGraphs(input).flatMap((artifact) => artifact.historicalDecisionPackageIds),
    ...getHistoricalDecisionPackages(input).map((artifact) => artifact.historicalDecisionPackageId),
    ...getHistoricalAuditPackages(input).flatMap((artifact) => artifact.historicalDecisionPackageIds),
    ...getHistoricalControllerPackages(input).flatMap((artifact) => artifact.historicalDecisionPackageIds),
  ]);
}

function getHistoricalAuditPackageIds(input: BuildPortfolioMemoryPackageInput): string[] {
  return uniqueStable([
    ...getEnterpriseMemoryPackages(input).flatMap((artifact) => artifact.historicalAuditPackageIds),
    ...getCrossEntityMemoryPackages(input).flatMap((artifact) => artifact.historicalAuditPackageIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((artifact) => artifact.historicalAuditPackageIds),
    ...getCrossFunctionMemoryPackages(input).flatMap((artifact) => artifact.historicalAuditPackageIds),
    ...getOrganizationalMemoryGraphs(input).flatMap((artifact) => artifact.historicalAuditPackageIds),
    ...getHistoricalAuditPackages(input).map((artifact) => artifact.historicalAuditPackageId),
  ]);
}

function getHistoricalControllerPackageIds(input: BuildPortfolioMemoryPackageInput): string[] {
  return uniqueStable([
    ...getEnterpriseMemoryPackages(input).flatMap((artifact) => artifact.historicalControllerPackageIds),
    ...getCrossEntityMemoryPackages(input).flatMap((artifact) => artifact.historicalControllerPackageIds),
    ...getCrossPeriodMemoryPackages(input).flatMap((artifact) => artifact.historicalControllerPackageIds),
    ...getCrossFunctionMemoryPackages(input).flatMap((artifact) => artifact.historicalControllerPackageIds),
    ...getOrganizationalMemoryGraphs(input).flatMap((artifact) => artifact.historicalControllerPackageIds),
    ...getHistoricalControllerPackages(input).map((artifact) => artifact.historicalControllerPackageId),
  ]);
}

function getEvidenceReferenceIds(input: BuildPortfolioMemoryPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => referenceArtifact.evidenceReferenceIds ?? []),
    ...getNetworkArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((artifact) => artifact.outcomeEvidenceReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((artifact) => artifact.decisionEvidenceReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((artifact) => artifact.auditEvidenceReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap((artifact) => artifact.controllerEvidenceReferenceIds),
  ]);
}

function getSourceReferenceIds(input: BuildPortfolioMemoryPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => referenceArtifact.sourceReferenceIds ?? []),
    ...getNetworkArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((artifact) => artifact.outcomeSourceReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((artifact) => artifact.decisionSourceReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((artifact) => artifact.auditSourceReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap((artifact) => artifact.controllerSourceReferenceIds),
  ]);
}

function getLineageReferenceIds(input: BuildPortfolioMemoryPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => referenceArtifact.lineageReferenceIds ?? []),
    ...getNetworkArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((artifact) => artifact.outcomeLineageReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((artifact) => artifact.decisionLineageReferenceIds),
    ...getHistoricalAuditPackages(input).flatMap((artifact) => artifact.auditLineageReferenceIds),
    ...getHistoricalControllerPackages(input).flatMap((artifact) => artifact.controllerLineageReferenceIds),
  ]);
}

function getUpstreamObservationIds(input: BuildPortfolioMemoryPackageInput): string[] {
  return uniqueStable([
    input.auditContract?.observationMetadata?.auditObservationId,
    ...(input.auditContract?.evidence.supportingObservationIds ?? []),
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "observationId"),
      ...(referenceArtifact.upstreamObservationIds ?? []),
    ]),
    ...getAllArtifacts(input).flatMap((artifact) => artifact.upstreamObservationIds),
  ].filter((value): value is string => value !== undefined));
}

function getUpstreamPackageIds(input: BuildPortfolioMemoryPackageInput): string[] {
  return uniqueStable([
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "packageId"),
      ...(referenceArtifact.upstreamPackageIds ?? []),
    ]),
    ...getAllArtifacts(input).flatMap((artifact) => artifact.upstreamPackageIds),
  ]);
}

function getAuditContractReferenceIds(input: BuildPortfolioMemoryPackageInput): string[] {
  const auditContract = input.auditContract;
  return uniqueStable([
    auditContract?.observationMetadata?.auditObservationId,
    auditContract?.findingMetadata?.auditFindingId,
    auditContract?.exceptionMetadata?.auditExceptionId,
    auditContract?.riskMetadata?.auditRiskId,
    ...(auditContract?.evidence.sourceReferenceIds ?? []),
    ...(auditContract?.evidence.lineageReferenceIds ?? []),
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => referenceArtifact.auditContractReferenceIds ?? []),
    ...getAllArtifacts(input).flatMap((artifact) => artifact.auditContractReferenceIds),
  ].filter((value): value is string => value !== undefined));
}

function buildPortfolioMemoryPackageKey(input: BuildPortfolioMemoryPackageInput): string {
  const scope = input.auditContract?.scope;

  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    companyId: scope?.companyId ?? null,
    scope: scope ?? null,
    customerIsolation: scope ? buildCustomerIsolation(scope) : null,
    firmIsolation: scope ? buildFirmIsolation(scope) : null,
    clientIsolation: scope ? buildClientIsolation(scope) : null,
    enterpriseMemoryPackageIds: getEnterpriseMemoryPackageIds(input),
    crossEntityMemoryPackageIds: getCrossEntityMemoryPackageIds(input),
    crossPeriodMemoryPackageIds: getCrossPeriodMemoryPackageIds(input),
    crossFunctionMemoryPackageIds: getCrossFunctionMemoryPackageIds(input),
    organizationalMemoryGraphIds: getOrganizationalMemoryGraphIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
    historicalOutcomePackageIds: getHistoricalOutcomePackageIds(input),
    historicalDecisionPackageIds: getHistoricalDecisionPackageIds(input),
    historicalAuditPackageIds: getHistoricalAuditPackageIds(input),
    historicalControllerPackageIds: getHistoricalControllerPackageIds(input),
    clientPortfolioPackageIds: getPackageIds(input, input.clientPortfolioPackages, "clientPortfolioPackageId", "clientPortfolioPackageIds"),
    firmAuditPackageIds: getPackageIds(input, input.firmAuditPackages, "firmAuditPackageId", "firmAuditPackageIds"),
    firmControllerPackageIds: getPackageIds(input, input.firmControllerPackages, "firmControllerPackageId", "firmControllerPackageIds"),
    multiClientRiskReadinessPackageIds: getPackageIds(
      input,
      input.multiClientRiskReadinessPackages,
      "multiClientRiskReadinessPackageId",
      "multiClientRiskReadinessPackageIds",
    ),
  });
}

function buildPortfolioMemoryPackageId(input: BuildPortfolioMemoryPackageInput): string {
  return `synthetic-portfolio-memory-package:${stableSnapshotHash({
    portfolioMemoryPackageKey: buildPortfolioMemoryPackageKey(input),
    packageCategory: input.packageCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
  })}`;
}

function getMaterialityMetadata(input: BuildPortfolioMemoryPackageInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getPhase35PackageReferences(input).flatMap((referenceArtifact) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityCompatibility"),
    ]),
    ...getAllArtifacts(input).flatMap((artifact) => [...artifact.materialityMetadata, ...artifact.materialityCompatibility]),
  ]);
}

function getForwardCompatibilityWarnings(input: BuildPortfolioMemoryPackageInput): string[] {
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

function validateInput(input: BuildPortfolioMemoryPackageInput): string[] {
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
  if (auditContract.scope.customerIsolationRequired !== true) warnings.push("customerIsolation must remain required for portfolio memory.");
  if (auditContract.scope.firmIsolationRequired !== true) warnings.push("firmIsolation must remain required for portfolio memory.");
  if (buildCustomerIsolation(auditContract.scope).referenceIds.length === 0) warnings.push("customerIsolation referenceIds are required.");
  if (buildFirmIsolation(auditContract.scope).referenceIds.length === 0) warnings.push("firmIsolation referenceIds are required.");

  const companyId = auditContract.scope.companyId;
  for (const [inputName, values] of [
    ["clientPortfolioPackages", getInputArray(input.clientPortfolioPackages)],
    ["firmAuditPackages", getInputArray(input.firmAuditPackages)],
    ["firmControllerPackages", getInputArray(input.firmControllerPackages)],
    ["multiClientRiskReadinessPackages", getInputArray(input.multiClientRiskReadinessPackages)],
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

  for (const [inputName, values, idName, keyName] of [
    ["enterpriseMemoryPackages", getEnterpriseMemoryPackages(input), "enterpriseMemoryPackageId", "enterpriseMemoryPackageKey"],
    ["crossEntityMemoryPackages", getCrossEntityMemoryPackages(input), "crossEntityMemoryPackageId", "crossEntityMemoryPackageKey"],
    ["crossPeriodMemoryPackages", getCrossPeriodMemoryPackages(input), "crossPeriodMemoryPackageId", "crossPeriodMemoryPackageKey"],
    ["crossFunctionMemoryPackages", getCrossFunctionMemoryPackages(input), "crossFunctionMemoryPackageId", "crossFunctionMemoryPackageKey"],
    ["organizationalMemoryGraphs", getOrganizationalMemoryGraphs(input), "organizationalMemoryGraphId", "organizationalMemoryGraphKey"],
    ["organizationalMemoryPackages", getOrganizationalMemoryPackages(input), "organizationalMemoryPackageId", "organizationalMemoryPackageKey"],
    ["historicalOutcomePackages", getHistoricalOutcomePackages(input), "historicalOutcomePackageId", "historicalOutcomePackageKey"],
    ["historicalDecisionPackages", getHistoricalDecisionPackages(input), "historicalDecisionPackageId", "historicalDecisionPackageKey"],
    ["historicalAuditPackages", getHistoricalAuditPackages(input), "historicalAuditPackageId", "historicalAuditPackageKey"],
    ["historicalControllerPackages", getHistoricalControllerPackages(input), "historicalControllerPackageId", "historicalControllerPackageKey"],
  ] as const) {
    values.forEach((artifact, index) => {
      if (!hasValue((artifact as unknown as Record<string, unknown>)[idName])) warnings.push(`${inputName}[${index}].${idName} is required.`);
      if (!hasValue((artifact as unknown as Record<string, unknown>)[keyName])) warnings.push(`${inputName}[${index}].${keyName} is required.`);
      if (artifact.companyId !== companyId) warnings.push(`${inputName}[${index}].companyId must equal scope.companyId.`);
    });
  }

  return warnings;
}

export function buildPortfolioMemoryPackage(input: BuildPortfolioMemoryPackageInput): BuildPortfolioMemoryPackageResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      portfolioMemoryPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const enterpriseMemoryPackageIds = getEnterpriseMemoryPackageIds(input);
  const crossEntityMemoryPackageIds = getCrossEntityMemoryPackageIds(input);
  const crossPeriodMemoryPackageIds = getCrossPeriodMemoryPackageIds(input);
  const crossFunctionMemoryPackageIds = getCrossFunctionMemoryPackageIds(input);
  const organizationalMemoryGraphIds = getOrganizationalMemoryGraphIds(input);
  const organizationalMemoryPackageIds = getOrganizationalMemoryPackageIds(input);
  const historicalOutcomePackageIds = getHistoricalOutcomePackageIds(input);
  const historicalDecisionPackageIds = getHistoricalDecisionPackageIds(input);
  const historicalAuditPackageIds = getHistoricalAuditPackageIds(input);
  const historicalControllerPackageIds = getHistoricalControllerPackageIds(input);
  const materialityMetadata = getMaterialityMetadata(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    portfolioMemoryPackage: {
      portfolioMemoryPackageId: buildPortfolioMemoryPackageId(input),
      portfolioMemoryPackageKey: buildPortfolioMemoryPackageKey(input),
      packageCategory: input.packageCategory,
      companyId: auditContract.scope.companyId,
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      enterpriseMemoryPackageIds,
      crossEntityMemoryPackageIds,
      crossPeriodMemoryPackageIds,
      crossFunctionMemoryPackageIds,
      organizationalMemoryGraphIds,
      organizationalMemoryPackageIds,
      historicalOutcomePackageIds,
      historicalDecisionPackageIds,
      historicalAuditPackageIds,
      historicalControllerPackageIds,
      clientPortfolioPackageIds: getPackageIds(input, input.clientPortfolioPackages, "clientPortfolioPackageId", "clientPortfolioPackageIds"),
      firmAuditPackageIds: getPackageIds(input, input.firmAuditPackages, "firmAuditPackageId", "firmAuditPackageIds"),
      firmControllerPackageIds: getPackageIds(input, input.firmControllerPackages, "firmControllerPackageId", "firmControllerPackageIds"),
      multiClientRiskReadinessPackageIds: getPackageIds(
        input,
        input.multiClientRiskReadinessPackages,
        "multiClientRiskReadinessPackageId",
        "multiClientRiskReadinessPackageIds",
      ),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      sourceReferenceIds: getSourceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
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
      suggestedPersonaCategories: SYNTHETIC_PORTFOLIO_MEMORY_SUGGESTED_PERSONAS,
      observationMetadata: compactDefined([
        auditContract.observationMetadata,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditObservationMetadata>(referenceArtifact, "observationMetadata"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.observationMetadata),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditFindingMetadata>(referenceArtifact, "findingMetadata"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.findingMetadata),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditExceptionMetadata>(referenceArtifact, "exceptionMetadata"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.exceptionMetadata),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditRiskMetadata>(referenceArtifact, "riskMetadata"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.riskMetadata),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditTrustMetadata>(referenceArtifact, "trustMetadata"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.trustMetadata),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(referenceArtifact, "confidenceMetadata"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.confidenceMetadata),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(referenceArtifact, "governanceMetadata"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.governanceMetadata),
      ]),
      materialityMetadata,
      materialityCompatibility: materialityMetadata,
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(referenceArtifact, "personaCompatibility"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(referenceArtifact, "packageCompatibility"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(referenceArtifact, "memoryCompatibility"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(referenceArtifact, "learningCompatibility"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...getPhase35PackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(referenceArtifact, "surfaceCompatibility"),
        ),
        ...getAllArtifacts(input).flatMap((artifact) => artifact.surfaceCompatibility),
      ]),
      enterpriseMemoryPackages: getEnterpriseMemoryPackages(input),
      crossEntityMemoryPackages: getCrossEntityMemoryPackages(input),
      crossPeriodMemoryPackages: getCrossPeriodMemoryPackages(input),
      crossFunctionMemoryPackages: getCrossFunctionMemoryPackages(input),
      organizationalMemoryGraphs: getOrganizationalMemoryGraphs(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      historicalOutcomePackages: getHistoricalOutcomePackages(input),
      historicalDecisionPackages: getHistoricalDecisionPackages(input),
      historicalAuditPackages: getHistoricalAuditPackages(input),
      historicalControllerPackages: getHistoricalControllerPackages(input),
      clientPortfolioPackages: getInputArray(input.clientPortfolioPackages),
      firmAuditPackages: getInputArray(input.firmAuditPackages),
      firmControllerPackages: getInputArray(input.firmControllerPackages),
      multiClientRiskReadinessPackages: getInputArray(input.multiClientRiskReadinessPackages),
      healthcarePpdObservations: getInputArray(input.healthcarePpdObservations),
      payrollObservations: getInputArray(input.payrollObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
