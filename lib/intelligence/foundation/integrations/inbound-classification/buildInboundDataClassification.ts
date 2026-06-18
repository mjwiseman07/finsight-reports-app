import { stableSnapshotHash } from "../../../core/hash";
import type {
  InboundDataClassificationContract,
  IntegrationBaseContract,
  IntegrationConnectorKind,
  IntegrationDataSensitivityTier,
} from "../contracts";

export type InboundFieldClassification =
  | "phi"
  | "pii"
  | "sensitive"
  | "non_sensitive"
  | "undetermined";

export type InboundClassificationSource = "schema_derived" | "content_inferred" | "undetermined";

export interface InboundFieldClassificationMetadata {
  fieldName: string;
  classification: InboundFieldClassification;
  classificationSource: InboundClassificationSource;
  sensitivityTier?: IntegrationDataSensitivityTier;
}

export interface BuildInboundDataClassificationInput extends Partial<InboundDataClassificationContract> {
  connectorKind?: IntegrationConnectorKind;
  fieldClassificationMap?: InboundFieldClassificationMetadata[];
  classificationSource?: InboundClassificationSource;
  defaultedToHighSensitivity?: boolean;
  inputSnapshotHash?: string;
  isStale?: boolean;
  inboundDataClassificationComplete?: boolean;
}

export interface SyntheticInboundDataClassification extends InboundDataClassificationContract {
  inboundDataClassificationId: string;
  inboundDataClassificationKey: string;
  connectorId: string;
  connectorKind: IntegrationConnectorKind;
  firmTenantId: string;
  clientTenantId: string;
  fieldClassificationMap: InboundFieldClassificationMetadata[];
  containsPHI: boolean;
  containsPII: boolean;
  dataSensitivityTier: IntegrationDataSensitivityTier;
  inferredFromContent: boolean;
  classificationSource: InboundClassificationSource;
  failClosedToHighSensitivity: true;
  defaultedToHighSensitivity: boolean;
  carriesMarkersDownstream: true;
  markersConsumedByPhase42_5: true;
  inputSnapshotHash: string;
  isStale: boolean;
  inboundDataClassificationComplete: boolean;
}

export interface BuildInboundDataClassificationResult {
  inboundDataClassification: SyntheticInboundDataClassification | null;
  skipped: boolean;
  warnings: string[];
}

// Contract-layer classification uses connector schema metadata and classification rules only.
// Real payload value accuracy is validated later in the live-execution real-data test pass.
function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function hasUndeterminedClassification(input: BuildInboundDataClassificationInput): boolean {
  const fieldClassifications = getInputArray(input.fieldClassificationMap);

  return (
    fieldClassifications.length === 0 ||
    fieldClassifications.some(
      (field) => field.classification === "undetermined" || field.classificationSource === "undetermined",
    ) ||
    input.classificationSource === "undetermined"
  );
}

function getClassificationSource(input: BuildInboundDataClassificationInput): InboundClassificationSource {
  if (input.classificationSource) {
    return input.classificationSource;
  }

  if (getInputArray(input.fieldClassificationMap).some((field) => field.classificationSource === "content_inferred")) {
    return "content_inferred";
  }

  if (getInputArray(input.fieldClassificationMap).length > 0) {
    return "schema_derived";
  }

  return "undetermined";
}

function getContainsPHI(input: BuildInboundDataClassificationInput): boolean {
  if (hasUndeterminedClassification(input)) {
    return true;
  }

  return (
    input.containsPHI ??
    getInputArray(input.fieldClassificationMap).some((field) => field.classification === "phi")
  );
}

function getContainsPII(input: BuildInboundDataClassificationInput): boolean {
  return (
    input.containsPII ??
    getInputArray(input.fieldClassificationMap).some((field) => field.classification === "pii")
  );
}

function getDataSensitivityTier(input: BuildInboundDataClassificationInput): IntegrationDataSensitivityTier {
  if (hasUndeterminedClassification(input) || getContainsPHI(input) || getContainsPII(input)) {
    return "high";
  }

  if (
    input.dataSensitivityTier === "high" ||
    getInputArray(input.fieldClassificationMap).some(
      (field) => field.classification === "sensitive" || field.sensitivityTier === "medium",
    )
  ) {
    return input.dataSensitivityTier === "low" ? "medium" : input.dataSensitivityTier ?? "medium";
  }

  return input.dataSensitivityTier ?? "low";
}

function getInferredFromContent(input: BuildInboundDataClassificationInput): boolean {
  return (
    input.inferredFromContent === true ||
    getClassificationSource(input) === "content_inferred" ||
    getInputArray(input.fieldClassificationMap).some((field) => field.classificationSource === "content_inferred")
  );
}

