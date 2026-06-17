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

export type SyntheticCfoHelperAssignedCapability =
  | "board_presentation_update"
  | "investor_summary_preparation"
  | "management_discussion_analysis_drafting"
  | "board_package_assembly"
  | "kpi_dashboard_update"
  | "cash_forecast_scenario_preparation"
  | "variance_analysis_preparation"
  | "covenant_compliance_summary_preparation"
  | "lender_reporting_preparation"
  | "firm_wide_realization_summary_preparation";

export interface BuildCfoHelperRoleInput {
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  roleTemplateReferenceId?: string;
  capabilityReferenceIds?: string[];
  restrictionReferenceId?: string;
  governanceReferenceId?: string;
  approvalPolicyReferenceId?: string;
  auditLogReferenceId?: string;
  onboardingSessionReferenceId?: string;
  roleActivationReferenceId?: string;
  taskQueueReferenceId?: string;
  overnightScheduleReferenceId?: string;
  emailIntakeReferenceId?: string;
  pulseQueueReferenceId?: string;
  driveOutputReferenceId?: string;
  folderMappingReferenceId?: string;
  assignedCapabilities?: SyntheticCfoHelperAssignedCapability[];
  companyCfoCommercialPositioningNote?: string;
  fractionalCfoCommercialPositioningNote?: string;
  roleCompositionComplete?: boolean;
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

export interface SyntheticCfoHelperRole {
  cfoHelperRoleId: string;
  cfoHelperRoleKey: string;
  roleType: "cfo_helper";
  roleInstanceId: string;
  roleTemplateReferenceId: string;
  capabilityReferenceIds: string[];
  restrictionReferenceId: string;
  governanceReferenceId: string;
  approvalPolicyReferenceId: string;
  auditLogReferenceId: string;
  onboardingSessionReferenceId: string;
  roleActivationReferenceId: string;
  taskQueueReferenceId: string;
  overnightScheduleReferenceId: string;
  emailIntakeReferenceId: string;
  pulseQueueReferenceId: string;
  driveOutputReferenceId: string;
  folderMappingReferenceId: string;
  assignedCapabilities: SyntheticCfoHelperAssignedCapability[];
  canGenerateJournalEntry: false;
  canUpdateBoardPresentations: true;
  canPrepareInvestorSummaries: true;
  canDraftManagementDiscussionAnalysis: true;
  canAssembleBoardPackages: true;
  canUpdateKpiDashboards: true;
  canPrepareCashForecastScenarios: true;
  canPrepareVarianceAnalysis: true;
  canPrepareCovenantComplianceSummary: true;
  canPrepareLenderReporting: true;
  canPrepareFirmWideRealizationSummary: true;
  canBeInitiatedByEmail: true;
  canBeInitiatedByPulse: true;
  supportsAdHocRequest: true;
  supportsOvernightProcessing: true;
  canPostDirectly: false;
  canSubmitToERP: false;
  canSelfApprove: false;
  canMakeFinalFinancialDecisions: false;
  canCommunicateWithBoardInvestorsLendersWithoutApproval: false;
  canApproveBudgetsForecastsStatements: false;
  canOverrideControllerDecisions: false;
  canCommunicateExternally: false;
  auditOpinionProhibited: true;
  escalationTargetRoleType: "human_cfo";
  requiresWorkpaperOnEveryOutput: true;
  requiresSupportPackageOnEveryOutput: true;
  allOutputsArePreparationAndDraftingOnly: true;
  cfoReviewsEditsApprovesBeforeExternalUse: true;
  companyCfoCommercialPositioningNote: string;
  fractionalCfoCommercialPositioningNote: string;
  roleCompositionComplete: boolean;
  isNotReplacementForHuman: true;
  humanCfoReviewsAndDecides: true;
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

export interface BuildCfoHelperRoleResult {
  cfoHelperRole: SyntheticCfoHelperRole | null;
  skipped: boolean;
  warnings: string[];
}

export const CFO_HELPER_ASSIGNED_CAPABILITIES: SyntheticCfoHelperAssignedCapability[] = [
  "board_presentation_update",
  "investor_summary_preparation",
  "management_discussion_analysis_drafting",
  "board_package_assembly",
  "kpi_dashboard_update",
  "cash_forecast_scenario_preparation",
  "variance_analysis_preparation",
  "covenant_compliance_summary_preparation",
  "lender_reporting_preparation",
  "firm_wide_realization_summary_preparation",
];

export const CFO_HELPER_COMPANY_CFO_COMMERCIAL_POSITIONING_NOTE =
  "What if your morning started with everything already prepared and you spent your day deciding instead of preparing.";

export const CFO_HELPER_FRACTIONAL_CFO_COMMERCIAL_POSITIONING_NOTE =
  "Serve eight clients without working eighty hours.";

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildCfoHelperRoleInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildCfoHelperRoleInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildCfoHelperRoleInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildCfoHelperRoleInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildCfoHelperRoleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildCfoHelperRoleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildCfoHelperRoleInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildCfoHelperRoleInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildCfoHelperRoleInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getAssignedCapabilities(input: BuildCfoHelperRoleInput): SyntheticCfoHelperAssignedCapability[] {
  return input.assignedCapabilities ?? CFO_HELPER_ASSIGNED_CAPABILITIES;
}

function getCompanyCfoCommercialPositioningNote(input: BuildCfoHelperRoleInput): string {
  return input.companyCfoCommercialPositioningNote ?? CFO_HELPER_COMPANY_CFO_COMMERCIAL_POSITIONING_NOTE;
}

function getFractionalCfoCommercialPositioningNote(input: BuildCfoHelperRoleInput): string {
  return input.fractionalCfoCommercialPositioningNote ?? CFO_HELPER_FRACTIONAL_CFO_COMMERCIAL_POSITIONING_NOTE;
}

function getRoleCompositionComplete(input: BuildCfoHelperRoleInput): boolean {
  if (input.roleCompositionComplete !== undefined) {
    return input.roleCompositionComplete;
  }

  return (
    hasValue(input.roleInstanceId) &&
    hasValue(input.roleTemplateReferenceId) &&
    hasValue(input.governanceReferenceId) &&
    hasValue(input.restrictionReferenceId) &&
    getInputArray(input.capabilityReferenceIds).length > 0
  );
}

function collectMissingRequiredIdentifiers(input: BuildCfoHelperRoleInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.roleTemplateReferenceId)) {
    missing.push("roleTemplateReferenceId");
  }

