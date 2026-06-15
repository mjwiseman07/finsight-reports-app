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

export type SyntheticRoleRestrictionEscalationTargetRoleType =
  | SyntheticRoleType
  | "human_controller"
  | "human_cfo"
  | "human_audit_manager"
  | "human_partner";

interface RoleRestrictionDefinition {
  allowedTaskFamilies: string[];
  forbiddenTaskFamilies: string[];
  escalationTriggers: string[];
  escalationTargetRoleType: SyntheticRoleRestrictionEscalationTargetRoleType;
  canSubmitToERP: boolean;
  canPostDirectly: boolean;
  canGenerateJournalEntry: boolean;
  canCommunicateExternally: boolean;
  clientEmailEnabled: boolean;
  scheduledDocumentCheckingEnabled: boolean;
  materialityGateRequired: boolean;
  humanDecisionRequired: boolean;
  mustEscalateFraudFlags: boolean;
  mustEscalateReasonablenessFlags: boolean;
  canApproveBudgetsForecastsStatements: false;
  canOverrideControllerDecisions: false;
  canConcludeOnAuditAreas: false;
  canSignOffAsEngagement: false;
  canFinalizeWorkpaperReviewSignOff: false;
  canMakeMaterialityOrScopeDecisions: false;
  canSignOffOnAuditOpinion: false;
  canConcludeOnEngagements: false;
  canMakeIndependenceOrEthicsDeterminations: false;
  canMakeMaterialityConclusions: false;
  externalCommunicationRequiresApproval: boolean;
}

export interface BuildRoleRestrictionInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  allowedTaskFamilies?: string[];
  forbiddenTaskFamilies?: string[];
  allowedEntityIds?: string[];
  forbiddenEntityIds?: string[];
  allowedAccountIds?: string[];
  forbiddenAccountIds?: string[];
  allowedDimensionIds?: string[];
  materialityThresholdReferenceIds?: string[];
  approvalThresholdReferenceIds?: string[];
  approvedSenderEmailAddresses?: string[];
  escalationTriggers?: string[];
  escalationTargetRoleType?: SyntheticRoleRestrictionEscalationTargetRoleType;
  canSubmitToERP?: boolean;
  canPostDirectly?: boolean;
  canGenerateJournalEntry?: boolean;
  canCommunicateExternally?: boolean;
  clientEmailEnabled?: boolean;
  scheduledDocumentCheckingEnabled?: boolean;
  materialityGateRequired?: boolean;
  humanDecisionRequired?: boolean;
  mustEscalateFraudFlags?: boolean;
  mustEscalateReasonablenessFlags?: boolean;
  externalCommunicationRequiresApproval?: boolean;
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

