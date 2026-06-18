import { stableSnapshotHash } from "../../../core/hash";
import type { ConsolidationMethod, StandardsBaseContract, StandardsReportingFramework } from "../contracts";

export type FrameworkOnboardingLockStatus = "pending" | "locked";

export interface BuildFrameworkSelectionInput extends Partial<StandardsBaseContract> {
  entityId?: string;
  entityFrameworkConfigurationReferenceId?: string;
  primaryReportingFramework?: StandardsReportingFramework;
  secondaryReportingFrameworks?: StandardsReportingFramework[];
  activeFrameworkIdentifiers?: StandardsReportingFramework[];
  frameworkRegistryReferenceId?: string;
  functionalCurrency?: string;
  presentationCurrency?: string;
  consolidationMethod?: ConsolidationMethod;
  parentEntityId?: string;
  ownershipPercentage?: number;
  onboardingLockStatus?: FrameworkOnboardingLockStatus;
  frameworkSelectionComplete?: boolean;
}

export interface SyntheticFrameworkSelection extends StandardsBaseContract {
  frameworkSelectionId: string;
  frameworkSelectionKey: string;
  entityId: string;
  entityFrameworkConfigurationReferenceId: string;
  primaryReportingFramework: StandardsReportingFramework;
  secondaryReportingFrameworks: StandardsReportingFramework[];
  onlyActiveFrameworksSelectable: true;
  selectionFailsClosedIfNotActive: true;
  frameworkRegistryReferenceId: string;
  functionalCurrency: string;
  presentationCurrency: string;
  functionalAndPresentationCurrencySeparate: true;
  consolidationMethod: ConsolidationMethod;
  parentEntityId: string;
  ownershipPercentage: number;
  frameworkSetPerEntityNotPerCompany: true;
  selectionImmutableAfterOnboardingLock: true;
  laterChangeRequiresFrameworkChangeGovernance: true;
  onboardingLockStatus: FrameworkOnboardingLockStatus;
  frameworkSelectionComplete: boolean;
}

