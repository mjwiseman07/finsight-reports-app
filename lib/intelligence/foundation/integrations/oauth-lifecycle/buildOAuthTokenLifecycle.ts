import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract, IntegrationConnectorKind } from "../contracts";

export type OAuthTokenRefreshFailureMode = "fail_closed_with_escalation";

export type OAuthUnattendedOperationType = "close" | "audit" | "payroll" | "other";

export interface BuildOAuthTokenLifecycleInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: IntegrationConnectorKind;
  firmTenantId?: string;
  clientTenantId?: string;
  authorizationUrlPattern?: string;
  scopeDeclaration?: string[];
  tokenExchangeContractReference?: string;
  tokenRefreshSupported?: boolean;
  tokenRefreshWindow?: string;
  tokenRefreshFailureMode?: OAuthTokenRefreshFailureMode;
  tokenStorageReference?: string;
  tokenStoredByHandleOnly?: true;
  tokenNeverPlainText?: true;
  tokenNeverLogged?: true;
  revocationContractReference?: string;
  reconnectionContractReference?: string;
  refreshFailureTriggersHealthDegradation?: true;
  refreshFailureEscalatesViaPhase40F?: true;
  refreshFailurePromptsCustomerReconnection?: true;
  unattendedExpirationIsEscalationEvent?: true;
  unattendedOperationTypes?: OAuthUnattendedOperationType[];
  oauthTokenLifecycleComplete?: boolean;
}

export interface SyntheticOAuthTokenLifecycle extends IntegrationBaseContract {
  oauthTokenLifecycleId: string;
  oauthTokenLifecycleKey: string;
  connectorId: string;
  connectorKind: IntegrationConnectorKind;
  firmTenantId: string;
  clientTenantId: string;
  authorizationUrlPattern: string;
  scopeDeclaration: string[];
  tokenExchangeContractReference: string;
  tokenRefreshSupported: boolean;
  tokenRefreshWindow: string;
  tokenRefreshFailureMode: OAuthTokenRefreshFailureMode;
  tokenStorageReference: string;
  tokenStoredByHandleOnly: true;
  tokenNeverPlainText: true;
  tokenNeverLogged: true;
  revocationContractReference: string;
  reconnectionContractReference: string;
  refreshFailureTriggersHealthDegradation: true;
  refreshFailureEscalatesViaPhase40F: true;
  refreshFailurePromptsCustomerReconnection: true;
  unattendedExpirationIsEscalationEvent: true;
  unattendedOperationTypes: OAuthUnattendedOperationType[];
  oauthTokenLifecycleComplete: boolean;
}

export interface BuildOAuthTokenLifecycleResult {
  oauthTokenLifecycle: SyntheticOAuthTokenLifecycle | null;
  skipped: boolean;
  warnings: string[];
}

// Contract-layer lifecycle metadata only. Real OAuth exchange, refresh, and revocation are
// validated later in live-execution sandbox testing and recorded on the real-data test register.
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

