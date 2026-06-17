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

export type SyntheticMorningSummaryTargetPersona =
  | "controller"
  | "cfo"
  | "manager"
  | "partner"
  | "audit_manager";

export type SyntheticMorningSummaryChannel = "email" | "pulse" | "both";

export type SyntheticMorningSummaryStatus = "prepared" | "not_prepared";

export interface BuildMorningSummaryInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  overnightScheduleReferenceId?: string;
  pulseQueueReferenceId?: string;
  summaryTargetPersona?: SyntheticMorningSummaryTargetPersona;
  summaryTargetUserId?: string;
  summaryChannel?: SyntheticMorningSummaryChannel;
  summaryDate?: string;
  completedTaskReferenceIds?: string[];
  completedTaskCount?: number;
  completedOutputReferenceIds?: string[];
  completedWorkpaperReferenceIds?: string[];
  driveOutputPlacementReferenceIds?: string[];
  declinedTaskReferenceIds?: string[];
  declineWarningReferenceIds?: string[];
  exceptionsFlaggedReferenceIds?: string[];
  decisionsRequiredReferenceIds?: string[];
  fraudFlagEscalationReferenceIds?: string[];
  reasonablenessFlagEscalationReferenceIds?: string[];
  realizationSheetUpdateReferenceIds?: string[];
  itemsRequiringHumanDecisionCount?: number;
  summaryNarrativeReference?: string;
  linkedAuditLogReferenceId?: string;
  morningReviewReady?: boolean;
  summaryStatus?: SyntheticMorningSummaryStatus;
  commercialPositioningNote?: string;
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

