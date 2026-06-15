import type { Phase39ExecutionHandoff, SyntheticActionHandoffPackage } from "../../actions/action-handoff-package";
import type { SyntheticPhase38AuditPackage } from "../../actions/phase38-audit";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";

export type SyntheticRoleType =
  | "staff_accountant"
  | "senior_accountant"
  | "accounting_manager"
  | "controller_helper"
  | "cfo_helper"
  | "staff_auditor"
  | "senior_auditor"
  | "audit_manager_helper"
  | "partner_helper";

export type SyntheticRoleStatus = "inactive" | "activating" | "active" | "suspended" | "deactivated";

export type SyntheticRoleTaskSourceType = "email" | "workflow" | "scheduled" | "manual" | "pulse_queue";

export type SyntheticAdHocRequestSource = "email" | "pulse_quick_request";

export type SyntheticAdHocRequestIntakeType = "email" | "pulse_quick_request" | "both";

export type SyntheticAdHocComplexityLevel = "immediate" | "overnight";

export type SyntheticAdHocExecutionStatus = "pending" | "executing" | "completed" | "declined" | "flagged_for_review";

export type SyntheticRoleErpConnectionType = "quickbooks" | "xero" | "netsuite" | "sage" | "dynamics" | "csv" | "other";

export type SyntheticRoleErpConnectionStatus = "pending" | "connected" | "failed";

export type SyntheticRoleActivationType = "new_customer" | "existing_customer";

export type SyntheticPulseQueueStatus = "draft" | "confirmed" | "processing" | "completed";

export type SyntheticDocumentConnectorType =
  | "sharepoint"
  | "onedrive"
  | "google_drive"
  | "cch_engagement"
  | "caseware"
  | "suralink"
  | "auditfile"
  | "email_attachment"
  | "custom";

export type SyntheticDocumentCheckingMode = "scheduled" | "triggered" | "both";

export type SyntheticDriveOutputFileType = "pdf" | "excel" | "word" | "csv" | "image" | "visio" | "powerpoint" | "other";

export type SyntheticDriveStorageEnvironment = "sharepoint" | "onedrive" | "google_drive" | "other";

export interface SyntheticRoleBaseContract {
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  executable: false;
  executionReady: boolean;
}

export interface SyntheticPhase38RoleHandoffConsumptionContract extends SyntheticRoleBaseContract {
  phase38HandoffHandle: string;
  phase38ActionHandoffHandle: string;
  phase38ExecutionHandoffHandle: string;
  boundPhase38SnapshotHash: string;
  boundPhase37SnapshotHash: string;
  phase38ActionHandoffPackageReference?: SyntheticActionHandoffPackage;
  phase38ExecutionHandoffReference?: Phase39ExecutionHandoff;
  phase38AuditPackageReference?: SyntheticPhase38AuditPackage;
}

export interface SyntheticRoleTemplateContract extends SyntheticRoleBaseContract {
  roleTemplateId: string;
  roleTemplateKey: string;
  roleType: SyntheticRoleType;
  roleDisplayName: string;
  adHocRequestSupported: true;
  adHocRequestIntakeTypes: SyntheticAdHocRequestIntakeType;
}

export interface SyntheticRoleInstanceContract extends SyntheticRoleBaseContract {
  roleInstanceId: string;
  roleInstanceKey: string;
  roleTemplateId: string;
  roleTemplateKey: string;
  roleType: SyntheticRoleType;
  roleStatus: SyntheticRoleStatus;
  roleEmailInbox: string;
  roleDisplayName: string;
  assignedCompanyId: string;
  assignedFirmId: string;
  assignedEngagementId: string;
}

export interface SyntheticCapabilityTaxonomyEntryContract extends SyntheticRoleBaseContract {
  capabilityId: string;
  capabilityKey: string;
  capabilityFamily: string;
  roleApplicability: SyntheticRoleType[];
  taskFamily: string;
  inputsRequired: string[];
  outputType: string;
  evidenceRequirements: string[];
  reviewLevel: string;
  materialitySensitivity: string;
  canGenerateJournalEntry: boolean;
  canBeInitiatedByEmail: boolean;
  canBeFullyAutomated: boolean;
  requiresReviewerIntervention: boolean;
}

