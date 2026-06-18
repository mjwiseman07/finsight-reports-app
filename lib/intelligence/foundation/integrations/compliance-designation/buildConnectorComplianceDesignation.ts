import { stableSnapshotHash } from "../../../core/hash";
import type { IntegrationBaseContract, IntegrationConnectorKind } from "../contracts";

export interface BuildConnectorComplianceDesignationInput extends Partial<IntegrationBaseContract> {
  connectorId?: string;
  connectorKind?: IntegrationConnectorKind;
  socCompliantUpstream?: "yes" | "no" | "unknown";
  hipaaBaaAvailable?: "yes" | "no" | "unknown";
  gdprDpaAvailable?: "yes" | "no" | "unknown";
  dataProcessingRegion?: string;
  regulatedIndustryActivationContext?: "healthcare" | "financial_services" | "government" | "none";
  hipaaBaaRequiredForActivation?: boolean;
  gdprDpaRequiredForActivation?: boolean;
  regulatedIndustryActivationFlag?: boolean;
  flaggedForRegulatedIndustryUse?: boolean;
  nonCompliantUpstreamFlag?: boolean;
  feedsPhase42_5SubProcessorDisclosure?: true;
  feedsPhase42_5TrustCenter?: true;
  complianceDesignationIsDeclarativeNotAttestation?: true;
  connectorComplianceDesignationComplete?: boolean;
}

export interface SyntheticConnectorComplianceDesignation extends IntegrationBaseContract {
  connectorComplianceDesignationId: string;
  connectorComplianceDesignationKey: string;
  connectorId: string;
  connectorKind: IntegrationConnectorKind;
  socCompliantUpstream: "yes" | "no" | "unknown";
  hipaaBaaAvailable: "yes" | "no" | "unknown";
  gdprDpaAvailable: "yes" | "no" | "unknown";
  dataProcessingRegion: string;
  regulatedIndustryActivationFlag: boolean;
  flaggedForRegulatedIndustryUse: boolean;
  nonCompliantUpstreamFlag: boolean;
  feedsPhase42_5SubProcessorDisclosure: true;
  feedsPhase42_5TrustCenter: true;
  complianceDesignationIsDeclarativeNotAttestation: true;
  connectorComplianceDesignationComplete: boolean;
}

export interface BuildConnectorComplianceDesignationResult {
  connectorComplianceDesignation: SyntheticConnectorComplianceDesignation | null;
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

function isRegulatedIndustryActivation(input: BuildConnectorComplianceDesignationInput): boolean {
  return (
    input.regulatedIndustryActivationContext === "healthcare" ||
    input.regulatedIndustryActivationContext === "financial_services" ||
    input.regulatedIndustryActivationContext === "government"
  );
}

function requiresHipaaBaa(input: BuildConnectorComplianceDesignationInput): boolean {
  return input.hipaaBaaRequiredForActivation === true || input.regulatedIndustryActivationContext === "healthcare";
}

function requiresGdprDpa(input: BuildConnectorComplianceDesignationInput): boolean {
  return input.gdprDpaRequiredForActivation === true;
}

function getNonCompliantUpstreamFlag(input: BuildConnectorComplianceDesignationInput): boolean {
  return (
    input.nonCompliantUpstreamFlag === true ||
    input.socCompliantUpstream === "no" ||
    (requiresHipaaBaa(input) && input.hipaaBaaAvailable === "no") ||
    (requiresGdprDpa(input) && input.gdprDpaAvailable === "no")
  );
}

function hasUnknownRelevantControl(input: BuildConnectorComplianceDesignationInput): boolean {
  return (
    input.socCompliantUpstream === "unknown" ||
    (requiresHipaaBaa(input) && input.hipaaBaaAvailable === "unknown") ||
    (requiresGdprDpa(input) && input.gdprDpaAvailable === "unknown")
  );
}

function getRegulatedIndustryActivationFlag(input: BuildConnectorComplianceDesignationInput): boolean {
  return (
    input.regulatedIndustryActivationFlag === true ||
    (isRegulatedIndustryActivation(input) && (getNonCompliantUpstreamFlag(input) || hasUnknownRelevantControl(input)))
  );
}

function getFlaggedForRegulatedIndustryUse(input: BuildConnectorComplianceDesignationInput): boolean {
  return input.flaggedForRegulatedIndustryUse === true || getRegulatedIndustryActivationFlag(input);
}

function collectMissingRequiredIdentifiers(input: BuildConnectorComplianceDesignationInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.connectorId)) {
    missing.push("connectorId");
  }

  if (!input.connectorKind) {
    missing.push("connectorKind");
  }

  if (!input.socCompliantUpstream) {
    missing.push("socCompliantUpstream");
  }

  if (!input.hipaaBaaAvailable) {
    missing.push("hipaaBaaAvailable");
  }

  if (!input.gdprDpaAvailable) {
    missing.push("gdprDpaAvailable");
  }

  if (!hasValue(input.dataProcessingRegion)) {
    missing.push("dataProcessingRegion");
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

function buildConnectorComplianceDesignationKey(input: BuildConnectorComplianceDesignationInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    socCompliantUpstream: input.socCompliantUpstream ?? "",
    hipaaBaaAvailable: input.hipaaBaaAvailable ?? "",
    gdprDpaAvailable: input.gdprDpaAvailable ?? "",
    dataProcessingRegion: input.dataProcessingRegion ?? "",
    regulatedIndustryActivationFlag: getRegulatedIndustryActivationFlag(input),
    flaggedForRegulatedIndustryUse: getFlaggedForRegulatedIndustryUse(input),
    nonCompliantUpstreamFlag: getNonCompliantUpstreamFlag(input),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
  });
}

