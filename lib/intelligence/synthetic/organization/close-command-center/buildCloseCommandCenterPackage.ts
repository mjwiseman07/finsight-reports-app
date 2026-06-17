import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationBaseContract,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export type SyntheticCloseTaskStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "review_needed"
  | "complete";

export type SyntheticCloseCommandCenterPersona = "controller" | "cfo" | "manager";

export interface BuildCloseCommandCenterPackageInput
  extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  organizationalUnitId?: string;
  period?: string;
  closeTaskReferenceIds?: string[];
  closeTaskOwnershipMap?: Record<string, string>;
  closeTaskStatusMap?: Record<string, SyntheticCloseTaskStatus>;
  dependencyReferenceIds?: string[];
  blockerReferenceIds?: string[];
  escalationReferenceIds?: string[];
  consumedPhase39RoleOutputReferenceIds?: string[];
  consumedOvernightQueueReferenceIds?: string[];
  itemsRequiringHumanDecisionReferenceIds?: string[];
  itemsRequiringHumanDecisionCount?: number;
  closeStatusSummary?: string;
  closePercentComplete?: number;
  surfacedToPersonas?: SyntheticCloseCommandCenterPersona[];
  packageKeyTuple?: string;
  inputSnapshotHash?: string;
  latestInputSnapshotHash?: string;
  isStale?: boolean;
  containsPHI?: boolean;
  closeCommandCenterPackageComplete?: boolean;
}

export interface SyntheticCloseCommandCenterPackage
  extends SyntheticPhase39RoleHandoffConsumptionContract {
  closeCommandCenterPackageId: string;
  closeCommandCenterPackageKey: string;
  organizationalUnitId: string;
  period: string;
  closeTaskReferenceIds: string[];
  closeTaskOwnershipMap: Record<string, string>;
  closeTaskStatusMap: Record<string, SyntheticCloseTaskStatus>;
  dependencyReferenceIds: string[];
  blockerReferenceIds: string[];
  escalationReferenceIds: string[];
  consumedPhase39RoleOutputReferenceIds: string[];
  consumedOvernightQueueReferenceIds: string[];
  itemsRequiringHumanDecisionReferenceIds: string[];
  itemsRequiringHumanDecisionCount: number;
  closeStatusSummary: string;
  closePercentComplete: number;
  surfacedToPersonas: SyntheticCloseCommandCenterPersona[];
  packageKeyTuple: string;
  updateInPlace: true;
  noDuplicateOnRerun: true;
  noTimestampInHashInputs: true;
  inputSnapshotHash: string;
  isStale: boolean;
  containsPHI: boolean;
  closeCommandCenterPackageComplete: boolean;
}