function getDefaultedToHighSensitivity(input: BuildInboundDataClassificationInput): boolean {
  return input.defaultedToHighSensitivity === true || hasUndeterminedClassification(input);
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
    containsPHI: input.containsPHI ?? true,
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

function getInputSnapshotHash(input: BuildInboundDataClassificationInput): string {
  return (
    input.inputSnapshotHash ??
    stableSnapshotHash({
      connectorId: input.connectorId ?? "",
      connectorKind: input.connectorKind ?? "",
      firmTenantId: input.firmTenantId ?? "",
      clientTenantId: input.clientTenantId ?? "",
      fieldClassificationMap: getInputArray(input.fieldClassificationMap),
      classificationSource: getClassificationSource(input),
      boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    })
  );
}

function buildInboundDataClassificationKey(input: BuildInboundDataClassificationInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    firmTenantId: input.firmTenantId ?? "",
    clientTenantId: input.clientTenantId ?? "",
    inputSnapshotHash: getInputSnapshotHash(input),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildInboundDataClassificationId(input: BuildInboundDataClassificationInput): string {
  return `synthetic-inbound-data-classification:${stableSnapshotHash({
    inboundDataClassificationKey: buildInboundDataClassificationKey(input),
    artifactType: "SyntheticInboundDataClassification",
  })}`;
}

function buildDerivationHash(input: BuildInboundDataClassificationInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    fieldClassificationMap: getInputArray(input.fieldClassificationMap),
    containsPHI: getContainsPHI(input),
    containsPII: getContainsPII(input),
    dataSensitivityTier: getDataSensitivityTier(input),
    inferredFromContent: getInferredFromContent(input),
    classificationSource: getClassificationSource(input),
    failClosedToHighSensitivity: true,
    defaultedToHighSensitivity: getDefaultedToHighSensitivity(input),
    carriesMarkersDownstream: true,
    markersConsumedByPhase42_5: true,
    inputSnapshotHash: getInputSnapshotHash(input),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function collectMissingRequiredIdentifiers(input: BuildInboundDataClassificationInput): string[] {
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

  if (!hasValue(input.phase40OrganizationalHandoffHandle)) {
    missing.push("phase40OrganizationalHandoffHandle");
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

function getWarnings(input: BuildInboundDataClassificationInput): string[] {
  return [
    ...getInputArray(input.warnings),
    ...(getDefaultedToHighSensitivity(input)
      ? [
          "classification undetermined; defaulted to high sensitivity and containsPHI true without inspecting real payload values",
        ]
      : []),
  ];
}

export function buildInboundDataClassification(
  input: BuildInboundDataClassificationInput,
): BuildInboundDataClassificationResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      inboundDataClassification: null,
      skipped: true,
      warnings: [
        ...getInputArray(input.warnings),
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const sharedBase = getSharedBase({
    ...input,
    containsPHI: getContainsPHI(input),
  });
  const requiredPhase40OrganizationalHandoffHandle = input.phase40OrganizationalHandoffHandle as string;
  const requiredFirmTenantId = input.firmTenantId as string;
  const requiredClientTenantId = input.clientTenantId as string;
  const requiredConnectorId = input.connectorId as string;
  const requiredConnectorKind = input.connectorKind as IntegrationConnectorKind;

  const inboundDataClassification: SyntheticInboundDataClassification = {
    ...sharedBase,
    phase40OrganizationalHandoffHandle: requiredPhase40OrganizationalHandoffHandle,
    phase40HandoffReferenceIds: getInputArray(input.phase40HandoffReferenceIds),
    firmTenantId: requiredFirmTenantId,
    clientTenantId: requiredClientTenantId,
    perTenantCredentialIsolation: true,
    inboundDataClassificationId: buildInboundDataClassificationId(input),
    inboundDataClassificationKey: buildInboundDataClassificationKey(input),
    connectorId: requiredConnectorId,
    connectorKind: requiredConnectorKind,
    fieldClassificationMap: getInputArray(input.fieldClassificationMap),
    containsPHI: getContainsPHI(input),
    containsPII: getContainsPII(input),
    dataSensitivityTier: getDataSensitivityTier(input),
    inferredFromContent: getInferredFromContent(input),
    classificationSource: getClassificationSource(input),
    failClosedToHighSensitivity: true,
    defaultedToHighSensitivity: getDefaultedToHighSensitivity(input),
    carriesMarkersDownstream: true,
    markersConsumedByPhase42_5: true,
    inputSnapshotHash: getInputSnapshotHash(input),
    isStale: input.isStale === true,
    classificationComplete: input.classificationComplete === true,
    inboundDataClassificationComplete: input.inboundDataClassificationComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    inboundDataClassification,
    skipped: false,
    warnings: inboundDataClassification.warnings,
  };
}