export interface SyntheticRoleRestrictionContract extends SyntheticRoleBaseContract {
  restrictionId: string;
  restrictionKey: string;
  allowedTaskFamilies: string[];
  forbiddenTaskFamilies: string[];
  allowedEntityIds: string[];
  allowedAccountIds: string[];
  allowedDimensionIds: string[];
  materialityThresholdReferenceIds: string[];
  approvalThresholdReferenceIds: string[];
  approvedSenderEmailAddresses: string[];
  canSubmitToERP: boolean;
  canPostDirectly: boolean;
  clientEmailEnabled: boolean;
  scheduledDocumentCheckingEnabled: boolean;
  documentCheckingScheduleReferenceIds: string[];
}

export interface SyntheticRoleApprovalPolicyMetadataContract extends SyntheticRoleBaseContract {
  approvalPolicyId: string;
  approvalPolicyKey: string;
  approvalRequired: boolean;
  approvalQuorumRequired: boolean;
  segregationOfDutiesRequired: boolean;
  selfApprovalProhibited: true;
  auditOpinionProhibited: true;
  reviewerSignOffProhibited: true;
  approverSignOffProhibited: true;
  materialityGateRequired: boolean;
  humanDecisionRequired: boolean;
}

export interface SyntheticRoleExecutionAuditLogMetadataContract extends SyntheticRoleBaseContract {
  auditLogId: string;
  auditLogKey: string;
  roleInstanceId: string;
  taskSourceType: SyntheticRoleTaskSourceType;
  taskSourceReference: string;
  evidenceReferenceIds: string[];
  rulesApplied: string[];
  reasonablenessCheckResult: string;
  fraudDetectionCheckResult: string;
  outputsGenerated: string[];
  approvalActions: string[];
  erpStatusChanges: string[];
  declineReasons: string[];
  warningReasons: string[];
  overrideReasons: string[];
  clientEmailsSent: string[];
  driveOutputPlacements: string[];
  auditLogCreatedAt: string;
}

export interface SyntheticAdHocRequestMetadataContract extends SyntheticRoleBaseContract {
  adHocRequestId: string;
  adHocRequestKey: string;
  adHocRequestSource: SyntheticAdHocRequestSource;
  adHocRequestContent: string;
  adHocRequesterId: string;
  adHocRequesterEmail: string;
  adHocRequestTimestamp: string;
  adHocClassificationResult: string;
  adHocCapabilityMatch: boolean;
  adHocRestrictionCheck: boolean;
  adHocAuthorizationCheck: boolean;
  adHocComplexityLevel: SyntheticAdHocComplexityLevel;
  adHocJournalEntryRequired: boolean;
  adHocExecutionStatus: SyntheticAdHocExecutionStatus;
  adHocDeclineReason: string;
  adHocSuggestedAlternativeRoleType: SyntheticRoleType;
  adHocOutputReferenceIds: string[];
  adHocAuditLogReferenceId: string;
  adHocRestrictionOverrideProhibited: true;
  adHocGovernanceBypassProhibited: true;
  adHocPermissionGrantProhibited: true;
  adHocPermanentAuditLoggingRequired: true;
  adHocDeclineReasonPreservationRequired: true;
  adHocMaterialRequestHumanReviewRequired: true;
}

export interface SyntheticRapidOnboardingRoleActivationMetadataContract extends SyntheticRoleBaseContract {
  onboardingSessionId: string;
  onboardingSessionKey: string;
  onboardingStartedAt: string;
  onboardingCompletedAt: string;
  onboardingDurationSeconds: number;
  onboardingUnder15MinutesGate: boolean;
  erpConnectionType: SyntheticRoleErpConnectionType;
  erpConnectionStatus: SyntheticRoleErpConnectionStatus;
  chartOfAccountsIngested: boolean;
  historyIngested: boolean;
  methodologyDerived: boolean;
  roleActivationType: SyntheticRoleActivationType;
  newCustomerActivationUnder15MinutesGate: boolean;
  existingCustomerActivationUnder3MinutesGate: boolean;
  roleActivationCompletedAt: string;
}

