/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 *
 * MAAR 6 timekeeping — URL handle only per Q3=A (no hard-coded sampling table).
 */

import type { GcAuditEmitter } from "../audit/gc-audit-emitter";
import type { MAAR6Input, MAAR6Result } from "../types";
import { resolveGovConCitationHandle } from "../../../standards/govcon/handles";
import { emitEscalationAudit } from "../audit/gc-audit-emitter";
import { Maar6Violation } from "../errors";

export function evaluateMAAR6Compliance(input: MAAR6Input, emitter: GcAuditEmitter): MAAR6Result {
  const handleId = input.maar6EvidenceHandleId ?? "DCAA_MAAR_6_AP";
  if (!input.maar6EvidenceHandleId) {
    const msg = "Labor rate resolves without MAAR 6 evidence link";
    emitEscalationAudit(emitter, {
      code: "GOVCON_MAAR6_MISSING",
      message: msg,
      subSegmentId: input.subSegmentId,
      handleId: "DCAA_MAAR_6_AP",
    });
    emitter.emitDcaaRateAudit({
      subSegmentId: input.subSegmentId,
      decisionType: "maar6-timekeeping-check",
      evidence: { laborRateUsd: input.laborRateUsd },
      outcome: "rejected-escalation",
      handleId: "DCAA_MAAR_6_AP",
    });
    return { compliant: false, escalationAudits: [msg] };
  }
  const handle = resolveGovConCitationHandle(handleId);
  if (!input.timekeepingIntegrityVerified) {
    const msg = "MAAR 6 timekeeping integrity not verified";
    emitEscalationAudit(emitter, { code: "GOVCON_MAAR6_TAMPER", message: msg, subSegmentId: input.subSegmentId, handleId: handle.handleId });
    emitter.emitDcaaRateAudit({
      subSegmentId: input.subSegmentId,
      decisionType: "maar6-timekeeping-check",
      evidence: { url: handle.url },
      outcome: "rejected-escalation",
      handleId: handle.handleId,
    });
    throw Maar6Violation(msg);
  }
  emitter.emitDcaaRateAudit({
    subSegmentId: input.subSegmentId,
    decisionType: "maar6-timekeeping-check",
    evidence: { url: handle.url, laborRateUsd: input.laborRateUsd },
    outcome: "allowed",
    handleId: handle.handleId,
  });
  return { compliant: true, escalationAudits: [] };
}
