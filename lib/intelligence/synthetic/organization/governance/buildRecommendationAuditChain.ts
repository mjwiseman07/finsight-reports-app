import { stableSnapshotHash } from "../../../core/hash";
import type {
  RecommendationAuditEntry,
  SyntheticOrganizationBaseContract,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export interface BuildRecommendationAuditChainInput
  extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  organizationalUnitId?: string;
  recommendationAuditEntries?: RecommendationAuditEntry[];
  auditEntryReferenceIds?: string[];
  chainSequenceNumbers?: Record<string, number>;
  chainHeadReferenceId?: string;
  chainTailReferenceId?: string;
  containsPHI?: boolean;
  recommendationAuditChainComplete?: boolean;
}

export interface SyntheticRecommendationAuditChain
  extends SyntheticPhase39RoleHandoffConsumptionContract {
  recommendationAuditChainId: string;
  recommendationAuditChainKey: string;
  organizationalUnitId: string;
  auditEntryReferenceIds: string[];
  chainSequenceNumbers: Record<string, number>;
  chainHeadReferenceId: string;
  chainTailReferenceId: string;
  appendOnly: true;
  immutableRecord: true;
  neverEditedOrDeleted: true;
  supersedingCreatesNewEntry: true;
  supportsSoc1Evidence: true;
  supportsSoc2Evidence: true;
  soc1Soc2ProgramDeferredToPhase42_5: true;
  recommendationAuditChainComplete: boolean;
}

export interface BuildRecommendationAuditChainResult {
  recommendationAuditChain: SyntheticRecommendationAuditChain | null;
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

function getContainsPHI(inputContainsPHI: boolean | undefined, entries: RecommendationAuditEntry[]): boolean {
  if (entries.some((entry) => entry.containsPHI === true)) {
    return true;
  }

  return inputContainsPHI ?? true;
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
    containsPHI: input.containsPHI ?? parent.containsPHI ?? true,
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

function getAuditEntryReferenceIds(input: BuildRecommendationAuditChainInput): string[] {
  return getInputArray(input.auditEntryReferenceIds).length > 0
    ? getInputArray(input.auditEntryReferenceIds)
    : getInputArray(input.recommendationAuditEntries).map((entry) => entry.recommendationAuditEntryId);
}

function getChainSequenceNumbers(input: BuildRecommendationAuditChainInput): Record<string, number> {
  const auditEntryReferenceIds = getAuditEntryReferenceIds(input);

  if (Object.keys(getInputRecord(input.chainSequenceNumbers)).length > 0) {
    return getInputRecord(input.chainSequenceNumbers);
  }

  return auditEntryReferenceIds.reduce<Record<string, number>>((sequenceNumbers, referenceId, index) => {
    sequenceNumbers[referenceId] = index + 1;
    return sequenceNumbers;
  }, {});
}

function getChainHeadReferenceId(input: BuildRecommendationAuditChainInput): string {
  return input.chainHeadReferenceId ?? getAuditEntryReferenceIds(input)[0] ?? "";
}

function getChainTailReferenceId(input: BuildRecommendationAuditChainInput): string {
  const auditEntryReferenceIds = getAuditEntryReferenceIds(input);

  return input.chainTailReferenceId ?? auditEntryReferenceIds[auditEntryReferenceIds.length - 1] ?? "";
}

function collectMissingRequiredIdentifiers(input: BuildRecommendationAuditChainInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.organizationalUnitId)) {
    missing.push("organizationalUnitId");
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

function buildRecommendationAuditChainDerivationHash(input: BuildRecommendationAuditChainInput): string {
  return stableSnapshotHash({
    organizationalUnitId: input.organizationalUnitId ?? "",
    auditEntryReferenceIds: getAuditEntryReferenceIds(input),
    chainSequenceNumbers: getChainSequenceNumbers(input),
    chainHeadReferenceId: getChainHeadReferenceId(input),
    chainTailReferenceId: getChainTailReferenceId(input),
    appendOnly: true,
    immutableRecord: true,
    neverEditedOrDeleted: true,
    supersedingCreatesNewEntry: true,
    supportsSoc1Evidence: true,
    supportsSoc2Evidence: true,
    soc1Soc2ProgramDeferredToPhase42_5: true,
    containsPHI: getContainsPHI(input.containsPHI, getInputArray(input.recommendationAuditEntries)),
    recommendationAuditChainComplete: input.recommendationAuditChainComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildRecommendationAuditChain(
  input: BuildRecommendationAuditChainInput,
): BuildRecommendationAuditChainResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      recommendationAuditChain: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const organizationalUnitId = input.organizationalUnitId as string;
  const containsPHI = getContainsPHI(input.containsPHI, getInputArray(input.recommendationAuditEntries));
  const auditEntryReferenceIds = getAuditEntryReferenceIds(input);
  const chainSequenceNumbers = getChainSequenceNumbers(input);
  const chainHeadReferenceId = getChainHeadReferenceId(input);
  const chainTailReferenceId = getChainTailReferenceId(input);
  const derivationHash = buildRecommendationAuditChainDerivationHash(input);
  const recommendationAuditChainKey = stableSnapshotHash({
    organizationalUnitId,
    auditEntryReferenceIds,
    chainSequenceNumbers,
    chainHeadReferenceId,
    chainTailReferenceId,
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
    recommendationAuditChain: {
      ...base,
      recommendationAuditChainId: stableSnapshotHash({
        recommendationAuditChainKey,
        artifactType: "SyntheticRecommendationAuditChain",
      }),
      recommendationAuditChainKey,
      organizationalUnitId,
      auditEntryReferenceIds,
      chainSequenceNumbers,
      chainHeadReferenceId,
      chainTailReferenceId,
      appendOnly: true,
      immutableRecord: true,
      neverEditedOrDeleted: true,
      supersedingCreatesNewEntry: true,
      supportsSoc1Evidence: true,
      supportsSoc2Evidence: true,
      soc1Soc2ProgramDeferredToPhase42_5: true,
      recommendationAuditChainComplete: input.recommendationAuditChainComplete === true,
      containsPHI,
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
