import type {
  AuditEventContract,
  ControlSpineIsolationDimension,
  ControlSpineOverlayAttachmentStatus,
  OverlayAttachmentContract,
} from "../../control-spine/contracts";
import { SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS } from "../../control-spine/audit/buildAuditEvent";
import {
  classifyIsolationReach,
  type ControlSpineIsolationScope,
  type ControlSpineResourceVisibilityScope,
} from "../../control-spine/isolation";

export type OverlayDisciplineOutcome = "disciplined" | "violation";

export type OverlayDisciplineAttemptedActionKind =
  | "contribute_retention_floor_via_slot"
  | "configure_opaque_through_slot"
  | "replace_spine_baseline"
  | "loosen_spine_guarantee"
  | "attach_off_slot"
  | "reference_spine_internals"
  | "exceed_declared_scope"
  | "configure_isolation_bypass_path"
  | "unrecognized";

export type OverlayDisciplineViolationReason =
  | "fm1_replace_or_loosen_baseline"
  | "fm2_off_slot_attachment"
  | "fm2_spine_internal_reference"
  | "fm3_scope_exceedance"
  | "spine_guarantee_loosening"
  | "pc08_overlay_isolation_bypass_attempt"
  | "unrecognized_ambiguous_action"
  | "violation_by_default";

export type OverlayRetentionContributionMode =
  | "max_merge_contribution"
  | "replace_baseline"
  | "loosen_baseline";

export interface OverlayRetentionContributionDescriptor {
  contributedRetentionDurationDays: number;
  contributionMode: OverlayRetentionContributionMode;
  spineBaselineRetentionDurationDays: number;
}

export interface OverlayIsolationBypassProbeDescriptor {
  requesterPersonaKey: "firm_staff" | "firm_admin" | "client_controller" | "client_owner" | "business_owner" | "declared_persona";
  requesterPersonaReferenceId: string;
  requesterScope: ControlSpineIsolationScope;
  targetResourceReferenceId: string;
  targetResourceVisibilityScope: ControlSpineResourceVisibilityScope;
  targetScope: ControlSpineIsolationScope;
  /** Overlay claims the configured path bypasses isolation when spine would deny. */
  claimsBypassWhenIsolationDenied: boolean;
}

export interface OverlaySpineGuaranteeLooseningFlags {
  widensIsolation: boolean;
  grantsRbacSpineDenies: boolean;
  disablesAudit: boolean;
  broadensKeyScope: boolean;
}

export interface OverlayAttachmentAttemptDescriptor {
  overlayAttachmentAttemptReferenceId: string;
  attachmentContract: OverlayAttachmentContract;
  attemptedActionKind: OverlayDisciplineAttemptedActionKind;
  targetSlotReferenceId: string;
  /** Opaque boundary reference the overlay declares this action stays within (FM-3). */
  actionScopeBoundaryReferenceId: string;
  retentionContribution?: OverlayRetentionContributionDescriptor;
  isolationBypassProbe?: OverlayIsolationBypassProbeDescriptor;
  referencesSpineInternalDirectly?: boolean;
  spineGuaranteeLoosening?: OverlaySpineGuaranteeLooseningFlags;
  actionDescriptorParseable: boolean;
}

export interface ClassifyOverlayAttachmentCore {
  disciplineOutcome: OverlayDisciplineOutcome;
  violationReason: OverlayDisciplineViolationReason | null;
  violatedFmDisciplineIds: Array<"FM-1" | "FM-2" | "FM-3">;
  poisonCaseIds: string[];
  evaluationTrace: string[];
}

export interface EvaluateOverlayDisciplineInput {
  actorReferenceId: string;
  attachmentAttempt: OverlayAttachmentAttemptDescriptor;
  evaluationTimestampIso: string;
  retentionConfigurationReferenceId: string;
}

