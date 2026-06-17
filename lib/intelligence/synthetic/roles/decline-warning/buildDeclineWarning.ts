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

export type SyntheticDeclineSource =
  | "validation"
  | "fraud_detection"
  | "reasonableness";

export type SyntheticDeclineWarningSeverity = "low" | "medium" | "high";

export type SyntheticDeclineWarningPersona =
  | "controller"
  | "cfo"
  | "manager"
  | "partner"
  | "audit_manager";

export type SyntheticDeclineWarningState =
  | "declined"
  | "override_pending"
  | "overridden_with_reason"
  | "additional_support_provided"
  | "resolved";

export interface BuildDeclineWarningInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  journalEntryCandidateReferenceId?: string;
  outputReferenceId?: string;
  declineSource?: SyntheticDeclineSource;
  declineReason?: string;
  specificFlagDetail?: string;
  specificPatternDetected?: string;
  priorOccurrenceReferences?: string[];
  warningSeverity?: SyntheticDeclineWarningSeverity;
  warningIssuedToPersona?: SyntheticDeclineWarningPersona;
  warningIssuedToUserId?: string;
  warningNotificationReferenceId?: string;
  controllerOverrideProvided?: boolean;
  overrideReason?: string;
  overrideRequesterId?: string;
  overrideRequesterPersona?: string;
  additionalDocumentationProvidedReferenceIds?: string[];
  postOverrideVerificationRequired?: boolean;
  declineWarningState?: SyntheticDeclineWarningState;
  linkedAuditLogReferenceId?: string;
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

export interface SyntheticDeclineWarning {
  declineWarningId: string;
  declineWarningKey: string;
  roleType: SyntheticRoleType | "";
  roleInstanceId: string;
  journalEntryCandidateReferenceId: string;
  outputReferenceId: string;
  declineSource: SyntheticDeclineSource;
  declineReason: string;
  specificFlagDetail: string;
  specificPatternDetected: string;
  priorOccurrenceReferences: string[];
  warningSeverity: SyntheticDeclineWarningSeverity;
  warningIssuedToPersona: SyntheticDeclineWarningPersona;
  warningIssuedToUserId: string;
  warningNotificationReferenceId: string;
  declinePreservedPermanently: true;
  neverSilentlyPasses: true;
  controllerOverrideProvided: boolean;
  overrideReason: string;
  overrideRequesterId: string;
  overrideRequesterPersona: string;
  overridePreservedPermanently: true;
  additionalDocumentationProvidedReferenceIds: string[];
  postOverrideVerificationRequired: boolean;
  declineWarningState: SyntheticDeclineWarningState;
  linkedAuditLogReferenceId: string;
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

export interface BuildDeclineWarningResult {
  declineWarning: SyntheticDeclineWarning | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildDeclineWarningInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildDeclineWarningInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildDeclineWarningInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildDeclineWarningInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildDeclineWarningInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildDeclineWarningInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildDeclineWarningInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildDeclineWarningInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildDeclineWarningInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getWarningSeverity(input: BuildDeclineWarningInput): SyntheticDeclineWarningSeverity {
  return input.warningSeverity ?? "medium";
}

function getWarningIssuedToPersona(input: BuildDeclineWarningInput): SyntheticDeclineWarningPersona {
  return input.warningIssuedToPersona ?? "controller";
}

function getDeclineWarningState(input: BuildDeclineWarningInput): SyntheticDeclineWarningState {
  return input.declineWarningState ?? "declined";
}

function collectMissingRequiredIdentifiers(input: BuildDeclineWarningInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.declineSource)) {
    missing.push("declineSource");
  }

  if (!hasValue(input.declineReason)) {
    missing.push("declineReason");
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

function buildDerivationHash(input: BuildDeclineWarningInput): string {
  return stableSnapshotHash({
    roleType: input.roleType ?? "",
    roleInstanceId: input.roleInstanceId,
    journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
    outputReferenceId: input.outputReferenceId ?? "",
    declineSource: input.declineSource,
    declineReason: input.declineReason,
    specificFlagDetail: input.specificFlagDetail ?? "",
    specificPatternDetected: input.specificPatternDetected ?? "",
    priorOccurrenceReferences: getInputArray(input.priorOccurrenceReferences),
    warningSeverity: getWarningSeverity(input),
    warningIssuedToPersona: getWarningIssuedToPersona(input),
    warningIssuedToUserId: input.warningIssuedToUserId ?? "",
    warningNotificationReferenceId: input.warningNotificationReferenceId ?? "",
    declinePreservedPermanently: true,
    neverSilentlyPasses: true,
    controllerOverrideProvided: input.controllerOverrideProvided === true,
    overrideReason: input.overrideReason ?? "",
    overrideRequesterId: input.overrideRequesterId ?? "",
    overrideRequesterPersona: input.overrideRequesterPersona ?? "",
    overridePreservedPermanently: true,
    additionalDocumentationProvidedReferenceIds: getInputArray(input.additionalDocumentationProvidedReferenceIds),
    postOverrideVerificationRequired: input.postOverrideVerificationRequired === true,
    declineWarningState: getDeclineWarningState(input),
    linkedAuditLogReferenceId: input.linkedAuditLogReferenceId ?? "",
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildDeclineWarning(input: BuildDeclineWarningInput): BuildDeclineWarningResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      declineWarning: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType ?? "";
  const roleInstanceId = input.roleInstanceId as string;
  const declineSource = input.declineSource as SyntheticDeclineSource;
  const declineReason = input.declineReason as string;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const warningSeverity = getWarningSeverity(input);
  const warningIssuedToPersona = getWarningIssuedToPersona(input);
  const declineWarningState = getDeclineWarningState(input);
  const derivationHash = buildDerivationHash(input);
  const declineWarningKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
    outputReferenceId: input.outputReferenceId ?? "",
    declineSource,
    declineReason,
    warningSeverity,
    warningIssuedToPersona,
    companyId,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const declineWarningId = stableSnapshotHash({
    declineWarningKey,
    artifactType: "SyntheticDeclineWarning",
  });

  return {
    declineWarning: {
      declineWarningId,
      declineWarningKey,
      roleType,
      roleInstanceId,
      journalEntryCandidateReferenceId: input.journalEntryCandidateReferenceId ?? "",
      outputReferenceId: input.outputReferenceId ?? "",
      declineSource,
      declineReason,
      specificFlagDetail: input.specificFlagDetail ?? "",
      specificPatternDetected: input.specificPatternDetected ?? "",
      priorOccurrenceReferences: getInputArray(input.priorOccurrenceReferences),
      warningSeverity,
      warningIssuedToPersona,
      warningIssuedToUserId: input.warningIssuedToUserId ?? "",
      warningNotificationReferenceId: input.warningNotificationReferenceId ?? "",
      declinePreservedPermanently: true,
      neverSilentlyPasses: true,
      controllerOverrideProvided: input.controllerOverrideProvided === true,
      overrideReason: input.overrideReason ?? "",
      overrideRequesterId: input.overrideRequesterId ?? "",
      overrideRequesterPersona: input.overrideRequesterPersona ?? "",
      overridePreservedPermanently: true,
      additionalDocumentationProvidedReferenceIds: getInputArray(input.additionalDocumentationProvidedReferenceIds),
      postOverrideVerificationRequired: input.postOverrideVerificationRequired === true,
      declineWarningState,
      linkedAuditLogReferenceId: input.linkedAuditLogReferenceId ?? "",
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
