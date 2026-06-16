import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticActionDerivationMethod, SyntheticPhase38StaleMarker } from "../../actions/contracts";
import type { SyntheticActionHandoffPackage } from "../../actions/action-handoff-package";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticRoleType } from "../contracts";
import type { SyntheticJournalEntryErpPostingMode } from "../canonical-journal-entry";

export type SyntheticJournalEntryState =
  | "draft"
  | "support_required"
  | "review_ready"
  | "declined_with_warning"
  | "controller_override_pending"
  | "approved_for_import"
  | "submitted_to_erp"
  | "posted"
  | "rejected"
  | "failed_with_remediation_request";

export interface SyntheticJournalEntryLegalTransition {
  fromState: SyntheticJournalEntryState | "any";
  toState: SyntheticJournalEntryState;
  transitionCondition: string;
}

export interface SyntheticJournalEntryTransitionGateRequirement {
  fromState: SyntheticJournalEntryState | "any";
  toState: SyntheticJournalEntryState;
  requiredGateReferenceIds: string[];
  requirementDescription: string;
}

export interface SyntheticJournalEntryTransitionHistoryEntry {
  fromState: SyntheticJournalEntryState | "none";
  toState: SyntheticJournalEntryState;
  transitionedAt: string;
  transitionReason: string;
  transitionReferenceId: string;
}

export interface BuildJournalEntryStateMachineInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  journalEntryCandidateReferenceId?: string;
  currentState?: SyntheticJournalEntryState;
  stateEnum?: SyntheticJournalEntryState[];
  validationResultReferenceId?: string;
  reasonablenessResultReferenceId?: string;
  fraudDetectionResultReferenceId?: string;
  legalTransitions?: SyntheticJournalEntryLegalTransition[];
  transitionGateRequirements?: SyntheticJournalEntryTransitionGateRequirement[];
  transitionHistory?: SyntheticJournalEntryTransitionHistoryEntry[];
  declineWarningReference?: string;
  declineReason?: string;
  controllerOverrideReference?: string;
  overrideReason?: string;
  overrideRequesterId?: string;
  erpPostingMode?: SyntheticJournalEntryErpPostingMode;
  erpSubmissionReference?: string;
  finalState?: SyntheticJournalEntryState;
  stateMachineRunAt?: string;
  auditLogReferenceId?: string;
  boundPhase38SnapshotHash?: string;
  boundPhase37SnapshotHash?: string;
  phase39StaleMarker?: SyntheticPhase38StaleMarker;
  executionReady?: boolean;
  companyId?: string;
  scope?: SyntheticAuditScope;
  customerIsolation?: SyntheticMemoryObjectIsolationDimension;
  firmIsolation?: SyntheticMemoryObjectIsolationDimension;
  clientIsolation?: SyntheticMemoryObjectIsolationDimension;
  derivationLineageIds?: string[];
  derivationMethod?: SyntheticActionDerivationMethod;
  confidenceFloorMetadata?: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds?: string[];
  evidenceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  trustMetadata?: SyntheticAuditTrustMetadata[];
  confidenceMetadata?: SyntheticAuditConfidenceMetadata[];
  governanceMetadata?: SyntheticAuditGovernanceMetadata[];
  materialityMetadata?: SyntheticAuditMaterialityCompatibility[];
  warnings?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticJournalEntryStateMachine {
  stateMachineId: string;
  stateMachineKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  journalEntryCandidateReferenceId: string;
  currentState: SyntheticJournalEntryState;
  stateEnum: SyntheticJournalEntryState[];
  validationResultReferenceId: string;
  reasonablenessResultReferenceId: string;
  fraudDetectionResultReferenceId: string;
  legalTransitions: SyntheticJournalEntryLegalTransition[];
  transitionGateRequirements: SyntheticJournalEntryTransitionGateRequirement[];
  transitionHistory: SyntheticJournalEntryTransitionHistoryEntry[];
  declineWarningReference: string;
  declineReason: string;
  controllerOverrideReference: string;
  overrideReason: string;
  overrideRequesterId: string;
  overridePreservedPermanently: true;
  declinePreservedPermanently: true;
  advanceRequiresAllGatesPassed: true;
  cannotAdvanceToReviewReadyWithoutSupportPackage: true;
  cannotAdvanceToApprovedWithoutGatesOrOverride: true;
  neverSilentlyPassesFlag: true;
  erpPostingMode: SyntheticJournalEntryErpPostingMode;
  erpSubmissionReference: string;
  finalState: SyntheticJournalEntryState;
  stateMachineRunAt: string;
  auditLogReferenceId: string;
  boundPhase38SnapshotHash: string;
  boundPhase37SnapshotHash: string;
  phase39StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  executionReady: boolean;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  derivationLineageIds: string[];
  derivationMethod: SyntheticActionDerivationMethod;
  derivationHash: string;
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  lineageReferenceIds: string[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
  warnings: string[];
  skippedIndexes: number[];
}

export interface BuildJournalEntryStateMachineResult {
  stateMachine: SyntheticJournalEntryStateMachine | null;
  skipped: boolean;
  warnings: string[];
}

export const JOURNAL_ENTRY_STATE_ENUM: SyntheticJournalEntryState[] = [
  "draft",
  "support_required",
  "review_ready",
  "declined_with_warning",
  "controller_override_pending",
  "approved_for_import",
  "submitted_to_erp",
  "posted",
  "rejected",
  "failed_with_remediation_request",
];

export const JOURNAL_ENTRY_LEGAL_TRANSITIONS: SyntheticJournalEntryLegalTransition[] = [
  {
    fromState: "draft",
    toState: "support_required",
    transitionCondition: "support package missing",
  },
  {
    fromState: "draft",
    toState: "review_ready",
    transitionCondition: "validation passed and support present",
  },
  {
    fromState: "review_ready",
    toState: "declined_with_warning",
    transitionCondition: "fraud detection or reasonableness flags",
  },
  {
    fromState: "declined_with_warning",
    toState: "controller_override_pending",
    transitionCondition: "controller provides documented override reason",
  },
  {
    fromState: "controller_override_pending",
    toState: "approved_for_import",
    transitionCondition: "override recorded",
  },
  {
    fromState: "review_ready",
    toState: "approved_for_import",
    transitionCondition: "all gates passed",
  },
  {
    fromState: "approved_for_import",
    toState: "submitted_to_erp",
    transitionCondition: "submitted",
  },
  {
    fromState: "submitted_to_erp",
    toState: "posted",
    transitionCondition: "ERP confirms",
  },
  {
    fromState: "submitted_to_erp",
    toState: "rejected",
    transitionCondition: "ERP rejects",
  },
  {
    fromState: "any",
    toState: "failed_with_remediation_request",
    transitionCondition: "failure",
  },
];

export const JOURNAL_ENTRY_TRANSITION_GATE_REQUIREMENTS: SyntheticJournalEntryTransitionGateRequirement[] = [
  {
    fromState: "draft",
    toState: "review_ready",
    requiredGateReferenceIds: ["validation_result", "support_package"],
    requirementDescription: "validation passed and support package present",
  },
  {
    fromState: "review_ready",
    toState: "approved_for_import",
    requiredGateReferenceIds: ["validation_result", "fraud_detection_result", "reasonableness_result"],
    requirementDescription: "validation, fraud detection, and reasonableness passed",
  },
  {
    fromState: "declined_with_warning",
    toState: "controller_override_pending",
    requiredGateReferenceIds: ["decline_warning", "controller_override_reason"],
    requirementDescription: "documented controller override reason present",
  },
  {
    fromState: "controller_override_pending",
    toState: "approved_for_import",
    requiredGateReferenceIds: ["controller_override_reference"],
    requirementDescription: "override recorded and preserved",
  },
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildJournalEntryStateMachineInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildJournalEntryStateMachineInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildJournalEntryStateMachineInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildJournalEntryStateMachineInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildJournalEntryStateMachineInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildJournalEntryStateMachineInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildJournalEntryStateMachineInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildJournalEntryStateMachineInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildJournalEntryStateMachineInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function collectMissingRequiredIdentifiers(input: BuildJournalEntryStateMachineInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.journalEntryCandidateReferenceId)) {
    missing.push("journalEntryCandidateReferenceId");
  }

  if (!hasValue(getBoundPhase38SnapshotHash(input))) {
    missing.push("boundPhase38SnapshotHash");
  }

  if (!hasValue(getBoundPhase37SnapshotHash(input))) {
    missing.push("boundPhase37SnapshotHash");
  }

  if (!hasValue(getCompanyId(input))) {
    missing.push("companyId");
  }

  if (!getScope(input)) {
    missing.push("scope");
  }

  if (!getCustomerIsolation(input)) {
    missing.push("customerIsolation");
  }

  if (!getFirmIsolation(input)) {
    missing.push("firmIsolation");
  }

  if (!getClientIsolation(input)) {
    missing.push("clientIsolation");
  }

  return missing;
}