export interface ControlSpineOverlayDisciplineEvaluationResult {
  overlayDisciplineEvaluationResultId: string;
  overlayDisciplineEvaluationResultKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  disciplineOutcome: OverlayDisciplineOutcome;
  violationReason: OverlayDisciplineViolationReason | null;
  violatedFmDisciplineIds: Array<"FM-1" | "FM-2" | "FM-3">;
  poisonCaseIds: string[];
  evaluationTrace: string[];
  auditEvent: AuditEventContract;
}

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildDeterministicEvaluationId(parts: string[]): string {
  return `overlay-discipline-eval:${parts.filter(Boolean).join(":")}`;
}

function declaredScopeBoundaryReferenceIds(contract: OverlayAttachmentContract): string[] {
  return [
    contract.activationScopeReferenceId,
    contract.regulatoryScopeStatementReferenceId,
    contract.precedenceConfigurationReferenceId,
  ];
}

function isOnDeclaredSlot(contract: OverlayAttachmentContract, slotReferenceId: string): boolean {
  return (
    hasValue(slotReferenceId) &&
    Array.isArray(contract.overlayInterfaceSlotReferenceIds) &&
    contract.overlayInterfaceSlotReferenceIds.includes(slotReferenceId)
  );
}

function isWithinDeclaredScope(contract: OverlayAttachmentContract, actionScopeBoundaryReferenceId: string): boolean {
  if (!hasValue(actionScopeBoundaryReferenceId)) {
    return false;
  }

  return declaredScopeBoundaryReferenceIds(contract).includes(actionScopeBoundaryReferenceId);
}

function violation(
  violationReason: OverlayDisciplineViolationReason,
  violatedFmDisciplineIds: Array<"FM-1" | "FM-2" | "FM-3">,
  poisonCaseIds: string[],
  evaluationTrace: string[],
): ClassifyOverlayAttachmentCore {
  return {
    disciplineOutcome: "violation",
    violationReason,
    violatedFmDisciplineIds,
    poisonCaseIds,
    evaluationTrace: [...evaluationTrace, `violation:${violationReason}`],
  };
}

function disciplined(evaluationTrace: string[]): ClassifyOverlayAttachmentCore {
  return {
    disciplineOutcome: "disciplined",
    violationReason: null,
    violatedFmDisciplineIds: [],
    poisonCaseIds: [],
    evaluationTrace: [...evaluationTrace, "discipline:configure_through_slot_only"],
  };
}

function evaluateSpineGuaranteeLoosening(
  flags: OverlaySpineGuaranteeLooseningFlags | undefined,
  evaluationTrace: string[],
): ClassifyOverlayAttachmentCore | null {
  if (!flags) {
    return null;
  }

  evaluationTrace.push("check:spine_guarantee_loosening");

  if (
    flags.widensIsolation ||
    flags.grantsRbacSpineDenies ||
    flags.disablesAudit ||
    flags.broadensKeyScope
  ) {
    return violation(
      "spine_guarantee_loosening",
      ["FM-1", "FM-2", "FM-3"],
      [],
      evaluationTrace,
    );
  }

  evaluationTrace.push("check:spine_guarantee_loosening:none_detected");
  return null;
}

function evaluateFm1RetentionContribution(
  contribution: OverlayRetentionContributionDescriptor | undefined,
  evaluationTrace: string[],
): ClassifyOverlayAttachmentCore | null {
  if (!contribution) {
    evaluationTrace.push("fm1:missing_retention_contribution_descriptor");
    return violation("unrecognized_ambiguous_action", ["FM-1"], [], evaluationTrace);
  }

  evaluationTrace.push(
    `fm1:contribution_mode:${contribution.contributionMode}`,
    `fm1:contributed_days:${contribution.contributedRetentionDurationDays}`,
    `fm1:spine_baseline_days:${contribution.spineBaselineRetentionDurationDays}`,
  );

  if (
    contribution.contributionMode === "replace_baseline" ||
    contribution.contributionMode === "loosen_baseline"
  ) {
    return violation("fm1_replace_or_loosen_baseline", ["FM-1"], [], evaluationTrace);
  }

  if (contribution.contributionMode !== "max_merge_contribution") {
    return violation("unrecognized_ambiguous_action", ["FM-1"], [], evaluationTrace);
  }

  if (contribution.contributedRetentionDurationDays < contribution.spineBaselineRetentionDurationDays) {
    return violation("fm1_replace_or_loosen_baseline", ["FM-1"], [], evaluationTrace);
  }

  evaluationTrace.push("fm1:max_merge_contribution_allowed");
  return null;
}

