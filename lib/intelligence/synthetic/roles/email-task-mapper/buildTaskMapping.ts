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

export type SyntheticTaskMappingComplexityLevel = "immediate" | "overnight";

export type SyntheticTaskMappingStatus = "mapped" | "incomplete" | "insufficient_input" | "flagged_for_review";

export interface SyntheticTaskMappingMaterialityAssessment {
  materialityAssessmentReferenceId: string;
  materialityAssessmentSummary: string;
  materialityLevel: "unknown" | "low" | "medium" | "high" | "requires_human_decision";
}

export interface BuildTaskMappingInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  emailIntakeReferenceId?: string;
  attachmentParseReferenceIds?: string[];
  mappedTaskFamily?: string;
  mappedCapabilityReferenceId?: string;
  taskDescription?: string;
  taskInputReferences?: string[];
  taskParameterReferences?: string[];
  requiredEvidenceReferenceIds?: string[];
  expectedOutputType?: string;
  generatesJournalEntry?: boolean;
  requiresFraudDetection?: boolean;
  requiresReasonablenessCheck?: boolean;
  requiresWorkpaper?: boolean;
  requiresLeadSheet?: boolean;
  requiresSupportPackage?: boolean;
  governanceReferenceId?: string;
  restrictionReferenceId?: string;
  approvalRoutingTargetRoleType?: SyntheticRoleType;
  materialityAssessment?: SyntheticTaskMappingMaterialityAssessment[];
  materialityGateRequired?: boolean;
  complexityLevel?: SyntheticTaskMappingComplexityLevel;
  taskExecutionTargetModule?: string;
  taskMappingStatus?: SyntheticTaskMappingStatus;
  insufficientInputReason?: string;
  requiresHumanReview?: boolean;
  linkedTaskQueueReferenceId?: string;
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

