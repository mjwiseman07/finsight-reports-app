import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticMemoryObject,
  SyntheticMemoryObjectIsolationDimension,
  SyntheticMemoryObjectSourceArtifact,
} from "../memory-object";
import type { SyntheticMemoryRelationship } from "../memory-relationship";
import type { SyntheticEvidenceLineageGraph } from "../evidence-lineage-graph";
import type { SyntheticOrganizationalMemoryPackage } from "../organizational-memory-package";
import type { SyntheticHistoricalOutcomePackage } from "../historical-outcome-package";
import type { SyntheticHistoricalDecisionPackage } from "../historical-decision-package";
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

export type SyntheticHistoricalAuditPackageCategory =
  | "historical_audit_package"
  | "audit_response_historical_package"
  | "audit_evidence_historical_package"
  | "audit_finding_historical_package"
  | "audit_confidence_historical_package"
  | "audit_surface_historical_package"
  | "audit_watchlist_historical_package"
  | "audit_briefing_historical_package"
  | "firm_audit_historical_package"
  | "client_portfolio_audit_historical_package";

export const SYNTHETIC_HISTORICAL_AUDIT_PACKAGE_CATEGORIES: SyntheticHistoricalAuditPackageCategory[] = [
  "historical_audit_package",
  "audit_response_historical_package",
  "audit_evidence_historical_package",
  "audit_finding_historical_package",
  "audit_confidence_historical_package",
  "audit_surface_historical_package",
  "audit_watchlist_historical_package",
  "audit_briefing_historical_package",
  "firm_audit_historical_package",
  "client_portfolio_audit_historical_package",
];

export type SyntheticHistoricalAuditSuggestedPersona = "auditor" | "audit_partner" | "controller" | "cfo";

export const SYNTHETIC_HISTORICAL_AUDIT_SUGGESTED_PERSONAS: SyntheticHistoricalAuditSuggestedPersona[] = [
  "auditor",
  "audit_partner",
  "controller",
  "cfo",
];

export interface BuildHistoricalAuditPackageInput {
  auditContract: SyntheticAuditContract | null;
  packageCategory: SyntheticHistoricalAuditPackageCategory;
  historicalAuditReferenceIds?: string[];
  auditLineageReferenceIds?: string[];
  auditEvidenceReferenceIds?: string[];
  auditSourceReferenceIds?: string[];
  memoryObjects?: SyntheticMemoryObject[];
  memoryRelationships?: SyntheticMemoryRelationship[];
  evidenceLineageGraphs?: SyntheticEvidenceLineageGraph[];
  organizationalMemoryPackages?: SyntheticOrganizationalMemoryPackage[];
  historicalOutcomePackages?: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages?: SyntheticHistoricalDecisionPackage[];
  auditResponsePackages?: SyntheticMemoryObjectSourceArtifact[];
  auditPackages?: SyntheticMemoryObjectSourceArtifact[];
  evidenceReviewPackages?: SyntheticMemoryObjectSourceArtifact[];
  firmAuditPackages?: SyntheticMemoryObjectSourceArtifact[];
  clientPortfolioPackages?: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations?: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations?: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations?: SyntheticMemoryObjectSourceArtifact[];
}

export interface SyntheticHistoricalAuditPackage {
  historicalAuditPackageId: string;
  historicalAuditPackageKey: string;
  packageCategory: SyntheticHistoricalAuditPackageCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  historicalAuditReferenceIds: string[];
  auditLineageReferenceIds: string[];
  auditEvidenceReferenceIds: string[];
  auditSourceReferenceIds: string[];
  memoryObjectIds: string[];
  memoryRelationshipIds: string[];
  evidenceLineageGraphIds: string[];
  organizationalMemoryPackageIds: string[];
  historicalOutcomePackageIds: string[];
  historicalDecisionPackageIds: string[];
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
  suggestedPersonaCategories: SyntheticHistoricalAuditSuggestedPersona[];
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
  memoryObjects: SyntheticMemoryObject[];
  memoryRelationships: SyntheticMemoryRelationship[];
  evidenceLineageGraphs: SyntheticEvidenceLineageGraph[];
  organizationalMemoryPackages: SyntheticOrganizationalMemoryPackage[];
  historicalOutcomePackages: SyntheticHistoricalOutcomePackage[];
  historicalDecisionPackages: SyntheticHistoricalDecisionPackage[];
  auditResponsePackages: SyntheticMemoryObjectSourceArtifact[];
  auditPackages: SyntheticMemoryObjectSourceArtifact[];
  evidenceReviewPackages: SyntheticMemoryObjectSourceArtifact[];
  firmAuditPackages: SyntheticMemoryObjectSourceArtifact[];
  clientPortfolioPackages: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations: SyntheticMemoryObjectSourceArtifact[];
  warnings: string[];
}

