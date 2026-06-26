/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 */

import type { GcAuditEmitter } from "../audit/gc-audit-emitter";
import type { CasEvaluationInput, CasEvaluationResult } from "../types";
import { resolveGovConCitationHandle } from "../../../standards/govcon/handles";
import { emitEscalationAudit } from "../audit/gc-audit-emitter";

export function evaluateCas405(input: CasEvaluationInput, emitter: GcAuditEmitter): CasEvaluationResult {
  const handle = resolveGovConCitationHandle("CAS_405_UNALLOWABLE");
  if (!input.structuralPreconditionsMet) {
    emitEscalationAudit(emitter, {
      code: "GOVCON_CAS_PRECONDITION_FAIL",
      message: `CAS 405 structural preconditions failed`,
      subSegmentId: input.subSegmentId,
      handleId: handle.handleId,
    });
    emitter.emitDcaaRateAudit({
      subSegmentId: input.subSegmentId,
      decisionType: "cas-application",
      evidence: { casId: "405", url: handle.url },
      outcome: "rejected-escalation",
      handleId: handle.handleId,
    });
    return { compliant: false, handleId: handle.handleId };
  }
  emitter.emitDcaaRateAudit({
    subSegmentId: input.subSegmentId,
    decisionType: "cas-application",
    evidence: { casId: "405", url: handle.url },
    outcome: "allowed",
    handleId: handle.handleId,
  });
  return { compliant: true, handleId: handle.handleId };
}
