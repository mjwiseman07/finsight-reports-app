import type {
  AuditEventContract,
  ControlSpineIsolationDimension,
  OverlayAttachmentContract,
} from "../../control-spine/contracts";
import {
  evaluateOverlayDiscipline,
  type ControlSpineOverlayDisciplineEvaluationResult,
  type OverlayAttachmentAttemptDescriptor,
  type OverlayDisciplineOutcome,
} from "../overlay-discipline";

export type OverlayActivationRecordStatus = "active" | "rejected";

export type OverlayActivationResolutionOutcome = "active" | "not_active";

export type OverlayActivationResolutionReason =
  | "affirmative_disciplined_activation"
  | "no_matching_activation_record"
  | "ambiguous_activation_scope"
  | "fail_closed_default";

export interface OverlayTenantActivationScope {
  customerTenantId: string;
  firmTenantId: string;
  clientTenantId: string;
  customerIsolation: ControlSpineIsolationDimension;
  firmIsolation: ControlSpineIsolationDimension;
  clientIsolation: ControlSpineIsolationDimension;
  activationScopeReferenceId: string;
}

export interface BuildOverlayActivationRecordInput {
  actorReferenceId: string;
  attachmentAttempt: OverlayAttachmentAttemptDescriptor;
  tenantActivationScope: OverlayTenantActivationScope;
  evaluationTimestampIso: string;
  retentionConfigurationReferenceId: string;
}

export interface OverlayActivationRecord {
  overlayActivationRecordId: string;
  overlayActivationRecordKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  overlayRegistryKey: string;
  tenantActivationScope: OverlayTenantActivationScope;
  targetSlotReferenceId: string;
  attachmentContractReferenceId: string;
  disciplineResultReferenceId: string;
  disciplineOutcome: OverlayDisciplineOutcome;
  activationRecordStatus: OverlayActivationRecordStatus;
  activationResolution: OverlayActivationResolutionOutcome;
  buildTrace: string[];
  disciplineEvaluationTrace: string[];
  auditEvent: AuditEventContract;
}

export interface OverlayActivationRecordBuildResult {
  overlayActivationRecordBuildResultId: string;
  overlayActivationRecordBuildResultKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  buildTrace: string[];
  activationRecord: OverlayActivationRecord;
}

export interface OverlayActivationRegistry {
  overlayActivationRegistryId: string;
  overlayActivationRegistryKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  activationRecords: OverlayActivationRecord[];
}

export interface ResolveOverlayActivationInput {
  registry: OverlayActivationRegistry;
  tenantActivationScope: OverlayTenantActivationScope;
  overlayRegistryKey: string;
}

export interface OverlayActivationResolutionResult {
  overlayActivationResolutionResultId: string;
  overlayActivationResolutionResultKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  overlayRegistryKey: string;
  resolutionOutcome: OverlayActivationResolutionOutcome;
  resolutionReason: OverlayActivationResolutionReason;
  matchedActivationRecordId: string | null;
  evaluationTrace: string[];
}

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildDeterministicId(prefix: string, parts: string[]): string {
  return `${prefix}:${parts.filter(Boolean).join(":")}`;
}

function validateTenantActivationScope(
  scope: OverlayTenantActivationScope | null | undefined,
): { valid: true; scope: OverlayTenantActivationScope } | { valid: false } {
  if (!scope) {
    return { valid: false };
  }

  if (
    !hasValue(scope.customerTenantId) ||
    !hasValue(scope.firmTenantId) ||
    !hasValue(scope.clientTenantId) ||
    !hasValue(scope.activationScopeReferenceId)
  ) {
    return { valid: false };
  }

  const dimensions: ControlSpineIsolationDimension[] = [
    scope.customerIsolation,
    scope.firmIsolation,
    scope.clientIsolation,
  ];

  for (const dimension of dimensions) {
    if (
      !hasValue(dimension.isolationDimensionReferenceId) ||
      !hasValue(dimension.tenantScopeKey) ||
      !Array.isArray(dimension.boundaryReferenceIds)
    ) {
      return { valid: false };
    }
  }

  if (scope.customerIsolation.tenantScopeKey !== scope.customerTenantId) {
    return { valid: false };
  }

  if (scope.firmIsolation.tenantScopeKey !== scope.firmTenantId) {
    return { valid: false };
  }

  if (scope.clientIsolation.tenantScopeKey !== scope.clientTenantId) {
    return { valid: false };
  }

  return { valid: true, scope };
}