export interface BuildHistoricalAuditPackageResult {
  historicalAuditPackage: SyntheticHistoricalAuditPackage | null;
  skipped: boolean;
  warnings: string[];
}

type Phase36CoreArtifact =
  | SyntheticMemoryObject
  | SyntheticMemoryRelationship
  | SyntheticEvidenceLineageGraph
  | SyntheticOrganizationalMemoryPackage;

type HistoricalContextArtifact = SyntheticHistoricalOutcomePackage | SyntheticHistoricalDecisionPackage;

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

function isSupportedPackageCategory(packageCategory: SyntheticHistoricalAuditPackageCategory): boolean {
  return SYNTHETIC_HISTORICAL_AUDIT_PACKAGE_CATEGORIES.includes(packageCategory);
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

function getMemoryObjects(input: BuildHistoricalAuditPackageInput): SyntheticMemoryObject[] {
  return getInputArray(input.memoryObjects);
}

function getMemoryRelationships(input: BuildHistoricalAuditPackageInput): SyntheticMemoryRelationship[] {
  return getInputArray(input.memoryRelationships);
}

function getEvidenceLineageGraphs(input: BuildHistoricalAuditPackageInput): SyntheticEvidenceLineageGraph[] {
  return getInputArray(input.evidenceLineageGraphs);
}

function getOrganizationalMemoryPackages(input: BuildHistoricalAuditPackageInput): SyntheticOrganizationalMemoryPackage[] {
  return getInputArray(input.organizationalMemoryPackages);
}

function getHistoricalOutcomePackages(input: BuildHistoricalAuditPackageInput): SyntheticHistoricalOutcomePackage[] {
  return getInputArray(input.historicalOutcomePackages);
}

function getHistoricalDecisionPackages(input: BuildHistoricalAuditPackageInput): SyntheticHistoricalDecisionPackage[] {
  return getInputArray(input.historicalDecisionPackages);
}

function getAuditPackageReferences(input: BuildHistoricalAuditPackageInput): SyntheticMemoryObjectSourceArtifact[] {
  return [
    ...getInputArray(input.auditResponsePackages),
    ...getInputArray(input.auditPackages),
    ...getInputArray(input.evidenceReviewPackages),
    ...getInputArray(input.firmAuditPackages),
    ...getInputArray(input.clientPortfolioPackages),
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getPhase36CoreArtifacts(input: BuildHistoricalAuditPackageInput): Phase36CoreArtifact[] {
  return [
    ...getMemoryObjects(input),
    ...getMemoryRelationships(input),
    ...getEvidenceLineageGraphs(input),
    ...getOrganizationalMemoryPackages(input),
  ];
}

function getHistoricalContextArtifacts(input: BuildHistoricalAuditPackageInput): HistoricalContextArtifact[] {
  return [...getHistoricalOutcomePackages(input), ...getHistoricalDecisionPackages(input)];
}

function getAllPackageArtifacts(input: BuildHistoricalAuditPackageInput): Array<Phase36CoreArtifact | HistoricalContextArtifact> {
  return [...getPhase36CoreArtifacts(input), ...getHistoricalContextArtifacts(input)];
}

function getReferenceIds(input: BuildHistoricalAuditPackageInput, singularName: string, arrayName: string): string[] {
  return uniqueStable([
    ...getAuditPackageReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, singularName),
      ...getStringArrayProperty(referenceArtifact, arrayName),
    ]),
    ...getAllPackageArtifacts(input).flatMap((packageArtifact) => [
      ...getStringProperty(packageArtifact, singularName),
      ...getStringArrayProperty(packageArtifact, arrayName),
    ]),
  ]);
}

