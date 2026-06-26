/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 *
 * FAR 31.205-6 with exec-comp-cap connector (Gate D).
 */

import type { GcAuditEmitter } from "../audit/gc-audit-emitter";
import type { AllowabilityInput, AllowabilityResult } from "../types";
import { resolveGovConCitationHandle } from "../../../standards/govcon/handles";
import { emitEscalationAudit } from "../audit/gc-audit-emitter";
import { applyExecCompCap } from "../exec-comp-cap";

export function evaluateAllowability_31_205_6(
  input: AllowabilityInput,
  emitter: GcAuditEmitter,
): AllowabilityResult {
  const handle = resolveGovConCitationHandle("FAR_31_205_6_COMPENSATION");
  if (!input.structuralPreconditionsMet) {
    emitEscalationAudit(emitter, {
      code: "GOVCON_FAR_205_6_PRECONDITION",
      message: "FAR 31.205-6 structural preconditions failed",
      subSegmentId: input.subSegmentId,
      handleId: handle.handleId,
    });
    emitter.emitDcaaRateAudit({
      subSegmentId: input.subSegmentId,
      decisionType: "far-31-205-allowability",
      evidence: { subsection: "6" },
      outcome: "rejected-escalation",
      handleId: handle.handleId,
    });
    return { allowed: false, handleId: handle.handleId, escalationAudits: ["precondition fail"] };
  }
  const compUsd = input.compensationUsd ?? input.amountUsd;
  const cy = input.compensationCalendarYear ?? new Date().getFullYear();
  const cap = applyExecCompCap(
    { subSegmentId: input.subSegmentId, compensationUsd: compUsd, calendarYear: cy },
    emitter,
  );
  if (!cap.allowed) {
    return { allowed: false, handleId: handle.handleId, escalationAudits: cap.escalationAudits };
  }
  emitter.emitDcaaRateAudit({
    subSegmentId: input.subSegmentId,
    decisionType: "far-31-205-allowability",
    evidence: { subsection: "6", compensationUsd: compUsd },
    outcome: "allowed",
    handleId: handle.handleId,
  });
  return { allowed: true, handleId: handle.handleId, escalationAudits: cap.escalationAudits };
}