function tenantScopeMatchesContract(
  scope: OverlayTenantActivationScope,
  contract: OverlayAttachmentContract,
): boolean {
  return (
    scope.customerTenantId === contract.customerIsolation.tenantScopeKey &&
    scope.firmTenantId === contract.firmIsolation.tenantScopeKey &&
    scope.clientTenantId === contract.clientIsolation.tenantScopeKey
  );
}

function isolationDimensionsMatch(
  left: OverlayTenantActivationScope,
  right: OverlayTenantActivationScope,
): boolean {
  return (
    left.customerTenantId === right.customerTenantId &&
    left.firmTenantId === right.firmTenantId &&
    left.clientTenantId === right.clientTenantId &&
    left.customerIsolation.tenantScopeKey === right.customerIsolation.tenantScopeKey &&
    left.firmIsolation.tenantScopeKey === right.firmIsolation.tenantScopeKey &&
    left.clientIsolation.tenantScopeKey === right.clientIsolation.tenantScopeKey &&
    left.activationScopeReferenceId === right.activationScopeReferenceId
  );
}

export function createOverlayActivationRegistry(registryKey: string): OverlayActivationRegistry {
  return {
    overlayActivationRegistryId: buildDeterministicId("overlay-activation-registry", [registryKey]),
    overlayActivationRegistryKey: registryKey,
    containsVerticalComplianceLogic: false,
    executable: false,
    activationRecords: [],
  };
}

/**
 * Records overlay activation state only when 42.5H discipline passes.
 * Discipline violations are persisted as rejected — never active.
 */
