import { stableSnapshotHash } from "../../../core/hash";
import type {
  RecommendationAuditEntry,
  SyntheticOrganizationBaseContract,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export type SyntheticEscalationTrigger =
  | "material_exception"
  | "fraud_flag"
  | "reasonableness_flag"
  | "out_of_scope"
  | "capacity_overload"
  | "deadline_risk"
  | "other";

export interface BuildEscalationCandidateInput extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  organizationalUnitId?: string;
  consumedConfiguredChainReferenceId?: string;
  consumedChainStepsSnapshot?: Array<Record<string, unknown>>;
  triggerReference?: string;
  escalationTrigger?: SyntheticEscalationTrigger;
  escalationFromRoleType?: string;
  escalationToRoleType?: string;
  escalationToIsHuman?: boolean;
  escalationReason?: string;
  mustReachHuman?: boolean;
  recipientReferenceId?: string;
  inputSnapshotHash?: string;
  latestInputSnapshotHash?: string;
  recommendationTimestamp?: string;
  humanDecisionOutcome?: string;
  priorEntryReferenceId?: string;
  containsPHI?: boolean;
  escalationCandidateComplete?: boolean;
}

export interface SyntheticEscalationCandidate extends SyntheticPhase39RoleHandoffConsumptionContract {
  escalationCandidateId: string;
  escalationCandidateKey: string;
  organizationalUnitId: string;
  consumedConfiguredChainReferenceId: string;
  consumedChainStepsSnapshot: Array<Record<string, unknown>>;
  triggerReference: string;
  escalationTrigger: SyntheticEscalationTrigger;
  escalationFromRoleType: string;
  escalationToRoleType: string;
  escalationToIsHuman: boolean;
  escalationReason: string;
  mustReachHuman: boolean;
  requiresHumanDecision: true;
  isRecommendationOnly: true;
  recommendationAuditEntryReferenceId: string;
  containsPHI: boolean;
  escalationCandidateComplete: boolean;
}

export interface BuildEscalationCandidateResult {
  escalationCandidate: SyntheticEscalationCandidate | null;
  recommendationAuditEntry: RecommendationAuditEntry | null;
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

function triggerMustReachHuman(escalationTrigger: SyntheticEscalationTrigger | undefined): boolean {
  return escalationTrigger === "fraud_flag" || escalationTrigger === "reasonableness_flag";
}

function getMustReachHuman(input: BuildEscalationCandidateInput): boolean {
  return triggerMustReachHuman(input.escalationTrigger) || input.mustReachHuman === true;
}

function getInputSnapshotHash(input: BuildEscalationCandidateInput): string {
  return (
    input.inputSnapshotHash ??
    stableSnapshotHash({
      organizationalUnitId: input.organizationalUnitId ?? "",
      consumedConfiguredChainReferenceId: input.consumedConfiguredChainReferenceId ?? "",
      consumedChainStepsSnapshot: getInputArray(input.consumedChainStepsSnapshot),
      triggerReference: input.triggerReference ?? "",
      escalationTrigger: input.escalationTrigger ?? "",
      escalationFromRoleType: input.escalationFromRoleType ?? "",
      escalationToRoleType: input.escalationToRoleType ?? "",
      escalationToIsHuman: input.escalationToIsHuman === true,
      escalationReason: input.escalationReason ?? "",
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    })
  );
}

function getIsStale(input: BuildEscalationCandidateInput): boolean {
  return hasValue(input.latestInputSnapshotHash) && input.latestInputSnapshotHash !== getInputSnapshotHash(input);
}

function getPayloadHash(input: BuildEscalationCandidateInput): string {
  return stableSnapshotHash({
    organizationalUnitId: input.organizationalUnitId ?? "",
    consumedConfiguredChainReferenceId: input.consumedConfiguredChainReferenceId ?? "",
    consumedChainStepsSnapshot: getInputArray(input.consumedChainStepsSnapshot),
    triggerReference: input.triggerReference ?? "",
    escalationTrigger: input.escalationTrigger ?? "",
    escalationFromRoleType: input.escalationFromRoleType ?? "",
    escalationToRoleType: input.escalationToRoleType ?? "",
    escalationToIsHuman: input.escalationToIsHuman === true,
    escalationReason: input.escalationReason ?? "",
    mustReachHuman: getMustReachHuman(input),
    requiresHumanDecision: true,
    isRecommendationOnly: true,
    containsPHI: getContainsPHI(input.containsPHI),
  });
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

function collectMissingRequiredIdentifiers(input: BuildEscalationCandidateInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.organizationalUnitId)) {
    missing.push("organizationalUnitId");
  }

  if (!hasValue(input.consumedConfiguredChainReferenceId)) {
    missing.push("consumedConfiguredChainReferenceId");
  }

