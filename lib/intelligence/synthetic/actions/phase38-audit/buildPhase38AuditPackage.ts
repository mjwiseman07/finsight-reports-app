import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticActionDerivationMethod, SyntheticPhase38StaleMarker } from "../contracts";
import type { SyntheticPhase37ActionHandoffArtifact } from "../action-candidate";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";

export const PHASE38_COMPLETED_MODULES = [
  "38A",
  "38B",
  "38C",
  "38D",
  "38E",
  "38F",
  "38G",
  "38H",
  "38I",
  "38J",
  "38K",
  "38L",
  "38M",
  "38N",
  "38O",
  "38P",
  "38Q",
  "38R",
  "38S",
  "38T",
  "38V",
  "38W",
] as const;

export type Phase38CompletedModuleIdentifier = (typeof PHASE38_COMPLETED_MODULES)[number];

export interface BuildPhase38AuditPackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  phase38VerifierPassed?: boolean;
  phase38TypeScriptPassed?: boolean;
  phase38AllModulesPresent?: boolean;
  phase38AllMarkersConfirmed?: boolean;
  phase38AllProhibitedImportsAbsent?: boolean;
  phase38Phase37HandoffConsumed?: boolean;
  phase38Phase39HandoffProduced?: boolean;
  phase38SnapshotHash?: string;
  boundPhase37SnapshotHash?: string;
  phase37SupersessionReferenceIds?: string[];
  phase38StaleMarker?: SyntheticPhase38StaleMarker;
  phase38LockedAt?: string;
  phase38AuditNotes?: string[];
  companyId?: string;
  scope?: SyntheticAuditScope;
  customerIsolation?: SyntheticMemoryObjectIsolationDimension;
  firmIsolation?: SyntheticMemoryObjectIsolationDimension;
  clientIsolation?: SyntheticMemoryObjectIsolationDimension;
  derivationLineageIds?: string[];
  derivationMethod?: SyntheticActionDerivationMethod;
  confidenceFloorMetadata?: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds?: string[];
  evidenceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  trustMetadata?: SyntheticAuditTrustMetadata[];
  confidenceMetadata?: SyntheticAuditConfidenceMetadata[];
  governanceMetadata?: SyntheticAuditGovernanceMetadata[];
  materialityMetadata?: SyntheticAuditMaterialityCompatibility[];
  warnings?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticPhase38AuditPackage {
  phase38AuditPackageId: string;
  phase38AuditPackageKey: string;
  phase38LockHash: string;
  phase38CompletedModules: Phase38CompletedModuleIdentifier[];
  phase38VerifierPassed: boolean;
  phase38TypeScriptPassed: boolean;
  phase38AllModulesPresent: boolean;
  phase38AllMarkersConfirmed: boolean;
  phase38AllProhibitedImportsAbsent: boolean;
  phase38Phase37HandoffConsumed: boolean;
  phase38Phase39HandoffProduced: boolean;
  phase38SnapshotHash: string;
  boundPhase37SnapshotHash: string;
  boundPhase37KnowledgeGraphSnapshotHash: string;
  boundPhase37MethodologySnapshotHash: string;
  phase37SupersessionReferenceIds: string[];
  phase38StaleMarker: SyntheticPhase38StaleMarker;
  phase38LockedAt: string;
  phase38AuditNotes: string[];
  executable: false;
  executionReady: false;
  executionReadyIsExecutionAuthority: false;
  phase38Executes: false;
  phase39HandoffReady: boolean;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  derivationLineageIds: string[];
  derivationMethod: SyntheticActionDerivationMethod;
  derivationHash: string;
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  lineageReferenceIds: string[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
  warnings: string[];
  skippedIndexes: number[];
}

export interface BuildPhase38AuditPackageResult {
  phase38AuditPackage: SyntheticPhase38AuditPackage | null;
  skipped: boolean;
  warnings: string[];
}

type ReferenceRecord = Record<string, unknown>;

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getStringArrayProperty(value: object, propertyName: string): string[] {
  const property = (value as ReferenceRecord)[propertyName];
  return Array.isArray(property) ? property.filter((item): item is string => typeof item === "string") : [];
}

function getPhase37Handoff(input: BuildPhase38AuditPackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getBoundPhase37SnapshotHash(input: BuildPhase38AuditPackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getPhase38SnapshotHash(input: BuildPhase38AuditPackageInput): string {
  return (
    input.phase38SnapshotHash ??
    stableSnapshotHash({
      phase38CompletedModules: PHASE38_COMPLETED_MODULES,
      boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
      boundPhase37KnowledgeGraphSnapshotHash: getPhase37Handoff(input)?.knowledgeGraphSnapshotHash ?? null,
      boundPhase37MethodologySnapshotHash: getPhase37Handoff(input)?.methodologySnapshotHash ?? null,
    })
  );
}

function getPhase38StaleMarker(input: BuildPhase38AuditPackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildPhase38AuditPackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "handoff_metadata_preservation";
}

function getPhase37SupersessionReferenceIds(input: BuildPhase38AuditPackageInput): string[] {
  return [
    ...getInputArray(getPhase37Handoff(input)?.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildPhase38AuditPackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildPhase38AuditPackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildPhase38AuditPackageInput): string[] {
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceEvidenceLineageGraphIds),
  ];
}

function getLineageReferenceIds(input: BuildPhase38AuditPackageInput): string[] {
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceKnowledgeObjectIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceMethodologyObjectIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceMemoryObjectIds),
  ];
}

function getDerivationLineageIds(input: BuildPhase38AuditPackageInput): string[] {
  return [
    ...getInputArray(input.derivationLineageIds),
    ...PHASE38_COMPLETED_MODULES,
    getPhase38SnapshotHash(input),
    getBoundPhase37SnapshotHash(input),
  ].filter((item) => item !== "");
}

function getPhase38LockedAt(input: BuildPhase38AuditPackageInput): string {
  return (
    input.phase38LockedAt ??
    `deterministic-phase38-lock:${stableSnapshotHash({
      phase38CompletedModules: PHASE38_COMPLETED_MODULES,
      phase38SnapshotHash: getPhase38SnapshotHash(input),
      boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    })}`
  );
}

function getPhase38AuditNotes(input: BuildPhase38AuditPackageInput): string[] {
  return getInputArray(input.phase38AuditNotes);
}

function getPhase38LockHash(input: BuildPhase38AuditPackageInput): string {
  return stableSnapshotHash({
    phase38CompletedModules: PHASE38_COMPLETED_MODULES,
    phase38VerifierPassed: input.phase38VerifierPassed === true,
    phase38TypeScriptPassed: input.phase38TypeScriptPassed === true,
    phase38AllModulesPresent: input.phase38AllModulesPresent === true,
    phase38AllMarkersConfirmed: input.phase38AllMarkersConfirmed === true,
    phase38AllProhibitedImportsAbsent: input.phase38AllProhibitedImportsAbsent === true,
    phase38Phase37HandoffConsumed: input.phase38Phase37HandoffConsumed === true,
    phase38Phase39HandoffProduced: input.phase38Phase39HandoffProduced === true,
    phase38SnapshotHash: getPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    boundPhase37KnowledgeGraphSnapshotHash: getPhase37Handoff(input)?.knowledgeGraphSnapshotHash ?? null,
    boundPhase37MethodologySnapshotHash: getPhase37Handoff(input)?.methodologySnapshotHash ?? null,
    phase38StaleMarker: getPhase38StaleMarker(input),
  });
}

function getPhase39HandoffReady(input: BuildPhase38AuditPackageInput): boolean {
  return (
    input.phase38VerifierPassed === true &&
    input.phase38TypeScriptPassed === true &&
    input.phase38AllModulesPresent === true &&
    input.phase38AllMarkersConfirmed === true &&
    input.phase38AllProhibitedImportsAbsent === true &&
    input.phase38Phase37HandoffConsumed === true &&
    input.phase38Phase39HandoffProduced === true
  );
}

function buildPhase38AuditPackageKey(input: BuildPhase38AuditPackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    phase38LockHash: getPhase38LockHash(input),
    phase38CompletedModules: PHASE38_COMPLETED_MODULES,
    phase38SnapshotHash: getPhase38SnapshotHash(input),
    phase39HandoffReady: getPhase39HandoffReady(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    boundPhase37KnowledgeGraphSnapshotHash: handoff?.knowledgeGraphSnapshotHash ?? null,
    boundPhase37MethodologySnapshotHash: handoff?.methodologySnapshotHash ?? null,
    companyId: input.companyId ?? handoff?.companyId ?? null,
    customerIsolation: input.customerIsolation ?? handoff?.customerIsolation ?? null,
    firmIsolation: input.firmIsolation ?? handoff?.firmIsolation ?? null,
    clientIsolation: input.clientIsolation ?? handoff?.clientIsolation ?? null,
  });
}