function getHistoricalAuditReferenceIds(input: BuildHistoricalAuditPackageInput): string[] {
  return uniqueStable([
    ...getInputArray(input.historicalAuditReferenceIds),
    input.auditContract?.observationMetadata?.auditObservationId,
    input.auditContract?.findingMetadata?.auditFindingId,
    ...getReferenceIds(input, "auditPackageId", "auditPackageIds"),
  ].filter((value): value is string => value !== undefined));
}

function getAuditLineageReferenceIds(input: BuildHistoricalAuditPackageInput): string[] {
  return uniqueStable([
    ...getInputArray(input.auditLineageReferenceIds),
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getPhase36CoreArtifacts(input).flatMap((packageArtifact) => packageArtifact.lineageReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((historicalOutcomePackage) => historicalOutcomePackage.outcomeLineageReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((historicalDecisionPackage) => historicalDecisionPackage.decisionLineageReferenceIds),
  ]);
}

function getAuditEvidenceReferenceIds(input: BuildHistoricalAuditPackageInput): string[] {
  return uniqueStable([
    ...getInputArray(input.auditEvidenceReferenceIds),
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getPhase36CoreArtifacts(input).flatMap((packageArtifact) => packageArtifact.evidenceReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((historicalOutcomePackage) => historicalOutcomePackage.outcomeEvidenceReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((historicalDecisionPackage) => historicalDecisionPackage.decisionEvidenceReferenceIds),
  ]);
}

function getAuditSourceReferenceIds(input: BuildHistoricalAuditPackageInput): string[] {
  return uniqueStable([
    ...getInputArray(input.auditSourceReferenceIds),
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getPhase36CoreArtifacts(input).flatMap((packageArtifact) => packageArtifact.sourceReferenceIds),
    ...getHistoricalOutcomePackages(input).flatMap((historicalOutcomePackage) => historicalOutcomePackage.outcomeSourceReferenceIds),
    ...getHistoricalDecisionPackages(input).flatMap((historicalDecisionPackage) => historicalDecisionPackage.decisionSourceReferenceIds),
  ]);
}

function getMemoryObjectIds(input: BuildHistoricalAuditPackageInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.supportingMemoryIds ?? []),
    ...getMemoryObjects(input).map((memoryObject) => memoryObject.memoryObjectId),
    ...getMemoryRelationships(input).flatMap((memoryRelationship) => memoryRelationship.memoryObjectIds),
    ...getEvidenceLineageGraphs(input).flatMap((evidenceLineageGraph) => evidenceLineageGraph.memoryObjectIds),
    ...getOrganizationalMemoryPackages(input).flatMap((organizationalMemoryPackage) => organizationalMemoryPackage.memoryObjectIds),
    ...getHistoricalContextArtifacts(input).flatMap((historicalContextArtifact) => historicalContextArtifact.memoryObjectIds),
  ]);
}

function getMemoryRelationshipIds(input: BuildHistoricalAuditPackageInput): string[] {
  return uniqueStable([
    ...getMemoryRelationships(input).map((memoryRelationship) => memoryRelationship.memoryRelationshipId),
    ...getEvidenceLineageGraphs(input).flatMap((evidenceLineageGraph) => evidenceLineageGraph.memoryRelationshipIds),
    ...getOrganizationalMemoryPackages(input).flatMap((organizationalMemoryPackage) => organizationalMemoryPackage.memoryRelationshipIds),
    ...getHistoricalContextArtifacts(input).flatMap((historicalContextArtifact) => historicalContextArtifact.memoryRelationshipIds),
  ]);
}

function getEvidenceLineageGraphIds(input: BuildHistoricalAuditPackageInput): string[] {
  return uniqueStable([
    ...getEvidenceLineageGraphs(input).map((evidenceLineageGraph) => evidenceLineageGraph.evidenceLineageGraphId),
    ...getOrganizationalMemoryPackages(input).flatMap((organizationalMemoryPackage) => organizationalMemoryPackage.evidenceLineageGraphIds),
    ...getHistoricalContextArtifacts(input).flatMap((historicalContextArtifact) => historicalContextArtifact.evidenceLineageGraphIds),
  ]);
}

function getOrganizationalMemoryPackageIds(input: BuildHistoricalAuditPackageInput): string[] {
  return uniqueStable([
    ...getOrganizationalMemoryPackages(input).map((organizationalMemoryPackage) => organizationalMemoryPackage.organizationalMemoryPackageId),
    ...getHistoricalContextArtifacts(input).flatMap((historicalContextArtifact) => historicalContextArtifact.organizationalMemoryPackageIds),
  ]);
}

function getHistoricalOutcomePackageIds(input: BuildHistoricalAuditPackageInput): string[] {
  return uniqueStable(getHistoricalOutcomePackages(input).map((historicalOutcomePackage) => historicalOutcomePackage.historicalOutcomePackageId));
}

function getHistoricalDecisionPackageIds(input: BuildHistoricalAuditPackageInput): string[] {
  return uniqueStable(
    getHistoricalDecisionPackages(input).map((historicalDecisionPackage) => historicalDecisionPackage.historicalDecisionPackageId),
  );
}

function getUpstreamObservationIds(input: BuildHistoricalAuditPackageInput): string[] {
  return uniqueStable([
    input.auditContract?.observationMetadata?.auditObservationId,
    ...(input.auditContract?.evidence.supportingObservationIds ?? []),
    ...getAuditPackageReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "observationId"),
      ...(referenceArtifact.upstreamObservationIds ?? []),
    ]),
    ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.upstreamObservationIds),
  ].filter((value): value is string => value !== undefined));
}