  if (!hasValue(input.escalationTrigger)) {
    missing.push("escalationTrigger");
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

function buildRecommendationAuditEntry(
  input: BuildEscalationCandidateInput,
  derivationHash: string,
): RecommendationAuditEntry {
  const containsPHI = getContainsPHI(input.containsPHI);
  const base = getPhase39HandoffBase(
    {
      ...input,
      containsPHI,
      derivationHash,
    },
    {},
  );
  const inputSnapshotHash = getInputSnapshotHash(input);
  const payloadHash = getPayloadHash(input);
  const recommendationAuditEntryKey = stableSnapshotHash({
    recommendationType: "escalation",
    recommenderModule: "escalation",
    recipientReferenceId: input.recipientReferenceId ?? input.escalationToRoleType ?? "",
    payloadHash,
    inputSnapshotHash,
    isStale: getIsStale(input),
    priorEntryReferenceId: input.priorEntryReferenceId ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
  });

  return {
    ...base,
    recommendationAuditEntryId: stableSnapshotHash({
      recommendationAuditEntryKey,
      artifactType: "RecommendationAuditEntry",
    }),
    recommendationAuditEntryKey,
    recommendationType: "escalation",
    recommenderModule: "escalation",
    recipientReferenceId: input.recipientReferenceId ?? input.escalationToRoleType ?? "",
    payloadHash,
    inputSnapshotHash,
    isStale: getIsStale(input),
    recommendationTimestamp: input.recommendationTimestamp ?? "",
    humanDecisionOutcome: input.humanDecisionOutcome ?? "",
    priorEntryReferenceId: input.priorEntryReferenceId ?? "",
    appendOnly: true,
    immutableRecord: true,
    containsPHI,
    derivationHash,
  };
}

function buildEscalationCandidateDerivationHash(input: BuildEscalationCandidateInput): string {
  return stableSnapshotHash({
    organizationalUnitId: input.organizationalUnitId ?? "",
    consumedConfiguredChainReferenceId: input.consumedConfiguredChainReferenceId ?? "",
    consumedChainStepsSnapshot: getInputArray(input.consumedChainStepsSnapshot),
    triggerReference: input.triggerReference ?? "",
    escalationTrigger: input.escalationTrigger ?? "",
    escalationFromRoleType: input.escalationFromRoleType ?? "",
    escalationToRoleType: input.escalationToRoleType ?? "",
    escalationToIsHuman: input.escalationToIsHuman === true,
    escalationReason: input.escalationReason ?? "",
    mustReachHuman: getMustReachHuman(input),
    requiresHumanDecision: true,
    isRecommendationOnly: true,
    payloadHash: getPayloadHash(input),
    inputSnapshotHash: getInputSnapshotHash(input),
    isStale: getIsStale(input),
    containsPHI: getContainsPHI(input.containsPHI),
    escalationCandidateComplete: input.escalationCandidateComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildEscalationCandidate(
  input: BuildEscalationCandidateInput,
): BuildEscalationCandidateResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      escalationCandidate: null,
      recommendationAuditEntry: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const organizationalUnitId = input.organizationalUnitId as string;
  const consumedConfiguredChainReferenceId = input.consumedConfiguredChainReferenceId as string;
  const escalationTrigger = input.escalationTrigger as SyntheticEscalationTrigger;
  const containsPHI = getContainsPHI(input.containsPHI);
  const mustReachHuman = getMustReachHuman(input);
  const derivationHash = buildEscalationCandidateDerivationHash(input);
  const recommendationAuditEntry = buildRecommendationAuditEntry(input, derivationHash);
  const escalationCandidateKey = stableSnapshotHash({
    organizationalUnitId,
    consumedConfiguredChainReferenceId,
    triggerReference: input.triggerReference ?? "",
    escalationTrigger,
    escalationToRoleType: input.escalationToRoleType ?? "",
    mustReachHuman,
    recommendationAuditEntryReferenceId: recommendationAuditEntry.recommendationAuditEntryId,
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
    escalationCandidate: {
      ...base,
      escalationCandidateId: stableSnapshotHash({
        escalationCandidateKey,
        artifactType: "SyntheticEscalationCandidate",
      }),
      escalationCandidateKey,
      organizationalUnitId,
      consumedConfiguredChainReferenceId,
      consumedChainStepsSnapshot: getInputArray(input.consumedChainStepsSnapshot),
      triggerReference: input.triggerReference ?? "",
      escalationTrigger,
      escalationFromRoleType: input.escalationFromRoleType ?? "",
      escalationToRoleType: input.escalationToRoleType ?? "",
      escalationToIsHuman: input.escalationToIsHuman === true,
      escalationReason: input.escalationReason ?? "",
      mustReachHuman,
      requiresHumanDecision: true,
      isRecommendationOnly: true,
      recommendationAuditEntryReferenceId: recommendationAuditEntry.recommendationAuditEntryId,
      containsPHI,
      escalationCandidateComplete: input.escalationCandidateComplete === true,
      derivationHash,
    },
    recommendationAuditEntry,
    skipped: false,
    warnings,
  };
}