export interface BuildCloseCommandCenterPackageResult {
  closeCommandCenterPackage: SyntheticCloseCommandCenterPackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getInputRecord<T>(value: Record<string, T> | undefined): Record<string, T> {
  return value ?? {};
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function getItemsRequiringHumanDecisionCount(input: BuildCloseCommandCenterPackageInput): number {
  return input.itemsRequiringHumanDecisionCount ?? getInputArray(input.itemsRequiringHumanDecisionReferenceIds).length;
}

function getSharedBase(
  input: Partial<SyntheticOrganizationBaseContract>,
  parent: Partial<SyntheticOrganizationBaseContract>,
): SyntheticOrganizationBaseContract {
  return {
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? parent.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? parent.boundPhase38SnapshotHash ?? "",
    phase40StaleMarker: input.phase40StaleMarker ?? parent.phase40StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope ?? parent.scope,
    customerIsolation: input.customerIsolation ?? parent.customerIsolation,
    firmIsolation: input.firmIsolation ?? parent.firmIsolation,
    clientIsolation: input.clientIsolation ?? parent.clientIsolation,
    containsPHI: getContainsPHI(input.containsPHI ?? parent.containsPHI),
    derivationLineageIds: getInputArray(input.derivationLineageIds ?? parent.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? parent.derivationMethod ?? "handoff_metadata_preservation",
    derivationHash: "",
    confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata ?? parent.confidenceFloorMetadata),
    sourceConfidenceReferenceIds: getInputArray(
      input.sourceConfidenceReferenceIds ?? parent.sourceConfidenceReferenceIds,
    ),
    evidenceReferenceIds: getInputArray(input.evidenceReferenceIds ?? parent.evidenceReferenceIds),
    lineageReferenceIds: getInputArray(input.lineageReferenceIds ?? parent.lineageReferenceIds),
    trustMetadata: getInputArray(input.trustMetadata ?? parent.trustMetadata),
    confidenceMetadata: getInputArray(input.confidenceMetadata ?? parent.confidenceMetadata),
    governanceMetadata: getInputArray(input.governanceMetadata ?? parent.governanceMetadata),
    warnings: getInputArray(input.warnings ?? parent.warnings),
    skippedIndexes: getInputArray(input.skippedIndexes ?? parent.skippedIndexes),
  } as SyntheticOrganizationBaseContract;
}

function getPhase39HandoffBase(
  input: Partial<SyntheticPhase39RoleHandoffConsumptionContract>,
  parent: Partial<SyntheticPhase39RoleHandoffConsumptionContract>,
): SyntheticPhase39RoleHandoffConsumptionContract {
  return {
    ...getSharedBase(input, parent),
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? parent.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(
      input.phase39RoleInstanceReferenceIds ?? parent.phase39RoleInstanceReferenceIds,
    ),
  };
}

function getInputSnapshotHash(input: BuildCloseCommandCenterPackageInput): string {
  return (
    input.inputSnapshotHash ??
    stableSnapshotHash({
      organizationalUnitId: input.organizationalUnitId ?? "",
      period: input.period ?? "",
      closeTaskReferenceIds: getInputArray(input.closeTaskReferenceIds),
      closeTaskOwnershipMap: getInputRecord(input.closeTaskOwnershipMap),
      closeTaskStatusMap: getInputRecord(input.closeTaskStatusMap),
      dependencyReferenceIds: getInputArray(input.dependencyReferenceIds),
      blockerReferenceIds: getInputArray(input.blockerReferenceIds),
      escalationReferenceIds: getInputArray(input.escalationReferenceIds),
      consumedPhase39RoleOutputReferenceIds: getInputArray(input.consumedPhase39RoleOutputReferenceIds),
      consumedOvernightQueueReferenceIds: getInputArray(input.consumedOvernightQueueReferenceIds),
      itemsRequiringHumanDecisionReferenceIds: getInputArray(input.itemsRequiringHumanDecisionReferenceIds),
      itemsRequiringHumanDecisionCount: getItemsRequiringHumanDecisionCount(input),
      closeStatusSummary: input.closeStatusSummary ?? "",
      closePercentComplete: input.closePercentComplete ?? 0,
      surfacedToPersonas: getInputArray(input.surfacedToPersonas),
      noTimestampInHashInputs: true,
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    })
  );
}

function getIsStale(input: BuildCloseCommandCenterPackageInput): boolean {
  return (
    input.isStale === true ||
    (hasValue(input.latestInputSnapshotHash) && input.latestInputSnapshotHash !== getInputSnapshotHash(input))
  );
}

function getPackageKeyTuple(input: BuildCloseCommandCenterPackageInput): string {
  return input.packageKeyTuple ?? `${input.period ?? ""}_${input.organizationalUnitId ?? ""}_${getInputSnapshotHash(input)}`;
}

function collectMissingRequiredIdentifiers(input: BuildCloseCommandCenterPackageInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.organizationalUnitId)) {
    missing.push("organizationalUnitId");
  }

  if (!hasValue(input.period)) {
    missing.push("period");
  }

