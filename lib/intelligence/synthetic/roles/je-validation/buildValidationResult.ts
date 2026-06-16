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

export type SyntheticValidationCheckStatus = "pass" | "fail" | "not_run";

export type SyntheticOverallValidationStatus = "passed" | "failed" | "not_run";

export type SyntheticValidationCheckName =
  | "debits_equal_credits"
  | "required_fields_present"
  | "account_mappings_valid"
  | "dimension_mappings_valid"
  | "accounting_period_open"
  | "support_package_present"
  | "lead_sheet_present"
  | "approval_policy_satisfied";

export interface SyntheticValidationCheck {
  validationCheckName: SyntheticValidationCheckName;
  validationCheckStatus: SyntheticValidationCheckStatus;
  validationCheckReason: string;
}

export interface BuildValidationResultInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  journalEntryCandidateReferenceId?: string;
  validationChecks?: SyntheticValidationCheck[];
  debitsEqualCreditsCheck?: SyntheticValidationCheckStatus;
  requiredFieldsPresentCheck?: SyntheticValidationCheckStatus;
  accountMappingsValidCheck?: SyntheticValidationCheckStatus;
  dimensionMappingsValidCheck?: SyntheticValidationCheckStatus;
  accountingPeriodOpenCheck?: SyntheticValidationCheckStatus;
  supportPackagePresentCheck?: SyntheticValidationCheckStatus;
  leadSheetPresentCheck?: SyntheticValidationCheckStatus;
  approvalPolicySatisfiedCheck?: SyntheticValidationCheckStatus;
  overallValidationStatus?: SyntheticOverallValidationStatus;
  failedCheckReasons?: string[];
  validationFailureDetails?: string[];
  advanceAuthorized?: boolean;
  validationRunAt?: string;
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