function buildPhase38AuditPackageId(input: BuildPhase38AuditPackageInput): string {
  return `synthetic-phase38-audit-package:${stableSnapshotHash({
    phase38AuditPackageKey: buildPhase38AuditPackageKey(input),
    phase38LockHash: getPhase38LockHash(input),
  })}`;
}

function buildDerivationHash(input: BuildPhase38AuditPackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    phase38CompletedModules: PHASE38_COMPLETED_MODULES,
    phase38LockHash: getPhase38LockHash(input),
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validatePhase38AuditPackageInput(input: BuildPhase38AuditPackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(getBoundPhase37SnapshotHash(input))) warnings.push("boundPhase37SnapshotHash is required.");
  if (!handoff) return warnings;

  if (!hasValue(input.companyId ?? handoff.companyId)) warnings.push("companyId is required.");
  if (!(input.scope ?? handoff.scope)) warnings.push("scope is required.");
  if (!hasValue(handoff.knowledgeGraphSnapshotHash)) warnings.push("phase37Handoff.knowledgeGraphSnapshotHash is required.");
  if (!hasValue(handoff.methodologySnapshotHash)) warnings.push("phase37Handoff.methodologySnapshotHash is required.");
  if (handoff.phase38MayConsume !== true) warnings.push("phase37Handoff.phase38MayConsume must be true.");
  if (handoff.phase38MayMutate !== false) warnings.push("phase37Handoff.phase38MayMutate must be false.");
  if (handoff.phase38MayWriteBack !== false) warnings.push("phase37Handoff.phase38MayWriteBack must be false.");

  return warnings;
}