function getUpstreamPackageIds(input: BuildHistoricalAuditPackageInput): string[] {
  return uniqueStable([
    ...getAuditPackageReferences(input).flatMap((referenceArtifact) => [
      ...getStringProperty(referenceArtifact, "packageId"),
      ...(referenceArtifact.upstreamPackageIds ?? []),
    ]),
    ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.upstreamPackageIds),
  ]);
}

function getAuditContractReferenceIds(input: BuildHistoricalAuditPackageInput): string[] {
  const auditContract = input.auditContract;
  return uniqueStable([
    auditContract?.observationMetadata?.auditObservationId,
    auditContract?.findingMetadata?.auditFindingId,
    auditContract?.exceptionMetadata?.auditExceptionId,
    auditContract?.riskMetadata?.auditRiskId,
    ...(auditContract?.evidence.sourceReferenceIds ?? []),
    ...(auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAuditPackageReferences(input).flatMap((referenceArtifact) => referenceArtifact.auditContractReferenceIds ?? []),
    ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.auditContractReferenceIds),
  ].filter((value): value is string => value !== undefined));
}

function buildHistoricalAuditPackageKey(input: BuildHistoricalAuditPackageInput): string {
  const scope = input.auditContract?.scope;

  return stableSnapshotHash({
    packageCategory: input.packageCategory,
    companyId: scope?.companyId ?? null,
    scope: scope ?? null,
    customerIsolation: scope ? buildCustomerIsolation(scope) : null,
    firmIsolation: scope ? buildFirmIsolation(scope) : null,
    clientIsolation: scope ? buildClientIsolation(scope) : null,
    historicalAuditReferenceIds: getHistoricalAuditReferenceIds(input),
    auditLineageReferenceIds: getAuditLineageReferenceIds(input),
    auditEvidenceReferenceIds: getAuditEvidenceReferenceIds(input),
    auditSourceReferenceIds: getAuditSourceReferenceIds(input),
    memoryObjectIds: getMemoryObjectIds(input),
    memoryRelationshipIds: getMemoryRelationshipIds(input),
    evidenceLineageGraphIds: getEvidenceLineageGraphIds(input),
    organizationalMemoryPackageIds: getOrganizationalMemoryPackageIds(input),
    historicalOutcomePackageIds: getHistoricalOutcomePackageIds(input),
    historicalDecisionPackageIds: getHistoricalDecisionPackageIds(input),
  });
}

function buildHistoricalAuditPackageId(input: BuildHistoricalAuditPackageInput): string {
  return `synthetic-historical-audit-package:${stableSnapshotHash({
    historicalAuditPackageKey: buildHistoricalAuditPackageKey(input),
    packageCategory: input.packageCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
  })}`;
}

function getMaterialityMetadata(input: BuildHistoricalAuditPackageInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getAuditPackageReferences(input).flatMap((referenceArtifact) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(referenceArtifact, "materialityCompatibility"),
    ]),
    ...getAllPackageArtifacts(input).flatMap((packageArtifact) => [
      ...packageArtifact.materialityMetadata,
      ...packageArtifact.materialityCompatibility,
    ]),
  ]);
}

