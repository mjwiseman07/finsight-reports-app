import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract, IntegrationConnectorKind } from "../contracts";

export type WebhookSignatureVerificationRequirement = "required";

export type WebhookReplayProtectionRequirement = "required";

export type WebhookReplayProtectionMethod = "idempotency_key";

export interface BuildWebhookSubscriptionInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: IntegrationConnectorKind;
  firmTenantId?: string;
  clientTenantId?: string;
  webhookSupported?: boolean;
  webhookEventTypes?: string[];
  webhookSignatureVerification?: WebhookSignatureVerificationRequirement;
  webhookSignatureVerificationFailClosed?: true;
  webhookReplayProtection?: WebhookReplayProtectionRequirement;
  webhookReplayProtectionMethod?: WebhookReplayProtectionMethod;
  webhookPayloadSchemaReference?: string;
  webhookEndpointPerTenant?: true;
  noSharedWebhookEndpoints?: true;
  payloadTreatedAsUntrustedInput?: true;
  payloadValidatedBeforeUse?: true;
  payloadNeverActedOnWithoutHumanApprovedGate?: true;
  producesConnectorActivityEntryOnReceipt?: true;
  mayTriggerPhase40RecommendationFlow?: boolean;
  webhookSubscriptionComplete?: boolean;
}

export interface SyntheticWebhookSubscription extends IntegrationBaseContract {
  webhookSubscriptionId: string;
  webhookSubscriptionKey: string;
  connectorId: string;
  connectorKind: IntegrationConnectorKind;
  firmTenantId: string;
  clientTenantId: string;
  webhookSupported: boolean;
  webhookEventTypes: string[];
  webhookSignatureVerification: WebhookSignatureVerificationRequirement;
  webhookSignatureVerificationFailClosed: true;
  webhookReplayProtection: WebhookReplayProtectionRequirement;
  webhookReplayProtectionMethod: WebhookReplayProtectionMethod;
  webhookPayloadSchemaReference: string;
  webhookEndpointPerTenant: true;
  noSharedWebhookEndpoints: true;
  payloadTreatedAsUntrustedInput: true;
  payloadValidatedBeforeUse: true;
  payloadNeverActedOnWithoutHumanApprovedGate: true;
  producesConnectorActivityEntryOnReceipt: true;
  mayTriggerPhase40RecommendationFlow: boolean;
  webhookSubscriptionComplete: boolean;
}

export interface BuildWebhookSubscriptionResult {
  webhookSubscription: SyntheticWebhookSubscription | null;
  skipped: boolean;
  warnings: string[];
}

// Contract-layer webhook metadata only. Real signature verification, replay handling, and
// delivery validation are performed later in live-execution testing against real sandboxes.
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

function collectMissingRequiredIdentifiers(input: BuildWebhookSubscriptionInput): string[] {
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

  if (input.webhookSupported === true && input.webhookSignatureVerification !== "required") {
    missing.push("webhookSignatureVerification");
  }

  if (input.webhookSupported === true && input.webhookReplayProtection !== "required") {
    missing.push("webhookReplayProtection");
  }

  if (input.webhookSupported === true && input.webhookReplayProtectionMethod !== "idempotency_key") {
    missing.push("webhookReplayProtectionMethod");
  }

  if (input.webhookSupported === true && !hasValue(input.webhookPayloadSchemaReference)) {
    missing.push("webhookPayloadSchemaReference");
  }

  if (input.webhookSupported === true && input.webhookEndpointPerTenant !== true) {
    missing.push("webhookEndpointPerTenant");
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

function buildWebhookSubscriptionKey(input: BuildWebhookSubscriptionInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    webhookSupported: input.webhookSupported === true,
    webhookEventTypes: getInputArray(input.webhookEventTypes),
    webhookSignatureVerification: "required",
    webhookReplayProtection: "required",
    webhookReplayProtectionMethod: "idempotency_key",
    webhookPayloadSchemaReference: input.webhookPayloadSchemaReference ?? "",
    webhookEndpointPerTenant: true,
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildWebhookSubscriptionId(input: BuildWebhookSubscriptionInput): string {
  return `synthetic-webhook-subscription:${stableSnapshotHash({
    webhookSubscriptionKey: buildWebhookSubscriptionKey(input),
    artifactType: "SyntheticWebhookSubscription",
  })}`;
}

function buildDerivationHash(input: BuildWebhookSubscriptionInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    webhookSupported: input.webhookSupported === true,
    webhookEventTypes: getInputArray(input.webhookEventTypes),
    webhookSignatureVerification: "required",
    webhookSignatureVerificationFailClosed: true,
    webhookReplayProtection: "required",
    webhookReplayProtectionMethod: "idempotency_key",
    webhookPayloadSchemaReference: input.webhookPayloadSchemaReference ?? "",
    webhookEndpointPerTenant: true,
    noSharedWebhookEndpoints: true,
    payloadTreatedAsUntrustedInput: true,
    payloadValidatedBeforeUse: true,
    payloadNeverActedOnWithoutHumanApprovedGate: true,
    producesConnectorActivityEntryOnReceipt: true,
    mayTriggerPhase40RecommendationFlow: input.mayTriggerPhase40RecommendationFlow === true,
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildWebhookSubscription(input: BuildWebhookSubscriptionInput): BuildWebhookSubscriptionResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      webhookSubscription: null,
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

  const webhookSubscription: SyntheticWebhookSubscription = {
    ...sharedBase,
    webhookSubscriptionId: buildWebhookSubscriptionId(input),
    webhookSubscriptionKey: buildWebhookSubscriptionKey(input),
    connectorId: requiredConnectorId,
    connectorKind: requiredConnectorKind,
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    webhookSupported: input.webhookSupported === true,
    webhookEventTypes: getInputArray(input.webhookEventTypes),
    webhookSignatureVerification: "required",
    webhookSignatureVerificationFailClosed: true,
    webhookReplayProtection: "required",
    webhookReplayProtectionMethod: "idempotency_key",
    webhookPayloadSchemaReference: input.webhookPayloadSchemaReference ?? "",
    webhookEndpointPerTenant: true,
    noSharedWebhookEndpoints: true,
    payloadTreatedAsUntrustedInput: true,
    payloadValidatedBeforeUse: true,
    payloadNeverActedOnWithoutHumanApprovedGate: true,
    producesConnectorActivityEntryOnReceipt: true,
    mayTriggerPhase40RecommendationFlow: input.mayTriggerPhase40RecommendationFlow === true,
    webhookSubscriptionComplete: input.webhookSubscriptionComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getInputArray(input.warnings),
  };

  return {
    webhookSubscription,
    skipped: false,
    warnings: webhookSubscription.warnings,
  };
}
