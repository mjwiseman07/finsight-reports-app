import { stableSnapshotHash } from "../../../core/hash";
import type { StandardsBaseContract, StandardsReportingFramework } from "../contracts";
import {
  buildFrameworkRegistryEntry,
  type BuildFrameworkRegistryEntryInput,
  type SyntheticFrameworkRegistryEntry,
} from "./buildFrameworkRegistryEntry";

type FrameworkRegistryBase = Omit<StandardsBaseContract, "reportingFramework">;

export interface BuildFrameworkRegistryInput extends Partial<FrameworkRegistryBase> {
  frameworkEntries?: BuildFrameworkRegistryEntryInput[];
  frameworkRegistryComplete?: boolean;
}

export interface SyntheticFrameworkRegistry extends FrameworkRegistryBase {
  frameworkRegistryId: string;
  frameworkRegistryKey: string;
  registryEntryReferenceIds: string[];
  activeFrameworkIdentifiers: StandardsReportingFramework[];
  nonActiveFrameworkIdentifiers: StandardsReportingFramework[];
  selectableFrameworkIdentifiers: StandardsReportingFramework[];
  selectableEqualsActiveOnly: true;
  neverSilentlySubstitutesFramework: true;
  frameworkRegistryComplete: boolean;
}

export interface BuildFrameworkRegistryResult {
  frameworkRegistry: SyntheticFrameworkRegistry | null;
  frameworkRegistryEntries: SyntheticFrameworkRegistryEntry[];
  skippedIndexes: number[];
  warnings: string[];
}