function buildDerivationHash(input: BuildJournalEntryStateMachineInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId,
    currentState: input.currentState ?? "draft",
    stateEnum: input.stateEnum ?? JOURNAL_ENTRY_STATE_ENUM,
    validationResultReferenceId: input.validationResultReferenceId ?? "",
    reasonablenessResultReferenceId: input.reasonablenessResultReferenceId ?? "",
    fraudDetectionResultReferenceId: input.fraudDetectionResultReferenceId ?? "",
    legalTransitions: input.legalTransitions ?? JOURNAL_ENTRY_LEGAL_TRANSITIONS,
    transitionGateRequirements: input.transitionGateRequirements ?? JOURNAL_ENTRY_TRANSITION_GATE_REQUIREMENTS,
    transitionHistory: getInputArray(input.transitionHistory),
    declineWarningReference: input.declineWarningReference ?? "",
    declineReason: input.declineReason ?? "",
    controllerOverrideReference: input.controllerOverrideReference ?? "",
    overrideReason: input.overrideReason ?? "",
    overrideRequesterId: input.overrideRequesterId ?? "",
    overridePreservedPermanently: true,
    declinePreservedPermanently: true,
    advanceRequiresAllGatesPassed: true,
    cannotAdvanceToReviewReadyWithoutSupportPackage: true,
    cannotAdvanceToApprovedWithoutGatesOrOverride: true,
    neverSilentlyPassesFlag: true,
    erpPostingMode: input.erpPostingMode ?? "not_set",
    erpSubmissionReference: input.erpSubmissionReference ?? "",
    finalState: input.finalState ?? input.currentState ?? "draft",
    stateMachineRunAt: input.stateMachineRunAt ?? "",
    auditLogReferenceId: input.auditLogReferenceId ?? "",
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildJournalEntryStateMachine(
  input: BuildJournalEntryStateMachineInput,
): BuildJournalEntryStateMachineResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      stateMachine: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const journalEntryCandidateReferenceId = input.journalEntryCandidateReferenceId as string;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const currentState = input.currentState ?? "draft";
  const finalState = input.finalState ?? currentState;
  const derivationHash = buildDerivationHash(input);
  const stateMachineKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    journalEntryCandidateReferenceId,
    currentState,
    finalState,
    stateMachineRunAt: input.stateMachineRunAt ?? "",
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const stateMachineId = stableSnapshotHash({
    stateMachineKey,
    artifactType: "SyntheticJournalEntryStateMachine",
  });

  return {
    stateMachine: {
      stateMachineId,
      stateMachineKey,
      roleType,
      roleInstanceId,
      journalEntryCandidateReferenceId,
      currentState,
      stateEnum: input.stateEnum ?? JOURNAL_ENTRY_STATE_ENUM,
      validationResultReferenceId: input.validationResultReferenceId ?? "",
      reasonablenessResultReferenceId: input.reasonablenessResultReferenceId ?? "",
      fraudDetectionResultReferenceId: input.fraudDetectionResultReferenceId ?? "",
      legalTransitions: input.legalTransitions ?? JOURNAL_ENTRY_LEGAL_TRANSITIONS,
      transitionGateRequirements: input.transitionGateRequirements ?? JOURNAL_ENTRY_TRANSITION_GATE_REQUIREMENTS,
      transitionHistory: getInputArray(input.transitionHistory),
      declineWarningReference: input.declineWarningReference ?? "",
      declineReason: input.declineReason ?? "",
      controllerOverrideReference: input.controllerOverrideReference ?? "",
      overrideReason: input.overrideReason ?? "",
      overrideRequesterId: input.overrideRequesterId ?? "",
      overridePreservedPermanently: true,
      declinePreservedPermanently: true,
      advanceRequiresAllGatesPassed: true,
      cannotAdvanceToReviewReadyWithoutSupportPackage: true,
      cannotAdvanceToApprovedWithoutGatesOrOverride: true,
      neverSilentlyPassesFlag: true,
      erpPostingMode: input.erpPostingMode ?? "not_set",
      erpSubmissionReference: input.erpSubmissionReference ?? "",
      finalState,
      stateMachineRunAt: input.stateMachineRunAt ?? "",
      auditLogReferenceId: input.auditLogReferenceId ?? "",
      boundPhase38SnapshotHash,
      boundPhase37SnapshotHash,
      phase39StaleMarker: getPhase39StaleMarker(input),
      executable: false,
      executionReady: input.executionReady === true,
      companyId,
      scope: scope as SyntheticAuditScope,
      customerIsolation: customerIsolation as SyntheticMemoryObjectIsolationDimension,
      firmIsolation: firmIsolation as SyntheticMemoryObjectIsolationDimension,
      clientIsolation: clientIsolation as SyntheticMemoryObjectIsolationDimension,
      derivationLineageIds: getInputArray(input.derivationLineageIds),
      derivationMethod: getDerivationMethod(input),
      derivationHash,
      confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
      sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
      evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
      lineageReferenceIds: getInputArray(input.lineageReferenceIds),
      trustMetadata: getInputArray(input.trustMetadata),
      confidenceMetadata: getInputArray(input.confidenceMetadata),
      governanceMetadata: getInputArray(input.governanceMetadata),
      materialityMetadata: getInputArray(input.materialityMetadata),
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