function collectMissingRequiredIdentifiers(input: BuildOAuthTokenLifecycleInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (!input.connectorKind) {
    missing.push("connectorKind");
  }

  if (!hasValue(input.firmTenantId)) {
    missing.push("firmTenantId");
  }

  if (!hasValue(input.clientTenantId)) {
    missing.push("clientTenantId");
  }

  if (!hasValue(input.authorizationUrlPattern)) {
    missing.push("authorizationUrlPattern");
  }

  if (!hasValue(input.tokenExchangeContractReference)) {
    missing.push("tokenExchangeContractReference");
  }

  if (!hasValue(input.tokenRefreshWindow)) {
    missing.push("tokenRefreshWindow");
  }

  if (!hasValue(input.tokenStorageReference)) {
    missing.push("tokenStorageReference");
  }

  if (!hasValue(input.revocationContractReference)) {
    missing.push("revocationContractReference");
  }

  if (!hasValue(input.reconnectionContractReference)) {
    missing.push("reconnectionContractReference");
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

function buildOAuthTokenLifecycleKey(input: BuildOAuthTokenLifecycleInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    authorizationUrlPattern: input.authorizationUrlPattern ?? "",
    scopeDeclaration: getInputArray(input.scopeDeclaration),
    tokenExchangeContractReference: input.tokenExchangeContractReference ?? "",
    tokenRefreshSupported: input.tokenRefreshSupported === true,
    tokenRefreshWindow: input.tokenRefreshWindow ?? "",
    tokenRefreshFailureMode: "fail_closed_with_escalation",
    tokenStorageReference: input.tokenStorageReference ?? "",
    revocationContractReference: input.revocationContractReference ?? "",
    reconnectionContractReference: input.reconnectionContractReference ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildOAuthTokenLifecycleId(input: BuildOAuthTokenLifecycleInput): string {
  return `synthetic-oauth-token-lifecycle:${stableSnapshotHash({
    oauthTokenLifecycleKey: buildOAuthTokenLifecycleKey(input),
    artifactType: "SyntheticOAuthTokenLifecycle",
  })}`;
}

function buildDerivationHash(input: BuildOAuthTokenLifecycleInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    authorizationUrlPattern: input.authorizationUrlPattern ?? "",
    scopeDeclaration: getInputArray(input.scopeDeclaration),
    tokenExchangeContractReference: input.tokenExchangeContractReference ?? "",
    tokenRefreshSupported: input.tokenRefreshSupported === true,
    tokenRefreshWindow: input.tokenRefreshWindow ?? "",
    tokenRefreshFailureMode: "fail_closed_with_escalation",
    tokenStorageReference: input.tokenStorageReference ?? "",
    tokenStoredByHandleOnly: true,
    tokenNeverPlainText: true,
    tokenNeverLogged: true,
    revocationContractReference: input.revocationContractReference ?? "",
    reconnectionContractReference: input.reconnectionContractReference ?? "",
    refreshFailureTriggersHealthDegradation: true,
    refreshFailureEscalatesViaPhase40F: true,
    refreshFailurePromptsCustomerReconnection: true,
    unattendedExpirationIsEscalationEvent: true,
    unattendedOperationTypes: getInputArray(input.unattendedOperationTypes),
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildOAuthTokenLifecycle(input: BuildOAuthTokenLifecycleInput): BuildOAuthTokenLifecycleResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      oauthTokenLifecycle: null,
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
  const requiredConnectorKind = input.connectorKind as IntegrationConnectorKind;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredAuthorizationUrlPattern = input.authorizationUrlPattern as string;
  const requiredTokenExchangeContractReference = input.tokenExchangeContractReference as string;
  const requiredTokenRefreshWindow = input.tokenRefreshWindow as string;
  const requiredTokenStorageReference = input.tokenStorageReference as string;
  const requiredRevocationContractReference = input.revocationContractReference as string;
  const requiredReconnectionContractReference = input.reconnectionContractReference as string;

  const oauthTokenLifecycle: SyntheticOAuthTokenLifecycle = {
    ...sharedBase,
    oauthTokenLifecycleId: buildOAuthTokenLifecycleId(input),
    oauthTokenLifecycleKey: buildOAuthTokenLifecycleKey(input),
    connectorId: requiredConnectorId,
    connectorKind: requiredConnectorKind,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    authorizationUrlPattern: requiredAuthorizationUrlPattern,
    scopeDeclaration: getInputArray(input.scopeDeclaration),
    tokenExchangeContractReference: requiredTokenExchangeContractReference,
    tokenRefreshSupported: input.tokenRefreshSupported === true,
    tokenRefreshWindow: requiredTokenRefreshWindow,
    tokenRefreshFailureMode: "fail_closed_with_escalation",
    tokenStorageReference: requiredTokenStorageReference,
    tokenStoredByHandleOnly: true,
    tokenNeverPlainText: true,
    tokenNeverLogged: true,
    revocationContractReference: requiredRevocationContractReference,
    reconnectionContractReference: requiredReconnectionContractReference,
    refreshFailureTriggersHealthDegradation: true,
    refreshFailureEscalatesViaPhase40F: true,
    refreshFailurePromptsCustomerReconnection: true,
    unattendedExpirationIsEscalationEvent: true,
    unattendedOperationTypes: getInputArray(input.unattendedOperationTypes),
    oauthTokenLifecycleComplete: input.oauthTokenLifecycleComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getInputArray(input.warnings),
  };

  return {
    oauthTokenLifecycle,
    skipped: false,
    warnings: oauthTokenLifecycle.warnings,
  };
}
