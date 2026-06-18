import { stableSnapshotHash } from "../../../core/hash";
import type { StandardsBaseContract } from "../contracts";

export interface BuildRoleResolverAdapterInput extends Partial<StandardsBaseContract> {
  phase39RoleReferenceId?: string;
  phase39RoleHandle?: string;
  resolverReferenceId?: string;
  roleResolverAdapterComplete?: boolean;
}

export interface SyntheticRoleResolverAdapter extends StandardsBaseContract {
  roleResolverAdapterId: string;
  roleResolverAdapterKey: string;
  phase39RoleReferenceId: string;
  phase39RoleHandle: string;
  roleCallsResolverNotHardcodedTreatment: true;
  resolverReferenceId: string;
  rolesCallResolveTopicEntityId: true;
  rolesHoldNoFrameworkKnowledge: true;
  frameworkAwarenessViaResolverOnly: true;
  backwardCompatibleForUsGaap: true;
  existingUsGaapOutputsUnchanged: true;
  enablesNonUsGaapOutputs: true;
  enforcesFrameworkSegregationAtRoleLayer: true;
  roleLogicUnchangedOnlyTreatmentSourceChanges: true;
  doesNotModifyPhase39Namespace: true;
  adapterLivesInStandardsNamespace: true;
  roleResolverAdapterComplete: boolean;
}

export interface BuildRoleResolverAdapterResult {
  roleResolverAdapter: SyntheticRoleResolverAdapter | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function getSharedBase(input: Partial<StandardsBaseContract>): StandardsBaseContract {
  return {
    phase40OrganizationalHandoffHandle: input.phase40OrganizationalHandoffHandle ?? "",
    phase40_5IntegrationHandoffHandle: input.phase40_5IntegrationHandoffHandle ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase40_5SnapshotHash: input.boundPhase40_5SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    phase41_5StaleMarker: input.phase41_5StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
    reportingFramework: input.reportingFramework as StandardsBaseContract["reportingFramework"],
    containsPHI: getContainsPHI(input.containsPHI),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
    derivationHash: "",
    confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
    sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
    evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
    lineageReferenceIds: getInputArray(input.lineageReferenceIds),
    trustMetadata: getInputArray(input.trustMetadata),
    confidenceMetadata: getInputArray(input.confidenceMetadata),
    governanceMetadata: getInputArray(input.governanceMetadata),
    warnings: getInputArray(input.warnings),
    skippedIndexes: getInputArray(input.skippedIndexes),
  } as StandardsBaseContract;
}

function collectMissingRequiredIdentifiers(input: BuildRoleResolverAdapterInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.phase39RoleReferenceId)) {
    missing.push("phase39RoleReferenceId");
  }

  if (!hasValue(input.resolverReferenceId)) {
    missing.push("resolverReferenceId");
  }

  if (!hasValue(input.boundPhase40SnapshotHash)) {
    missing.push("boundPhase40SnapshotHash");
  }

  if (!hasValue(input.boundPhase40_5SnapshotHash)) {
    missing.push("boundPhase40_5SnapshotHash");
  }

  if (!hasValue(input.boundPhase39SnapshotHash)) {
    missing.push("boundPhase39SnapshotHash");
  }

  if (!hasValue(input.boundPhase38SnapshotHash)) {
    missing.push("boundPhase38SnapshotHash");
  }

  if (!input.scope) {
    missing.push("scope");
  }

  if (!input.customerIsolation) {
    missing.push("customerIsolation");
  }

  if (!input.firmIsolation) {
    missing.push("firmIsolation");
  }

  if (!input.clientIsolation) {
    missing.push("clientIsolation");
  }

  return missing;
}

function buildRoleResolverAdapterKey(input: BuildRoleResolverAdapterInput): string {
  return stableSnapshotHash({
    phase39RoleReferenceId: input.phase39RoleReferenceId ?? "",
    phase39RoleHandle: input.phase39RoleHandle ?? "",
    resolverReferenceId: input.resolverReferenceId ?? "",
    roleCallsResolverNotHardcodedTreatment: true,
    rolesCallResolveTopicEntityId: true,
    frameworkAwarenessViaResolverOnly: true,
    backwardCompatibleForUsGaap: true,
    enablesNonUsGaapOutputs: true,
  });
}

function buildRoleResolverAdapterId(input: BuildRoleResolverAdapterInput): string {
  return `synthetic-role-resolver-adapter:${stableSnapshotHash({
    roleResolverAdapterKey: buildRoleResolverAdapterKey(input),
    artifactType: "SyntheticRoleResolverAdapter",
  })}`;
}

function buildDerivationHash(input: BuildRoleResolverAdapterInput): string {
  return stableSnapshotHash({
    roleResolverAdapterKey: buildRoleResolverAdapterKey(input),
    roleCallsResolverNotHardcodedTreatment: true,
    rolesCallResolveTopicEntityId: true,
    rolesHoldNoFrameworkKnowledge: true,
    frameworkAwarenessViaResolverOnly: true,
    backwardCompatibleForUsGaap: true,
    existingUsGaapOutputsUnchanged: true,
    enablesNonUsGaapOutputs: true,
    enforcesFrameworkSegregationAtRoleLayer: true,
    roleLogicUnchangedOnlyTreatmentSourceChanges: true,
    doesNotModifyPhase39Namespace: true,
    adapterLivesInStandardsNamespace: true,
  });
}

function getWarnings(input: BuildRoleResolverAdapterInput): string[] {
  return [
    ...getInputArray(input.warnings),
    ...(!hasValue(input.phase39RoleHandle)
      ? ["phase39RoleHandle should identify the locked Phase 39 role by handle without modifying Phase 39 code"]
      : []),
    "metadata-only role-resolver adapter seam in standards namespace; no Phase 39 file is modified",
    "live role wiring and proof that US GAAP outputs remain unchanged while IFRS outputs become available is deferred to real-data validation",
  ];
}

export function buildRoleResolverAdapter(
  input: BuildRoleResolverAdapterInput,
): BuildRoleResolverAdapterResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      roleResolverAdapter: null,
      skipped: true,
      warnings: [
        `missing required role resolver adapter identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredPhase39RoleReferenceId = input.phase39RoleReferenceId as string;
  const requiredResolverReferenceId = input.resolverReferenceId as string;
  const base = getSharedBase(input);
  const roleResolverAdapter: SyntheticRoleResolverAdapter = {
    ...base,
    roleResolverAdapterId: buildRoleResolverAdapterId(input),
    roleResolverAdapterKey: buildRoleResolverAdapterKey(input),
    phase39RoleReferenceId: requiredPhase39RoleReferenceId,
    phase39RoleHandle: input.phase39RoleHandle ?? "",
    roleCallsResolverNotHardcodedTreatment: true,
    resolverReferenceId: requiredResolverReferenceId,
    rolesCallResolveTopicEntityId: true,
    rolesHoldNoFrameworkKnowledge: true,
    frameworkAwarenessViaResolverOnly: true,
    backwardCompatibleForUsGaap: true,
    existingUsGaapOutputsUnchanged: true,
    enablesNonUsGaapOutputs: true,
    enforcesFrameworkSegregationAtRoleLayer: true,
    roleLogicUnchangedOnlyTreatmentSourceChanges: true,
    doesNotModifyPhase39Namespace: true,
    adapterLivesInStandardsNamespace: true,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
    roleResolverAdapterComplete: input.roleResolverAdapterComplete === true,
  };

  return {
    roleResolverAdapter,
    skipped: false,
    warnings: roleResolverAdapter.warnings,
  };
}
