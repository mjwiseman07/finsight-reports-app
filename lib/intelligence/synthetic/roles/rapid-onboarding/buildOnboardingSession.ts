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
import type { SyntheticRoleErpConnectionStatus, SyntheticRoleErpConnectionType } from "../contracts";

export type SyntheticOnboardingType = "intelligence_platform" | "role_activation";

export type SyntheticOnboardingStep =
  | "step_1_account_creation"
  | "step_2_erp_oauth_connection"
  | "step_3_company_period_detection"
  | "step_4_chart_of_accounts_ingestion"
  | "step_5_history_ingestion"
  | "step_6_methodology_derivation"
  | "step_7_first_output_generation"
  | "step_8_onboarding_complete";

export type SyntheticOnboardingProgressDisplayState =
  | "learning_chart_of_accounts"
  | "reviewing_prior_journal_entries"
  | "understanding_close_methodology"
  | "mapping_erp_connections"
  | "ready";

export type SyntheticOnboardingFirstOutputType = "board_package" | "first_role_task" | "none";

export type SyntheticOnboardingStepStatus = "pending" | "in_progress" | "completed" | "failed" | "skipped";

export type SyntheticOnboardingStepStatuses = Partial<Record<SyntheticOnboardingStep, SyntheticOnboardingStepStatus>>;

