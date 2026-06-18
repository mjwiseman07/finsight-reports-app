import { stableSnapshotHash } from "../../../core/hash";
import type { StandardsBaseContract, StandardsReportingFramework } from "../contracts";

type MultiFrameworkEntityBase = Omit<StandardsBaseContract, "reportingFramework"> & {
  reportingFrameworks: StandardsReportingFramework[];
};

export interface BuildMultiFrameworkEntityInput extends Partial<MultiFrameworkEntityBase> {
  entityId?: string;
  entityFrameworkConfigurationReferenceId?: string;
  primaryReportingFramework?: StandardsReportingFramework;
  secondaryReportingFrameworks?: StandardsReportingFramework[];
  primaryBookArtifactReferenceIds?: string[];
  secondaryBookArtifactReferenceIds?: string[];
  conversionEngineReferenceId?: string;
  multiFrameworkEntityComplete?: boolean;
}

export interface SyntheticMultiFrameworkEntity extends MultiFrameworkEntityBase {
  multiFrameworkEntityId: string;
  multiFrameworkEntityKey: string;
  entityId: string;
  entityFrameworkConfigurationReferenceId: string;
  primaryReportingFramework: StandardsReportingFramework;
  secondaryReportingFrameworks: StandardsReportingFramework[];
  isMultiFramework: boolean;
  multiFrameworkIsFirstClassNotSpecialCase: true;
  oneFrameworkAndMultiFrameworkHandledUniformly: true;
  primaryBookArtifactReferenceIds: string[];
  secondaryBookArtifactReferenceIds: string[];
  everyArtifactFrameworkTagged: true;
  primaryAndSecondaryBooksSegregated: true;
  primaryBookMemoryInvisibleToSecondaryBook: true;
  secondaryBookMemoryInvisibleToPrimaryBook: true;
  conversionBetweenBooksIsFirstClassArtifact: true;
  conversionEngineReferenceId: string;
  reconciliationViaConversionEngine: true;
  frameworkScopedRetrievalRequired: true;
  multiFrameworkEntityComplete: boolean;
}

export interface BuildMultiFrameworkEntityResult {
  multiFrameworkEntity: SyntheticMultiFrameworkEntity | null;
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

function getSecondaryReportingFrameworks(
  input: BuildMultiFrameworkEntityInput,
): StandardsReportingFramework[] {
  return getInputArray(input.secondaryReportingFrameworks);
}

function getReportingFrameworks(input: BuildMultiFrameworkEntityInput): StandardsReportingFramework[] {
  const primary = input.primaryReportingFramework;
  if (!primary) {
    return [];
  }

  return [primary, ...getSecondaryReportingFrameworks(input)];
}

function getIsMultiFramework(input: BuildMultiFrameworkEntityInput): boolean {
  return getSecondaryReportingFrameworks(input).length > 0;
}

function getSharedBase(input: Partial<MultiFrameworkEntityBase>): MultiFrameworkEntityBase {
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
    reportingFrameworks: getInputArray(input.reportingFrameworks),
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
  } as MultiFrameworkEntityBase;
}