export interface SyntheticRoleRestriction {
  restrictionId: string;
  restrictionKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  allowedTaskFamilies: string[];
  forbiddenTaskFamilies: string[];
  allowedEntityIds: string[];
  forbiddenEntityIds: string[];
  allowedAccountIds: string[];
  forbiddenAccountIds: string[];
  allowedDimensionIds: string[];
  materialityThresholdReferenceIds: string[];
  approvalThresholdReferenceIds: string[];
  approvedSenderEmailAddresses: string[];
  escalationTriggers: string[];
  escalationTargetRoleType: SyntheticRoleRestrictionEscalationTargetRoleType;
  canSubmitToERP: boolean;
  canPostDirectly: boolean;
  canSelfApprove: false;
  canGenerateAuditOpinion: false;
  canSignOffAsReviewer: false;
  canSignOffAsApprover: false;
  canCommunicateExternally: boolean;
  clientEmailEnabled: boolean;
  clientEmailDefaultOff: true;
  scheduledDocumentCheckingEnabled: boolean;
  scheduledCheckingDefaultOff: true;
  canOverrideFraudDetection: false;
  canOverrideReasonablenessCheck: false;
  canModifyDeleteMoveFiles: false;
  canGenerateJournalEntry: boolean;
  mustEscalateFraudFlags: boolean;
  mustEscalateReasonablenessFlags: boolean;
  canApproveBudgetsForecastsStatements: false;
  canOverrideControllerDecisions: false;
  canConcludeOnAuditAreas: false;
  canSignOffAsEngagement: false;
  canFinalizeWorkpaperReviewSignOff: false;
  canMakeMaterialityOrScopeDecisions: false;
  canSignOffOnAuditOpinion: false;
  canConcludeOnEngagements: false;
  canMakeIndependenceOrEthicsDeterminations: false;
  canMakeMaterialityConclusions: false;
  externalCommunicationRequiresApproval: boolean;
  materialityGateRequired: boolean;
  humanDecisionRequired: boolean;
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

export interface BuildRoleRestrictionResult {
  roleRestriction: SyntheticRoleRestriction | null;
  skipped: boolean;
  warnings: string[];
}

const UNIVERSAL_ESCALATION_TRIGGERS = [
  "material_exception",
  "fraud_flag",
  "reasonableness_flag",
  "out_of_scope_request",
] as const;

const ROLE_RESTRICTION_DEFINITIONS: Record<SyntheticRoleType, RoleRestrictionDefinition> = {
  staff_accountant: {
    allowedTaskFamilies: ["reconciliations", "journal_entries", "close_execution", "fixed_assets", "inbox_delegation", "ad_hoc_request", "overnight_preparation"],
    forbiddenTaskFamilies: ["review_and_approval", "process_intelligence", "audit_and_evidence"],
    escalationTriggers: [...UNIVERSAL_ESCALATION_TRIGGERS],
    escalationTargetRoleType: "senior_accountant",
    canSubmitToERP: false,
    canPostDirectly: false,
    canGenerateJournalEntry: true,
    canCommunicateExternally: false,
    clientEmailEnabled: true,
    scheduledDocumentCheckingEnabled: true,
    materialityGateRequired: true,
    humanDecisionRequired: true,
    mustEscalateFraudFlags: true,
    mustEscalateReasonablenessFlags: true,
    canApproveBudgetsForecastsStatements: false,
    canOverrideControllerDecisions: false,
    canConcludeOnAuditAreas: false,
    canSignOffAsEngagement: false,
    canFinalizeWorkpaperReviewSignOff: false,
    canMakeMaterialityOrScopeDecisions: false,
    canSignOffOnAuditOpinion: false,
    canConcludeOnEngagements: false,
    canMakeIndependenceOrEthicsDeterminations: false,
    canMakeMaterialityConclusions: false,
    externalCommunicationRequiresApproval: false,
  },
  senior_accountant: {
    allowedTaskFamilies: ["reconciliations", "journal_entries", "close_execution", "fixed_assets", "reporting_and_analysis", "inbox_delegation", "review_and_approval", "ad_hoc_request", "overnight_preparation"],
    forbiddenTaskFamilies: ["process_intelligence", "audit_and_evidence"],
    escalationTriggers: [...UNIVERSAL_ESCALATION_TRIGGERS],
    escalationTargetRoleType: "controller_helper",
    canSubmitToERP: false,
    canPostDirectly: false,
    canGenerateJournalEntry: true,
    canCommunicateExternally: false,
    clientEmailEnabled: true,
    scheduledDocumentCheckingEnabled: true,
    materialityGateRequired: true,
    humanDecisionRequired: true,
    mustEscalateFraudFlags: true,
    mustEscalateReasonablenessFlags: true,
    canApproveBudgetsForecastsStatements: false,
    canOverrideControllerDecisions: false,
    canConcludeOnAuditAreas: false,
    canSignOffAsEngagement: false,
    canFinalizeWorkpaperReviewSignOff: false,
    canMakeMaterialityOrScopeDecisions: false,
    canSignOffOnAuditOpinion: false,
    canConcludeOnEngagements: false,
    canMakeIndependenceOrEthicsDeterminations: false,
    canMakeMaterialityConclusions: false,
    externalCommunicationRequiresApproval: false,
  },
  accounting_manager: {
    allowedTaskFamilies: ["reconciliations", "close_execution", "reporting_and_analysis", "inbox_delegation", "review_and_approval", "process_documentation", "ad_hoc_request", "overnight_preparation"],
    forbiddenTaskFamilies: ["audit_and_evidence"],
    escalationTriggers: [...UNIVERSAL_ESCALATION_TRIGGERS],
    escalationTargetRoleType: "controller_helper",
    canSubmitToERP: false,
    canPostDirectly: false,
    canGenerateJournalEntry: false,
    canCommunicateExternally: false,
    clientEmailEnabled: true,
    scheduledDocumentCheckingEnabled: true,
    materialityGateRequired: true,
    humanDecisionRequired: true,
    mustEscalateFraudFlags: true,
    mustEscalateReasonablenessFlags: true,
    canApproveBudgetsForecastsStatements: false,
    canOverrideControllerDecisions: false,
    canConcludeOnAuditAreas: false,
    canSignOffAsEngagement: false,
    canFinalizeWorkpaperReviewSignOff: false,
    canMakeMaterialityOrScopeDecisions: false,
    canSignOffOnAuditOpinion: false,
    canConcludeOnEngagements: false,
    canMakeIndependenceOrEthicsDeterminations: false,
    canMakeMaterialityConclusions: false,
    externalCommunicationRequiresApproval: false,
  },
  controller_helper: {
    allowedTaskFamilies: ["reconciliations", "close_execution", "reporting_and_analysis", "inbox_delegation", "review_and_approval", "process_documentation", "process_intelligence", "ad_hoc_request", "overnight_preparation"],
    forbiddenTaskFamilies: ["audit_and_evidence"],
    escalationTriggers: [...UNIVERSAL_ESCALATION_TRIGGERS],
    escalationTargetRoleType: "human_controller",
    canSubmitToERP: false,
    canPostDirectly: false,
    canGenerateJournalEntry: false,
    canCommunicateExternally: false,
    clientEmailEnabled: true,
    scheduledDocumentCheckingEnabled: true,
    materialityGateRequired: true,
    humanDecisionRequired: true,
    mustEscalateFraudFlags: true,
    mustEscalateReasonablenessFlags: true,
    canApproveBudgetsForecastsStatements: false,
    canOverrideControllerDecisions: false,
    canConcludeOnAuditAreas: false,
    canSignOffAsEngagement: false,
    canFinalizeWorkpaperReviewSignOff: false,
    canMakeMaterialityOrScopeDecisions: false,
    canSignOffOnAuditOpinion: false,
    canConcludeOnEngagements: false,
    canMakeIndependenceOrEthicsDeterminations: false,
    canMakeMaterialityConclusions: false,
    externalCommunicationRequiresApproval: false,
  },
  cfo_helper: {
    allowedTaskFamilies: ["reporting_and_analysis", "inbox_delegation", "process_documentation", "process_intelligence", "realization_sheet", "ad_hoc_request", "overnight_preparation"],
    forbiddenTaskFamilies: ["journal_entries"],
    escalationTriggers: [...UNIVERSAL_ESCALATION_TRIGGERS],
    escalationTargetRoleType: "human_cfo",
    canSubmitToERP: false,
    canPostDirectly: false,
    canGenerateJournalEntry: false,
    canCommunicateExternally: false,
    clientEmailEnabled: true,
    scheduledDocumentCheckingEnabled: true,
    materialityGateRequired: true,
    humanDecisionRequired: true,
    mustEscalateFraudFlags: true,
    mustEscalateReasonablenessFlags: true,
    canApproveBudgetsForecastsStatements: false,
    canOverrideControllerDecisions: false,
    canConcludeOnAuditAreas: false,
    canSignOffAsEngagement: false,
    canFinalizeWorkpaperReviewSignOff: false,
    canMakeMaterialityOrScopeDecisions: false,
    canSignOffOnAuditOpinion: false,
    canConcludeOnEngagements: false,
    canMakeIndependenceOrEthicsDeterminations: false,
    canMakeMaterialityConclusions: false,
    externalCommunicationRequiresApproval: false,
  },
  staff_auditor: {
    allowedTaskFamilies: ["audit_and_evidence", "inbox_delegation", "ad_hoc_request", "overnight_preparation"],
    forbiddenTaskFamilies: ["journal_entries", "review_and_approval", "process_intelligence"],
    escalationTriggers: [...UNIVERSAL_ESCALATION_TRIGGERS],
    escalationTargetRoleType: "senior_auditor",
    canSubmitToERP: false,
    canPostDirectly: false,
    canGenerateJournalEntry: false,
    canCommunicateExternally: false,
    clientEmailEnabled: false,
    scheduledDocumentCheckingEnabled: true,
    materialityGateRequired: true,
    humanDecisionRequired: true,
    mustEscalateFraudFlags: true,
    mustEscalateReasonablenessFlags: true,
    canApproveBudgetsForecastsStatements: false,
    canOverrideControllerDecisions: false,
    canConcludeOnAuditAreas: false,
    canSignOffAsEngagement: false,
    canFinalizeWorkpaperReviewSignOff: false,
    canMakeMaterialityOrScopeDecisions: false,
    canSignOffOnAuditOpinion: false,
    canConcludeOnEngagements: false,
    canMakeIndependenceOrEthicsDeterminations: false,
    canMakeMaterialityConclusions: false,
    externalCommunicationRequiresApproval: false,
  },
  senior_auditor: {
    allowedTaskFamilies: ["audit_and_evidence", "inbox_delegation", "review_and_approval", "ad_hoc_request", "overnight_preparation"],
    forbiddenTaskFamilies: ["journal_entries", "process_intelligence"],
    escalationTriggers: [...UNIVERSAL_ESCALATION_TRIGGERS],
    escalationTargetRoleType: "audit_manager_helper",
    canSubmitToERP: false,
    canPostDirectly: false,
    canGenerateJournalEntry: false,
    canCommunicateExternally: false,
    clientEmailEnabled: false,
    scheduledDocumentCheckingEnabled: true,
    materialityGateRequired: true,
    humanDecisionRequired: true,
    mustEscalateFraudFlags: true,
    mustEscalateReasonablenessFlags: true,
    canApproveBudgetsForecastsStatements: false,
    canOverrideControllerDecisions: false,
    canConcludeOnAuditAreas: false,
    canSignOffAsEngagement: false,
    canFinalizeWorkpaperReviewSignOff: false,
    canMakeMaterialityOrScopeDecisions: false,
    canSignOffOnAuditOpinion: false,
    canConcludeOnEngagements: false,
    canMakeIndependenceOrEthicsDeterminations: false,
    canMakeMaterialityConclusions: false,
    externalCommunicationRequiresApproval: false,
  },
  audit_manager_helper: {
    allowedTaskFamilies: ["audit_and_evidence", "inbox_delegation", "review_and_approval", "realization_sheet", "ad_hoc_request", "overnight_preparation"],
    forbiddenTaskFamilies: ["journal_entries", "process_intelligence"],
    escalationTriggers: [...UNIVERSAL_ESCALATION_TRIGGERS],
    escalationTargetRoleType: "human_audit_manager",
    canSubmitToERP: false,
    canPostDirectly: false,
    canGenerateJournalEntry: false,
    canCommunicateExternally: false,
    clientEmailEnabled: false,
    scheduledDocumentCheckingEnabled: true,
    materialityGateRequired: true,
    humanDecisionRequired: true,
    mustEscalateFraudFlags: true,
    mustEscalateReasonablenessFlags: true,
    canApproveBudgetsForecastsStatements: false,
    canOverrideControllerDecisions: false,
    canConcludeOnAuditAreas: false,
    canSignOffAsEngagement: false,
    canFinalizeWorkpaperReviewSignOff: false,
    canMakeMaterialityOrScopeDecisions: false,
    canSignOffOnAuditOpinion: false,
    canConcludeOnEngagements: false,
    canMakeIndependenceOrEthicsDeterminations: false,
    canMakeMaterialityConclusions: false,
    externalCommunicationRequiresApproval: true,
  },
  partner_helper: {
    allowedTaskFamilies: ["audit_and_evidence", "inbox_delegation", "review_and_approval", "realization_sheet", "ad_hoc_request", "overnight_preparation"],
    forbiddenTaskFamilies: ["journal_entries", "process_intelligence"],
    escalationTriggers: [...UNIVERSAL_ESCALATION_TRIGGERS],
    escalationTargetRoleType: "human_partner",
    canSubmitToERP: false,
    canPostDirectly: false,
    canGenerateJournalEntry: false,
    canCommunicateExternally: false,
    clientEmailEnabled: false,
    scheduledDocumentCheckingEnabled: true,
    materialityGateRequired: true,
    humanDecisionRequired: true,
    mustEscalateFraudFlags: true,
    mustEscalateReasonablenessFlags: true,
    canApproveBudgetsForecastsStatements: false,
    canOverrideControllerDecisions: false,
    canConcludeOnAuditAreas: false,
    canSignOffAsEngagement: false,
    canFinalizeWorkpaperReviewSignOff: false,
    canMakeMaterialityOrScopeDecisions: false,
    canSignOffOnAuditOpinion: false,
    canConcludeOnEngagements: false,
    canMakeIndependenceOrEthicsDeterminations: false,
    canMakeMaterialityConclusions: false,
    externalCommunicationRequiresApproval: true,
  },
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getDefinition(roleType: SyntheticRoleType | undefined): RoleRestrictionDefinition | null {
  return roleType ? ROLE_RESTRICTION_DEFINITIONS[roleType] ?? null : null;
}

function getBoundPhase38SnapshotHash(input: BuildRoleRestrictionInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildRoleRestrictionInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildRoleRestrictionInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildRoleRestrictionInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildRoleRestrictionInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildRoleRestrictionInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildRoleRestrictionInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildRoleRestrictionInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildRoleRestrictionInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function collectMissingRequiredIdentifiers(input: BuildRoleRestrictionInput): string[] {
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

function buildDerivationHash(input: BuildRoleRestrictionInput, definition: RoleRestrictionDefinition): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    allowedTaskFamilies: input.allowedTaskFamilies ?? definition.allowedTaskFamilies,
    forbiddenTaskFamilies: input.forbiddenTaskFamilies ?? definition.forbiddenTaskFamilies,
    allowedEntityIds: getInputArray(input.allowedEntityIds),
    forbiddenEntityIds: getInputArray(input.forbiddenEntityIds),
    allowedAccountIds: getInputArray(input.allowedAccountIds),
    forbiddenAccountIds: getInputArray(input.forbiddenAccountIds),
    allowedDimensionIds: getInputArray(input.allowedDimensionIds),
    materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
    approvalThresholdReferenceIds: getInputArray(input.approvalThresholdReferenceIds),
    approvedSenderEmailAddresses: getInputArray(input.approvedSenderEmailAddresses),
    escalationTriggers: input.escalationTriggers ?? definition.escalationTriggers,
    escalationTargetRoleType: input.escalationTargetRoleType ?? definition.escalationTargetRoleType,
    canSubmitToERP: input.canSubmitToERP ?? definition.canSubmitToERP,
    canPostDirectly: input.canPostDirectly ?? definition.canPostDirectly,
    canGenerateJournalEntry: input.canGenerateJournalEntry ?? definition.canGenerateJournalEntry,
    canCommunicateExternally: input.canCommunicateExternally ?? definition.canCommunicateExternally,
    clientEmailEnabled: input.clientEmailEnabled ?? definition.clientEmailEnabled,
    scheduledDocumentCheckingEnabled:
      input.scheduledDocumentCheckingEnabled ?? definition.scheduledDocumentCheckingEnabled,
    materialityGateRequired: input.materialityGateRequired ?? definition.materialityGateRequired,
    humanDecisionRequired: input.humanDecisionRequired ?? definition.humanDecisionRequired,
    mustEscalateFraudFlags: input.mustEscalateFraudFlags ?? definition.mustEscalateFraudFlags,
    mustEscalateReasonablenessFlags:
      input.mustEscalateReasonablenessFlags ?? definition.mustEscalateReasonablenessFlags,
    externalCommunicationRequiresApproval:
      input.externalCommunicationRequiresApproval ?? definition.externalCommunicationRequiresApproval,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildRoleRestriction(input: BuildRoleRestrictionInput): BuildRoleRestrictionResult {
  const warnings = [...getInputArray(input.warnings)];
  const definition = getDefinition(input.roleType);

  if (!input.roleType || !definition) {
    return {
      roleRestriction: null,
      skipped: true,
      warnings: [...warnings, "missing roleType or unsupported roleType"],
    };
  }

  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      roleRestriction: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType;
  const roleInstanceId = input.roleInstanceId as string;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const derivationHash = buildDerivationHash(input, definition);
  const restrictionKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const restrictionId = stableSnapshotHash({
    restrictionKey,
    artifactType: "SyntheticRoleRestriction",
  });

  return {
    roleRestriction: {
      restrictionId,
      restrictionKey,
      roleType,
      roleInstanceId,
      allowedTaskFamilies: input.allowedTaskFamilies ?? definition.allowedTaskFamilies,
      forbiddenTaskFamilies: input.forbiddenTaskFamilies ?? definition.forbiddenTaskFamilies,
      allowedEntityIds: getInputArray(input.allowedEntityIds),
      forbiddenEntityIds: getInputArray(input.forbiddenEntityIds),
      allowedAccountIds: getInputArray(input.allowedAccountIds),
      forbiddenAccountIds: getInputArray(input.forbiddenAccountIds),
      allowedDimensionIds: getInputArray(input.allowedDimensionIds),
      materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
      approvalThresholdReferenceIds: getInputArray(input.approvalThresholdReferenceIds),
      approvedSenderEmailAddresses: getInputArray(input.approvedSenderEmailAddresses),
      escalationTriggers: input.escalationTriggers ?? definition.escalationTriggers,
      escalationTargetRoleType: input.escalationTargetRoleType ?? definition.escalationTargetRoleType,
      canSubmitToERP: input.canSubmitToERP ?? definition.canSubmitToERP,
      canPostDirectly: input.canPostDirectly ?? definition.canPostDirectly,
      canSelfApprove: false,
      canGenerateAuditOpinion: false,
      canSignOffAsReviewer: false,
      canSignOffAsApprover: false,
      canCommunicateExternally: input.canCommunicateExternally ?? definition.canCommunicateExternally,
      clientEmailEnabled: input.clientEmailEnabled ?? definition.clientEmailEnabled,
      clientEmailDefaultOff: true,
      scheduledDocumentCheckingEnabled:
        input.scheduledDocumentCheckingEnabled ?? definition.scheduledDocumentCheckingEnabled,
      scheduledCheckingDefaultOff: true,
      canOverrideFraudDetection: false,
      canOverrideReasonablenessCheck: false,
      canModifyDeleteMoveFiles: false,
      canGenerateJournalEntry: input.canGenerateJournalEntry ?? definition.canGenerateJournalEntry,
      mustEscalateFraudFlags: input.mustEscalateFraudFlags ?? definition.mustEscalateFraudFlags,
      mustEscalateReasonablenessFlags:
        input.mustEscalateReasonablenessFlags ?? definition.mustEscalateReasonablenessFlags,
      canApproveBudgetsForecastsStatements: false,
      canOverrideControllerDecisions: false,
      canConcludeOnAuditAreas: false,
      canSignOffAsEngagement: false,
      canFinalizeWorkpaperReviewSignOff: false,
      canMakeMaterialityOrScopeDecisions: false,
      canSignOffOnAuditOpinion: false,
      canConcludeOnEngagements: false,
      canMakeIndependenceOrEthicsDeterminations: false,
      canMakeMaterialityConclusions: false,
      externalCommunicationRequiresApproval:
        input.externalCommunicationRequiresApproval ?? definition.externalCommunicationRequiresApproval,
      materialityGateRequired: input.materialityGateRequired ?? definition.materialityGateRequired,
      humanDecisionRequired: input.humanDecisionRequired ?? definition.humanDecisionRequired,
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