function getForwardCompatibilityWarnings(input: BuildHistoricalAuditPackageInput): string[] {
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

function validateInput(input: BuildHistoricalAuditPackageInput): string[] {
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

  const companyId = auditContract.scope.companyId;
  for (const [inputName, values] of [
    ["auditResponsePackages", getInputArray(input.auditResponsePackages)],
    ["auditPackages", getInputArray(input.auditPackages)],
    ["evidenceReviewPackages", getInputArray(input.evidenceReviewPackages)],
    ["firmAuditPackages", getInputArray(input.firmAuditPackages)],
    ["clientPortfolioPackages", getInputArray(input.clientPortfolioPackages)],
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

  getMemoryObjects(input).forEach((memoryObject, index) => {
    if (!hasValue(memoryObject.memoryObjectId)) warnings.push(`memoryObjects[${index}].memoryObjectId is required.`);
    if (!hasValue(memoryObject.memoryObjectKey)) warnings.push(`memoryObjects[${index}].memoryObjectKey is required.`);
    if (memoryObject.companyId !== companyId) warnings.push(`memoryObjects[${index}].companyId must equal scope.companyId.`);
  });

  getMemoryRelationships(input).forEach((memoryRelationship, index) => {
    if (!hasValue(memoryRelationship.memoryRelationshipId)) {
      warnings.push(`memoryRelationships[${index}].memoryRelationshipId is required.`);
    }
    if (!hasValue(memoryRelationship.memoryRelationshipKey)) {
      warnings.push(`memoryRelationships[${index}].memoryRelationshipKey is required.`);
    }
    if (memoryRelationship.companyId !== companyId) warnings.push(`memoryRelationships[${index}].companyId must equal scope.companyId.`);
  });

  getEvidenceLineageGraphs(input).forEach((evidenceLineageGraph, index) => {
    if (!hasValue(evidenceLineageGraph.evidenceLineageGraphId)) {
      warnings.push(`evidenceLineageGraphs[${index}].evidenceLineageGraphId is required.`);
    }
    if (!hasValue(evidenceLineageGraph.evidenceLineageGraphKey)) {
      warnings.push(`evidenceLineageGraphs[${index}].evidenceLineageGraphKey is required.`);
    }
    if (evidenceLineageGraph.companyId !== companyId) warnings.push(`evidenceLineageGraphs[${index}].companyId must equal scope.companyId.`);
  });

  getOrganizationalMemoryPackages(input).forEach((organizationalMemoryPackage, index) => {
    if (!hasValue(organizationalMemoryPackage.organizationalMemoryPackageId)) {
      warnings.push(`organizationalMemoryPackages[${index}].organizationalMemoryPackageId is required.`);
    }
    if (!hasValue(organizationalMemoryPackage.organizationalMemoryPackageKey)) {
      warnings.push(`organizationalMemoryPackages[${index}].organizationalMemoryPackageKey is required.`);
    }
    if (organizationalMemoryPackage.companyId !== companyId) {
      warnings.push(`organizationalMemoryPackages[${index}].companyId must equal scope.companyId.`);
    }
  });

  getHistoricalOutcomePackages(input).forEach((historicalOutcomePackage, index) => {
    if (!hasValue(historicalOutcomePackage.historicalOutcomePackageId)) {
      warnings.push(`historicalOutcomePackages[${index}].historicalOutcomePackageId is required.`);
    }
    if (!hasValue(historicalOutcomePackage.historicalOutcomePackageKey)) {
      warnings.push(`historicalOutcomePackages[${index}].historicalOutcomePackageKey is required.`);
    }
    if (historicalOutcomePackage.companyId !== companyId) {
      warnings.push(`historicalOutcomePackages[${index}].companyId must equal scope.companyId.`);
    }
  });

  getHistoricalDecisionPackages(input).forEach((historicalDecisionPackage, index) => {
    if (!hasValue(historicalDecisionPackage.historicalDecisionPackageId)) {
      warnings.push(`historicalDecisionPackages[${index}].historicalDecisionPackageId is required.`);
    }
    if (!hasValue(historicalDecisionPackage.historicalDecisionPackageKey)) {
      warnings.push(`historicalDecisionPackages[${index}].historicalDecisionPackageKey is required.`);
    }
    if (historicalDecisionPackage.companyId !== companyId) {
      warnings.push(`historicalDecisionPackages[${index}].companyId must equal scope.companyId.`);
    }
  });

  return warnings;
}

export function buildHistoricalAuditPackage(input: BuildHistoricalAuditPackageInput): BuildHistoricalAuditPackageResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      historicalAuditPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const historicalAuditReferenceIds = getHistoricalAuditReferenceIds(input);
  const auditLineageReferenceIds = getAuditLineageReferenceIds(input);
  const auditEvidenceReferenceIds = getAuditEvidenceReferenceIds(input);
  const auditSourceReferenceIds = getAuditSourceReferenceIds(input);
  const memoryObjectIds = getMemoryObjectIds(input);
  const memoryRelationshipIds = getMemoryRelationshipIds(input);
  const evidenceLineageGraphIds = getEvidenceLineageGraphIds(input);
  const organizationalMemoryPackageIds = getOrganizationalMemoryPackageIds(input);
  const historicalOutcomePackageIds = getHistoricalOutcomePackageIds(input);
  const historicalDecisionPackageIds = getHistoricalDecisionPackageIds(input);
  const materialityMetadata = getMaterialityMetadata(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    historicalAuditPackage: {
      historicalAuditPackageId: buildHistoricalAuditPackageId(input),
      historicalAuditPackageKey: buildHistoricalAuditPackageKey(input),
      packageCategory: input.packageCategory,
      companyId: auditContract.scope.companyId,
      scope: auditContract.scope,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
      historicalAuditReferenceIds,
      auditLineageReferenceIds,
      auditEvidenceReferenceIds,
      auditSourceReferenceIds,
      memoryObjectIds,
      memoryRelationshipIds,
      evidenceLineageGraphIds,
      organizationalMemoryPackageIds,
      historicalOutcomePackageIds,
      historicalDecisionPackageIds,
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
      suggestedPersonaCategories: SYNTHETIC_HISTORICAL_AUDIT_SUGGESTED_PERSONAS,
      observationMetadata: compactDefined([
        auditContract.observationMetadata,
        ...getAuditPackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditObservationMetadata>(referenceArtifact, "observationMetadata"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.observationMetadata),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...getAuditPackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditFindingMetadata>(referenceArtifact, "findingMetadata"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.findingMetadata),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...getAuditPackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditExceptionMetadata>(referenceArtifact, "exceptionMetadata"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.exceptionMetadata),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...getAuditPackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditRiskMetadata>(referenceArtifact, "riskMetadata"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.riskMetadata),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...getAuditPackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditTrustMetadata>(referenceArtifact, "trustMetadata"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.trustMetadata),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...getAuditPackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(referenceArtifact, "confidenceMetadata"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.confidenceMetadata),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...getAuditPackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(referenceArtifact, "governanceMetadata"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.governanceMetadata),
      ]),
      materialityMetadata,
      materialityCompatibility: materialityMetadata,
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...getAuditPackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(referenceArtifact, "personaCompatibility"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...getAuditPackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(referenceArtifact, "packageCompatibility"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...getAuditPackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(referenceArtifact, "memoryCompatibility"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...getAuditPackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(referenceArtifact, "learningCompatibility"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...getAuditPackageReferences(input).flatMap((referenceArtifact) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(referenceArtifact, "surfaceCompatibility"),
        ),
        ...getAllPackageArtifacts(input).flatMap((packageArtifact) => packageArtifact.surfaceCompatibility),
      ]),
      memoryObjects: getMemoryObjects(input),
      memoryRelationships: getMemoryRelationships(input),
      evidenceLineageGraphs: getEvidenceLineageGraphs(input),
      organizationalMemoryPackages: getOrganizationalMemoryPackages(input),
      historicalOutcomePackages: getHistoricalOutcomePackages(input),
      historicalDecisionPackages: getHistoricalDecisionPackages(input),
      auditResponsePackages: getInputArray(input.auditResponsePackages),
      auditPackages: getInputArray(input.auditPackages),
      evidenceReviewPackages: getInputArray(input.evidenceReviewPackages),
      firmAuditPackages: getInputArray(input.firmAuditPackages),
      clientPortfolioPackages: getInputArray(input.clientPortfolioPackages),
      healthcarePpdObservations: getInputArray(input.healthcarePpdObservations),
      payrollObservations: getInputArray(input.payrollObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