function evaluateFm2SlotAndInternalReference(
  attempt: OverlayAttachmentAttemptDescriptor,
  evaluationTrace: string[],
): ClassifyOverlayAttachmentCore | null {
  if (attempt.referencesSpineInternalDirectly) {
    return violation("fm2_spine_internal_reference", ["FM-2"], [], evaluationTrace);
  }

  if (!isOnDeclaredSlot(attempt.attachmentContract, attempt.targetSlotReferenceId)) {
    evaluationTrace.push(`fm2:off_slot:${attempt.targetSlotReferenceId}`);
    return violation("fm2_off_slot_attachment", ["FM-2"], [], evaluationTrace);
  }

  evaluationTrace.push(`fm2:on_declared_slot:${attempt.targetSlotReferenceId}`);
  return null;
}

function evaluateFm3Scope(
  attempt: OverlayAttachmentAttemptDescriptor,
  evaluationTrace: string[],
): ClassifyOverlayAttachmentCore | null {
  if (!isWithinDeclaredScope(attempt.attachmentContract, attempt.actionScopeBoundaryReferenceId)) {
    evaluationTrace.push(`fm3:scope_exceedance:${attempt.actionScopeBoundaryReferenceId}`);
    return violation("fm3_scope_exceedance", ["FM-3"], [], evaluationTrace);
  }

  evaluationTrace.push(`fm3:within_declared_scope:${attempt.actionScopeBoundaryReferenceId}`);
  return null;
}

function evaluatePc08IsolationBypass(
  probe: OverlayIsolationBypassProbeDescriptor | undefined,
  evaluationTrace: string[],
): ClassifyOverlayAttachmentCore | null {
  if (!probe) {
    evaluationTrace.push("pc08:missing_isolation_bypass_probe");
    return violation("unrecognized_ambiguous_action", ["FM-2", "FM-3"], ["PC-08"], evaluationTrace);
  }

  evaluationTrace.push("pc08:compose_with_spine_isolation_classifier");

  const isolationClassification = classifyIsolationReach({
    requesterPersonaKey: probe.requesterPersonaKey,
    requesterPersonaReferenceId: probe.requesterPersonaReferenceId,
    requesterScope: probe.requesterScope,
    targetResourceReferenceId: probe.targetResourceReferenceId,
    targetResourceVisibilityScope: probe.targetResourceVisibilityScope,
    targetScope: probe.targetScope,
  });

  evaluationTrace.push(
    ...isolationClassification.evaluationTrace.map((traceLine) => `pc08:${traceLine}`),
    `pc08:isolation_outcome:${isolationClassification.accessOutcome}`,
  );

  if (!probe.claimsBypassWhenIsolationDenied) {
    evaluationTrace.push("pc08:missing_bypass_claim_descriptor");
    return violation(
      "unrecognized_ambiguous_action",
      ["FM-2"],
      ["PC-08"],
      evaluationTrace,
    );
  }

  if (isolationClassification.accessOutcome === "denied") {
    return violation(
      "pc08_overlay_isolation_bypass_attempt",
      ["FM-1", "FM-2"],
      ["PC-08"],
      evaluationTrace,
    );
  }

  evaluationTrace.push("pc08:isolation_allowed_no_bypass_surface");
  return null;
}

/**
 * Pure overlay-discipline classifier. Violation-by-default; fail-closed on ambiguous attachments.
 * Overlay-blind: no branching on overlay registry key or regime naming.
 */