  if (!hasValue(input.phase39RoleHandoffHandle)) {
    missing.push("phase39RoleHandoffHandle");
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

function buildCloseCommandCenterPackageDerivationHash(
  input: BuildCloseCommandCenterPackageInput,
): string {
  return stableSnapshotHash({
    organizationalUnitId: input.organizationalUnitId ?? "",
    period: input.period ?? "",
    closeTaskReferenceIds: getInputArray(input.closeTaskReferenceIds),
    closeTaskOwnershipMap: getInputRecord(input.closeTaskOwnershipMap),
    closeTaskStatusMap: getInputRecord(input.closeTaskStatusMap),
    dependencyReferenceIds: getInputArray(input.dependencyReferenceIds),
    blockerReferenceIds: getInputArray(input.blockerReferenceIds),
    escalationReferenceIds: getInputArray(input.escalationReferenceIds),
    consumedPhase39RoleOutputReferenceIds: getInputArray(input.consumedPhase39RoleOutputReferenceIds),
    consumedOvernightQueueReferenceIds: getInputArray(input.consumedOvernightQueueReferenceIds),
    itemsRequiringHumanDecisionReferenceIds: getInputArray(input.itemsRequiringHumanDecisionReferenceIds),
    itemsRequiringHumanDecisionCount: getItemsRequiringHumanDecisionCount(input),
    closeStatusSummary: input.closeStatusSummary ?? "",
    closePercentComplete: input.closePercentComplete ?? 0,
    surfacedToPersonas: getInputArray(input.surfacedToPersonas),
    packageKeyTuple: getPackageKeyTuple(input),
    updateInPlace: true,
    noDuplicateOnRerun: true,
    noTimestampInHashInputs: true,
    inputSnapshotHash: getInputSnapshotHash(input),
    isStale: getIsStale(input),
    containsPHI: getContainsPHI(input.containsPHI),
    closeCommandCenterPackageComplete: input.closeCommandCenterPackageComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildCloseCommandCenterPackage(
  input: BuildCloseCommandCenterPackageInput,
): BuildCloseCommandCenterPackageResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      closeCommandCenterPackage: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const organizationalUnitId = input.organizationalUnitId as string;
  const period = input.period as string;
  const containsPHI = getContainsPHI(input.containsPHI);
  const inputSnapshotHash = getInputSnapshotHash(input);
  const isStale = getIsStale(input);
  const packageKeyTuple = getPackageKeyTuple(input);
  const derivationHash = buildCloseCommandCenterPackageDerivationHash(input);
  const closeCommandCenterPackageKey = stableSnapshotHash({
    period,
    organizationalUnitId,
    inputSnapshotHash,
    packageKeyTuple,
    noTimestampInHashInputs: true,
    containsPHI,
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash,
    derivationHash,
  });
  const base = getPhase39HandoffBase(
    {
      ...input,
      containsPHI,
      derivationHash,
    },
    {},
  );

  return {
    closeCommandCenterPackage: {
      ...base,
      closeCommandCenterPackageId: stableSnapshotHash({
        closeCommandCenterPackageKey,
        artifactType: "SyntheticCloseCommandCenterPackage",
      }),
      closeCommandCenterPackageKey,
      organizationalUnitId,
      period,
      closeTaskReferenceIds: getInputArray(input.closeTaskReferenceIds),
      closeTaskOwnershipMap: getInputRecord(input.closeTaskOwnershipMap),
      closeTaskStatusMap: getInputRecord(input.closeTaskStatusMap),
      dependencyReferenceIds: getInputArray(input.dependencyReferenceIds),
      blockerReferenceIds: getInputArray(input.blockerReferenceIds),
      escalationReferenceIds: getInputArray(input.escalationReferenceIds),
      consumedPhase39RoleOutputReferenceIds: getInputArray(input.consumedPhase39RoleOutputReferenceIds),
      consumedOvernightQueueReferenceIds: getInputArray(input.consumedOvernightQueueReferenceIds),
      itemsRequiringHumanDecisionReferenceIds: getInputArray(input.itemsRequiringHumanDecisionReferenceIds),
      itemsRequiringHumanDecisionCount: getItemsRequiringHumanDecisionCount(input),
      closeStatusSummary: input.closeStatusSummary ?? "",
      closePercentComplete: input.closePercentComplete ?? 0,
      surfacedToPersonas: getInputArray(input.surfacedToPersonas),
      packageKeyTuple,
      updateInPlace: true,
      noDuplicateOnRerun: true,
      noTimestampInHashInputs: true,
      inputSnapshotHash,
      isStale,
      containsPHI,
      closeCommandCenterPackageComplete: input.closeCommandCenterPackageComplete === true,
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