export interface SyntheticTaskMapping {
  taskMappingId: string;
  taskMappingKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  emailIntakeReferenceId: string;
  attachmentParseReferenceIds: string[];
  mappedTaskFamily: string;
  mappedCapabilityReferenceId: string;
  taskDescription: string;
  taskInputReferences: string[];
  taskParameterReferences: string[];
  requiredEvidenceReferenceIds: string[];
  expectedOutputType: string;
  generatesJournalEntry: boolean;
  requiresFraudDetection: boolean;
  requiresReasonablenessCheck: boolean;
  requiresWorkpaper: boolean;
  requiresLeadSheet: boolean;
  requiresSupportPackage: boolean;
  governanceReferenceId: string;
  restrictionReferenceId: string;
  approvalRoutingTargetRoleType: SyntheticRoleType | "";
  materialityAssessment: SyntheticTaskMappingMaterialityAssessment[];
  materialityGateRequired: boolean;
  complexityLevel: SyntheticTaskMappingComplexityLevel;
  taskExecutionTargetModule: string;
  taskMappingStatus: SyntheticTaskMappingStatus;
  insufficientInputReason: string;
  requiresHumanReview: boolean;
  failClosedOnInsufficientInput: true;
  linkedTaskQueueReferenceId: string;
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

export interface BuildTaskMappingResult {
  taskMapping: SyntheticTaskMapping | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildTaskMappingInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildTaskMappingInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildTaskMappingInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildTaskMappingInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildTaskMappingInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildTaskMappingInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildTaskMappingInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildTaskMappingInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildTaskMappingInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getGeneratesJournalEntry(input: BuildTaskMappingInput): boolean {
  return input.generatesJournalEntry === true;
}

function getRequiresFraudDetection(input: BuildTaskMappingInput): boolean {
  return getGeneratesJournalEntry(input) || input.requiresFraudDetection === true;
}

function getRequiresReasonablenessCheck(input: BuildTaskMappingInput): boolean {
  return getGeneratesJournalEntry(input) || input.requiresReasonablenessCheck === true;
}

function hasInsufficientInput(input: BuildTaskMappingInput): boolean {
  return (
    hasValue(input.insufficientInputReason) ||
    !hasValue(input.mappedTaskFamily) ||
    !hasValue(input.mappedCapabilityReferenceId) ||
    getInputArray(input.taskInputReferences).length === 0
  );
}

function getTaskMappingStatus(input: BuildTaskMappingInput): SyntheticTaskMappingStatus {
  if (input.taskMappingStatus) {
    return input.taskMappingStatus;
  }

  if (hasInsufficientInput(input)) {
    return "insufficient_input";
  }

  if (input.requiresHumanReview === true) {
    return "flagged_for_review";
  }

  return "mapped";
}

function getRequiresHumanReview(input: BuildTaskMappingInput): boolean {
  return input.requiresHumanReview === true || getTaskMappingStatus(input) === "insufficient_input";
}

function collectMissingRequiredIdentifiers(input: BuildTaskMappingInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.emailIntakeReferenceId)) {
    missing.push("emailIntakeReferenceId");
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

function buildDerivationHash(input: BuildTaskMappingInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    emailIntakeReferenceId: input.emailIntakeReferenceId,
    attachmentParseReferenceIds: getInputArray(input.attachmentParseReferenceIds),
    mappedTaskFamily: input.mappedTaskFamily ?? "",
    mappedCapabilityReferenceId: input.mappedCapabilityReferenceId ?? "",
    taskDescription: input.taskDescription ?? "",
    taskInputReferences: getInputArray(input.taskInputReferences),
    taskParameterReferences: getInputArray(input.taskParameterReferences),
    requiredEvidenceReferenceIds: getInputArray(input.requiredEvidenceReferenceIds),
    expectedOutputType: input.expectedOutputType ?? "",
    generatesJournalEntry: getGeneratesJournalEntry(input),
    requiresFraudDetection: getRequiresFraudDetection(input),
    requiresReasonablenessCheck: getRequiresReasonablenessCheck(input),
    requiresWorkpaper: input.requiresWorkpaper === true,
    requiresLeadSheet: input.requiresLeadSheet === true,
    requiresSupportPackage: input.requiresSupportPackage === true,
    governanceReferenceId: input.governanceReferenceId ?? "",
    restrictionReferenceId: input.restrictionReferenceId ?? "",
    approvalRoutingTargetRoleType: input.approvalRoutingTargetRoleType ?? "",
    materialityAssessment: getInputArray(input.materialityAssessment),
    materialityGateRequired: input.materialityGateRequired === true,
    complexityLevel: input.complexityLevel ?? "immediate",
    taskExecutionTargetModule: input.taskExecutionTargetModule ?? "",
    taskMappingStatus: getTaskMappingStatus(input),
    insufficientInputReason: input.insufficientInputReason ?? "",
    requiresHumanReview: getRequiresHumanReview(input),
    failClosedOnInsufficientInput: true,
    linkedTaskQueueReferenceId: input.linkedTaskQueueReferenceId ?? "",
    auditLogReferenceId: input.auditLogReferenceId ?? "",
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildTaskMapping(input: BuildTaskMappingInput): BuildTaskMappingResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      taskMapping: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const emailIntakeReferenceId = input.emailIntakeReferenceId as string;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const generatesJournalEntry = getGeneratesJournalEntry(input);
  const requiresFraudDetection = getRequiresFraudDetection(input);
  const requiresReasonablenessCheck = getRequiresReasonablenessCheck(input);
  const taskMappingStatus = getTaskMappingStatus(input);
  const requiresHumanReview = getRequiresHumanReview(input);
  const derivationHash = buildDerivationHash(input);
  const taskMappingKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    emailIntakeReferenceId,
    mappedTaskFamily: input.mappedTaskFamily ?? "",
    mappedCapabilityReferenceId: input.mappedCapabilityReferenceId ?? "",
    taskMappingStatus,
    complexityLevel: input.complexityLevel ?? "immediate",
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const taskMappingId = stableSnapshotHash({
    taskMappingKey,
    artifactType: "SyntheticTaskMapping",
  });

  return {
    taskMapping: {
      taskMappingId,
      taskMappingKey,
      roleType,
      roleInstanceId,
      emailIntakeReferenceId,
      attachmentParseReferenceIds: getInputArray(input.attachmentParseReferenceIds),
      mappedTaskFamily: input.mappedTaskFamily ?? "",
      mappedCapabilityReferenceId: input.mappedCapabilityReferenceId ?? "",
      taskDescription: input.taskDescription ?? "",
      taskInputReferences: getInputArray(input.taskInputReferences),
      taskParameterReferences: getInputArray(input.taskParameterReferences),
      requiredEvidenceReferenceIds: getInputArray(input.requiredEvidenceReferenceIds),
      expectedOutputType: input.expectedOutputType ?? "",
      generatesJournalEntry,
      requiresFraudDetection,
      requiresReasonablenessCheck,
      requiresWorkpaper: input.requiresWorkpaper === true,
      requiresLeadSheet: input.requiresLeadSheet === true,
      requiresSupportPackage: input.requiresSupportPackage === true,
      governanceReferenceId: input.governanceReferenceId ?? "",
      restrictionReferenceId: input.restrictionReferenceId ?? "",
      approvalRoutingTargetRoleType: input.approvalRoutingTargetRoleType ?? "",
      materialityAssessment: getInputArray(input.materialityAssessment),
      materialityGateRequired: input.materialityGateRequired === true,
      complexityLevel: input.complexityLevel ?? "immediate",
      taskExecutionTargetModule: input.taskExecutionTargetModule ?? "",
      taskMappingStatus,
      insufficientInputReason: input.insufficientInputReason ?? "",
      requiresHumanReview,
      failClosedOnInsufficientInput: true,
      linkedTaskQueueReferenceId: input.linkedTaskQueueReferenceId ?? "",
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