export interface SyntheticMorningSummary {
  morningSummaryId: string;
  morningSummaryKey: string;
  roleType: SyntheticRoleType | "";
  roleInstanceId: string;
  overnightScheduleReferenceId: string;
  pulseQueueReferenceId: string;
  summaryTargetPersona: SyntheticMorningSummaryTargetPersona;
  summaryTargetUserId: string;
  summaryChannel: SyntheticMorningSummaryChannel;
  summaryDate: string;
  completedTaskReferenceIds: string[];
  completedTaskCount: number;
  completedOutputReferenceIds: string[];
  completedWorkpaperReferenceIds: string[];
  driveOutputPlacementReferenceIds: string[];
  declinedTaskReferenceIds: string[];
  declineWarningReferenceIds: string[];
  exceptionsFlaggedReferenceIds: string[];
  decisionsRequiredReferenceIds: string[];
  fraudFlagEscalationReferenceIds: string[];
  reasonablenessFlagEscalationReferenceIds: string[];
  realizationSheetUpdateReferenceIds: string[];
  itemsRequiringHumanDecisionCount: number;
  summaryNarrativeReference: string;
  linkedAuditLogReferenceId: string;
  summaryPreservesTraceability: true;
  morningReviewReady: boolean;
  summaryStatus: SyntheticMorningSummaryStatus;
  commercialPositioningNote: string;
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

export interface BuildMorningSummaryResult {
  morningSummary: SyntheticMorningSummary | null;
  skipped: boolean;
  warnings: string[];
}

export const MORNING_SUMMARY_COMMERCIAL_POSITIONING_NOTE =
  "Wake up to completed work: the human comes in to a completed workload with overnight activity summarized and items needing decisions clearly highlighted.";

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getBoundPhase38SnapshotHash(input: BuildMorningSummaryInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildMorningSummaryInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildMorningSummaryInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildMorningSummaryInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildMorningSummaryInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildMorningSummaryInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildMorningSummaryInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildMorningSummaryInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildMorningSummaryInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function getSummaryStatus(input: BuildMorningSummaryInput): SyntheticMorningSummaryStatus {
  return input.summaryStatus ?? "prepared";
}

function getCompletedTaskCount(input: BuildMorningSummaryInput): number {
  return input.completedTaskCount ?? getInputArray(input.completedTaskReferenceIds).length;
}

function getItemsRequiringHumanDecisionCount(input: BuildMorningSummaryInput): number {
  return input.itemsRequiringHumanDecisionCount ?? getInputArray(input.decisionsRequiredReferenceIds).length;
}

function getCommercialPositioningNote(input: BuildMorningSummaryInput): string {
  return input.commercialPositioningNote ?? MORNING_SUMMARY_COMMERCIAL_POSITIONING_NOTE;
}

function collectMissingRequiredIdentifiers(input: BuildMorningSummaryInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.summaryTargetPersona)) {
    missing.push("summaryTargetPersona");
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

function buildDerivationHash(input: BuildMorningSummaryInput): string {
  return stableSnapshotHash({
    roleType: input.roleType ?? "",
    roleInstanceId: input.roleInstanceId,
    overnightScheduleReferenceId: input.overnightScheduleReferenceId ?? "",
    pulseQueueReferenceId: input.pulseQueueReferenceId ?? "",
    summaryTargetPersona: input.summaryTargetPersona,
    summaryTargetUserId: input.summaryTargetUserId ?? "",
    summaryChannel: input.summaryChannel ?? "pulse",
    summaryDate: input.summaryDate ?? "",
    completedTaskReferenceIds: getInputArray(input.completedTaskReferenceIds),
    completedTaskCount: getCompletedTaskCount(input),
    completedOutputReferenceIds: getInputArray(input.completedOutputReferenceIds),
    completedWorkpaperReferenceIds: getInputArray(input.completedWorkpaperReferenceIds),
    driveOutputPlacementReferenceIds: getInputArray(input.driveOutputPlacementReferenceIds),
    declinedTaskReferenceIds: getInputArray(input.declinedTaskReferenceIds),
    declineWarningReferenceIds: getInputArray(input.declineWarningReferenceIds),
    exceptionsFlaggedReferenceIds: getInputArray(input.exceptionsFlaggedReferenceIds),
    decisionsRequiredReferenceIds: getInputArray(input.decisionsRequiredReferenceIds),
    fraudFlagEscalationReferenceIds: getInputArray(input.fraudFlagEscalationReferenceIds),
    reasonablenessFlagEscalationReferenceIds: getInputArray(input.reasonablenessFlagEscalationReferenceIds),
    realizationSheetUpdateReferenceIds: getInputArray(input.realizationSheetUpdateReferenceIds),
    itemsRequiringHumanDecisionCount: getItemsRequiringHumanDecisionCount(input),
    summaryNarrativeReference: input.summaryNarrativeReference ?? "",
    linkedAuditLogReferenceId: input.linkedAuditLogReferenceId ?? "",
    summaryPreservesTraceability: true,
    morningReviewReady: input.morningReviewReady === true,
    summaryStatus: getSummaryStatus(input),
    commercialPositioningNote: getCommercialPositioningNote(input),
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildMorningSummary(input: BuildMorningSummaryInput): BuildMorningSummaryResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      morningSummary: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType ?? "";
  const roleInstanceId = input.roleInstanceId as string;
  const summaryTargetPersona = input.summaryTargetPersona as SyntheticMorningSummaryTargetPersona;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const summaryChannel = input.summaryChannel ?? "pulse";
  const summaryStatus = getSummaryStatus(input);
  const completedTaskCount = getCompletedTaskCount(input);
  const itemsRequiringHumanDecisionCount = getItemsRequiringHumanDecisionCount(input);
  const derivationHash = buildDerivationHash(input);
  const morningSummaryKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    overnightScheduleReferenceId: input.overnightScheduleReferenceId ?? "",
    summaryTargetPersona,
    summaryTargetUserId: input.summaryTargetUserId ?? "",
    summaryDate: input.summaryDate ?? "",
    companyId,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const morningSummaryId = stableSnapshotHash({
    morningSummaryKey,
    artifactType: "SyntheticMorningSummary",
  });

  return {
    morningSummary: {
      morningSummaryId,
      morningSummaryKey,
      roleType,
      roleInstanceId,
      overnightScheduleReferenceId: input.overnightScheduleReferenceId ?? "",
      pulseQueueReferenceId: input.pulseQueueReferenceId ?? "",
      summaryTargetPersona,
      summaryTargetUserId: input.summaryTargetUserId ?? "",
      summaryChannel,
      summaryDate: input.summaryDate ?? "",
      completedTaskReferenceIds: getInputArray(input.completedTaskReferenceIds),
      completedTaskCount,
      completedOutputReferenceIds: getInputArray(input.completedOutputReferenceIds),
      completedWorkpaperReferenceIds: getInputArray(input.completedWorkpaperReferenceIds),
      driveOutputPlacementReferenceIds: getInputArray(input.driveOutputPlacementReferenceIds),
      declinedTaskReferenceIds: getInputArray(input.declinedTaskReferenceIds),
      declineWarningReferenceIds: getInputArray(input.declineWarningReferenceIds),
      exceptionsFlaggedReferenceIds: getInputArray(input.exceptionsFlaggedReferenceIds),
      decisionsRequiredReferenceIds: getInputArray(input.decisionsRequiredReferenceIds),
      fraudFlagEscalationReferenceIds: getInputArray(input.fraudFlagEscalationReferenceIds),
      reasonablenessFlagEscalationReferenceIds: getInputArray(input.reasonablenessFlagEscalationReferenceIds),
      realizationSheetUpdateReferenceIds: getInputArray(input.realizationSheetUpdateReferenceIds),
      itemsRequiringHumanDecisionCount,
      summaryNarrativeReference: input.summaryNarrativeReference ?? "",
      linkedAuditLogReferenceId: input.linkedAuditLogReferenceId ?? "",
      summaryPreservesTraceability: true,
      morningReviewReady: input.morningReviewReady === true,
      summaryStatus,
      commercialPositioningNote: getCommercialPositioningNote(input),
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
