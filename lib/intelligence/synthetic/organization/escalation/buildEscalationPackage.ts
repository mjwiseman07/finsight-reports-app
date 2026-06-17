import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationBaseContract,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";
import type { SyntheticEscalationCandidate } from "./buildEscalationCandidate";

export interface BuildEscalationPackageInput extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  organizationalUnitId?: string;
  consumedConfiguredChainReferenceId?: string;
  escalationCandidates?: SyntheticEscalationCandidate[];
  escalationCandidateReferenceIds?: string[];
  fraudFlagEscalationReferenceIds?: string[];
  reasonablenessFlagEscalationReferenceIds?: string[];
  inputSnapshotHash?: string;
  latestInputSnapshotHash?: string;
  isStale?: boolean;
  containsPHI?: boolean;
  escalationPackageComplete?: boolean;
}

export interface SyntheticEscalationPackage extends SyntheticPhase39RoleHandoffConsumptionContract {
  escalationPackageId: string;
  escalationPackageKey: string;
  organizationalUnitId: string;
  consumedConfiguredChainReferenceId: string;
  escalationCandidateReferenceIds: string[];
  fraudFlagEscalationReferenceIds: string[];
  reasonablenessFlagEscalationReferenceIds: string[];
  inputSnapshotHash: string;
  isStale: boolean;
  isRecommendationOnly: true;
  noAutonomousEscalation: true;
  humanResolvesEscalations: true;
  containsPHI: boolean;
  escalationPackageComplete: boolean;
}

export interface BuildEscalationPackageResult {
  escalationPackage: SyntheticEscalationPackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined, candidates: SyntheticEscalationCandidate[]): boolean {
  if (candidates.some((candidate) => candidate.containsPHI === true)) {
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

function getEscalationCandidateReferenceIds(input: BuildEscalationPackageInput): string[] {
  return getInputArray(input.escalationCandidateReferenceIds).length > 0
    ? getInputArray(input.escalationCandidateReferenceIds)
    : getInputArray(input.escalationCandidates).map((candidate) => candidate.escalationCandidateId);
}

function getFraudFlagEscalationReferenceIds(input: BuildEscalationPackageInput): string[] {
  return getInputArray(input.fraudFlagEscalationReferenceIds).length > 0
    ? getInputArray(input.fraudFlagEscalationReferenceIds)
    : getInputArray(input.escalationCandidates)
        .filter((candidate) => candidate.escalationTrigger === "fraud_flag")
        .map((candidate) => candidate.escalationCandidateId);
}

function getReasonablenessFlagEscalationReferenceIds(input: BuildEscalationPackageInput): string[] {
  return getInputArray(input.reasonablenessFlagEscalationReferenceIds).length > 0
    ? getInputArray(input.reasonablenessFlagEscalationReferenceIds)
    : getInputArray(input.escalationCandidates)
        .filter((candidate) => candidate.escalationTrigger === "reasonableness_flag")
        .map((candidate) => candidate.escalationCandidateId);
}

function getInputSnapshotHash(input: BuildEscalationPackageInput): string {
  return (
    input.inputSnapshotHash ??
    stableSnapshotHash({
      organizationalUnitId: input.organizationalUnitId ?? "",
      consumedConfiguredChainReferenceId: input.consumedConfiguredChainReferenceId ?? "",
      escalationCandidateReferenceIds: getEscalationCandidateReferenceIds(input),
      fraudFlagEscalationReferenceIds: getFraudFlagEscalationReferenceIds(input),
      reasonablenessFlagEscalationReferenceIds: getReasonablenessFlagEscalationReferenceIds(input),
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    })
  );
}

function getIsStale(input: BuildEscalationPackageInput): boolean {
  return (
    input.isStale === true ||
    (hasValue(input.latestInputSnapshotHash) && input.latestInputSnapshotHash !== getInputSnapshotHash(input))
  );
}

function collectMissingRequiredIdentifiers(input: BuildEscalationPackageInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.organizationalUnitId)) {
    missing.push("organizationalUnitId");
  }

  if (!hasValue(input.consumedConfiguredChainReferenceId)) {
    missing.push("consumedConfiguredChainReferenceId");
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

function buildEscalationPackageDerivationHash(input: BuildEscalationPackageInput): string {
  return stableSnapshotHash({
    organizationalUnitId: input.organizationalUnitId ?? "",
    consumedConfiguredChainReferenceId: input.consumedConfiguredChainReferenceId ?? "",
    escalationCandidateReferenceIds: getEscalationCandidateReferenceIds(input),
    fraudFlagEscalationReferenceIds: getFraudFlagEscalationReferenceIds(input),
    reasonablenessFlagEscalationReferenceIds: getReasonablenessFlagEscalationReferenceIds(input),
    inputSnapshotHash: getInputSnapshotHash(input),
    isStale: getIsStale(input),
    isRecommendationOnly: true,
    noAutonomousEscalation: true,
    humanResolvesEscalations: true,
    containsPHI: getContainsPHI(input.containsPHI, getInputArray(input.escalationCandidates)),
    escalationPackageComplete: input.escalationPackageComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildEscalationPackage(input: BuildEscalationPackageInput): BuildEscalationPackageResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      escalationPackage: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const organizationalUnitId = input.organizationalUnitId as string;
  const consumedConfiguredChainReferenceId = input.consumedConfiguredChainReferenceId as string;
  const containsPHI = getContainsPHI(input.containsPHI, getInputArray(input.escalationCandidates));
  const inputSnapshotHash = getInputSnapshotHash(input);
  const isStale = getIsStale(input);
  const derivationHash = buildEscalationPackageDerivationHash(input);
  const escalationPackageKey = stableSnapshotHash({
    organizationalUnitId,
    consumedConfiguredChainReferenceId,
    inputSnapshotHash,
    isStale,
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
    escalationPackage: {
      ...base,
      escalationPackageId: stableSnapshotHash({
        escalationPackageKey,
        artifactType: "SyntheticEscalationPackage",
      }),
      escalationPackageKey,
      organizationalUnitId,
      consumedConfiguredChainReferenceId,
      escalationCandidateReferenceIds: getEscalationCandidateReferenceIds(input),
      fraudFlagEscalationReferenceIds: getFraudFlagEscalationReferenceIds(input),
      reasonablenessFlagEscalationReferenceIds: getReasonablenessFlagEscalationReferenceIds(input),
      inputSnapshotHash,
      isStale,
      isRecommendationOnly: true,
      noAutonomousEscalation: true,
      humanResolvesEscalations: true,
      containsPHI,
      escalationPackageComplete: input.escalationPackageComplete === true,
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