export function buildOverlayActivationRecord(
  input: BuildOverlayActivationRecordInput,
): OverlayActivationRecordBuildResult {
  const buildTrace: string[] = [
    "buildOverlayActivationRecord:start",
    "policy:discipline_gated_activation",
    "invariant:regime_blind_registry",
  ];

  const scopeValidation = validateTenantActivationScope(input.tenantActivationScope);
  if (!scopeValidation.valid) {
    buildTrace.push("scope:ambiguous_or_missing");

    const rejectedRecord = buildRejectedActivationRecord(input, {
      disciplineResultReferenceId: buildDeterministicId("overlay-discipline-eval", [
        "rejected",
        "ambiguous_scope",
      ]),
      disciplineOutcome: "violation",
      buildTrace,
      disciplineEvaluationTrace: ["discipline:bypassed_due_to_ambiguous_scope"],
      auditEvent: buildFallbackAuditEvent(input, buildTrace),
      rejectionReasonKey: "ambiguous_scope",
    });

    return wrapBuildResult(rejectedRecord, buildTrace);
  }

  const tenantActivationScope = scopeValidation.scope;
  buildTrace.push(`scope:valid:${tenantActivationScope.activationScopeReferenceId}`);

  const disciplineEvaluation: ControlSpineOverlayDisciplineEvaluationResult = evaluateOverlayDiscipline({
    actorReferenceId: input.actorReferenceId,
    attachmentAttempt: input.attachmentAttempt,
    evaluationTimestampIso: input.evaluationTimestampIso,
    retentionConfigurationReferenceId: input.retentionConfigurationReferenceId,
  });

  buildTrace.push(
    `discipline:evaluated:${disciplineEvaluation.overlayDisciplineEvaluationResultId}`,
    `discipline:outcome:${disciplineEvaluation.disciplineOutcome}`,
  );

  const contract = input.attachmentAttempt.attachmentContract;
  const scopeAlignedWithContract = tenantScopeMatchesContract(tenantActivationScope, contract);
  buildTrace.push(`scope:contract_alignment:${scopeAlignedWithContract ? "match" : "mismatch"}`);

  const disciplinePassed = disciplineEvaluation.disciplineOutcome === "disciplined";
  const activationEligible = disciplinePassed && scopeAlignedWithContract;

  if (!disciplinePassed) {
    buildTrace.push("activation:rejected_discipline_violation");
  } else if (!scopeAlignedWithContract) {
    buildTrace.push("activation:rejected_scope_contract_mismatch");
  } else {
    buildTrace.push("activation:recorded_active");
  }

  const activationRecordStatus: OverlayActivationRecordStatus = activationEligible ? "active" : "rejected";
  const activationResolution: OverlayActivationResolutionOutcome = activationEligible ? "active" : "not_active";

  const activationRecord: OverlayActivationRecord = {
    overlayActivationRecordId: buildDeterministicId("overlay-activation-record", [
      contract.overlayRegistryKey,
      tenantActivationScope.activationScopeReferenceId,
      activationRecordStatus,
      disciplineEvaluation.overlayDisciplineEvaluationResultId,
    ]),
    overlayActivationRecordKey: `overlay-activation:${contract.overlayRegistryKey}:${activationRecordStatus}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    overlayRegistryKey: contract.overlayRegistryKey,
    tenantActivationScope,
    targetSlotReferenceId: input.attachmentAttempt.targetSlotReferenceId,
    attachmentContractReferenceId: contract.overlayAttachmentContractId,
    disciplineResultReferenceId: disciplineEvaluation.overlayDisciplineEvaluationResultId,
    disciplineOutcome: disciplineEvaluation.disciplineOutcome,
    activationRecordStatus,
    activationResolution,
    buildTrace: [...buildTrace],
    disciplineEvaluationTrace: [...disciplineEvaluation.evaluationTrace],
    auditEvent: disciplineEvaluation.auditEvent,
  };

  return wrapBuildResult(activationRecord, buildTrace);
}

function buildRejectedActivationRecord(
  input: BuildOverlayActivationRecordInput,
  rejected: {
    disciplineResultReferenceId: string;
    disciplineOutcome: OverlayDisciplineOutcome;
    buildTrace: string[];
    disciplineEvaluationTrace: string[];
    auditEvent: AuditEventContract;
    rejectionReasonKey: string;
  },
): OverlayActivationRecord {
  const contract = input.attachmentAttempt.attachmentContract;
  const scope = input.tenantActivationScope;

  return {
    overlayActivationRecordId: buildDeterministicId("overlay-activation-record", [
      contract.overlayRegistryKey,
      scope.activationScopeReferenceId,
      "rejected",
      rejected.rejectionReasonKey,
    ]),
    overlayActivationRecordKey: `overlay-activation:${contract.overlayRegistryKey}:rejected`,
    containsVerticalComplianceLogic: false,
    executable: false,
    overlayRegistryKey: contract.overlayRegistryKey,
    tenantActivationScope: scope,
    targetSlotReferenceId: input.attachmentAttempt.targetSlotReferenceId,
    attachmentContractReferenceId: contract.overlayAttachmentContractId,
    disciplineResultReferenceId: rejected.disciplineResultReferenceId,
    disciplineOutcome: rejected.disciplineOutcome,
    activationRecordStatus: "rejected",
    activationResolution: "not_active",
    buildTrace: rejected.buildTrace,
    disciplineEvaluationTrace: rejected.disciplineEvaluationTrace,
    auditEvent: rejected.auditEvent,
  };
}

function buildFallbackAuditEvent(
  input: BuildOverlayActivationRecordInput,
  buildTrace: string[],
): AuditEventContract {
  const contract = input.attachmentAttempt.attachmentContract;

  return {
    auditEventContractId: buildDeterministicId("audit", [
      input.actorReferenceId,
      input.attachmentAttempt.overlayAttachmentAttemptReferenceId,
      "rejected",
    ]),
    auditEventKey: "overlay-activation:rejected",
    containsVerticalComplianceLogic: false,
    executable: false,
    customerIsolation: contract.customerIsolation,
    firmIsolation: contract.firmIsolation,
    clientIsolation: contract.clientIsolation,
    eventCategory: "configuration",
    eventOutcome: "denied",
    actorReferenceId: input.actorReferenceId,
    targetResourceReferenceId: input.attachmentAttempt.overlayAttachmentAttemptReferenceId,
    eventTimestampIso: input.evaluationTimestampIso,
    retentionConfigurationReferenceId: input.retentionConfigurationReferenceId,
    auditTrailReferenceIds: [...buildTrace],
  };
}

function wrapBuildResult(
  activationRecord: OverlayActivationRecord,
  buildTrace: string[],
): OverlayActivationRecordBuildResult {
  return {
    overlayActivationRecordBuildResultId: buildDeterministicId("overlay-activation-build", [
      activationRecord.overlayActivationRecordId,
    ]),
    overlayActivationRecordBuildResultKey: `overlay-activation-build:${activationRecord.activationRecordStatus}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    buildTrace,
    activationRecord,
  };
}

/**
 * Fail-closed activation resolver — PC-07 heart.
 * Returns active only for an affirmative, discipline-passing record at the exact tenant scope.
 */