export interface SyntheticValidationResult {
  validationResultId: string;
  validationResultKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  journalEntryCandidateReferenceId: string;
  validationChecks: SyntheticValidationCheck[];
  debitsEqualCreditsCheck: SyntheticValidationCheckStatus;
  requiredFieldsPresentCheck: SyntheticValidationCheckStatus;
  accountMappingsValidCheck: SyntheticValidationCheckStatus;
  dimensionMappingsValidCheck: SyntheticValidationCheckStatus;
  accountingPeriodOpenCheck: SyntheticValidationCheckStatus;
  supportPackagePresentCheck: SyntheticValidationCheckStatus;
  leadSheetPresentCheck: SyntheticValidationCheckStatus;
  approvalPolicySatisfiedCheck: SyntheticValidationCheckStatus;
  overallValidationStatus: SyntheticOverallValidationStatus;
  failedCheckReasons: string[];
  validationFailureDetails: string[];
  advanceAuthorized: boolean;
  failClosedOnAnyCheckFailure: true;
  validationRunAt: string;
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

export interface BuildValidationResultResult {
  validationResult: SyntheticValidationResult | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildValidationResultInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildValidationResultInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildValidationResultInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildValidationResultInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildValidationResultInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildValidationResultInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildValidationResultInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildValidationResultInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildValidationResultInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getCheckStatuses(input: BuildValidationResultInput): SyntheticValidationCheckStatus[] {
  return [
    input.debitsEqualCreditsCheck ?? "not_run",
    input.requiredFieldsPresentCheck ?? "not_run",
    input.accountMappingsValidCheck ?? "not_run",
    input.dimensionMappingsValidCheck ?? "not_run",
    input.accountingPeriodOpenCheck ?? "not_run",
    input.supportPackagePresentCheck ?? "not_run",
    input.leadSheetPresentCheck ?? "not_run",
    input.approvalPolicySatisfiedCheck ?? "not_run",
  ];
}

function getOverallValidationStatus(input: BuildValidationResultInput): SyntheticOverallValidationStatus {
  const checks = getCheckStatuses(input);

  if (checks.some((check) => check === "fail")) {
    return "failed";
  }

  if (checks.every((check) => check === "pass")) {
    return "passed";
  }

  return "not_run";
}

function getAdvanceAuthorized(input: BuildValidationResultInput): boolean {
  return getOverallValidationStatus(input) === "passed";
}

function getValidationChecks(input: BuildValidationResultInput): SyntheticValidationCheck[] {
  return (
    input.validationChecks ?? [
      {
        validationCheckName: "debits_equal_credits",
        validationCheckStatus: input.debitsEqualCreditsCheck ?? "not_run",
        validationCheckReason: "",
      },
      {
        validationCheckName: "required_fields_present",
        validationCheckStatus: input.requiredFieldsPresentCheck ?? "not_run",
        validationCheckReason: "",
      },
      {
        validationCheckName: "account_mappings_valid",
        validationCheckStatus: input.accountMappingsValidCheck ?? "not_run",
        validationCheckReason: "",
      },
      {
        validationCheckName: "dimension_mappings_valid",
        validationCheckStatus: input.dimensionMappingsValidCheck ?? "not_run",
        validationCheckReason: "",
      },
      {
        validationCheckName: "accounting_period_open",
        validationCheckStatus: input.accountingPeriodOpenCheck ?? "not_run",
        validationCheckReason: "",
      },
      {
        validationCheckName: "support_package_present",
        validationCheckStatus: input.supportPackagePresentCheck ?? "not_run",
        validationCheckReason: "",
      },
      {
        validationCheckName: "lead_sheet_present",
        validationCheckStatus: input.leadSheetPresentCheck ?? "not_run",
        validationCheckReason: "",
      },
      {
        validationCheckName: "approval_policy_satisfied",
        validationCheckStatus: input.approvalPolicySatisfiedCheck ?? "not_run",
        validationCheckReason: "",
      },
    ]
  );
}

function collectMissingRequiredIdentifiers(input: BuildValidationResultInput): string[] {
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

function buildDerivationHash(input: BuildValidationResultInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId,
    validationChecks: getValidationChecks(input),
    debitsEqualCreditsCheck: input.debitsEqualCreditsCheck ?? "not_run",
    requiredFieldsPresentCheck: input.requiredFieldsPresentCheck ?? "not_run",
    accountMappingsValidCheck: input.accountMappingsValidCheck ?? "not_run",
    dimensionMappingsValidCheck: input.dimensionMappingsValidCheck ?? "not_run",
    accountingPeriodOpenCheck: input.accountingPeriodOpenCheck ?? "not_run",
    supportPackagePresentCheck: input.supportPackagePresentCheck ?? "not_run",
    leadSheetPresentCheck: input.leadSheetPresentCheck ?? "not_run",
    approvalPolicySatisfiedCheck: input.approvalPolicySatisfiedCheck ?? "not_run",
    overallValidationStatus: getOverallValidationStatus(input),
    failedCheckReasons: getInputArray(input.failedCheckReasons),
    validationFailureDetails: getInputArray(input.validationFailureDetails),
    advanceAuthorized: getAdvanceAuthorized(input),
    failClosedOnAnyCheckFailure: true,
    validationRunAt: input.validationRunAt ?? "",
    auditLogReferenceId: input.auditLogReferenceId ?? "",
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildValidationResult(input: BuildValidationResultInput): BuildValidationResultResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      validationResult: null,
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
  const overallValidationStatus = getOverallValidationStatus(input);
  const advanceAuthorized = getAdvanceAuthorized(input);
  const derivationHash = buildDerivationHash(input);
  const validationResultKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    journalEntryCandidateReferenceId,
    overallValidationStatus,
    validationRunAt: input.validationRunAt ?? "",
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const validationResultId = stableSnapshotHash({
    validationResultKey,
    artifactType: "SyntheticValidationResult",
  });

  return {
    validationResult: {
      validationResultId,
      validationResultKey,
      roleType,
      roleInstanceId,
      journalEntryCandidateReferenceId,
      validationChecks: getValidationChecks(input),
      debitsEqualCreditsCheck: input.debitsEqualCreditsCheck ?? "not_run",
      requiredFieldsPresentCheck: input.requiredFieldsPresentCheck ?? "not_run",
      accountMappingsValidCheck: input.accountMappingsValidCheck ?? "not_run",
      dimensionMappingsValidCheck: input.dimensionMappingsValidCheck ?? "not_run",
      accountingPeriodOpenCheck: input.accountingPeriodOpenCheck ?? "not_run",
      supportPackagePresentCheck: input.supportPackagePresentCheck ?? "not_run",
      leadSheetPresentCheck: input.leadSheetPresentCheck ?? "not_run",
      approvalPolicySatisfiedCheck: input.approvalPolicySatisfiedCheck ?? "not_run",
      overallValidationStatus,
      failedCheckReasons: getInputArray(input.failedCheckReasons),
      validationFailureDetails: getInputArray(input.validationFailureDetails),
      advanceAuthorized,
      failClosedOnAnyCheckFailure: true,
      validationRunAt: input.validationRunAt ?? "",
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
