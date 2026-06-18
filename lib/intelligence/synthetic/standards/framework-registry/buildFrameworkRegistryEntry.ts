import { stableSnapshotHash } from "../../../core/hash";
import type { FrameworkRegistryStatus, StandardsBaseContract, StandardsReportingFramework } from "../contracts";

type FrameworkRegistryBase = Omit<StandardsBaseContract, "reportingFramework">;

export interface BuildFrameworkRegistryEntryInput extends Partial<FrameworkRegistryBase> {
  frameworkIdentifier?: StandardsReportingFramework;
  frameworkDisplayName?: string;
  frameworkStatus?: FrameworkRegistryStatus;
  isSelectable?: boolean;
  statusTransitionAuditReferenceId?: string;
  isJurisdictionalOverlay?: boolean;
  overlayBaselineFrameworkIdentifier?: StandardsReportingFramework;
  frameworkRegistryEntryComplete?: boolean;
}

export interface SyntheticFrameworkRegistryEntry extends FrameworkRegistryBase {
  frameworkRegistryEntryId: string;
  frameworkRegistryEntryKey: string;
  frameworkIdentifier: StandardsReportingFramework;
  frameworkDisplayName: string;
  frameworkStatus: FrameworkRegistryStatus;
  isSelectable: boolean;
  selectableOnlyWhenActive: true;
  failClosedOnNonActiveSelection: true;
  statusTransitionIsGovernedEvent: true;
  statusTransitionAuditReferenceId: string;
  isJurisdictionalOverlay: boolean;
  overlayBaselineFrameworkIdentifier: StandardsReportingFramework | "";
  frameworkRegistryEntryComplete: boolean;
}

export interface BuildFrameworkRegistryEntryResult {
  frameworkRegistryEntry: SyntheticFrameworkRegistryEntry | null;
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

function getSharedBase(input: Partial<FrameworkRegistryBase>): FrameworkRegistryBase {
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
  } as FrameworkRegistryBase;
}

function collectMissingRequiredIdentifiers(input: BuildFrameworkRegistryEntryInput): string[] {
  const missing: string[] = [];

  if (!input.frameworkIdentifier) {
    missing.push("frameworkIdentifier");
  }

  if (!hasValue(input.frameworkDisplayName)) {
    missing.push("frameworkDisplayName");
  }

  if (!input.frameworkStatus) {
    missing.push("frameworkStatus");
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

function buildFrameworkRegistryEntryKey(input: BuildFrameworkRegistryEntryInput): string {
  return stableSnapshotHash({
    frameworkIdentifier: input.frameworkIdentifier ?? "",
    frameworkDisplayName: input.frameworkDisplayName ?? "",
    frameworkStatus: input.frameworkStatus ?? "",
    statusTransitionAuditReferenceId: input.statusTransitionAuditReferenceId ?? "",
    isJurisdictionalOverlay: input.isJurisdictionalOverlay === true,
    overlayBaselineFrameworkIdentifier: input.overlayBaselineFrameworkIdentifier ?? "",
  });
}

function buildFrameworkRegistryEntryId(input: BuildFrameworkRegistryEntryInput): string {
  return `synthetic-framework-registry-entry:${stableSnapshotHash({
    frameworkRegistryEntryKey: buildFrameworkRegistryEntryKey(input),
    artifactType: "SyntheticFrameworkRegistryEntry",
  })}`;
}

function buildDerivationHash(input: BuildFrameworkRegistryEntryInput): string {
  return stableSnapshotHash({
    frameworkRegistryEntryKey: buildFrameworkRegistryEntryKey(input),
    frameworkIdentifier: input.frameworkIdentifier ?? "",
    frameworkStatus: input.frameworkStatus ?? "",
    isSelectable: input.frameworkStatus === "active",
    selectableOnlyWhenActive: true,
    failClosedOnNonActiveSelection: true,
    statusTransitionIsGovernedEvent: true,
  });
}

function getWarnings(input: BuildFrameworkRegistryEntryInput): string[] {
  return [
    ...getInputArray(input.warnings),
    ...(input.frameworkStatus !== "active" && input.isSelectable === true
      ? ["non-active framework cannot be selectable; selection fails closed as not yet supported"]
      : []),
    ...(input.isJurisdictionalOverlay === true && !input.overlayBaselineFrameworkIdentifier
      ? ["jurisdictional overlay should reference overlayBaselineFrameworkIdentifier"]
      : []),
  ];
}

export function buildFrameworkRegistryEntry(
  input: BuildFrameworkRegistryEntryInput,
): BuildFrameworkRegistryEntryResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      frameworkRegistryEntry: null,
      skipped: true,
      warnings: [`missing required framework registry entry identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const requiredFrameworkIdentifier = input.frameworkIdentifier as StandardsReportingFramework;
  const requiredFrameworkDisplayName = input.frameworkDisplayName as string;
  const requiredFrameworkStatus = input.frameworkStatus as FrameworkRegistryStatus;
  const base = getSharedBase(input);
  const frameworkRegistryEntry: SyntheticFrameworkRegistryEntry = {
    ...base,
    frameworkRegistryEntryId: buildFrameworkRegistryEntryId(input),
    frameworkRegistryEntryKey: buildFrameworkRegistryEntryKey(input),
    frameworkIdentifier: requiredFrameworkIdentifier,
    frameworkDisplayName: requiredFrameworkDisplayName,
    frameworkStatus: requiredFrameworkStatus,
    isSelectable: requiredFrameworkStatus === "active",
    selectableOnlyWhenActive: true,
    failClosedOnNonActiveSelection: true,
    statusTransitionIsGovernedEvent: true,
    statusTransitionAuditReferenceId: input.statusTransitionAuditReferenceId ?? "",
    isJurisdictionalOverlay: input.isJurisdictionalOverlay === true,
    overlayBaselineFrameworkIdentifier: input.overlayBaselineFrameworkIdentifier ?? "",
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
    frameworkRegistryEntryComplete: input.frameworkRegistryEntryComplete === true,
  };

  return {
    frameworkRegistryEntry,
    skipped: false,
    warnings: frameworkRegistryEntry.warnings,
  };
}
