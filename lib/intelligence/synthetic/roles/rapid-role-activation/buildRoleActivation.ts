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

export type SyntheticRoleActivationType = "new_customer";

export type SyntheticRoleActivationStep =
  | "step_1_account_creation"
  | "step_2_erp_oauth_connection"
  | "step_3_history_ingestion"
  | "step_4_chart_of_accounts_mapping"
  | "step_5_methodology_derivation"
  | "step_6_role_permissions_configuration"
  | "step_7_materiality_thresholds_configuration"
  | "step_8_role_email_inbox_provisioning"
  | "step_9_first_task_ready"
  | "step_10_activation_complete";

export type SyntheticRoleActivationProgressDisplayState =
  | "ingesting_company_history"
  | "mapping_chart_of_accounts"
  | "deriving_close_methodology"
  | "configuring_role_permissions"
  | "provisioning_role_inbox"
  | "role_ready";

export type SyntheticRoleActivationStepStatus = "pending" | "in_progress" | "completed" | "failed" | "skipped";

export type SyntheticRoleActivationStepStatuses = Partial<
  Record<SyntheticRoleActivationStep, SyntheticRoleActivationStepStatus>
>;

export interface BuildRoleActivationInput {
  roleActivationType?: SyntheticRoleActivationType;
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  roleTemplateId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  onboardingSessionReferenceId?: string;
  activationStartedAt?: string;
  activationCompletedAt?: string;
  activationDurationSeconds?: number;
  activationStepSequence?: SyntheticRoleActivationStep[];
  activationCurrentStep?: SyntheticRoleActivationStep;
  activationStepStatuses?: SyntheticRoleActivationStepStatuses;
  erpConnectionReferenceId?: string;
  chartOfAccountsMappingReferenceId?: string;
  historyIngestionReferenceId?: string;
  methodologyDerivationReferenceId?: string;
  rolePermissionsConfigured?: boolean;
  rolePermissionsReferenceId?: string;
  materialityThresholdsConfigured?: boolean;
  materialityThresholdReferenceIds?: string[];
  roleEmailInboxProvisioned?: boolean;
  roleEmailInbox?: string;
  roleRestrictionReferenceId?: string;
  roleGovernanceReferenceId?: string;
  roleCapabilityReferenceIds?: string[];
  firstTaskReady?: boolean;
  activationProgressDisplayStates?: SyntheticRoleActivationProgressDisplayState[];
  activationFailureReason?: string;
  activationRetryCount?: number;
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

export interface SyntheticRoleActivation {
  roleActivationId: string;
  roleActivationKey: string;
  roleActivationType: SyntheticRoleActivationType;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  roleTemplateId: string;
  onboardingSessionReferenceId: string;
  activationStartedAt: string;
  activationCompletedAt: string;
  activationDurationSeconds: number;
  newCustomerActivationUnder15MinutesGate: boolean;
  activationStepSequence: SyntheticRoleActivationStep[];
  activationCurrentStep: SyntheticRoleActivationStep;
  activationStepStatuses: SyntheticRoleActivationStepStatuses;
  erpConnectionReferenceId: string;
  chartOfAccountsMappingReferenceId: string;
  historyIngestionReferenceId: string;
  methodologyDerivationReferenceId: string;
  rolePermissionsConfigured: boolean;
  rolePermissionsReferenceId: string;
  materialityThresholdsConfigured: boolean;
  materialityThresholdReferenceIds: string[];
  roleEmailInboxProvisioned: boolean;
  roleEmailInbox: string;
  roleRestrictionReferenceId: string;
  roleGovernanceReferenceId: string;
  roleCapabilityReferenceIds: string[];
  firstTaskReady: boolean;
  activationProgressDisplayStates: SyntheticRoleActivationProgressDisplayState[];
  activationFailureReason: string;
  activationRetryCount: number;
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

export interface BuildRoleActivationResult {
  roleActivation: SyntheticRoleActivation | null;
  skipped: boolean;
  warnings: string[];
}

export const NEW_CUSTOMER_ACTIVATION_STEP_SEQUENCE: SyntheticRoleActivationStep[] = [
  "step_1_account_creation",
  "step_2_erp_oauth_connection",
  "step_3_history_ingestion",
  "step_4_chart_of_accounts_mapping",
  "step_5_methodology_derivation",
  "step_6_role_permissions_configuration",
  "step_7_materiality_thresholds_configuration",
  "step_8_role_email_inbox_provisioning",
  "step_9_first_task_ready",
  "step_10_activation_complete",
];

export const ROLE_ACTIVATION_PROGRESS_DISPLAY_STATES: SyntheticRoleActivationProgressDisplayState[] = [
  "ingesting_company_history",
  "mapping_chart_of_accounts",
  "deriving_close_methodology",
  "configuring_role_permissions",
  "provisioning_role_inbox",
  "role_ready",
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildRoleActivationInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildRoleActivationInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildRoleActivationInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildRoleActivationInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildRoleActivationInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildRoleActivationInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildRoleActivationInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildRoleActivationInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildRoleActivationInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getActivationDurationSeconds(input: BuildRoleActivationInput): number {
  return input.activationDurationSeconds ?? 0;
}

function collectMissingRequiredIdentifiers(input: BuildRoleActivationInput): string[] {
  const missing: string[] = [];

  if (input.roleActivationType !== "new_customer") {
    missing.push("roleActivationType:new_customer");
  }

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.roleTemplateId)) {
    missing.push("roleTemplateId");
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

function buildDerivationHash(input: BuildRoleActivationInput): string {
  return stableSnapshotHash({
    roleActivationType: input.roleActivationType,
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    roleTemplateId: input.roleTemplateId,
    onboardingSessionReferenceId: input.onboardingSessionReferenceId ?? "",
    activationStartedAt: input.activationStartedAt ?? "",
    activationCompletedAt: input.activationCompletedAt ?? "",
    activationDurationSeconds: getActivationDurationSeconds(input),
    newCustomerActivationUnder15MinutesGate: getActivationDurationSeconds(input) < 900,
    activationStepSequence: input.activationStepSequence ?? NEW_CUSTOMER_ACTIVATION_STEP_SEQUENCE,
    activationCurrentStep: input.activationCurrentStep ?? "step_1_account_creation",
    activationStepStatuses: input.activationStepStatuses ?? {},
    erpConnectionReferenceId: input.erpConnectionReferenceId ?? "",
    chartOfAccountsMappingReferenceId: input.chartOfAccountsMappingReferenceId ?? "",
    historyIngestionReferenceId: input.historyIngestionReferenceId ?? "",
    methodologyDerivationReferenceId: input.methodologyDerivationReferenceId ?? "",
    rolePermissionsConfigured: input.rolePermissionsConfigured === true,
    rolePermissionsReferenceId: input.rolePermissionsReferenceId ?? "",
    materialityThresholdsConfigured: input.materialityThresholdsConfigured === true,
    materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
    roleEmailInboxProvisioned: input.roleEmailInboxProvisioned === true,
    roleEmailInbox: input.roleEmailInbox ?? "",
    roleRestrictionReferenceId: input.roleRestrictionReferenceId ?? "",
    roleGovernanceReferenceId: input.roleGovernanceReferenceId ?? "",
    roleCapabilityReferenceIds: getInputArray(input.roleCapabilityReferenceIds),
    firstTaskReady: input.firstTaskReady === true,
    activationProgressDisplayStates:
      input.activationProgressDisplayStates ?? ROLE_ACTIVATION_PROGRESS_DISPLAY_STATES,
    activationFailureReason: input.activationFailureReason ?? "",
    activationRetryCount: input.activationRetryCount ?? 0,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildRoleActivation(input: BuildRoleActivationInput): BuildRoleActivationResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      roleActivation: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleActivationType = input.roleActivationType as SyntheticRoleActivationType;
  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const roleTemplateId = input.roleTemplateId as string;
  const activationDurationSeconds = getActivationDurationSeconds(input);
  const newCustomerActivationUnder15MinutesGate = activationDurationSeconds < 900;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const derivationHash = buildDerivationHash(input);
  const roleActivationKey = stableSnapshotHash({
    roleActivationType,
    roleType,
    roleInstanceId,
    roleTemplateId,
    companyId,
    activationStartedAt: input.activationStartedAt ?? "",
    activationCompletedAt: input.activationCompletedAt ?? "",
    activationDurationSeconds,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const roleActivationId = stableSnapshotHash({
    roleActivationKey,
    artifactType: "SyntheticRoleActivation",
  });

  return {
    roleActivation: {
      roleActivationId,
      roleActivationKey,
      roleActivationType,
      roleType,
      roleInstanceId,
      roleTemplateId,
      onboardingSessionReferenceId: input.onboardingSessionReferenceId ?? "",
      activationStartedAt: input.activationStartedAt ?? "",
      activationCompletedAt: input.activationCompletedAt ?? "",
      activationDurationSeconds,
      newCustomerActivationUnder15MinutesGate,
      activationStepSequence: input.activationStepSequence ?? NEW_CUSTOMER_ACTIVATION_STEP_SEQUENCE,
      activationCurrentStep: input.activationCurrentStep ?? "step_1_account_creation",
      activationStepStatuses: input.activationStepStatuses ?? {},
      erpConnectionReferenceId: input.erpConnectionReferenceId ?? "",
      chartOfAccountsMappingReferenceId: input.chartOfAccountsMappingReferenceId ?? "",
      historyIngestionReferenceId: input.historyIngestionReferenceId ?? "",
      methodologyDerivationReferenceId: input.methodologyDerivationReferenceId ?? "",
      rolePermissionsConfigured: input.rolePermissionsConfigured === true,
      rolePermissionsReferenceId: input.rolePermissionsReferenceId ?? "",
      materialityThresholdsConfigured: input.materialityThresholdsConfigured === true,
      materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
      roleEmailInboxProvisioned: input.roleEmailInboxProvisioned === true,
      roleEmailInbox: input.roleEmailInbox ?? "",
      roleRestrictionReferenceId: input.roleRestrictionReferenceId ?? "",
      roleGovernanceReferenceId: input.roleGovernanceReferenceId ?? "",
      roleCapabilityReferenceIds: getInputArray(input.roleCapabilityReferenceIds),
      firstTaskReady: input.firstTaskReady === true,
      activationProgressDisplayStates:
        input.activationProgressDisplayStates ?? ROLE_ACTIVATION_PROGRESS_DISPLAY_STATES,
      activationFailureReason: input.activationFailureReason ?? "",
      activationRetryCount: input.activationRetryCount ?? 0,
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
