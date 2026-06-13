import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditContract,
  SyntheticAuditEvidenceReferences,
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

export type SyntheticMemoryObjectCategory =
  | "organizational_context_memory"
  | "audit_context_memory"
  | "controller_context_memory"
  | "evidence_context_memory"
  | "package_lineage_memory"
  | "historical_context_memory"
  | "cross_period_context_memory"
  | "cross_entity_context_memory"
  | "cross_function_context_memory";

export const SYNTHETIC_MEMORY_OBJECT_CATEGORIES: SyntheticMemoryObjectCategory[] = [
  "organizational_context_memory",
  "audit_context_memory",
  "controller_context_memory",
  "evidence_context_memory",
  "package_lineage_memory",
  "historical_context_memory",
  "cross_period_context_memory",
  "cross_entity_context_memory",
  "cross_function_context_memory",
];

export interface SyntheticMemoryObjectIsolationDimension {
  required: boolean;
  referenceIds: string[];
}

export interface SyntheticMemoryObjectSourceArtifact {
  companyId: string;
  observationId?: string;
  packageId?: string;
  evidenceReferenceIds?: string[];
  sourceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  upstreamObservationIds?: string[];
  upstreamPackageIds?: string[];
  auditContractReferenceIds?: string[];
  auditCandidateIds?: string[];
  auditEvidencePackageIds?: string[];
  auditFindingArtifactIds?: string[];
  auditFindingIds?: string[];
  auditConfidenceIds?: string[];
  auditSurfaceIds?: string[];
  auditWatchlistIds?: string[];
  auditBriefingIds?: string[];
  healthcarePpdObservationId?: string;
  healthcarePpdObservationIds?: string[];
  payrollObservationId?: string;
  payrollObservationIds?: string[];
  methodologyObservationId?: string;
  methodologyObservationIds?: string[];
  observationMetadata?: SyntheticAuditObservationMetadata[];
  findingMetadata?: SyntheticAuditFindingMetadata[];
  exceptionMetadata?: SyntheticAuditExceptionMetadata[];
  riskMetadata?: SyntheticAuditRiskMetadata[];
  trustMetadata?: SyntheticAuditTrustMetadata[];
  confidenceMetadata?: SyntheticAuditConfidenceMetadata[];
  governanceMetadata?: SyntheticAuditGovernanceMetadata[];
  materialityMetadata?: SyntheticAuditMaterialityCompatibility[];
  materialityCompatibility?: SyntheticAuditMaterialityCompatibility[];
  personaCompatibility?: SyntheticAuditPersonaCompatibility[];
  packageCompatibility?: SyntheticAuditPackageCompatibility[];
  memoryCompatibility?: SyntheticAuditMemoryCompatibility[];
  learningCompatibility?: SyntheticAuditLearningCompatibility[];
  surfaceCompatibility?: SyntheticAuditSurfaceCompatibility[];
}

export interface BuildMemoryObjectInput {
  auditContract: SyntheticAuditContract | null;
  memoryCategory: SyntheticMemoryObjectCategory;
  sourceArtifacts?: SyntheticMemoryObjectSourceArtifact[];
  workflowPackages?: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations?: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations?: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations?: SyntheticMemoryObjectSourceArtifact[];
}

export interface SyntheticMemoryObject {
  memoryObjectId: string;
  memoryObjectKey: string;
  memoryCategory: SyntheticMemoryObjectCategory;
  companyId: string;
  scope: SyntheticAuditScope;
  immutable: true;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
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
  evidence: SyntheticAuditEvidenceReferences;
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
  auditContract: SyntheticAuditContract;
  sourceArtifacts: SyntheticMemoryObjectSourceArtifact[];
  workflowPackages: SyntheticMemoryObjectSourceArtifact[];
  healthcarePpdObservations: SyntheticMemoryObjectSourceArtifact[];
  payrollObservations: SyntheticMemoryObjectSourceArtifact[];
  methodologyObservations: SyntheticMemoryObjectSourceArtifact[];
  warnings: string[];
}

export interface BuildMemoryObjectResult {
  memoryObject: SyntheticMemoryObject | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function hasArrayValue(values: string[] | undefined): boolean {
  return Array.isArray(values) && values.some(hasValue);
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

function isSupportedMemoryCategory(memoryCategory: SyntheticMemoryObjectCategory): boolean {
  return SYNTHETIC_MEMORY_OBJECT_CATEGORIES.includes(memoryCategory);
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

function getAllSourceArtifacts(input: BuildMemoryObjectInput): SyntheticMemoryObjectSourceArtifact[] {
  return [
    ...getInputArray(input.sourceArtifacts),
    ...getInputArray(input.workflowPackages),
    ...getInputArray(input.healthcarePpdObservations),
    ...getInputArray(input.payrollObservations),
    ...getInputArray(input.methodologyObservations),
  ];
}

function getReferenceIds(input: BuildMemoryObjectInput, singularName: string, arrayName: string): string[] {
  return uniqueStable(
    getAllSourceArtifacts(input).flatMap((sourceArtifact) => [
      ...getStringProperty(sourceArtifact, singularName),
      ...getStringArrayProperty(sourceArtifact, arrayName),
    ]),
  );
}

function getEvidenceReferenceIds(input: BuildMemoryObjectInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAllSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.evidenceReferenceIds ?? []),
  ]);
}

