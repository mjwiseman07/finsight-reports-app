import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract } from "../contracts";

export interface BuildVaultAccessContractInput extends Partial<IntegrationBaseContract> {
  credentialReferenceId?: string;
  firmTenantId?: string;
  clientTenantId?: string;
  accessByHandleOnly?: true;
  crossTenantAccessProhibited?: true;
  firmCannotAccessClientCredentialsWithoutAuthorization?: true;
  authorizationGovernanceEntryReferenceId?: string;
  vaultStorageImplementedSeparately?: true;
  vaultNeverInRepo?: true;
  failClosedOnAccessError?: true;
  vaultAccessContractComplete?: boolean;
}

export interface SyntheticVaultAccessContract extends IntegrationBaseContract {
  vaultAccessContractId: string;
  vaultAccessContractKey: string;
  credentialReferenceId: string;
  firmTenantId: string;
  clientTenantId: string;
  accessByHandleOnly: true;
  crossTenantAccessProhibited: true;
  firmCannotAccessClientCredentialsWithoutAuthorization: true;
  authorizationGovernanceEntryReferenceId: string;
  vaultStorageImplementedSeparately: true;
  vaultNeverInRepo: true;
  failClosedOnAccessError: true;
  vaultAccessContractComplete: boolean;
}

export interface BuildVaultAccessContractResult {
  vaultAccessContract: SyntheticVaultAccessContract | null;
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

function getSharedBase(input: Partial<IntegrationBaseContract>): IntegrationBaseContract {
  return {
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    phase405StaleMarker: input.phase405StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
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
  } as IntegrationBaseContract;
}

function collectMissingRequiredIdentifiers(input: BuildVaultAccessContractInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.credentialReferenceId)) {
    missing.push("credentialReferenceId");
  }

  if (!hasValue(input.firmTenantId)) {
    missing.push("firmTenantId");
  }

  if (!hasValue(input.clientTenantId)) {
    missing.push("clientTenantId");
  }

  if (!hasValue(input.authorizationGovernanceEntryReferenceId)) {
    missing.push("authorizationGovernanceEntryReferenceId");
  }

  if (!hasValue(input.boundPhase40SnapshotHash)) {
    missing.push("boundPhase40SnapshotHash");
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

function buildVaultAccessContractKey(input: BuildVaultAccessContractInput): string {
  return stableSnapshotHash({
    credentialReferenceId: input.credentialReferenceId ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    authorizationGovernanceEntryReferenceId: input.authorizationGovernanceEntryReferenceId ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildVaultAccessContractId(input: BuildVaultAccessContractInput): string {
  return `synthetic-vault-access-contract:${stableSnapshotHash({
    vaultAccessContractKey: buildVaultAccessContractKey(input),
    artifactType: "SyntheticVaultAccessContract",
  })}`;
}

function buildDerivationHash(input: BuildVaultAccessContractInput): string {
  return stableSnapshotHash({
    credentialReferenceId: input.credentialReferenceId ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    accessByHandleOnly: true,
    crossTenantAccessProhibited: true,
    firmCannotAccessClientCredentialsWithoutAuthorization: true,
    authorizationGovernanceEntryReferenceId: input.authorizationGovernanceEntryReferenceId ?? "",
    vaultStorageImplementedSeparately: true,
    vaultNeverInRepo: true,
    failClosedOnAccessError: true,
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function getWarnings(input: BuildVaultAccessContractInput): string[] {
  return [
    ...getInputArray(input.warnings),
    "vault access contract defines handle-only interface; encrypted vault storage is implemented separately",
  ];
}

export function buildVaultAccessContract(input: BuildVaultAccessContractInput): BuildVaultAccessContractResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      vaultAccessContract: null,
      skipped: true,
      warnings: [
        ...getInputArray(input.warnings),
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const sharedBase = getSharedBase({
    ...input,
    containsPHI: getContainsPHI(input.containsPHI),
  });
  const requiredCredentialReferenceId = input.credentialReferenceId as string;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredAuthorizationGovernanceEntryReferenceId = input.authorizationGovernanceEntryReferenceId as string;

  const vaultAccessContract: SyntheticVaultAccessContract = {
    ...sharedBase,
    vaultAccessContractId: buildVaultAccessContractId(input),
    vaultAccessContractKey: buildVaultAccessContractKey(input),
    credentialReferenceId: requiredCredentialReferenceId,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    accessByHandleOnly: true,
    crossTenantAccessProhibited: true,
    firmCannotAccessClientCredentialsWithoutAuthorization: true,
    authorizationGovernanceEntryReferenceId: requiredAuthorizationGovernanceEntryReferenceId,
    vaultStorageImplementedSeparately: true,
    vaultNeverInRepo: true,
    failClosedOnAccessError: true,
    vaultAccessContractComplete: input.vaultAccessContractComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    vaultAccessContract,
    skipped: false,
    warnings: vaultAccessContract.warnings,
  };
}