export function resolveOverlayActivation(
  input: ResolveOverlayActivationInput,
): OverlayActivationResolutionResult {
  const evaluationTrace: string[] = [
    "resolveOverlayActivation:start",
    "policy:fail_closed_not_active_by_default",
    "invariant:regime_blind_registry",
  ];

  if (!hasValue(input.overlayRegistryKey)) {
    evaluationTrace.push("overlay_key:missing");
    return notActiveResult(input.overlayRegistryKey, "ambiguous_activation_scope", evaluationTrace);
  }

  evaluationTrace.push(`overlay_key:${input.overlayRegistryKey}`);

  const scopeValidation = validateTenantActivationScope(input.tenantActivationScope);
  if (!scopeValidation.valid) {
    evaluationTrace.push("scope:ambiguous_or_missing");
    return notActiveResult(input.overlayRegistryKey, "ambiguous_activation_scope", evaluationTrace);
  }

  const tenantActivationScope = scopeValidation.scope;
  evaluationTrace.push(`scope:valid:${tenantActivationScope.activationScopeReferenceId}`);

  const activeMatches = input.registry.activationRecords.filter((record) => {
    if (record.overlayRegistryKey !== input.overlayRegistryKey) {
      return false;
    }

    if (record.activationRecordStatus !== "active") {
      return false;
    }

    if (record.disciplineOutcome !== "disciplined") {
      return false;
    }

    return isolationDimensionsMatch(record.tenantActivationScope, tenantActivationScope);
  });

  if (activeMatches.length === 0) {
    evaluationTrace.push("match:none");
    return notActiveResult(
      input.overlayRegistryKey,
      "no_matching_activation_record",
      evaluationTrace,
    );
  }

  if (activeMatches.length > 1) {
    evaluationTrace.push("match:ambiguous_multiple_active_records");
    return notActiveResult(input.overlayRegistryKey, "ambiguous_activation_scope", evaluationTrace);
  }

  const matchedRecord = activeMatches[0];
  evaluationTrace.push(
    `match:active_record:${matchedRecord.overlayActivationRecordId}`,
    `discipline_result:${matchedRecord.disciplineResultReferenceId}`,
    "resolution:active",
  );

  return {
    overlayActivationResolutionResultId: buildDeterministicId("overlay-activation-resolution", [
      input.overlayRegistryKey,
      tenantActivationScope.activationScopeReferenceId,
      "active",
      matchedRecord.overlayActivationRecordId,
    ]),
    overlayActivationResolutionResultKey: "overlay-activation-resolution:active",
    containsVerticalComplianceLogic: false,
    executable: false,
    overlayRegistryKey: input.overlayRegistryKey,
    resolutionOutcome: "active",
    resolutionReason: "affirmative_disciplined_activation",
    matchedActivationRecordId: matchedRecord.overlayActivationRecordId,
    evaluationTrace,
  };
}

function notActiveResult(
  overlayRegistryKey: string,
  resolutionReason: Extract<
    OverlayActivationResolutionReason,
    "no_matching_activation_record" | "ambiguous_activation_scope" | "fail_closed_default"
  >,
  evaluationTrace: string[],
): OverlayActivationResolutionResult {
  evaluationTrace.push("resolution:not_active");

  return {
    overlayActivationResolutionResultId: buildDeterministicId("overlay-activation-resolution", [
      overlayRegistryKey,
      "not_active",
      resolutionReason,
    ]),
    overlayActivationResolutionResultKey: "overlay-activation-resolution:not_active",
    containsVerticalComplianceLogic: false,
    executable: false,
    overlayRegistryKey,
    resolutionOutcome: "not_active",
    resolutionReason,
    matchedActivationRecordId: null,
    evaluationTrace,
  };
}

/** 42.5O probe export — PC-07 non-overlay attachment coverage detector. */
export function detectNonOverlayAttachmentCoverage(input: ResolveOverlayActivationInput): boolean {
  return resolveOverlayActivation(input).resolutionOutcome === "not_active";
}

export function appendOverlayActivationRecord(
  registry: OverlayActivationRegistry,
  activationRecord: OverlayActivationRecord,
): OverlayActivationRegistry {
  return {
    ...registry,
    activationRecords: [...registry.activationRecords, activationRecord],
  };
}

export function tenantActivationScopeFromContract(
  contract: OverlayAttachmentContract,
): OverlayTenantActivationScope {
  return {
    customerTenantId: contract.customerIsolation.tenantScopeKey,
    firmTenantId: contract.firmIsolation.tenantScopeKey,
    clientTenantId: contract.clientIsolation.tenantScopeKey,
    customerIsolation: contract.customerIsolation,
    firmIsolation: contract.firmIsolation,
    clientIsolation: contract.clientIsolation,
    activationScopeReferenceId: contract.activationScopeReferenceId,
  };
}
