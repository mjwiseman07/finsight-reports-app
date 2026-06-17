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

export type SyntheticReasonablenessCheckStatus = "pass" | "flag" | "not_run";

export type SyntheticOverallReasonablenessStatus = "passed" | "flagged" | "not_run";

export type SyntheticReasonablenessCheckName =
  | "makes_sense_given_history"
  | "business_purpose_matches_account"
  | "entry_size_within_normal_range"
  | "methodology_supports_entry_type"
  | "cross_entry_pattern";

export interface SyntheticReasonablenessCheck {
  reasonablenessCheckName: SyntheticReasonablenessCheckName;
  reasonablenessCheckStatus: SyntheticReasonablenessCheckStatus;
  reasonablenessCheckReason: string;
}

export interface BuildReasonablenessResultInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  journalEntryCandidateReferenceId?: string;
  reasonablenessChecks?: SyntheticReasonablenessCheck[];
  makesSenseGivenHistoryCheck?: SyntheticReasonablenessCheckStatus;
  businessPurposeMatchesAccountCheck?: SyntheticReasonablenessCheckStatus;
  entrySizeWithinNormalRangeCheck?: SyntheticReasonablenessCheckStatus;
  methodologySupportsEntryTypeCheck?: SyntheticReasonablenessCheckStatus;
  crossEntryPatternCheck?: SyntheticReasonablenessCheckStatus;
  organizationalMemoryReferenceIds?: string[];
  historicalPatternReferenceIds?: string[];
  methodologyReferenceIds?: string[];
  reasoningSummaryReference?: string;
  overallReasonablenessStatus?: SyntheticOverallReasonablenessStatus;
  flaggedCheckReasons?: string[];
  reasonablenessFlagDetails?: string[];
  advanceAuthorized?: boolean;
  reasonablenessRunAt?: string;
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

export interface SyntheticReasonablenessResult {
  reasonablenessResultId: string;
  reasonablenessResultKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  journalEntryCandidateReferenceId: string;
  reasonablenessChecks: SyntheticReasonablenessCheck[];
  makesSenseGivenHistoryCheck: SyntheticReasonablenessCheckStatus;
  businessPurposeMatchesAccountCheck: SyntheticReasonablenessCheckStatus;
  entrySizeWithinNormalRangeCheck: SyntheticReasonablenessCheckStatus;
  methodologySupportsEntryTypeCheck: SyntheticReasonablenessCheckStatus;
  crossEntryPatternCheck: SyntheticReasonablenessCheckStatus;
  organizationalMemoryReferenceIds: string[];
  historicalPatternReferenceIds: string[];
  methodologyReferenceIds: string[];
  reasoningSummaryReference: string;
  overallReasonablenessStatus: SyntheticOverallReasonablenessStatus;
  flaggedCheckReasons: string[];
  reasonablenessFlagDetails: string[];
  advanceAuthorized: boolean;
  failClosedOnAnyFlag: true;
  triggersDeclineAndWarnOnFlag: true;
  neverSilentlyPasses: true;
  reasonablenessRunAt: string;
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

export interface BuildReasonablenessResultResult {
  reasonablenessResult: SyntheticReasonablenessResult | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildReasonablenessResultInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildReasonablenessResultInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildReasonablenessResultInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildReasonablenessResultInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildReasonablenessResultInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildReasonablenessResultInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildReasonablenessResultInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildReasonablenessResultInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildReasonablenessResultInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getCheckStatuses(input: BuildReasonablenessResultInput): SyntheticReasonablenessCheckStatus[] {
  return [
    input.makesSenseGivenHistoryCheck ?? "not_run",
    input.businessPurposeMatchesAccountCheck ?? "not_run",
    input.entrySizeWithinNormalRangeCheck ?? "not_run",
    input.methodologySupportsEntryTypeCheck ?? "not_run",
    input.crossEntryPatternCheck ?? "not_run",
  ];
}

function getOverallReasonablenessStatus(input: BuildReasonablenessResultInput): SyntheticOverallReasonablenessStatus {
  const checks = getCheckStatuses(input);

  if (checks.some((check) => check === "flag")) {
    return "flagged";
  }

  if (checks.every((check) => check === "pass")) {
    return "passed";
  }

  return "not_run";
}

function getAdvanceAuthorized(input: BuildReasonablenessResultInput): boolean {
  return getOverallReasonablenessStatus(input) === "passed";
}

function getReasonablenessChecks(input: BuildReasonablenessResultInput): SyntheticReasonablenessCheck[] {
  return (
    input.reasonablenessChecks ?? [
      {
        reasonablenessCheckName: "makes_sense_given_history",
        reasonablenessCheckStatus: input.makesSenseGivenHistoryCheck ?? "not_run",
        reasonablenessCheckReason: "",
      },
      {
        reasonablenessCheckName: "business_purpose_matches_account",
        reasonablenessCheckStatus: input.businessPurposeMatchesAccountCheck ?? "not_run",
        reasonablenessCheckReason: "",
      },
      {
        reasonablenessCheckName: "entry_size_within_normal_range",
        reasonablenessCheckStatus: input.entrySizeWithinNormalRangeCheck ?? "not_run",
        reasonablenessCheckReason: "",
      },
      {
        reasonablenessCheckName: "methodology_supports_entry_type",
        reasonablenessCheckStatus: input.methodologySupportsEntryTypeCheck ?? "not_run",
        reasonablenessCheckReason: "",
      },
      {
        reasonablenessCheckName: "cross_entry_pattern",
        reasonablenessCheckStatus: input.crossEntryPatternCheck ?? "not_run",
        reasonablenessCheckReason: "",
      },
    ]
  );
}

function collectMissingRequiredIdentifiers(input: BuildReasonablenessResultInput): string[] {
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

function buildDerivationHash(input: BuildReasonablenessResultInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId,
    reasonablenessChecks: getReasonablenessChecks(input),
    makesSenseGivenHistoryCheck: input.makesSenseGivenHistoryCheck ?? "not_run",
    businessPurposeMatchesAccountCheck: input.businessPurposeMatchesAccountCheck ?? "not_run",
    entrySizeWithinNormalRangeCheck: input.entrySizeWithinNormalRangeCheck ?? "not_run",
    methodologySupportsEntryTypeCheck: input.methodologySupportsEntryTypeCheck ?? "not_run",
    crossEntryPatternCheck: input.crossEntryPatternCheck ?? "not_run",
    organizationalMemoryReferenceIds: getInputArray(input.organizationalMemoryReferenceIds),
    historicalPatternReferenceIds: getInputArray(input.historicalPatternReferenceIds),
    methodologyReferenceIds: getInputArray(input.methodologyReferenceIds),
    reasoningSummaryReference: input.reasoningSummaryReference ?? "",
    overallReasonablenessStatus: getOverallReasonablenessStatus(input),
    flaggedCheckReasons: getInputArray(input.flaggedCheckReasons),
    reasonablenessFlagDetails: getInputArray(input.reasonablenessFlagDetails),
    advanceAuthorized: getAdvanceAuthorized(input),
    failClosedOnAnyFlag: true,
    triggersDeclineAndWarnOnFlag: true,
    neverSilentlyPasses: true,
    reasonablenessRunAt: input.reasonablenessRunAt ?? "",
    auditLogReferenceId: input.auditLogReferenceId ?? "",
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildReasonablenessResult(
  input: BuildReasonablenessResultInput,
): BuildReasonablenessResultResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      reasonablenessResult: null,
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
  const overallReasonablenessStatus = getOverallReasonablenessStatus(input);
  const advanceAuthorized = getAdvanceAuthorized(input);
  const derivationHash = buildDerivationHash(input);
  const reasonablenessResultKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    journalEntryCandidateReferenceId,
    overallReasonablenessStatus,
    reasonablenessRunAt: input.reasonablenessRunAt ?? "",
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const reasonablenessResultId = stableSnapshotHash({
    reasonablenessResultKey,
    artifactType: "SyntheticReasonablenessResult",
  });

  return {
    reasonablenessResult: {
      reasonablenessResultId,
      reasonablenessResultKey,
      roleType,
      roleInstanceId,
      journalEntryCandidateReferenceId,
      reasonablenessChecks: getReasonablenessChecks(input),
      makesSenseGivenHistoryCheck: input.makesSenseGivenHistoryCheck ?? "not_run",
      businessPurposeMatchesAccountCheck: input.businessPurposeMatchesAccountCheck ?? "not_run",
      entrySizeWithinNormalRangeCheck: input.entrySizeWithinNormalRangeCheck ?? "not_run",
      methodologySupportsEntryTypeCheck: input.methodologySupportsEntryTypeCheck ?? "not_run",
      crossEntryPatternCheck: input.crossEntryPatternCheck ?? "not_run",
      organizationalMemoryReferenceIds: getInputArray(input.organizationalMemoryReferenceIds),
      historicalPatternReferenceIds: getInputArray(input.historicalPatternReferenceIds),
      methodologyReferenceIds: getInputArray(input.methodologyReferenceIds),
      reasoningSummaryReference: input.reasoningSummaryReference ?? "",
      overallReasonablenessStatus,
      flaggedCheckReasons: getInputArray(input.flaggedCheckReasons),
      reasonablenessFlagDetails: getInputArray(input.reasonablenessFlagDetails),
      advanceAuthorized,
      failClosedOnAnyFlag: true,
      triggersDeclineAndWarnOnFlag: true,
      neverSilentlyPasses: true,
      reasonablenessRunAt: input.reasonablenessRunAt ?? "",
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