export interface BuildOnboardingSessionInput {
  onboardingType?: SyntheticOnboardingType;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  onboardingStartedAt?: string;
  onboardingCompletedAt?: string;
  onboardingDurationSeconds?: number;
  onboardingStepSequence?: SyntheticOnboardingStep[];
  onboardingCurrentStep?: SyntheticOnboardingStep;
  onboardingStepStatuses?: SyntheticOnboardingStepStatuses;
  erpConnectionType?: SyntheticRoleErpConnectionType;
  erpConnectionStatus?: SyntheticRoleErpConnectionStatus;
  companyDetected?: boolean;
  companyDetectionReferenceId?: string;
  fiscalYearDetected?: boolean;
  accountingPeriodDetected?: boolean;
  chartOfAccountsIngested?: boolean;
  chartOfAccountsReferenceId?: string;
  historyIngested?: boolean;
  historyReferenceId?: string;
  methodologyDerived?: boolean;
  methodologyReferenceId?: string;
  firstOutputType?: SyntheticOnboardingFirstOutputType;
  firstOutputGenerated?: boolean;
  firstOutputReferenceId?: string;
  onboardingProgressDisplayStates?: SyntheticOnboardingProgressDisplayState[];
  onboardingFailureReason?: string;
  onboardingRetryCount?: number;
  supportTicketReferenceId?: string;
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

export interface SyntheticOnboardingSession {
  onboardingSessionId: string;
  onboardingSessionKey: string;
  onboardingType: SyntheticOnboardingType;
  onboardingStartedAt: string;
  onboardingCompletedAt: string;
  onboardingDurationSeconds: number;
  onboardingUnder15MinutesGate: boolean;
  onboardingStepSequence: SyntheticOnboardingStep[];
  onboardingCurrentStep: SyntheticOnboardingStep;
  onboardingStepStatuses: SyntheticOnboardingStepStatuses;
  erpConnectionType: SyntheticRoleErpConnectionType;
  erpConnectionStatus: SyntheticRoleErpConnectionStatus;
  companyDetected: boolean;
  companyDetectionReferenceId: string;
  fiscalYearDetected: boolean;
  accountingPeriodDetected: boolean;
  chartOfAccountsIngested: boolean;
  chartOfAccountsReferenceId: string;
  historyIngested: boolean;
  historyReferenceId: string;
  methodologyDerived: boolean;
  methodologyReferenceId: string;
  firstOutputType: SyntheticOnboardingFirstOutputType;
  firstOutputGenerated: boolean;
  firstOutputReferenceId: string;
  onboardingProgressDisplayStates: SyntheticOnboardingProgressDisplayState[];
  onboardingFailureReason: string;
  onboardingRetryCount: number;
  supportTicketReferenceId: string;
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

export interface BuildOnboardingSessionResult {
  onboardingSession: SyntheticOnboardingSession | null;
  skipped: boolean;
  warnings: string[];
}

export const ONBOARDING_STEP_SEQUENCE: SyntheticOnboardingStep[] = [
  "step_1_account_creation",
  "step_2_erp_oauth_connection",
  "step_3_company_period_detection",
  "step_4_chart_of_accounts_ingestion",
  "step_5_history_ingestion",
  "step_6_methodology_derivation",
  "step_7_first_output_generation",
  "step_8_onboarding_complete",
];

export const ONBOARDING_PROGRESS_DISPLAY_STATES: SyntheticOnboardingProgressDisplayState[] = [
  "learning_chart_of_accounts",
  "reviewing_prior_journal_entries",
  "understanding_close_methodology",
  "mapping_erp_connections",
  "ready",
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildOnboardingSessionInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildOnboardingSessionInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildOnboardingSessionInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildOnboardingSessionInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildOnboardingSessionInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildOnboardingSessionInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildOnboardingSessionInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildOnboardingSessionInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildOnboardingSessionInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getOnboardingDurationSeconds(input: BuildOnboardingSessionInput): number {
  return input.onboardingDurationSeconds ?? 0;
}

function collectMissingRequiredIdentifiers(input: BuildOnboardingSessionInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.onboardingType)) {
    missing.push("onboardingType");
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

function buildDerivationHash(input: BuildOnboardingSessionInput): string {
  return stableSnapshotHash({
    onboardingType: input.onboardingType,
    onboardingStartedAt: input.onboardingStartedAt ?? "",
    onboardingCompletedAt: input.onboardingCompletedAt ?? "",
    onboardingDurationSeconds: getOnboardingDurationSeconds(input),
    onboardingUnder15MinutesGate: getOnboardingDurationSeconds(input) < 900,
    onboardingStepSequence: input.onboardingStepSequence ?? ONBOARDING_STEP_SEQUENCE,
    onboardingCurrentStep: input.onboardingCurrentStep ?? "step_1_account_creation",
    onboardingStepStatuses: input.onboardingStepStatuses ?? {},
    erpConnectionType: input.erpConnectionType ?? "other",
    erpConnectionStatus: input.erpConnectionStatus ?? "pending",
    companyDetected: input.companyDetected === true,
    companyDetectionReferenceId: input.companyDetectionReferenceId ?? "",
    fiscalYearDetected: input.fiscalYearDetected === true,
    accountingPeriodDetected: input.accountingPeriodDetected === true,
    chartOfAccountsIngested: input.chartOfAccountsIngested === true,
    chartOfAccountsReferenceId: input.chartOfAccountsReferenceId ?? "",
    historyIngested: input.historyIngested === true,
    historyReferenceId: input.historyReferenceId ?? "",
    methodologyDerived: input.methodologyDerived === true,
    methodologyReferenceId: input.methodologyReferenceId ?? "",
    firstOutputType: input.firstOutputType ?? "none",
    firstOutputGenerated: input.firstOutputGenerated === true,
    firstOutputReferenceId: input.firstOutputReferenceId ?? "",
    onboardingProgressDisplayStates: input.onboardingProgressDisplayStates ?? ONBOARDING_PROGRESS_DISPLAY_STATES,
    onboardingFailureReason: input.onboardingFailureReason ?? "",
    onboardingRetryCount: input.onboardingRetryCount ?? 0,
    supportTicketReferenceId: input.supportTicketReferenceId ?? "",
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildOnboardingSession(input: BuildOnboardingSessionInput): BuildOnboardingSessionResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      onboardingSession: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const onboardingType = input.onboardingType as SyntheticOnboardingType;
  const onboardingDurationSeconds = getOnboardingDurationSeconds(input);
  const onboardingUnder15MinutesGate = onboardingDurationSeconds < 900;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const derivationHash = buildDerivationHash(input);
  const onboardingSessionKey = stableSnapshotHash({
    onboardingType,
    companyId,
    onboardingStartedAt: input.onboardingStartedAt ?? "",
    onboardingCompletedAt: input.onboardingCompletedAt ?? "",
    onboardingDurationSeconds,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const onboardingSessionId = stableSnapshotHash({
    onboardingSessionKey,
    artifactType: "SyntheticOnboardingSession",
  });

  return {
    onboardingSession: {
      onboardingSessionId,
      onboardingSessionKey,
      onboardingType,
      onboardingStartedAt: input.onboardingStartedAt ?? "",
      onboardingCompletedAt: input.onboardingCompletedAt ?? "",
      onboardingDurationSeconds,
      onboardingUnder15MinutesGate,
      onboardingStepSequence: input.onboardingStepSequence ?? ONBOARDING_STEP_SEQUENCE,
      onboardingCurrentStep: input.onboardingCurrentStep ?? "step_1_account_creation",
      onboardingStepStatuses: input.onboardingStepStatuses ?? {},
      erpConnectionType: input.erpConnectionType ?? "other",
      erpConnectionStatus: input.erpConnectionStatus ?? "pending",
      companyDetected: input.companyDetected === true,
      companyDetectionReferenceId: input.companyDetectionReferenceId ?? "",
      fiscalYearDetected: input.fiscalYearDetected === true,
      accountingPeriodDetected: input.accountingPeriodDetected === true,
      chartOfAccountsIngested: input.chartOfAccountsIngested === true,
      chartOfAccountsReferenceId: input.chartOfAccountsReferenceId ?? "",
      historyIngested: input.historyIngested === true,
      historyReferenceId: input.historyReferenceId ?? "",
      methodologyDerived: input.methodologyDerived === true,
      methodologyReferenceId: input.methodologyReferenceId ?? "",
      firstOutputType: input.firstOutputType ?? "none",
      firstOutputGenerated: input.firstOutputGenerated === true,
      firstOutputReferenceId: input.firstOutputReferenceId ?? "",
      onboardingProgressDisplayStates: input.onboardingProgressDisplayStates ?? ONBOARDING_PROGRESS_DISPLAY_STATES,
      onboardingFailureReason: input.onboardingFailureReason ?? "",
      onboardingRetryCount: input.onboardingRetryCount ?? 0,
      supportTicketReferenceId: input.supportTicketReferenceId ?? "",
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