function collectMissingRequiredIdentifiers(input: BuildMultiFrameworkEntityInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.entityId)) {
    missing.push("entityId");
  }

  if (!input.primaryReportingFramework) {
    missing.push("primaryReportingFramework");
  }

  if (!hasValue(input.entityFrameworkConfigurationReferenceId)) {
    missing.push("entityFrameworkConfigurationReferenceId");
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

function buildMultiFrameworkEntityKey(input: BuildMultiFrameworkEntityInput): string {
  return stableSnapshotHash({
    entityId: input.entityId ?? "",
    entityFrameworkConfigurationReferenceId: input.entityFrameworkConfigurationReferenceId ?? "",
    primaryReportingFramework: input.primaryReportingFramework ?? "",
    secondaryReportingFrameworks: getSecondaryReportingFrameworks(input),
    reportingFrameworks: getReportingFrameworks(input),
    primaryBookArtifactReferenceIds: getInputArray(input.primaryBookArtifactReferenceIds),
    secondaryBookArtifactReferenceIds: getInputArray(input.secondaryBookArtifactReferenceIds),
    conversionEngineReferenceId: input.conversionEngineReferenceId ?? "",
    isMultiFramework: getIsMultiFramework(input),
  });
}

function buildMultiFrameworkEntityId(input: BuildMultiFrameworkEntityInput): string {
  return `synthetic-multi-framework-entity:${stableSnapshotHash({
    multiFrameworkEntityKey: buildMultiFrameworkEntityKey(input),
    artifactType: "SyntheticMultiFrameworkEntity",
  })}`;
}

function buildDerivationHash(input: BuildMultiFrameworkEntityInput): string {
  return stableSnapshotHash({
    multiFrameworkEntityKey: buildMultiFrameworkEntityKey(input),
    multiFrameworkIsFirstClassNotSpecialCase: true,
    oneFrameworkAndMultiFrameworkHandledUniformly: true,
    everyArtifactFrameworkTagged: true,
    primaryAndSecondaryBooksSegregated: true,
    primaryBookMemoryInvisibleToSecondaryBook: true,
    secondaryBookMemoryInvisibleToPrimaryBook: true,
    conversionBetweenBooksIsFirstClassArtifact: true,
    reconciliationViaConversionEngine: true,
    frameworkScopedRetrievalRequired: true,
    isMultiFramework: getIsMultiFramework(input),
  });
}

function getWarnings(input: BuildMultiFrameworkEntityInput): string[] {
  const isMultiFramework = getIsMultiFramework(input);

  return [
    ...getInputArray(input.warnings),
    ...(isMultiFramework && !hasValue(input.conversionEngineReferenceId)
      ? ["multi-framework entity should reference the 41.5P conversion engine via conversionEngineReferenceId"]
      : []),
    ...(isMultiFramework &&
    getInputArray(input.secondaryBookArtifactReferenceIds).length === 0 &&
    getInputArray(input.primaryBookArtifactReferenceIds).length === 0
      ? ["multi-framework entity should preserve segregated primary and secondary book artifact references"]
      : []),
    "metadata-only multi-framework entity contract; live dual-book production and book segregation are deferred to real-data validation",
  ];
}

export function buildMultiFrameworkEntity(
  input: BuildMultiFrameworkEntityInput,
): BuildMultiFrameworkEntityResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      multiFrameworkEntity: null,
      skipped: true,
      warnings: [`missing required multi-framework entity identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const requiredEntityId = input.entityId as string;
  const requiredPrimaryReportingFramework = input.primaryReportingFramework as StandardsReportingFramework;
  const requiredEntityFrameworkConfigurationReferenceId =
    input.entityFrameworkConfigurationReferenceId as string;
  const reportingFrameworks = getReportingFrameworks(input);
  const isMultiFramework = getIsMultiFramework(input);
  const base = getSharedBase({
    ...input,
    reportingFrameworks,
  });
  const multiFrameworkEntity: SyntheticMultiFrameworkEntity = {
    ...base,
    multiFrameworkEntityId: buildMultiFrameworkEntityId(input),
    multiFrameworkEntityKey: buildMultiFrameworkEntityKey(input),
    entityId: requiredEntityId,
    entityFrameworkConfigurationReferenceId: requiredEntityFrameworkConfigurationReferenceId,
    primaryReportingFramework: requiredPrimaryReportingFramework,
    secondaryReportingFrameworks: getSecondaryReportingFrameworks(input),
    isMultiFramework,
    multiFrameworkIsFirstClassNotSpecialCase: true,
    oneFrameworkAndMultiFrameworkHandledUniformly: true,
    primaryBookArtifactReferenceIds: getInputArray(input.primaryBookArtifactReferenceIds),
    secondaryBookArtifactReferenceIds: getInputArray(input.secondaryBookArtifactReferenceIds),
    everyArtifactFrameworkTagged: true,
    primaryAndSecondaryBooksSegregated: true,
    primaryBookMemoryInvisibleToSecondaryBook: true,
    secondaryBookMemoryInvisibleToPrimaryBook: true,
    conversionBetweenBooksIsFirstClassArtifact: true,
    conversionEngineReferenceId: input.conversionEngineReferenceId ?? "",
    reconciliationViaConversionEngine: true,
    frameworkScopedRetrievalRequired: true,
    reportingFrameworks,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
    multiFrameworkEntityComplete: input.multiFrameworkEntityComplete === true,
  };

  return {
    multiFrameworkEntity,
    skipped: false,
    warnings: multiFrameworkEntity.warnings,
  };
}