function buildConnectorComplianceDesignationId(input: BuildConnectorComplianceDesignationInput): string {
  return `synthetic-connector-compliance-designation:${stableSnapshotHash({
    connectorComplianceDesignationKey: buildConnectorComplianceDesignationKey(input),
    artifactType: "SyntheticConnectorComplianceDesignation",
  })}`;
}

function buildDerivationHash(input: BuildConnectorComplianceDesignationInput): string {
  return stableSnapshotHash({
    connectorId: input.connectorId ?? "",
    connectorKind: input.connectorKind ?? "",
    socCompliantUpstream: input.socCompliantUpstream ?? "",
    hipaaBaaAvailable: input.hipaaBaaAvailable ?? "",
    gdprDpaAvailable: input.gdprDpaAvailable ?? "",
    dataProcessingRegion: input.dataProcessingRegion ?? "",
    regulatedIndustryActivationFlag: getRegulatedIndustryActivationFlag(input),
    flaggedForRegulatedIndustryUse: getFlaggedForRegulatedIndustryUse(input),
    nonCompliantUpstreamFlag: getNonCompliantUpstreamFlag(input),
    feedsPhase42_5SubProcessorDisclosure: true,
    feedsPhase42_5TrustCenter: true,
    complianceDesignationIsDeclarativeNotAttestation: true,
    containsPHI: getContainsPHI(input.containsPHI),
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

function getWarnings(input: BuildConnectorComplianceDesignationInput): string[] {
  return [
    ...getInputArray(input.warnings),
    ...(getNonCompliantUpstreamFlag(input) ? ["declared upstream compliance posture is non-compliant"] : []),
    ...(hasUnknownRelevantControl(input) ? ["declared upstream compliance posture has unknown regulated control"] : []),
    ...(getFlaggedForRegulatedIndustryUse(input)
      ? ["connector is flagged for regulated-industry use review"]
      : []),
    "compliance designation is declarative upstream metadata, not Advisacor attestation",
  ];
}

export function buildConnectorComplianceDesignation(
  input: BuildConnectorComplianceDesignationInput,
): BuildConnectorComplianceDesignationResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      connectorComplianceDesignation: null,
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
  const requiredSocCompliantUpstream = input.socCompliantUpstream as "yes" | "no" | "unknown";
  const requiredHipaaBaaAvailable = input.hipaaBaaAvailable as "yes" | "no" | "unknown";
  const requiredGdprDpaAvailable = input.gdprDpaAvailable as "yes" | "no" | "unknown";
  const requiredDataProcessingRegion = input.dataProcessingRegion as string;

  const connectorComplianceDesignation: SyntheticConnectorComplianceDesignation = {
    ...sharedBase,
    connectorComplianceDesignationId: buildConnectorComplianceDesignationId(input),
    connectorComplianceDesignationKey: buildConnectorComplianceDesignationKey(input),
    connectorId: requiredConnectorId,
    connectorKind: requiredConnectorKind,
    socCompliantUpstream: requiredSocCompliantUpstream,
    hipaaBaaAvailable: requiredHipaaBaaAvailable,
    gdprDpaAvailable: requiredGdprDpaAvailable,
    dataProcessingRegion: requiredDataProcessingRegion,
    regulatedIndustryActivationFlag: getRegulatedIndustryActivationFlag(input),
    flaggedForRegulatedIndustryUse: getFlaggedForRegulatedIndustryUse(input),
    nonCompliantUpstreamFlag: getNonCompliantUpstreamFlag(input),
    feedsPhase42_5SubProcessorDisclosure: true,
    feedsPhase42_5TrustCenter: true,
    complianceDesignationIsDeclarativeNotAttestation: true,
    connectorComplianceDesignationComplete: input.connectorComplianceDesignationComplete === true,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
  };

  return {
    connectorComplianceDesignation,
    skipped: false,
    warnings: connectorComplianceDesignation.warnings,
  };
}