export const PHASE_41_5_FRAMEWORK_REGISTRY_BLUEPRINT: ReadonlyArray<BuildFrameworkRegistryEntryInput> = [
  {
    frameworkIdentifier: "us_gaap",
    frameworkDisplayName: "US GAAP",
    frameworkStatus: "active",
  },
  {
    frameworkIdentifier: "ifrs_for_smes",
    frameworkDisplayName: "IFRS for SMEs",
    frameworkStatus: "active",
  },
  {
    frameworkIdentifier: "ifrs_iasb",
    frameworkDisplayName: "Full IFRS (IASB baseline)",
    frameworkStatus: "active",
  },
  {
    frameworkIdentifier: "ifrs_eu",
    frameworkDisplayName: "IFRS as endorsed by EU",
    frameworkStatus: "active",
    isJurisdictionalOverlay: true,
    overlayBaselineFrameworkIdentifier: "ifrs_iasb",
  },
  {
    frameworkIdentifier: "ifrs_uk",
    frameworkDisplayName: "IFRS as endorsed by UK",
    frameworkStatus: "active",
    isJurisdictionalOverlay: true,
    overlayBaselineFrameworkIdentifier: "ifrs_iasb",
  },
  {
    frameworkIdentifier: "ifrs_ca",
    frameworkDisplayName: "IFRS as endorsed by CA",
    frameworkStatus: "active",
    isJurisdictionalOverlay: true,
    overlayBaselineFrameworkIdentifier: "ifrs_iasb",
  },
  {
    frameworkIdentifier: "ifrs_au",
    frameworkDisplayName: "IFRS as endorsed by AU",
    frameworkStatus: "recognized_unpopulated",
  },
  {
    frameworkIdentifier: "frs_102",
    frameworkDisplayName: "FRS 102 (UK)",
    frameworkStatus: "recognized_unpopulated",
  },
  {
    frameworkIdentifier: "de_hgb",
    frameworkDisplayName: "German HGB",
    frameworkStatus: "recognized_unpopulated",
  },
  {
    frameworkIdentifier: "br_gaap",
    frameworkDisplayName: "Brazilian GAAP",
    frameworkStatus: "recognized_unpopulated",
  },
  {
    frameworkIdentifier: "local_other",
    frameworkDisplayName: "Other local GAAP",
    frameworkStatus: "recognized_unpopulated",
  },
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function getFrameworkEntryInputs(input: BuildFrameworkRegistryInput): BuildFrameworkRegistryEntryInput[] {
  return input.frameworkEntries ?? [...PHASE_41_5_FRAMEWORK_REGISTRY_BLUEPRINT];
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

function collectMissingRequiredIdentifiers(input: BuildFrameworkRegistryInput): string[] {
  const missing: string[] = [];

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

function buildFrameworkRegistryKey(frameworkRegistryEntries: SyntheticFrameworkRegistryEntry[]): string {
  return stableSnapshotHash({
    registryEntryReferenceIds: frameworkRegistryEntries.map((entry) => entry.frameworkRegistryEntryId),
    frameworkIdentifiers: frameworkRegistryEntries.map((entry) => entry.frameworkIdentifier),
    frameworkStatuses: frameworkRegistryEntries.map((entry) => entry.frameworkStatus),
    selectableEqualsActiveOnly: true,
    neverSilentlySubstitutesFramework: true,
  });
}

function buildFrameworkRegistryId(frameworkRegistryEntries: SyntheticFrameworkRegistryEntry[]): string {
  return `synthetic-framework-registry:${stableSnapshotHash({
    frameworkRegistryKey: buildFrameworkRegistryKey(frameworkRegistryEntries),
    artifactType: "SyntheticFrameworkRegistry",
  })}`;
}

function buildDerivationHash(frameworkRegistryEntries: SyntheticFrameworkRegistryEntry[]): string {
  return stableSnapshotHash({
    activeFrameworkIdentifiers: getActiveFrameworkIdentifiers(frameworkRegistryEntries),
    nonActiveFrameworkIdentifiers: getNonActiveFrameworkIdentifiers(frameworkRegistryEntries),
    selectableFrameworkIdentifiers: getSelectableFrameworkIdentifiers(frameworkRegistryEntries),
    selectableEqualsActiveOnly: true,
    neverSilentlySubstitutesFramework: true,
  });
}

function getActiveFrameworkIdentifiers(
  frameworkRegistryEntries: SyntheticFrameworkRegistryEntry[],
): StandardsReportingFramework[] {
  return frameworkRegistryEntries
    .filter((entry) => entry.frameworkStatus === "active")
    .map((entry) => entry.frameworkIdentifier);
}

function getNonActiveFrameworkIdentifiers(
  frameworkRegistryEntries: SyntheticFrameworkRegistryEntry[],
): StandardsReportingFramework[] {
  return frameworkRegistryEntries
    .filter((entry) => entry.frameworkStatus !== "active")
    .map((entry) => entry.frameworkIdentifier);
}

function getSelectableFrameworkIdentifiers(
  frameworkRegistryEntries: SyntheticFrameworkRegistryEntry[],
): StandardsReportingFramework[] {
  return frameworkRegistryEntries.filter((entry) => entry.isSelectable).map((entry) => entry.frameworkIdentifier);
}

function getWarnings(
  input: BuildFrameworkRegistryInput,
  frameworkRegistryEntries: SyntheticFrameworkRegistryEntry[],
  entryWarnings: string[],
): string[] {
  const activeFrameworkIdentifiers = getActiveFrameworkIdentifiers(frameworkRegistryEntries);
  const selectableFrameworkIdentifiers = getSelectableFrameworkIdentifiers(frameworkRegistryEntries);
  const selectableMismatch = selectableFrameworkIdentifiers.some(
    (frameworkIdentifier) => !activeFrameworkIdentifiers.includes(frameworkIdentifier),
  );

  return [
    ...getInputArray(input.warnings),
    ...entryWarnings,
    ...(selectableMismatch ? ["selectable framework identifiers must equal active framework identifiers only"] : []),
    ...(frameworkRegistryEntries.some(
      (entry) =>
        entry.isJurisdictionalOverlay === true &&
        entry.overlayBaselineFrameworkIdentifier !== "" &&
        !activeFrameworkIdentifiers.includes(entry.overlayBaselineFrameworkIdentifier),
    )
      ? ["jurisdictional overlays become active only after their IASB baseline is active"]
      : []),
  ];
}

export function buildFrameworkRegistry(input: BuildFrameworkRegistryInput): BuildFrameworkRegistryResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      frameworkRegistry: null,
      frameworkRegistryEntries: [],
      skippedIndexes: [],
      warnings: [`missing required framework registry identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const frameworkRegistryEntries: SyntheticFrameworkRegistryEntry[] = [];
  const skippedIndexes: number[] = [];
  const entryWarnings: string[] = [];
  const frameworkEntryInputs = getFrameworkEntryInputs(input);

  frameworkEntryInputs.forEach((entryInput, index) => {
    const result = buildFrameworkRegistryEntry({
      ...input,
      ...entryInput,
      skippedIndexes: [...getInputArray(input.skippedIndexes), index],
    });

    if (result.frameworkRegistryEntry) {
      frameworkRegistryEntries.push(result.frameworkRegistryEntry);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    entryWarnings.push(...result.warnings.map((warning) => `frameworkRegistryEntry[${index}]: ${warning}`));
  });

  const base = getSharedBase(input);
  const frameworkRegistry: SyntheticFrameworkRegistry = {
    ...base,
    frameworkRegistryId: buildFrameworkRegistryId(frameworkRegistryEntries),
    frameworkRegistryKey: buildFrameworkRegistryKey(frameworkRegistryEntries),
    registryEntryReferenceIds: frameworkRegistryEntries.map((entry) => entry.frameworkRegistryEntryId),
    activeFrameworkIdentifiers: getActiveFrameworkIdentifiers(frameworkRegistryEntries),
    nonActiveFrameworkIdentifiers: getNonActiveFrameworkIdentifiers(frameworkRegistryEntries),
    selectableFrameworkIdentifiers: getSelectableFrameworkIdentifiers(frameworkRegistryEntries),
    selectableEqualsActiveOnly: true,
    neverSilentlySubstitutesFramework: true,
    executable: false,
    derivationHash: buildDerivationHash(frameworkRegistryEntries),
    warnings: getWarnings(input, frameworkRegistryEntries, entryWarnings),
    skippedIndexes,
    frameworkRegistryComplete: input.frameworkRegistryComplete === true && skippedIndexes.length === 0,
  };

  return {
    frameworkRegistry,
    frameworkRegistryEntries,
    skippedIndexes,
    warnings: frameworkRegistry.warnings,
  };
}
