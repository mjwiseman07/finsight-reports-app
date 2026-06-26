/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 */

import type { GcAuditEmitter } from "../audit/gc-audit-emitter";
import type { AllowabilityInput, AllowabilityResult } from "../types";
import { resolveGovConCitationHandle } from "../../../standards/govcon/handles";
import { emitEscalationAudit } from "../audit/gc-audit-emitter";

export function evaluateAllowability_31_205_51(
  input: AllowabilityInput,
  emitter: GcAuditEmitter,
): AllowabilityResult {
  const handle = resolveGovConCitationHandle("FAR_31_205_51_ALCOHOL");
  if (!input.structuralPreconditionsMet) {
    const escalation = emitEscalationAudit(emitter, {
      code: "GOVCON_FAR_PRECONDITION_FAIL",
      message: `FAR 31.205-51 structural preconditions failed`,
      subSegmentId: input.subSegmentId,
      handleId: handle.handleId,
    });
    emitter.emitDcaaRateAudit({
      subSegmentId: input.subSegmentId,
      decisionType: "far-31-205-allowability",
      evidence: { subsection: "51", url: handle.url },
      outcome: "rejected-escalation",
      handleId: handle.handleId,
    });
    return { allowed: false, handleId: handle.handleId, escalationAudits: [escalation.message] };
  }
  emitter.emitDcaaRateAudit({
    subSegmentId: input.subSegmentId,
    decisionType: "far-31-205-allowability",
    evidence: { subsection: "51", url: handle.url, costCategory: input.costCategory },
    outcome: "allowed",
    handleId: handle.handleId,
  });
  return { allowed: true, handleId: handle.handleId, escalationAudits: [] };
}