export interface SyntheticRoleDashboardTaskQueueMetadataContract extends SyntheticRoleBaseContract {
  taskQueueId: string;
  taskQueueKey: string;
  assignedTasks: string[];
  inProgressTasks: string[];
  completedTasks: string[];
  declinedTasks: string[];
  taskQueueStatus: string;
  overnightScheduleEnabled: boolean;
  overnightScheduleTime: string;
  morningScheduleTime: string;
  taskScheduledAt: string;
  taskCompletedAt: string;
}

export interface SyntheticPulseOvernightQueueMetadataContract extends SyntheticRoleBaseContract {
  pulseQueueId: string;
  pulseQueueKey: string;
  pulseQueueAssignedAt: string;
  pulseQueueConfirmedAt: string;
  pulseQueueAssignedByUserId: string;
  pulseQueueTargetRoleInstanceId: string;
  suggestedTaskReferenceIds: string[];
  confirmedTaskReferenceIds: string[];
  removedTaskReferenceIds: string[];
  customTaskDescriptions: string[];
  pulseQueueStatus: SyntheticPulseQueueStatus;
  pulseQueueCompletedAt: string;
  morningReviewReady: boolean;
}

export interface SyntheticPulseCommandCenterMetadataContract extends SyntheticRoleBaseContract {
  activeRoleStatuses: string[];
  overnightQueueStatuses: string[];
  completedOvernightOutputReferenceIds: string[];
  declinedOvernightOutputReferenceIds: string[];
  warningsFlaggedOvernightReferenceIds: string[];
  exceptionsFlaggedOvernightReferenceIds: string[];
  morningReviewSummaryReferenceId: string;
}

export interface SyntheticEmailDocumentConnectorGovernanceContract extends SyntheticRoleBaseContract {
  connectorId: string;
  connectorKey: string;
  connectorType: SyntheticDocumentConnectorType;
  documentCheckingMode: SyntheticDocumentCheckingMode;
  scheduledCheckingEnabled: boolean;
  scheduledCheckingDefaultOff: true;
  triggeredCheckingEnabled: boolean;
  clientEmailEnabled: boolean;
  clientEmailDefaultOff: true;
  clientEmailApprovedTemplateIds: string[];
  clientEmailApprovedSenderAddress: string;
  seniorOrManagerAlwaysCopied: true;
}

export interface SyntheticDriveOutputMetadataContract extends SyntheticRoleBaseContract {
  driveOutputId: string;
  driveOutputKey: string;
  outputFileType: SyntheticDriveOutputFileType;
  designatedOutputFolderPath: string;
  storageEnvironment: SyntheticDriveStorageEnvironment;
  placementConfirmed: boolean;
  placementTimestamp: string;
  readAccessEnabled: boolean;
  readAccessFolderPaths: string[];
  writeAccessEnabled: boolean;
  writeAccessFolderPaths: string[];
  modifyDeleteMoveProhibited: true;
}

export interface SyntheticJournalWorkpaperShellReferencesContract extends SyntheticRoleBaseContract {
  journalEntryCandidateReferenceIds: string[];
  leadSheetReferenceIds: string[];
  supportPackageReferenceIds: string[];
  workpaperPackageReferenceIds: string[];
  erpSubmissionReferenceIds: string[];
}

export interface SyntheticProcessDocumentationCosoMetadataContract extends SyntheticRoleBaseContract {
  processDocumentationId: string;
  processDocumentationKey: string;
  cosoComponentMappingEnabled: boolean;
  cosoPrincipleMappingEnabled: boolean;
  soxMappingModeEnabled: boolean;
  keyControlIdentified: boolean;
  segregationOfDutiesGapsIdentified: boolean;
  processIntelligenceEnabled: boolean;
  controllerPersonaSurfacingOnly: true;
  cfoPersonaSurfacingOnly: true;
  staffRoleSurfacingProhibited: true;
}

export interface SyntheticPhase39LockMarkersContract extends SyntheticRoleBaseContract {
  phase39ModulesCompleted: string[];
  phase39VerifierPassed: boolean;
  phase39TypeScriptPassed: boolean;
  phase39LockHash: string;
  phase39LockedAt: string;
}
