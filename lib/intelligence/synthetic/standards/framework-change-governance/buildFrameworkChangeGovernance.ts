import { stableSnapshotHash } from "../../../core/hash";
import type {
  FrameworkChangeType,
  StandardsBaseContract,
  StandardsReportingFramework,
} from "../contracts";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface BuildFrameworkChangeGovernanceInput extends Partial<StandardsBaseContract> {
  entityId?: string;
  frameworkChangeRequestReferenceId?: string;
  changeType?: FrameworkChangeType;
  fromFramework?: StandardsReportingFramework;
  toFramework?: StandardsReportingFramework;
  reasonCode?: string;
  conversionImpactAnalysisReferenceId?: string;
  requiredApproverRoles?: string[];
  approverReferenceIds?: string[];
  changeLogEntryReferenceId?: string;
  conversionProjectPlanReferenceId?: string;
  downstreamNotificationReferenceIds?: string[];
  approvalStatus?: ApprovalStatus;
  frameworkChangeGovernanceComplete?: boolean;
}

export interface SyntheticFrameworkChangeGovernance extends StandardsBaseContract {
  frameworkChangeGovernanceId: string;
  frameworkChangeGovernanceKey: string;
  entityId: string;
  frameworkChangeRequestReferenceId: string;
  changeType: FrameworkChangeType;
  fromFramework: StandardsReportingFramework;
  toFramework: StandardsReportingFramework;
  reasonCode: string;
  frameworkChangeIsGovernedEventNotToggle: true;
  primaryChangeRequiresReasonCode: true;
  primaryChangeRequiresConversionImpactAnalysis: true;
  conversionImpactAnalysisReferenceId: string;
  primaryChangeRequiresMultiPartyApproval: true;
  requiredApproverRoles: string[];
  approverReferenceIds: string[];
  secondaryChangeRequiresSingleApprover: true;
  allChangesLogged: true;
  changeLogEntryReferenceId: string;
  changeLogAppendOnlyImmutable: true;
  historicalBooksRemainImmutableUnderPriorFramework: true;
  conversionProjectPlanReferenceId: string;
  downstreamNotificationReferenceIds: string[];
  notifiesConsolidationTaxReportingCompliance: true;
  approvalStatus: ApprovalStatus;
  changeAppliedOnlyWhenApproved: true;
  frameworkChangeGovernanceComplete: boolean;
}

export interface BuildFrameworkChangeGovernanceResult {
  frameworkChangeGovernance: SyntheticFrameworkChangeGovernance | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function isPrimaryChange(changeType: FrameworkChangeType | undefined): boolean {
  return changeType === "primary_change";
}

function isSecondaryChange(changeType: FrameworkChangeType | undefined): boolean {
  return changeType === "secondary_add" || changeType === "secondary_remove";
}

function hasMultiPartyApproval(input: BuildFrameworkChangeGovernanceInput): boolean {
  const requiredApproverRoles = getInputArray(input.requiredApproverRoles);
  const approverReferenceIds = getInputArray(input.approverReferenceIds);

  if (requiredApproverRoles.length === 0) {
    return approverReferenceIds.length >= 2;
  }

  return approverReferenceIds.length >= requiredApproverRoles.length;
}

function hasSingleApprover(input: BuildFrameworkChangeGovernanceInput): boolean {
  return getInputArray(input.approverReferenceIds).length >= 1;
}

function hasPrimaryChangeRequirements(input: BuildFrameworkChangeGovernanceInput): boolean {
  return (
    hasValue(input.reasonCode) &&
    hasValue(input.conversionImpactAnalysisReferenceId) &&
    hasMultiPartyApproval(input)
  );
}

function hasSecondaryChangeRequirements(input: BuildFrameworkChangeGovernanceInput): boolean {
  return hasSingleApprover(input);
}

function getApprovalStatus(input: BuildFrameworkChangeGovernanceInput): ApprovalStatus {
  if (input.approvalStatus === "rejected") {
    return "rejected";
  }

  if (isPrimaryChange(input.changeType) && !hasPrimaryChangeRequirements(input)) {
    return "pending";
  }

  if (isSecondaryChange(input.changeType) && !hasSecondaryChangeRequirements(input)) {
    return "pending";
  }

  return input.approvalStatus === "approved" ? "approved" : "pending";
}

function getSharedBase(input: Partial<StandardsBaseContract>): StandardsBaseContract {
  return {
    phase40OrganizationalHandoffHandle: input.phase40OrganizationalHandoffHandle ?? "",
    phase40_5IntegrationHandoffHandle: input.phase40_5IntegrationHandoffHandle ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase40_5SnapshotHash: input.boundPhase40_5SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    phase41_5StaleMarker: input.phase41_5StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
    reportingFramework: input.reportingFramework as StandardsReportingFramework,
    containsPHI: getContainsPHI(input.containsPHI),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
    derivationHash: "",
    confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
    sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
    evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
    lineageReferenceIds: getInputArray(input.lineageReferenceIds),
    trustMetadata: getInputArray(input.trustMetadata),
    confidenceMetadata: getInputArray(input.confidenceMetadata),
    governanceMetadata: getInputArray(input.governanceMetadata),
    warnings: getInputArray(input.warnings),
    skippedIndexes: getInputArray(input.skippedIndexes),
  } as StandardsBaseContract;
}

function collectMissingRequiredIdentifiers(input: BuildFrameworkChangeGovernanceInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.entityId)) {
    missing.push("entityId");
  }

  if (!input.changeType) {
    missing.push("changeType");
  }

  if (!hasValue(input.frameworkChangeRequestReferenceId)) {
    missing.push("frameworkChangeRequestReferenceId");
  }

  if (!input.fromFramework) {
    missing.push("fromFramework");
  }

  if (!input.reportingFramework) {
    missing.push("reportingFramework");
  }

  if (!hasValue(input.boundPhase40SnapshotHash)) {
    missing.push("boundPhase40SnapshotHash");
  }

  if (!hasValue(input.boundPhase40_5SnapshotHash)) {
    missing.push("boundPhase40_5SnapshotHash");
  }

  if (!hasValue(input.boundPhase39SnapshotHash)) {
    missing.push("boundPhase39SnapshotHash");
  }

  if (!hasValue(input.boundPhase38SnapshotHash)) {
    missing.push("boundPhase38SnapshotHash");
  }

  if (!input.scope) {
    missing.push("scope");
  }

  if (!input.customerIsolation) {
    missing.push("customerIsolation");
  }

  if (!input.firmIsolation) {
    missing.push("firmIsolation");
  }

  if (!input.clientIsolation) {
    missing.push("clientIsolation");
  }

  return missing;
}