  if (!hasValue(input.governanceReferenceId)) {
    missing.push("governanceReferenceId");
  }

  if (!hasValue(input.restrictionReferenceId)) {
    missing.push("restrictionReferenceId");
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

function buildDerivationHash(input: BuildCfoHelperRoleInput): string {
  return stableSnapshotHash({
    roleType: "cfo_helper",
    roleInstanceId: input.roleInstanceId,
    roleTemplateReferenceId: input.roleTemplateReferenceId ?? "",
    capabilityReferenceIds: getInputArray(input.capabilityReferenceIds),
    restrictionReferenceId: input.restrictionReferenceId ?? "",
    governanceReferenceId: input.governanceReferenceId ?? "",
    approvalPolicyReferenceId: input.approvalPolicyReferenceId ?? "",
    auditLogReferenceId: input.auditLogReferenceId ?? "",
    onboardingSessionReferenceId: input.onboardingSessionReferenceId ?? "",
    roleActivationReferenceId: input.roleActivationReferenceId ?? "",
    taskQueueReferenceId: input.taskQueueReferenceId ?? "",
    overnightScheduleReferenceId: input.overnightScheduleReferenceId ?? "",
    emailIntakeReferenceId: input.emailIntakeReferenceId ?? "",
    pulseQueueReferenceId: input.pulseQueueReferenceId ?? "",
    driveOutputReferenceId: input.driveOutputReferenceId ?? "",
    folderMappingReferenceId: input.folderMappingReferenceId ?? "",
    assignedCapabilities: getAssignedCapabilities(input),
    canGenerateJournalEntry: false,
    canUpdateBoardPresentations: true,
    canPrepareInvestorSummaries: true,
    canDraftManagementDiscussionAnalysis: true,
    canAssembleBoardPackages: true,
    canUpdateKpiDashboards: true,
    canPrepareCashForecastScenarios: true,
    canPrepareVarianceAnalysis: true,
    canPrepareCovenantComplianceSummary: true,
    canPrepareLenderReporting: true,
    canPrepareFirmWideRealizationSummary: true,
    canBeInitiatedByEmail: true,
    canBeInitiatedByPulse: true,
    supportsAdHocRequest: true,
    supportsOvernightProcessing: true,
    canPostDirectly: false,
    canSubmitToERP: false,
    canSelfApprove: false,
    canMakeFinalFinancialDecisions: false,
    canCommunicateWithBoardInvestorsLendersWithoutApproval: false,
    canApproveBudgetsForecastsStatements: false,
    canOverrideControllerDecisions: false,
    canCommunicateExternally: false,
    auditOpinionProhibited: true,
    escalationTargetRoleType: "human_cfo",
    requiresWorkpaperOnEveryOutput: true,
    requiresSupportPackageOnEveryOutput: true,
    allOutputsArePreparationAndDraftingOnly: true,
    cfoReviewsEditsApprovesBeforeExternalUse: true,
    companyCfoCommercialPositioningNote: getCompanyCfoCommercialPositioningNote(input),
    fractionalCfoCommercialPositioningNote: getFractionalCfoCommercialPositioningNote(input),
    roleCompositionComplete: getRoleCompositionComplete(input),
    isNotReplacementForHuman: true,
    humanCfoReviewsAndDecides: true,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildCfoHelperRole(input: BuildCfoHelperRoleInput): BuildCfoHelperRoleResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      cfoHelperRole: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleInstanceId = input.roleInstanceId as string;
  const roleTemplateReferenceId = input.roleTemplateReferenceId as string;
  const restrictionReferenceId = input.restrictionReferenceId as string;
  const governanceReferenceId = input.governanceReferenceId as string;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const roleCompositionComplete = getRoleCompositionComplete(input);
  const derivationHash = buildDerivationHash(input);
  const cfoHelperRoleKey = stableSnapshotHash({
    roleType: "cfo_helper",
    roleInstanceId,
    companyId,
    roleTemplateReferenceId,
    restrictionReferenceId,
    governanceReferenceId,
    capabilityReferenceIds: getInputArray(input.capabilityReferenceIds),
    roleCompositionComplete,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const cfoHelperRoleId = stableSnapshotHash({
    cfoHelperRoleKey,
    artifactType: "SyntheticCfoHelperRole",
  });

  return {
    cfoHelperRole: {
      cfoHelperRoleId,
      cfoHelperRoleKey,
      roleType: "cfo_helper",
      roleInstanceId,
      roleTemplateReferenceId,
      capabilityReferenceIds: getInputArray(input.capabilityReferenceIds),
      restrictionReferenceId,
      governanceReferenceId,
      approvalPolicyReferenceId: input.approvalPolicyReferenceId ?? "",
      auditLogReferenceId: input.auditLogReferenceId ?? "",
      onboardingSessionReferenceId: input.onboardingSessionReferenceId ?? "",
      roleActivationReferenceId: input.roleActivationReferenceId ?? "",
      taskQueueReferenceId: input.taskQueueReferenceId ?? "",
      overnightScheduleReferenceId: input.overnightScheduleReferenceId ?? "",
      emailIntakeReferenceId: input.emailIntakeReferenceId ?? "",
      pulseQueueReferenceId: input.pulseQueueReferenceId ?? "",
      driveOutputReferenceId: input.driveOutputReferenceId ?? "",
      folderMappingReferenceId: input.folderMappingReferenceId ?? "",
      assignedCapabilities: getAssignedCapabilities(input),
      canGenerateJournalEntry: false,
      canUpdateBoardPresentations: true,
      canPrepareInvestorSummaries: true,
      canDraftManagementDiscussionAnalysis: true,
      canAssembleBoardPackages: true,
      canUpdateKpiDashboards: true,
      canPrepareCashForecastScenarios: true,
      canPrepareVarianceAnalysis: true,
      canPrepareCovenantComplianceSummary: true,
      canPrepareLenderReporting: true,
      canPrepareFirmWideRealizationSummary: true,
      canBeInitiatedByEmail: true,
      canBeInitiatedByPulse: true,
      supportsAdHocRequest: true,
      supportsOvernightProcessing: true,
      canPostDirectly: false,
      canSubmitToERP: false,
      canSelfApprove: false,
      canMakeFinalFinancialDecisions: false,
      canCommunicateWithBoardInvestorsLendersWithoutApproval: false,
      canApproveBudgetsForecastsStatements: false,
      canOverrideControllerDecisions: false,
      canCommunicateExternally: false,
      auditOpinionProhibited: true,
      escalationTargetRoleType: "human_cfo",
      requiresWorkpaperOnEveryOutput: true,
      requiresSupportPackageOnEveryOutput: true,
      allOutputsArePreparationAndDraftingOnly: true,
      cfoReviewsEditsApprovesBeforeExternalUse: true,
      companyCfoCommercialPositioningNote: getCompanyCfoCommercialPositioningNote(input),
      fractionalCfoCommercialPositioningNote: getFractionalCfoCommercialPositioningNote(input),
      roleCompositionComplete,
      isNotReplacementForHuman: true,
      humanCfoReviewsAndDecides: true,
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