export function classifyOverlayAttachment(
  attempt: OverlayAttachmentAttemptDescriptor,
): ClassifyOverlayAttachmentCore {
  const evaluationTrace: string[] = [
    "classifyOverlayAttachment:start",
    "policy:violation_by_default",
    "invariant:overlays_configure_through_slot_only",
    "invariant:overlay_blind_no_vertical_logic",
  ];

  if (!attempt.actionDescriptorParseable) {
    return violation("unrecognized_ambiguous_action", ["FM-1", "FM-2", "FM-3"], [], evaluationTrace);
  }

  if (!hasValue(attempt.overlayAttachmentAttemptReferenceId)) {
    return violation("unrecognized_ambiguous_action", ["FM-1", "FM-2", "FM-3"], [], evaluationTrace);
  }

  const spineGuaranteeViolation = evaluateSpineGuaranteeLoosening(
    attempt.spineGuaranteeLoosening,
    evaluationTrace,
  );
  if (spineGuaranteeViolation) {
    return spineGuaranteeViolation;
  }

  switch (attempt.attemptedActionKind) {
    case "contribute_retention_floor_via_slot": {
      const fm1Violation = evaluateFm1RetentionContribution(attempt.retentionContribution, evaluationTrace);
      if (fm1Violation) {
        return fm1Violation;
      }

      const fm2Violation = evaluateFm2SlotAndInternalReference(attempt, evaluationTrace);
      if (fm2Violation) {
        return fm2Violation;
      }

      const fm3Violation = evaluateFm3Scope(attempt, evaluationTrace);
      if (fm3Violation) {
        return fm3Violation;
      }

      return disciplined(evaluationTrace);
    }

    case "configure_opaque_through_slot": {
      const fm2Violation = evaluateFm2SlotAndInternalReference(attempt, evaluationTrace);
      if (fm2Violation) {
        return fm2Violation;
      }

      const fm3Violation = evaluateFm3Scope(attempt, evaluationTrace);
      if (fm3Violation) {
        return fm3Violation;
      }

      return disciplined(evaluationTrace);
    }

    case "replace_spine_baseline":
    case "loosen_spine_guarantee":
      return violation("fm1_replace_or_loosen_baseline", ["FM-1"], [], evaluationTrace);

    case "attach_off_slot":
      return violation("fm2_off_slot_attachment", ["FM-2"], [], evaluationTrace);

    case "reference_spine_internals":
      return violation("fm2_spine_internal_reference", ["FM-2"], [], evaluationTrace);

    case "exceed_declared_scope":
      return violation("fm3_scope_exceedance", ["FM-3"], [], evaluationTrace);

    case "configure_isolation_bypass_path": {
      const fm2Violation = evaluateFm2SlotAndInternalReference(attempt, evaluationTrace);
      if (fm2Violation) {
        return { ...fm2Violation, poisonCaseIds: ["PC-08"] };
      }

      const fm3Violation = evaluateFm3Scope(attempt, evaluationTrace);
      if (fm3Violation) {
        return { ...fm3Violation, poisonCaseIds: ["PC-08"] };
      }

      const pc08Violation = evaluatePc08IsolationBypass(attempt.isolationBypassProbe, evaluationTrace);
      if (pc08Violation) {
        return pc08Violation;
      }

      return disciplined(evaluationTrace);
    }

    case "unrecognized":
    default:
      return violation("unrecognized_ambiguous_action", ["FM-1", "FM-2", "FM-3"], [], evaluationTrace);
  }
}

