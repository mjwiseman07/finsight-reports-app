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

export type SyntheticFraudDetectionCheckStatus = "pass" | "flag" | "not_run";

export type SyntheticOverallFraudDetectionStatus = "passed" | "flagged" | "not_run";

export type SyntheticFraudDetectionCheckName =
  | "repeated_write_offs_without_support"
  | "unusual_timing"
  | "entry_outside_normal_account_range"
  | "unusual_transaction_size"
  | "contradicts_close_methodology"
  | "loss_write_off_without_documentation";

export interface SyntheticFraudDetectionCheck {
  fraudDetectionCheckName: SyntheticFraudDetectionCheckName;
  fraudDetectionCheckStatus: SyntheticFraudDetectionCheckStatus;
  fraudDetectionCheckReason: string;
}

export interface BuildFraudDetectionResultInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  journalEntryCandidateReferenceId?: string;
  phase34AuditIntelligenceReferenceIds?: string[];
  fraudDetectionChecks?: SyntheticFraudDetectionCheck[];
  repeatedWriteOffsWithoutSupportCheck?: SyntheticFraudDetectionCheckStatus;
  unusualTimingCheck?: SyntheticFraudDetectionCheckStatus;
  entryOutsideNormalAccountRangeCheck?: SyntheticFraudDetectionCheckStatus;
  unusualTransactionSizeCheck?: SyntheticFraudDetectionCheckStatus;
  contradictsCloseMethodologyCheck?: SyntheticFraudDetectionCheckStatus;
  lossWriteOffWithoutDocumentationCheck?: SyntheticFraudDetectionCheckStatus;
  organizationalMemoryReferenceIds?: string[];
  historicalPatternReferenceIds?: string[];
  closeMethodologyReferenceIds?: string[];
  detectedPatternReferences?: string[];
  overallFraudDetectionStatus?: SyntheticOverallFraudDetectionStatus;
  flaggedCheckReasons?: string[];
  fraudFlagDetails?: string[];
  specificPatternDetected?: string;
  priorOccurrenceReferences?: string[];
  advanceAuthorized?: boolean;
  fraudDetectionRunAt?: string;
  auditLogReferenceId?: string;
  boundPhase38SnapshotHash?: string;
  boundPhase37SnapshotHash?: string;
  boundPhase34SnapshotHash?: string;
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

export interface SyntheticFraudDetectionResult {
  fraudDetectionResultId: string;
  fraudDetectionResultKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  journalEntryCandidateReferenceId: string;
  phase34AuditIntelligenceReferenceIds: string[];
  fraudDetectionChecks: SyntheticFraudDetectionCheck[];
  repeatedWriteOffsWithoutSupportCheck: SyntheticFraudDetectionCheckStatus;
  unusualTimingCheck: SyntheticFraudDetectionCheckStatus;
  entryOutsideNormalAccountRangeCheck: SyntheticFraudDetectionCheckStatus;
  unusualTransactionSizeCheck: SyntheticFraudDetectionCheckStatus;
  contradictsCloseMethodologyCheck: SyntheticFraudDetectionCheckStatus;
  lossWriteOffWithoutDocumentationCheck: SyntheticFraudDetectionCheckStatus;
  organizationalMemoryReferenceIds: string[];
  historicalPatternReferenceIds: string[];
  closeMethodologyReferenceIds: string[];
  detectedPatternReferences: string[];
  overallFraudDetectionStatus: SyntheticOverallFraudDetectionStatus;
  flaggedCheckReasons: string[];
  fraudFlagDetails: string[];
  specificPatternDetected: string;
  priorOccurrenceReferences: string[];
  advanceAuthorized: boolean;
  failClosedOnAnyFlag: true;
  triggersDeclineAndWarnOnFlag: true;
  neverSilentlyPasses: true;
  fraudDetectionRunAt: string;
  auditLogReferenceId: string;
  boundPhase38SnapshotHash: string;
  boundPhase37SnapshotHash: string;
  boundPhase34SnapshotHash: string;
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

export interface BuildFraudDetectionResultResult {
  fraudDetectionResult: SyntheticFraudDetectionResult | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildFraudDetectionResultInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildFraudDetectionResultInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getBoundPhase34SnapshotHash(input: BuildFraudDetectionResultInput): string {
  return input.boundPhase34SnapshotHash ?? "";
}

function getCompanyId(input: BuildFraudDetectionResultInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildFraudDetectionResultInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildFraudDetectionResultInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildFraudDetectionResultInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildFraudDetectionResultInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildFraudDetectionResultInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildFraudDetectionResultInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getCheckStatuses(input: BuildFraudDetectionResultInput): SyntheticFraudDetectionCheckStatus[] {
  return [
    input.repeatedWriteOffsWithoutSupportCheck ?? "not_run",
    input.unusualTimingCheck ?? "not_run",
    input.entryOutsideNormalAccountRangeCheck ?? "not_run",
    input.unusualTransactionSizeCheck ?? "not_run",
    input.contradictsCloseMethodologyCheck ?? "not_run",
    input.lossWriteOffWithoutDocumentationCheck ?? "not_run",
  ];
}

function getOverallFraudDetectionStatus(input: BuildFraudDetectionResultInput): SyntheticOverallFraudDetectionStatus {
  const checks = getCheckStatuses(input);

  if (checks.some((check) => check === "flag")) {
    return "flagged";
  }

  if (checks.every((check) => check === "pass")) {
    return "passed";
  }

  return "not_run";
}

function getAdvanceAuthorized(input: BuildFraudDetectionResultInput): boolean {
  return getOverallFraudDetectionStatus(input) === "passed";
}

function getFraudDetectionChecks(input: BuildFraudDetectionResultInput): SyntheticFraudDetectionCheck[] {
  return (
    input.fraudDetectionChecks ?? [
      {
        fraudDetectionCheckName: "repeated_write_offs_without_support",
        fraudDetectionCheckStatus: input.repeatedWriteOffsWithoutSupportCheck ?? "not_run",
        fraudDetectionCheckReason: "",
      },
      {
        fraudDetectionCheckName: "unusual_timing",
        fraudDetectionCheckStatus: input.unusualTimingCheck ?? "not_run",
        fraudDetectionCheckReason: "",
      },
      {
        fraudDetectionCheckName: "entry_outside_normal_account_range",
        fraudDetectionCheckStatus: input.entryOutsideNormalAccountRangeCheck ?? "not_run",
        fraudDetectionCheckReason: "",
      },
      {
        fraudDetectionCheckName: "unusual_transaction_size",
        fraudDetectionCheckStatus: input.unusualTransactionSizeCheck ?? "not_run",
        fraudDetectionCheckReason: "",
      },
      {
        fraudDetectionCheckName: "contradicts_close_methodology",
        fraudDetectionCheckStatus: input.contradictsCloseMethodologyCheck ?? "not_run",
        fraudDetectionCheckReason: "",
      },
      {
        fraudDetectionCheckName: "loss_write_off_without_documentation",
        fraudDetectionCheckStatus: input.lossWriteOffWithoutDocumentationCheck ?? "not_run",
        fraudDetectionCheckReason: "",
      },
    ]
  );
}

function collectMissingRequiredIdentifiers(input: BuildFraudDetectionResultInput): string[] {
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

function buildDerivationHash(input: BuildFraudDetectionResultInput): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId,
    phase34AuditIntelligenceReferenceIds: getInputArray(input.phase34AuditIntelligenceReferenceIds),
    fraudDetectionChecks: getFraudDetectionChecks(input),
    repeatedWriteOffsWithoutSupportCheck: input.repeatedWriteOffsWithoutSupportCheck ?? "not_run",
    unusualTimingCheck: input.unusualTimingCheck ?? "not_run",
    entryOutsideNormalAccountRangeCheck: input.entryOutsideNormalAccountRangeCheck ?? "not_run",
    unusualTransactionSizeCheck: input.unusualTransactionSizeCheck ?? "not_run",
    contradictsCloseMethodologyCheck: input.contradictsCloseMethodologyCheck ?? "not_run",
    lossWriteOffWithoutDocumentationCheck: input.lossWriteOffWithoutDocumentationCheck ?? "not_run",
    organizationalMemoryReferenceIds: getInputArray(input.organizationalMemoryReferenceIds),
    historicalPatternReferenceIds: getInputArray(input.historicalPatternReferenceIds),
    closeMethodologyReferenceIds: getInputArray(input.closeMethodologyReferenceIds),
    detectedPatternReferences: getInputArray(input.detectedPatternReferences),
    overallFraudDetectionStatus: getOverallFraudDetectionStatus(input),
    flaggedCheckReasons: getInputArray(input.flaggedCheckReasons),
    fraudFlagDetails: getInputArray(input.fraudFlagDetails),
    specificPatternDetected: input.specificPatternDetected ?? "",
    priorOccurrenceReferences: getInputArray(input.priorOccurrenceReferences),
    advanceAuthorized: getAdvanceAuthorized(input),
    failClosedOnAnyFlag: true,
    triggersDeclineAndWarnOnFlag: true,
    neverSilentlyPasses: true,
    fraudDetectionRunAt: input.fraudDetectionRunAt ?? "",
    auditLogReferenceId: input.auditLogReferenceId ?? "",
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    boundPhase34SnapshotHash: getBoundPhase34SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildFraudDetectionResult(
  input: BuildFraudDetectionResultInput,
): BuildFraudDetectionResultResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      fraudDetectionResult: null,
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
  const boundPhase34SnapshotHash = getBoundPhase34SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const overallFraudDetectionStatus = getOverallFraudDetectionStatus(input);
  const advanceAuthorized = getAdvanceAuthorized(input);
  const derivationHash = buildDerivationHash(input);
  const fraudDetectionResultKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    journalEntryCandidateReferenceId,
    overallFraudDetectionStatus,
    fraudDetectionRunAt: input.fraudDetectionRunAt ?? "",
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    boundPhase34SnapshotHash,
    derivationHash,
  });
  const fraudDetectionResultId = stableSnapshotHash({
    fraudDetectionResultKey,
    artifactType: "SyntheticFraudDetectionResult",
  });

  return {
    fraudDetectionResult: {
      fraudDetectionResultId,
      fraudDetectionResultKey,
      roleType,
      roleInstanceId,
      journalEntryCandidateReferenceId,
      phase34AuditIntelligenceReferenceIds: getInputArray(input.phase34AuditIntelligenceReferenceIds),
      fraudDetectionChecks: getFraudDetectionChecks(input),
      repeatedWriteOffsWithoutSupportCheck: input.repeatedWriteOffsWithoutSupportCheck ?? "not_run",
      unusualTimingCheck: input.unusualTimingCheck ?? "not_run",
      entryOutsideNormalAccountRangeCheck: input.entryOutsideNormalAccountRangeCheck ?? "not_run",
      unusualTransactionSizeCheck: input.unusualTransactionSizeCheck ?? "not_run",
      contradictsCloseMethodologyCheck: input.contradictsCloseMethodologyCheck ?? "not_run",
      lossWriteOffWithoutDocumentationCheck: input.lossWriteOffWithoutDocumentationCheck ?? "not_run",
      organizationalMemoryReferenceIds: getInputArray(input.organizationalMemoryReferenceIds),
      historicalPatternReferenceIds: getInputArray(input.historicalPatternReferenceIds),
      closeMethodologyReferenceIds: getInputArray(input.closeMethodologyReferenceIds),
      detectedPatternReferences: getInputArray(input.detectedPatternReferences),
      overallFraudDetectionStatus,
      flaggedCheckReasons: getInputArray(input.flaggedCheckReasons),
      fraudFlagDetails: getInputArray(input.fraudFlagDetails),
      specificPatternDetected: input.specificPatternDetected ?? "",
      priorOccurrenceReferences: getInputArray(input.priorOccurrenceReferences),
      advanceAuthorized,
      failClosedOnAnyFlag: true,
      triggersDeclineAndWarnOnFlag: true,
      neverSilentlyPasses: true,
      fraudDetectionRunAt: input.fraudDetectionRunAt ?? "",
      auditLogReferenceId: input.auditLogReferenceId ?? "",
      boundPhase38SnapshotHash,
      boundPhase37SnapshotHash,
      boundPhase34SnapshotHash,
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