function getWarnings(input: BuildPhase38AuditPackageInput): string[] {
  const gateWarnings = [
    ...(input.phase38VerifierPassed === true ? [] : ["phase38AuditPackage: phase38VerifierPassed is false."]),
    ...(input.phase38TypeScriptPassed === true ? [] : ["phase38AuditPackage: phase38TypeScriptPassed is false."]),
    ...(input.phase38AllModulesPresent === true ? [] : ["phase38AuditPackage: phase38AllModulesPresent is false."]),
    ...(input.phase38AllMarkersConfirmed === true ? [] : ["phase38AuditPackage: phase38AllMarkersConfirmed is false."]),
    ...(input.phase38AllProhibitedImportsAbsent === true ? [] : ["phase38AuditPackage: phase38AllProhibitedImportsAbsent is false."]),
    ...(input.phase38Phase37HandoffConsumed === true ? [] : ["phase38AuditPackage: phase38Phase37HandoffConsumed is false."]),
    ...(input.phase38Phase39HandoffProduced === true ? [] : ["phase38AuditPackage: phase38Phase39HandoffProduced is false."]),
  ];

  return [
    ...gateWarnings,
    ...getInputArray(input.warnings),
    ...getStringArrayProperty(getPhase37Handoff(input) ?? {}, "warnings").map((warning) => `phase37Handoff: ${warning}`),
  ];
}

export function buildPhase38AuditPackage(input: BuildPhase38AuditPackageInput): BuildPhase38AuditPackageResult {
  const fatalWarnings = validatePhase38AuditPackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      phase38AuditPackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const warnings = getWarnings(input);

  return {
    phase38AuditPackage: {
      phase38AuditPackageId: buildPhase38AuditPackageId(input),
      phase38AuditPackageKey: buildPhase38AuditPackageKey(input),
      phase38LockHash: getPhase38LockHash(input),
      phase38CompletedModules: [...PHASE38_COMPLETED_MODULES],
      phase38VerifierPassed: input.phase38VerifierPassed === true,
      phase38TypeScriptPassed: input.phase38TypeScriptPassed === true,
      phase38AllModulesPresent: input.phase38AllModulesPresent === true,
      phase38AllMarkersConfirmed: input.phase38AllMarkersConfirmed === true,
      phase38AllProhibitedImportsAbsent: input.phase38AllProhibitedImportsAbsent === true,
      phase38Phase37HandoffConsumed: input.phase38Phase37HandoffConsumed === true,
      phase38Phase39HandoffProduced: input.phase38Phase39HandoffProduced === true,
      phase38SnapshotHash: getPhase38SnapshotHash(input),
      boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
      boundPhase37KnowledgeGraphSnapshotHash: handoff.knowledgeGraphSnapshotHash,
      boundPhase37MethodologySnapshotHash: handoff.methodologySnapshotHash,
      phase37SupersessionReferenceIds: getPhase37SupersessionReferenceIds(input),
      phase38StaleMarker: getPhase38StaleMarker(input),
      phase38LockedAt: getPhase38LockedAt(input),
      phase38AuditNotes: getPhase38AuditNotes(input),
      executable: false,
      executionReady: false,
      executionReadyIsExecutionAuthority: false,
      phase38Executes: false,
      phase39HandoffReady: getPhase39HandoffReady(input),
      companyId: input.companyId ?? handoff.companyId,
      scope: input.scope ?? handoff.scope,
      customerIsolation: input.customerIsolation ?? handoff.customerIsolation,
      firmIsolation: input.firmIsolation ?? handoff.firmIsolation,
      clientIsolation: input.clientIsolation ?? handoff.clientIsolation,
      derivationLineageIds: getDerivationLineageIds(input),
      derivationMethod: getDerivationMethod(input),
      derivationHash: buildDerivationHash(input),
      confidenceFloorMetadata: getConfidenceFloorMetadata(input),
      sourceConfidenceReferenceIds: getSourceConfidenceReferenceIds(input),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      trustMetadata: [...getInputArray(getPhase37Handoff(input)?.trustMetadata), ...getInputArray(input.trustMetadata)],
      confidenceMetadata: [...getInputArray(getPhase37Handoff(input)?.confidenceMetadata), ...getInputArray(input.confidenceMetadata)],
      governanceMetadata: [...getInputArray(getPhase37Handoff(input)?.governanceMetadata), ...getInputArray(input.governanceMetadata)],
      materialityMetadata: [...getInputArray(getPhase37Handoff(input)?.materialityMetadata), ...getInputArray(input.materialityMetadata)],
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