function buildAuditEventFromEvaluation(
  input: EvaluateOverlayDisciplineInput,
  classification: ClassifyOverlayAttachmentCore,
): AuditEventContract {
  const contract = input.attachmentAttempt.attachmentContract;

  return {
    auditEventContractId: buildDeterministicEvaluationId([
      "audit",
      input.actorReferenceId,
      input.attachmentAttempt.overlayAttachmentAttemptReferenceId,
      classification.disciplineOutcome,
    ]),
    auditEventKey: `overlay-discipline:${classification.disciplineOutcome}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    customerIsolation: contract.customerIsolation,
    firmIsolation: contract.firmIsolation,
    clientIsolation: contract.clientIsolation,
    eventCategory: "configuration",
    eventOutcome: classification.disciplineOutcome === "disciplined" ? "success" : "denied",
    actorReferenceId: input.actorReferenceId,
    targetResourceReferenceId: input.attachmentAttempt.overlayAttachmentAttemptReferenceId,
    eventTimestampIso: input.evaluationTimestampIso,
    retentionConfigurationReferenceId: input.retentionConfigurationReferenceId,
    auditTrailReferenceIds: [...classification.evaluationTrace],
  };
}

/**
 * Overlay discipline evaluator. Classifies attachment attempts as disciplined or violation only.
 * No live enforcement, no overlay execution, no spine mutation.
 */
export function evaluateOverlayDiscipline(
  input: EvaluateOverlayDisciplineInput,
): ControlSpineOverlayDisciplineEvaluationResult {
  const classification = classifyOverlayAttachment(input.attachmentAttempt);

  const overlayDisciplineEvaluationResultId = buildDeterministicEvaluationId([
    input.attachmentAttempt.overlayAttachmentAttemptReferenceId,
    input.attachmentAttempt.attemptedActionKind,
    classification.disciplineOutcome,
    classification.violationReason ?? "none",
  ]);

  return {
    overlayDisciplineEvaluationResultId,
    overlayDisciplineEvaluationResultKey: `overlay-discipline:${classification.disciplineOutcome}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    disciplineOutcome: classification.disciplineOutcome,
    violationReason: classification.violationReason,
    violatedFmDisciplineIds: classification.violatedFmDisciplineIds,
    poisonCaseIds: classification.poisonCaseIds,
    evaluationTrace: classification.evaluationTrace,
    auditEvent: buildAuditEventFromEvaluation(input, classification),
  };
}

/** 42.5O probe export — PC-08 overlay-leak discipline detector. */
export function detectOverlayIsolationBypassAttempt(
  attempt: OverlayAttachmentAttemptDescriptor,
): boolean {
  const classification = classifyOverlayAttachment({
    ...attempt,
    attemptedActionKind: "configure_isolation_bypass_path",
  });

  return (
    classification.disciplineOutcome === "violation" &&
    classification.violationReason === "pc08_overlay_isolation_bypass_attempt"
  );
}

/** 42.5O probe export — any overlay-discipline violation detector. */
export function detectOverlayDisciplineViolation(attempt: OverlayAttachmentAttemptDescriptor): boolean {
  return classifyOverlayAttachment(attempt).disciplineOutcome === "violation";
}

export function buildOverlayAttachmentContract(input: {
  overlayRegistryKey: string;
  overlayAttachmentReferenceId: string;
  activationScopeReferenceId: string;
  regulatoryScopeStatementReferenceId: string;
  precedenceConfigurationReferenceId: string;
  attachmentStatus?: ControlSpineOverlayAttachmentStatus;
  overlayInterfaceSlotReferenceIds: string[];
  customerTenantId: string;
  firmTenantId: string;
  clientTenantId: string;
}): OverlayAttachmentContract {
  const dimension = (tenantScopeKey: string, suffix: string): ControlSpineIsolationDimension => ({
    isolationDimensionReferenceId: buildDeterministicEvaluationId([`dim-ref:${suffix}`]),
    tenantScopeKey,
    boundaryReferenceIds: [buildDeterministicEvaluationId([`boundary:${suffix}`])],
  });

  return {
    overlayAttachmentContractId: buildDeterministicEvaluationId([
      "overlay-attachment",
      input.overlayAttachmentReferenceId,
    ]),
    overlayAttachmentContractKey: `overlay-attachment:${input.overlayAttachmentReferenceId}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    overlayRegistryKey: input.overlayRegistryKey,
    overlayAttachmentReferenceId: input.overlayAttachmentReferenceId,
    activationScopeReferenceId: input.activationScopeReferenceId,
    regulatoryScopeStatementReferenceId: input.regulatoryScopeStatementReferenceId,
    precedenceConfigurationReferenceId: input.precedenceConfigurationReferenceId,
    attachmentStatus: input.attachmentStatus ?? "active",
    overlayInterfaceSlotReferenceIds: input.overlayInterfaceSlotReferenceIds,
    customerIsolation: dimension(input.customerTenantId, `customer:${input.overlayAttachmentReferenceId}`),
    firmIsolation: dimension(input.firmTenantId, `firm:${input.overlayAttachmentReferenceId}`),
    clientIsolation: dimension(input.clientTenantId, `client:${input.overlayAttachmentReferenceId}`),
  };
}

export { SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS };
