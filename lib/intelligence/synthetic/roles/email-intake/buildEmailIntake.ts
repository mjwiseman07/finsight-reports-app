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

export type SyntheticEmailSenderAuthorizationStatus = "authorized" | "unauthorized" | "pending_verification";

export type SyntheticEmailRoutingDecision =
  | "route_to_task"
  | "decline_out_of_scope"
  | "decline_unauthorized_sender"
  | "flag_for_review";

export type SyntheticEmailIntakeStatus = "received" | "classified" | "routed" | "declined" | "flagged_for_review";

export interface BuildEmailIntakeInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  roleEmailInbox?: string;
  senderEmailAddress?: string;
  senderAuthorizationStatus?: SyntheticEmailSenderAuthorizationStatus;
  senderApprovedListReferenceId?: string;
  emailSubject?: string;
  emailReceivedAt?: string;
  emailBodyReference?: string;
  attachmentReferenceIds?: string[];
  attachmentCount?: number;
  extractedInstructionReference?: string;
  classificationResult?: string;
  classifiedTaskFamily?: string;
  classifiedCapabilityReferenceId?: string;
  capabilityMatch?: boolean;
  restrictionCheckResult?: boolean;
  authorizationCheckResult?: boolean;
  routingDecision?: SyntheticEmailRoutingDecision;
  routingTargetRoleType?: SyntheticRoleType;
  declineReason?: string;
  suggestedAlternativeRoleType?: SyntheticRoleType;
  intakeStatus?: SyntheticEmailIntakeStatus;
  linkedOutputReferenceIds?: string[];
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

