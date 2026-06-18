import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract } from "../contracts";

export type CredentialReferenceType =
  | "oauth_token"
  | "api_key"
  | "file_credential"
  | "direct_feed_credential"
  | "other";

export interface BuildCredentialReferenceInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  firmTenantId?: string;
  clientTenantId?: string;
  credentialHandle?: string;
  credentialType?: CredentialReferenceType;
  storedByHandleOnly?: true;
  neverStoredInPlainText?: true;
  neverLogged?: true;
  neverInArtifactsOrOutputsOrUrls?: true;
  encryptedAtRest?: true;
  isolatedAtFirmTenantLevel?: true;
  isolatedAtClientTenantLevel?: true;
  failClosedOnCredentialError?: true;
  containsNoSecretValue?: true;
  credentialReferenceComplete?: boolean;
}

export interface SyntheticCredentialReference extends IntegrationBaseContract {
  credentialReferenceId: string;
  credentialReferenceKey: string;
  connectorId: string;
  firmTenantId: string;
  clientTenantId: string;
  credentialHandle: string;
  credentialType: CredentialReferenceType;
  storedByHandleOnly: true;
  neverStoredInPlainText: true;
  neverLogged: true;
  neverInArtifactsOrOutputsOrUrls: true;
  encryptedAtRest: true;
  isolatedAtFirmTenantLevel: true;
  isolatedAtClientTenantLevel: true;
  failClosedOnCredentialError: true;
  containsNoSecretValue: true;
  credentialReferenceComplete: boolean;
}

export interface BuildCredentialReferenceResult {
  credentialReference: SyntheticCredentialReference | null;
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

function collectMissingRequiredIdentifiers(input: BuildCredentialReferenceInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (!hasValue(input.firmTenantId)) {
    missing.push("firmTenantId");
  }

  if (!hasValue(input.clientTenantId)) {
    missing.push("clientTenantId");
  }

  if (!hasValue(input.credentialHandle)) {
    missing.push("credentialHandle");
  }

  if (!input.credentialType) {
    missing.push("credentialType");
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

function buildCredentialReferenceKey(input: BuildCredentialReferenceInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    credentialHandle: input.credentialHandle ?? "",
    credentialType: input.credentialType ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildCredentialReferenceId(input: BuildCredentialReferenceInput): string {
  return `synthetic-credential-reference:${stableSnapshotHash({
    credentialReferenceKey: buildCredentialReferenceKey(input),
    artifactType: "SyntheticCredentialReference",
  })}`;
}

function buildDerivationHash(input: BuildCredentialReferenceInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    credentialHandle: input.credentialHandle ?? "",
    credentialType: input.credentialType ?? "",
    storedByHandleOnly: true,
    neverStoredInPlainText: true,
    neverLogged: true,
    neverInArtifactsOrOutputsOrUrls: true,
    encryptedAtRest: true,
    isolatedAtFirmTenantLevel: true,
    isolatedAtClientTenantLevel: true,
    failClosedOnCredentialError: true,
    containsNoSecretValue: true,
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function getWarnings(input: BuildCredentialReferenceInput): string[] {
  return [
    ...getInputArray(input.warnings),
    "credential reference contains opaque handle metadata only; no secret value is represented",
  ];
}

export function buildCredentialReference(input: BuildCredentialReferenceInput): BuildCredentialReferenceResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      credentialReference: null,
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
  const requiredConnectorId = input.connectorId as string;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredCredentialHandle = input.credentialHandle as string;
  const requiredCredentialType = input.credentialType as CredentialReferenceType;

  const credentialReference: SyntheticCredentialReference = {
    ...sharedBase,
    credentialReferenceId: buildCredentialReferenceId(input),
    credentialReferenceKey: buildCredentialReferenceKey(input),
    connectorId: requiredConnectorId,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    credentialHandle: requiredCredentialHandle,
    credentialType: requiredCredentialType,
    storedByHandleOnly: true,
    neverStoredInPlainText: true,
    neverLogged: true,
    neverInArtifactsOrOutputsOrUrls: true,
    encryptedAtRest: true,
    isolatedAtFirmTenantLevel: true,
    isolatedAtClientTenantLevel: true,
    failClosedOnCredentialError: true,
    containsNoSecretValue: true,
    credentialReferenceComplete: input.credentialReferenceComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    credentialReference,
    skipped: false,
    warnings: credentialReference.warnings,
  };
}