function buildFrameworkChangeGovernanceKey(input: BuildFrameworkChangeGovernanceInput): string {
  return stableSnapshotHash({
    entityId: input.entityId ?? "",
    frameworkChangeRequestReferenceId: input.frameworkChangeRequestReferenceId ?? "",
    changeType: input.changeType ?? "",
    fromFramework: input.fromFramework ?? "",
    toFramework: input.toFramework ?? "",
    reasonCode: input.reasonCode ?? "",
    conversionImpactAnalysisReferenceId: input.conversionImpactAnalysisReferenceId ?? "",
    requiredApproverRoles: getInputArray(input.requiredApproverRoles),
    approverReferenceIds: getInputArray(input.approverReferenceIds),
    changeLogEntryReferenceId: input.changeLogEntryReferenceId ?? "",
    conversionProjectPlanReferenceId: input.conversionProjectPlanReferenceId ?? "",
    downstreamNotificationReferenceIds: getInputArray(input.downstreamNotificationReferenceIds),
    approvalStatus: getApprovalStatus(input),
  });
}

function buildFrameworkChangeGovernanceId(input: BuildFrameworkChangeGovernanceInput): string {
  return `synthetic-framework-change-governance:${stableSnapshotHash({
    frameworkChangeGovernanceKey: buildFrameworkChangeGovernanceKey(input),
    artifactType: "SyntheticFrameworkChangeGovernance",
  })}`;
}

function buildDerivationHash(input: BuildFrameworkChangeGovernanceInput): string {
  return stableSnapshotHash({
    frameworkChangeGovernanceKey: buildFrameworkChangeGovernanceKey(input),
    frameworkChangeIsGovernedEventNotToggle: true,
    primaryChangeRequiresReasonCode: true,
    primaryChangeRequiresConversionImpactAnalysis: true,
    primaryChangeRequiresMultiPartyApproval: true,
    secondaryChangeRequiresSingleApprover: true,
    allChangesLogged: true,
    changeLogAppendOnlyImmutable: true,
    historicalBooksRemainImmutableUnderPriorFramework: true,
    notifiesConsolidationTaxReportingCompliance: true,
    changeAppliedOnlyWhenApproved: true,
    approvalStatus: getApprovalStatus(input),
  });
}