function getSourceReferenceIds(input: BuildMemoryObjectInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAllSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.sourceReferenceIds ?? []),
  ]);
}

function getLineageReferenceIds(input: BuildMemoryObjectInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAllSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.lineageReferenceIds ?? []),
  ]);
}

function getAuditContractReferenceIds(input: BuildMemoryObjectInput): string[] {
  const auditContract = input.auditContract;
  return uniqueStable([
    auditContract?.observationMetadata?.auditObservationId,
    auditContract?.findingMetadata?.auditFindingId,
    auditContract?.exceptionMetadata?.auditExceptionId,
    auditContract?.riskMetadata?.auditRiskId,
    ...(auditContract?.evidence.sourceReferenceIds ?? []),
    ...(auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAllSourceArtifacts(input).flatMap((sourceArtifact) => sourceArtifact.auditContractReferenceIds ?? []),
  ].filter((value): value is string => value !== undefined));
}

function getUpstreamObservationIds(input: BuildMemoryObjectInput): string[] {
  return uniqueStable([
    ...getAllSourceArtifacts(input).flatMap((sourceArtifact) => [
      ...getStringProperty(sourceArtifact, "observationId"),
      ...(sourceArtifact.upstreamObservationIds ?? []),
    ]),
  ]);
}

function getUpstreamPackageIds(input: BuildMemoryObjectInput): string[] {
  return uniqueStable([
    ...getAllSourceArtifacts(input).flatMap((sourceArtifact) => [
      ...getStringProperty(sourceArtifact, "packageId"),
      ...(sourceArtifact.upstreamPackageIds ?? []),
    ]),
  ]);
}

function buildMemoryObjectKey(input: BuildMemoryObjectInput): string {
  const auditContract = input.auditContract;
  const scope = auditContract?.scope;

  return stableSnapshotHash({
    memoryCategory: input.memoryCategory,
    companyId: scope?.companyId ?? null,
    scope: scope ?? null,
    customerIsolation: scope ? buildCustomerIsolation(scope) : null,
    firmIsolation: scope ? buildFirmIsolation(scope) : null,
    clientIsolation: scope ? buildClientIsolation(scope) : null,
    upstreamObservationIds: getUpstreamObservationIds(input),
    upstreamPackageIds: getUpstreamPackageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function buildMemoryObjectId(input: BuildMemoryObjectInput): string {
  return `synthetic-memory-object:${stableSnapshotHash({
    memoryObjectKey: buildMemoryObjectKey(input),
    memoryCategory: input.memoryCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
  })}`;
}

function getMaterialityMetadata(input: BuildMemoryObjectInput): SyntheticAuditMaterialityCompatibility[] {
  return compactDefined([
    input.auditContract?.materialityCompatibility,
    ...getAllSourceArtifacts(input).flatMap((sourceArtifact) => [
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(sourceArtifact, "materialityMetadata"),
      ...getObjectArrayProperty<SyntheticAuditMaterialityCompatibility>(sourceArtifact, "materialityCompatibility"),
    ]),
  ]);
}

function getForwardCompatibilityWarnings(input: BuildMemoryObjectInput): string[] {
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

function validateInput(input: BuildMemoryObjectInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (!hasValue(input.memoryCategory)) warnings.push("memoryCategory is required.");
  if (!isSupportedMemoryCategory(input.memoryCategory)) warnings.push("memoryCategory must be supported.");
  if (!auditContract.scope) warnings.push("auditContract.scope is required.");
  if (!auditContract.evidence) warnings.push("auditContract.evidence is required.");
  if (!auditContract.scope || !auditContract.evidence) return warnings;

  if (!hasValue(auditContract.scope.companyId)) warnings.push("scope.companyId is required.");
  if (!hasArrayValue(auditContract.scope.isolationBoundaryIds)) warnings.push("scope.isolationBoundaryIds must include at least one value.");
  if (auditContract.scope.firmIsolationRequired && !hasValue(auditContract.scope.firmId)) warnings.push("scope.firmId is required.");
  if (auditContract.scope.clientIsolationRequired && !hasValue(auditContract.scope.clientId)) warnings.push("scope.clientId is required.");
  if (!hasArrayValue(auditContract.evidence.evidenceIds)) warnings.push("evidence.evidenceIds must include at least one value.");
  if (!hasArrayValue(auditContract.evidence.sourceReferenceIds)) warnings.push("evidence.sourceReferenceIds must include at least one value.");
  if (!hasArrayValue(auditContract.evidence.lineageReferenceIds)) warnings.push("evidence.lineageReferenceIds must include at least one value.");

  const companyId = auditContract.scope.companyId;
  for (const [inputName, values] of [
    ["sourceArtifacts", getInputArray(input.sourceArtifacts)],
    ["workflowPackages", getInputArray(input.workflowPackages)],
    ["healthcarePpdObservations", getInputArray(input.healthcarePpdObservations)],
    ["payrollObservations", getInputArray(input.payrollObservations)],
    ["methodologyObservations", getInputArray(input.methodologyObservations)],
  ] as const) {
    values.forEach((sourceArtifact, index) => {
      if (!hasValue(sourceArtifact.companyId)) warnings.push(`${inputName}[${index}].companyId is required.`);
      if (sourceArtifact.companyId && sourceArtifact.companyId !== companyId) warnings.push(`${inputName}[${index}].companyId must match scope.companyId.`);
    });
  }

  return warnings;
}

export function buildMemoryObject(input: BuildMemoryObjectInput): BuildMemoryObjectResult {
  const fatalWarnings = validateInput(input);
  if (fatalWarnings.length > 0 || !input.auditContract) {
    return {
      memoryObject: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const auditContract = input.auditContract;
  const sourceArtifacts = getInputArray(input.sourceArtifacts);
  const workflowPackages = getInputArray(input.workflowPackages);
  const materialityMetadata = getMaterialityMetadata(input);
  const warnings = getForwardCompatibilityWarnings(input);

  return {
    memoryObject: {
      memoryObjectId: buildMemoryObjectId(input),
      memoryObjectKey: buildMemoryObjectKey(input),
      memoryCategory: input.memoryCategory,
      companyId: auditContract.scope.companyId,
      scope: auditContract.scope,
      immutable: true,
      customerIsolation: buildCustomerIsolation(auditContract.scope),
      firmIsolation: buildFirmIsolation(auditContract.scope),
      clientIsolation: buildClientIsolation(auditContract.scope),
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
      evidence: auditContract.evidence,
      observationMetadata: compactDefined([
        auditContract.observationMetadata,
        ...getAllSourceArtifacts(input).flatMap((sourceArtifact) =>
          getObjectArrayProperty<SyntheticAuditObservationMetadata>(sourceArtifact, "observationMetadata"),
        ),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...getAllSourceArtifacts(input).flatMap((sourceArtifact) =>
          getObjectArrayProperty<SyntheticAuditFindingMetadata>(sourceArtifact, "findingMetadata"),
        ),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...getAllSourceArtifacts(input).flatMap((sourceArtifact) =>
          getObjectArrayProperty<SyntheticAuditExceptionMetadata>(sourceArtifact, "exceptionMetadata"),
        ),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...getAllSourceArtifacts(input).flatMap((sourceArtifact) =>
          getObjectArrayProperty<SyntheticAuditRiskMetadata>(sourceArtifact, "riskMetadata"),
        ),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...getAllSourceArtifacts(input).flatMap((sourceArtifact) =>
          getObjectArrayProperty<SyntheticAuditTrustMetadata>(sourceArtifact, "trustMetadata"),
        ),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...getAllSourceArtifacts(input).flatMap((sourceArtifact) =>
          getObjectArrayProperty<SyntheticAuditConfidenceMetadata>(sourceArtifact, "confidenceMetadata"),
        ),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...getAllSourceArtifacts(input).flatMap((sourceArtifact) =>
          getObjectArrayProperty<SyntheticAuditGovernanceMetadata>(sourceArtifact, "governanceMetadata"),
        ),
      ]),
      materialityMetadata,
      materialityCompatibility: materialityMetadata,
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...getAllSourceArtifacts(input).flatMap((sourceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPersonaCompatibility>(sourceArtifact, "personaCompatibility"),
        ),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...getAllSourceArtifacts(input).flatMap((sourceArtifact) =>
          getObjectArrayProperty<SyntheticAuditPackageCompatibility>(sourceArtifact, "packageCompatibility"),
        ),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...getAllSourceArtifacts(input).flatMap((sourceArtifact) =>
          getObjectArrayProperty<SyntheticAuditMemoryCompatibility>(sourceArtifact, "memoryCompatibility"),
        ),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...getAllSourceArtifacts(input).flatMap((sourceArtifact) =>
          getObjectArrayProperty<SyntheticAuditLearningCompatibility>(sourceArtifact, "learningCompatibility"),
        ),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...getAllSourceArtifacts(input).flatMap((sourceArtifact) =>
          getObjectArrayProperty<SyntheticAuditSurfaceCompatibility>(sourceArtifact, "surfaceCompatibility"),
        ),
      ]),
      auditContract,
      sourceArtifacts,
      workflowPackages,
      healthcarePpdObservations: getInputArray(input.healthcarePpdObservations),
      payrollObservations: getInputArray(input.payrollObservations),
      methodologyObservations: getInputArray(input.methodologyObservations),
      warnings,
    },
    skipped: false,
    warnings,
  };
}