export interface BuildFrameworkSelectionResult {
  frameworkSelection: SyntheticFrameworkSelection | null;
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
    reportingFramework: input.reportingFramework as StandardsReportingFramework,
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

function getSecondaryReportingFrameworks(
  input: BuildFrameworkSelectionInput,
): StandardsReportingFramework[] {
  return getInputArray(input.secondaryReportingFrameworks);
}

function getSelectedFrameworkIdentifiers(input: BuildFrameworkSelectionInput): StandardsReportingFramework[] {
  const primary = input.primaryReportingFramework;
  if (!primary) {
    return [];
  }

  return [primary, ...getSecondaryReportingFrameworks(input)];
}

function getInactiveSelectedFrameworks(
  input: BuildFrameworkSelectionInput,
): StandardsReportingFramework[] {
  const activeFrameworkIdentifiers = getInputArray(input.activeFrameworkIdentifiers);
  if (activeFrameworkIdentifiers.length === 0) {
    return [];
  }

  return getSelectedFrameworkIdentifiers(input).filter(
    (frameworkIdentifier) => !activeFrameworkIdentifiers.includes(frameworkIdentifier),
  );
}

function hasNonActiveFrameworkSelection(input: BuildFrameworkSelectionInput): boolean {
  return getInactiveSelectedFrameworks(input).length > 0;
}

function getOnboardingLockStatus(input: BuildFrameworkSelectionInput): FrameworkOnboardingLockStatus {
  if (hasNonActiveFrameworkSelection(input)) {
    return "pending";
  }

  return input.onboardingLockStatus === "locked" ? "locked" : "pending";
}

function getPresentationCurrency(input: BuildFrameworkSelectionInput): string {
  return input.presentationCurrency ?? input.functionalCurrency ?? "";
}

function collectMissingRequiredIdentifiers(input: BuildFrameworkSelectionInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.entityId)) {
    missing.push("entityId");
  }

  if (!input.primaryReportingFramework) {
    missing.push("primaryReportingFramework");
  }

  if (!input.reportingFramework) {
    missing.push("reportingFramework");
  }

  if (!hasValue(input.entityFrameworkConfigurationReferenceId)) {
    missing.push("entityFrameworkConfigurationReferenceId");
  }

  if (!hasValue(input.frameworkRegistryReferenceId)) {
    missing.push("frameworkRegistryReferenceId");
  }

  if (!hasValue(input.functionalCurrency)) {
    missing.push("functionalCurrency");
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

function buildFrameworkSelectionKey(input: BuildFrameworkSelectionInput): string {
  return stableSnapshotHash({
    entityId: input.entityId ?? "",
    entityFrameworkConfigurationReferenceId: input.entityFrameworkConfigurationReferenceId ?? "",
    primaryReportingFramework: input.primaryReportingFramework ?? "",
    secondaryReportingFrameworks: getSecondaryReportingFrameworks(input),
    frameworkRegistryReferenceId: input.frameworkRegistryReferenceId ?? "",
    functionalCurrency: input.functionalCurrency ?? "",
    presentationCurrency: getPresentationCurrency(input),
    consolidationMethod: input.consolidationMethod ?? "none",
    parentEntityId: input.parentEntityId ?? "",
    ownershipPercentage: input.ownershipPercentage ?? 0,
    onboardingLockStatus: getOnboardingLockStatus(input),
  });
}

function buildFrameworkSelectionId(input: BuildFrameworkSelectionInput): string {
  return `synthetic-framework-selection:${stableSnapshotHash({
    frameworkSelectionKey: buildFrameworkSelectionKey(input),
    artifactType: "SyntheticFrameworkSelection",
  })}`;
}

function buildDerivationHash(input: BuildFrameworkSelectionInput): string {
  return stableSnapshotHash({
    frameworkSelectionKey: buildFrameworkSelectionKey(input),
    onlyActiveFrameworksSelectable: true,
    selectionFailsClosedIfNotActive: true,
    functionalAndPresentationCurrencySeparate: true,
    frameworkSetPerEntityNotPerCompany: true,
    selectionImmutableAfterOnboardingLock: true,
    laterChangeRequiresFrameworkChangeGovernance: true,
    onboardingLockStatus: getOnboardingLockStatus(input),
  });
}

function getWarnings(
  input: BuildFrameworkSelectionInput,
  onboardingLockStatus: FrameworkOnboardingLockStatus,
): string[] {
  const inactiveSelectedFrameworks = getInactiveSelectedFrameworks(input);

  return [
    ...getInputArray(input.warnings),
    ...(inactiveSelectedFrameworks.length > 0
      ? [
          `selection fails closed for non-active frameworks: ${inactiveSelectedFrameworks.join(", ")}`,
        ]
      : []),
    ...(onboardingLockStatus === "pending" && input.onboardingLockStatus === "locked"
      ? ["onboarding lock rejected because one or more selected frameworks are not active"]
      : []),
    ...(onboardingLockStatus === "locked"
      ? ["selection is immutable after onboarding lock; later changes require 41.5J Framework Change Governance"]
      : []),
    "metadata-only framework selection contract; live onboarding selection against real entities is deferred to real-data validation",
  ];
}

export function buildFrameworkSelection(input: BuildFrameworkSelectionInput): BuildFrameworkSelectionResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      frameworkSelection: null,
      skipped: true,
      warnings: [`missing required framework selection identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const requiredEntityId = input.entityId as string;
  const requiredPrimaryReportingFramework = input.primaryReportingFramework as StandardsReportingFramework;
  const requiredEntityFrameworkConfigurationReferenceId =
    input.entityFrameworkConfigurationReferenceId as string;
  const requiredFrameworkRegistryReferenceId = input.frameworkRegistryReferenceId as string;
  const requiredFunctionalCurrency = input.functionalCurrency as string;
  const onboardingLockStatus = getOnboardingLockStatus(input);
  const base = getSharedBase(input);
  const frameworkSelection: SyntheticFrameworkSelection = {
    ...base,
    frameworkSelectionId: buildFrameworkSelectionId(input),
    frameworkSelectionKey: buildFrameworkSelectionKey(input),
    entityId: requiredEntityId,
    entityFrameworkConfigurationReferenceId: requiredEntityFrameworkConfigurationReferenceId,
    primaryReportingFramework: requiredPrimaryReportingFramework,
    secondaryReportingFrameworks: getSecondaryReportingFrameworks(input),
    onlyActiveFrameworksSelectable: true,
    selectionFailsClosedIfNotActive: true,
    frameworkRegistryReferenceId: requiredFrameworkRegistryReferenceId,
    functionalCurrency: requiredFunctionalCurrency,
    presentationCurrency: getPresentationCurrency(input),
    functionalAndPresentationCurrencySeparate: true,
    consolidationMethod: input.consolidationMethod ?? "none",
    parentEntityId: input.parentEntityId ?? "",
    ownershipPercentage: input.ownershipPercentage ?? 0,
    frameworkSetPerEntityNotPerCompany: true,
    selectionImmutableAfterOnboardingLock: true,
    laterChangeRequiresFrameworkChangeGovernance: true,
    onboardingLockStatus,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, onboardingLockStatus),
    frameworkSelectionComplete:
      input.frameworkSelectionComplete === true &&
      onboardingLockStatus === "locked" &&
      !hasNonActiveFrameworkSelection(input),
  };

  return {
    frameworkSelection,
    skipped: false,
    warnings: frameworkSelection.warnings,
  };
}