function getWarnings(
  input: BuildFrameworkChangeGovernanceInput,
  approvalStatus: ApprovalStatus,
): string[] {
  const requiredApproverRoles = getInputArray(input.requiredApproverRoles);

  return [
    ...getInputArray(input.warnings),
    ...(isPrimaryChange(input.changeType) && !hasValue(input.reasonCode)
      ? ["primary framework change requires a reason code; approval remains pending until supplied"]
      : []),
    ...(isPrimaryChange(input.changeType) && !hasValue(input.conversionImpactAnalysisReferenceId)
      ? ["primary framework change requires conversion impact analysis; approval remains pending until supplied"]
      : []),
    ...(isPrimaryChange(input.changeType) && !hasMultiPartyApproval(input)
      ? [
          requiredApproverRoles.length > 0
            ? `primary framework change requires multi-party approval for roles: ${requiredApproverRoles.join(", ")}`
            : "primary framework change requires multi-party approval from at least two approvers",
        ]
      : []),
    ...(isSecondaryChange(input.changeType) && !hasSingleApprover(input)
      ? ["secondary framework change requires a single approver; approval remains pending until supplied"]
      : []),
    ...(approvalStatus === "pending" && input.approvalStatus === "approved"
      ? ["framework change approval rejected because required governance prerequisites are not satisfied"]
      : []),
    ...(approvalStatus === "pending" || approvalStatus === "rejected"
      ? ["framework change is applied only when approvalStatus is approved; pending or rejected changes are never applied"]
      : []),
    ...(approvalStatus === "approved" && getInputArray(input.downstreamNotificationReferenceIds).length === 0
      ? ["approved framework change should emit downstream notifications for consolidation, tax, reporting, and Phase 42.5 compliance"]
      : []),
    ...(!hasValue(input.changeLogEntryReferenceId)
      ? ["every framework change must be recorded in an append-only immutable change log via changeLogEntryReferenceId"]
      : []),
    "metadata-only framework change governance contract; live governed change, multi-party approval, and conversion projects are deferred to real-data validation",
  ];
}

export function buildFrameworkChangeGovernance(
  input: BuildFrameworkChangeGovernanceInput,
): BuildFrameworkChangeGovernanceResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      frameworkChangeGovernance: null,
      skipped: true,
      warnings: [
        `missing required framework change governance identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredEntityId = input.entityId as string;
  const requiredChangeType = input.changeType as FrameworkChangeType;
  const requiredFrameworkChangeRequestReferenceId = input.frameworkChangeRequestReferenceId as string;
  const requiredFromFramework = input.fromFramework as StandardsReportingFramework;
  const approvalStatus = getApprovalStatus(input);
  const base = getSharedBase(input);
  const frameworkChangeGovernance: SyntheticFrameworkChangeGovernance = {
    ...base,
    frameworkChangeGovernanceId: buildFrameworkChangeGovernanceId(input),
    frameworkChangeGovernanceKey: buildFrameworkChangeGovernanceKey(input),
    entityId: requiredEntityId,
    frameworkChangeRequestReferenceId: requiredFrameworkChangeRequestReferenceId,
    changeType: requiredChangeType,
    fromFramework: requiredFromFramework,
    toFramework: input.toFramework ?? requiredFromFramework,
    reasonCode: input.reasonCode ?? "",
    frameworkChangeIsGovernedEventNotToggle: true,
    primaryChangeRequiresReasonCode: true,
    primaryChangeRequiresConversionImpactAnalysis: true,
    conversionImpactAnalysisReferenceId: input.conversionImpactAnalysisReferenceId ?? "",
    primaryChangeRequiresMultiPartyApproval: true,
    requiredApproverRoles: getInputArray(input.requiredApproverRoles),
    approverReferenceIds: getInputArray(input.approverReferenceIds),
    secondaryChangeRequiresSingleApprover: true,
    allChangesLogged: true,
    changeLogEntryReferenceId: input.changeLogEntryReferenceId ?? "",
    changeLogAppendOnlyImmutable: true,
    historicalBooksRemainImmutableUnderPriorFramework: true,
    conversionProjectPlanReferenceId: input.conversionProjectPlanReferenceId ?? "",
    downstreamNotificationReferenceIds: getInputArray(input.downstreamNotificationReferenceIds),
    notifiesConsolidationTaxReportingCompliance: true,
    approvalStatus,
    changeAppliedOnlyWhenApproved: true,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, approvalStatus),
    frameworkChangeGovernanceComplete:
      input.frameworkChangeGovernanceComplete === true && approvalStatus === "approved",
  };

  return {
    frameworkChangeGovernance,
    skipped: false,
    warnings: frameworkChangeGovernance.warnings,
  };
}
