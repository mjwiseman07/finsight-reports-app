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

export type SyntheticExistingCustomerActivationType = "existing_customer";

export type SyntheticExistingCustomerActivationStep =
  | "step_1_click_activate_role"
  | "step_2_configure_permissions_and_materiality"
  | "step_3_confirm_role_email_inbox"
  | "step_4_role_ready";

export type SyntheticExistingCustomerActivationProgressDisplayState =
  | "loading_existing_memory"
  | "applying_existing_methodology"
  | "configuring_role_permissions"
  | "role_ready";

export type SyntheticExistingCustomerActivationStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped";

export type SyntheticExistingCustomerActivationStepStatuses = Partial<
  Record<SyntheticExistingCustomerActivationStep, SyntheticExistingCustomerActivationStepStatus>
>;

export interface SyntheticExistingCustomerMemoryDepthMetadata {
  memoryDepthReferenceIds: string[];
  memoryDepthSummary: string;
  memoryRichnessCategory: "limited" | "developing" | "seasoned" | "deep" | "unknown";
  compoundingMemoryLoopEnabled: boolean;
}

export interface BuildExistingCustomerActivationInput {
  roleActivationType?: SyntheticExistingCustomerActivationType;
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  roleTemplateId?: string;
  existingCustomerId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  existingMemoryReferenceIds?: string[];
  existingChartOfAccountsReferenceId?: string;
  existingHistoryReferenceId?: string;
  existingMethodologyReferenceId?: string;
  memoryDepthMetadata?: SyntheticExistingCustomerMemoryDepthMetadata[];
  memoryMonthsAccumulated?: number;
  activationStartedAt?: string;
  activationCompletedAt?: string;
  activationDurationSeconds?: number;
  activationStepSequence?: SyntheticExistingCustomerActivationStep[];
  activationCurrentStep?: SyntheticExistingCustomerActivationStep;
  activationStepStatuses?: SyntheticExistingCustomerActivationStepStatuses;
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
  activationProgressDisplayStates?: SyntheticExistingCustomerActivationProgressDisplayState[];
  activationFailureReason?: string;
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

export interface SyntheticExistingCustomerActivation {
  existingActivationId: string;
  existingActivationKey: string;
  roleActivationType: SyntheticExistingCustomerActivationType;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  roleTemplateId: string;
  existingCustomerId: string;
  existingMemoryReferenceIds: string[];
  existingChartOfAccountsReferenceId: string;
  existingHistoryReferenceId: string;
  existingMethodologyReferenceId: string;
  memoryDepthMetadata: SyntheticExistingCustomerMemoryDepthMetadata[];
  memoryMonthsAccumulated: number;
  activationStartedAt: string;
  activationCompletedAt: string;
  activationDurationSeconds: number;
  existingCustomerActivationUnder3MinutesGate: boolean;
  activationStepSequence: SyntheticExistingCustomerActivationStep[];
  activationCurrentStep: SyntheticExistingCustomerActivationStep;
  activationStepStatuses: SyntheticExistingCustomerActivationStepStatuses;
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
  activationProgressDisplayStates: SyntheticExistingCustomerActivationProgressDisplayState[];
  activationFailureReason: string;
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

export interface BuildExistingCustomerActivationResult {
  existingCustomerActivation: SyntheticExistingCustomerActivation | null;
  skipped: boolean;
  warnings: string[];
}

export const EXISTING_CUSTOMER_ACTIVATION_STEP_SEQUENCE: SyntheticExistingCustomerActivationStep[] = [
  "step_1_click_activate_role",
  "step_2_configure_permissions_and_materiality",
  "step_3_confirm_role_email_inbox",
  "step_4_role_ready",
];

export const EXISTING_CUSTOMER_ACTIVATION_PROGRESS_DISPLAY_STATES: SyntheticExistingCustomerActivationProgressDisplayState[] = [
  "loading_existing_memory",
  "applying_existing_methodology",
  "configuring_role_permissions",
  "role_ready",
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildExistingCustomerActivationInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildExistingCustomerActivationInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildExistingCustomerActivationInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildExistingCustomerActivationInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildExistingCustomerActivationInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildExistingCustomerActivationInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildExistingCustomerActivationInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildExistingCustomerActivationInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildExistingCustomerActivationInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getActivationDurationSeconds(input: BuildExistingCustomerActivationInput): number {
  return input.activationDurationSeconds ?? 0;
}

function collectMissingRequiredIdentifiers(input: BuildExistingCustomerActivationInput): string[] {
  const missing: string[] = [];

  if (input.roleActivationType !== "existing_customer") {
    missing.push("roleActivationType:existing_customer");
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

  if (!hasValue(input.existingCustomerId)) {
    missing.push("existingCustomerId");
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

function buildDerivationHash(input: BuildExistingCustomerActivationInput): string {
  return stableSnapshotHash({
    roleActivationType: input.roleActivationType,
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    roleTemplateId: input.roleTemplateId,
    existingCustomerId: input.existingCustomerId,
    existingMemoryReferenceIds: getInputArray(input.existingMemoryReferenceIds),
    existingChartOfAccountsReferenceId: input.existingChartOfAccountsReferenceId ?? "",
    existingHistoryReferenceId: input.existingHistoryReferenceId ?? "",
    existingMethodologyReferenceId: input.existingMethodologyReferenceId ?? "",
    memoryDepthMetadata: getInputArray(input.memoryDepthMetadata),
    memoryMonthsAccumulated: input.memoryMonthsAccumulated ?? 0,
    activationStartedAt: input.activationStartedAt ?? "",
    activationCompletedAt: input.activationCompletedAt ?? "",
    activationDurationSeconds: getActivationDurationSeconds(input),
    existingCustomerActivationUnder3MinutesGate: getActivationDurationSeconds(input) < 180,
    activationStepSequence: input.activationStepSequence ?? EXISTING_CUSTOMER_ACTIVATION_STEP_SEQUENCE,
    activationCurrentStep: input.activationCurrentStep ?? "step_1_click_activate_role",
    activationStepStatuses: input.activationStepStatuses ?? {},
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
      input.activationProgressDisplayStates ?? EXISTING_CUSTOMER_ACTIVATION_PROGRESS_DISPLAY_STATES,
    activationFailureReason: input.activationFailureReason ?? "",
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildExistingCustomerActivation(
  input: BuildExistingCustomerActivationInput,
): BuildExistingCustomerActivationResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      existingCustomerActivation: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleActivationType = input.roleActivationType as SyntheticExistingCustomerActivationType;
  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const roleTemplateId = input.roleTemplateId as string;
  const existingCustomerId = input.existingCustomerId as string;
  const activationDurationSeconds = getActivationDurationSeconds(input);
  const existingCustomerActivationUnder3MinutesGate = activationDurationSeconds < 180;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const derivationHash = buildDerivationHash(input);
  const existingActivationKey = stableSnapshotHash({
    roleActivationType,
    roleType,
    roleInstanceId,
    roleTemplateId,
    existingCustomerId,
    companyId,
    activationStartedAt: input.activationStartedAt ?? "",
    activationCompletedAt: input.activationCompletedAt ?? "",
    activationDurationSeconds,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const existingActivationId = stableSnapshotHash({
    existingActivationKey,
    artifactType: "SyntheticExistingCustomerActivation",
  });

  return {
    existingCustomerActivation: {
      existingActivationId,
      existingActivationKey,
      roleActivationType,
      roleType,
      roleInstanceId,
      roleTemplateId,
      existingCustomerId,
      existingMemoryReferenceIds: getInputArray(input.existingMemoryReferenceIds),
      existingChartOfAccountsReferenceId: input.existingChartOfAccountsReferenceId ?? "",
      existingHistoryReferenceId: input.existingHistoryReferenceId ?? "",
      existingMethodologyReferenceId: input.existingMethodologyReferenceId ?? "",
      memoryDepthMetadata: getInputArray(input.memoryDepthMetadata),
      memoryMonthsAccumulated: input.memoryMonthsAccumulated ?? 0,
      activationStartedAt: input.activationStartedAt ?? "",
      activationCompletedAt: input.activationCompletedAt ?? "",
      activationDurationSeconds,
      existingCustomerActivationUnder3MinutesGate,
      activationStepSequence: input.activationStepSequence ?? EXISTING_CUSTOMER_ACTIVATION_STEP_SEQUENCE,
      activationCurrentStep: input.activationCurrentStep ?? "step_1_click_activate_role",
      activationStepStatuses: input.activationStepStatuses ?? {},
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
        input.activationProgressDisplayStates ?? EXISTING_CUSTOMER_ACTIVATION_PROGRESS_DISPLAY_STATES,
      activationFailureReason: input.activationFailureReason ?? "",
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