export interface SyntheticEmailIntake {
  emailIntakeId: string;
  emailIntakeKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  roleEmailInbox: string;
  senderEmailAddress: string;
  senderAuthorizationStatus: SyntheticEmailSenderAuthorizationStatus;
  senderApprovedListReferenceId: string;
  emailSubject: string;
  emailReceivedAt: string;
  emailBodyReference: string;
  attachmentReferenceIds: string[];
  attachmentCount: number;
  extractedInstructionReference: string;
  classificationResult: string;
  classifiedTaskFamily: string;
  classifiedCapabilityReferenceId: string;
  capabilityMatch: boolean;
  restrictionCheckResult: boolean;
  authorizationCheckResult: boolean;
  routingDecision: SyntheticEmailRoutingDecision;
  routingTargetRoleType: SyntheticRoleType | "";
  declineReason: string;
  suggestedAlternativeRoleType: SyntheticRoleType | "";
  intakeStatus: SyntheticEmailIntakeStatus;
  linkedOutputReferenceIds: string[];
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

export interface BuildEmailIntakeResult {
  emailIntake: SyntheticEmailIntake | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildEmailIntakeInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildEmailIntakeInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildEmailIntakeInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildEmailIntakeInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildEmailIntakeInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildEmailIntakeInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildEmailIntakeInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildEmailIntakeInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildEmailIntakeInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getAttachmentCount(input: BuildEmailIntakeInput): number {
  return input.attachmentCount ?? getInputArray(input.attachmentReferenceIds).length;
}

function getRoutingDecision(input: BuildEmailIntakeInput): SyntheticEmailRoutingDecision {
  if (input.routingDecision) {
    return input.routingDecision;
  }

  if (input.authorizationCheckResult === false) {
    return "decline_unauthorized_sender";
  }

  if (input.capabilityMatch === false) {
    return "decline_out_of_scope";
  }

  if (input.capabilityMatch === true && input.restrictionCheckResult === true && input.authorizationCheckResult === true) {
    return "route_to_task";
  }

  return "flag_for_review";
}

function getIntakeStatus(input: BuildEmailIntakeInput): SyntheticEmailIntakeStatus {
  if (input.intakeStatus) {
    return input.intakeStatus;
  }

  const routingDecision = getRoutingDecision(input);

  if (routingDecision === "route_to_task") {
    return "routed";
  }

  if (routingDecision === "flag_for_review") {
    return "flagged_for_review";
  }

  if (routingDecision === "decline_out_of_scope" || routingDecision === "decline_unauthorized_sender") {
    return "declined";
  }

  return "received";
}

function collectMissingRequiredIdentifiers(input: BuildEmailIntakeInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
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

function buildDerivationHash(input: BuildEmailIntakeInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    roleEmailInbox: input.roleEmailInbox ?? "",
    senderEmailAddress: input.senderEmailAddress ?? "",
    senderAuthorizationStatus: input.senderAuthorizationStatus ?? "pending_verification",
    senderApprovedListReferenceId: input.senderApprovedListReferenceId ?? "",
    emailSubject: input.emailSubject ?? "",
    emailReceivedAt: input.emailReceivedAt ?? "",
    emailBodyReference: input.emailBodyReference ?? "",
    attachmentReferenceIds: getInputArray(input.attachmentReferenceIds),
    attachmentCount: getAttachmentCount(input),
    extractedInstructionReference: input.extractedInstructionReference ?? "",
    classificationResult: input.classificationResult ?? "",
    classifiedTaskFamily: input.classifiedTaskFamily ?? "",
    classifiedCapabilityReferenceId: input.classifiedCapabilityReferenceId ?? "",
    capabilityMatch: input.capabilityMatch === true,
    restrictionCheckResult: input.restrictionCheckResult === true,
    authorizationCheckResult: input.authorizationCheckResult === true,
    routingDecision: getRoutingDecision(input),
    routingTargetRoleType: input.routingTargetRoleType ?? "",
    declineReason: input.declineReason ?? "",
    suggestedAlternativeRoleType: input.suggestedAlternativeRoleType ?? "",
    intakeStatus: getIntakeStatus(input),
    linkedOutputReferenceIds: getInputArray(input.linkedOutputReferenceIds),
    auditLogReferenceId: input.auditLogReferenceId ?? "",
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildEmailIntake(input: BuildEmailIntakeInput): BuildEmailIntakeResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      emailIntake: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const attachmentCount = getAttachmentCount(input);
  const routingDecision = getRoutingDecision(input);
  const intakeStatus = getIntakeStatus(input);
  const derivationHash = buildDerivationHash(input);
  const emailIntakeKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    roleEmailInbox: input.roleEmailInbox ?? "",
    senderEmailAddress: input.senderEmailAddress ?? "",
    emailReceivedAt: input.emailReceivedAt ?? "",
    routingDecision,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const emailIntakeId = stableSnapshotHash({
    emailIntakeKey,
    artifactType: "SyntheticEmailIntake",
  });

  return {
    emailIntake: {
      emailIntakeId,
      emailIntakeKey,
      roleType,
      roleInstanceId,
      roleEmailInbox: input.roleEmailInbox ?? "",
      senderEmailAddress: input.senderEmailAddress ?? "",
      senderAuthorizationStatus: input.senderAuthorizationStatus ?? "pending_verification",
      senderApprovedListReferenceId: input.senderApprovedListReferenceId ?? "",
      emailSubject: input.emailSubject ?? "",
      emailReceivedAt: input.emailReceivedAt ?? "",
      emailBodyReference: input.emailBodyReference ?? "",
      attachmentReferenceIds: getInputArray(input.attachmentReferenceIds),
      attachmentCount,
      extractedInstructionReference: input.extractedInstructionReference ?? "",
      classificationResult: input.classificationResult ?? "",
      classifiedTaskFamily: input.classifiedTaskFamily ?? "",
      classifiedCapabilityReferenceId: input.classifiedCapabilityReferenceId ?? "",
      capabilityMatch: input.capabilityMatch === true,
      restrictionCheckResult: input.restrictionCheckResult === true,
      authorizationCheckResult: input.authorizationCheckResult === true,
      routingDecision,
      routingTargetRoleType: input.routingTargetRoleType ?? "",
      declineReason: input.declineReason ?? "",
      suggestedAlternativeRoleType: input.suggestedAlternativeRoleType ?? "",
      intakeStatus,
      linkedOutputReferenceIds: getInputArray(input.linkedOutputReferenceIds),
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
