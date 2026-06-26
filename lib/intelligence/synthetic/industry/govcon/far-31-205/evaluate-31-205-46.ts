/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 *
 * FAR 31.205-46 — per-diem structural refuse without GSA/DoS/DoD JTR citation (Q10=A).
 */

import type { GcAuditEmitter } from "../audit/gc-audit-emitter";
import type { AllowabilityInput, AllowabilityResult } from "../types";
import { resolveGovConCitationHandle } from "../../../standards/govcon/handles";
import { emitEscalationAudit } from "../audit/gc-audit-emitter";
import { PerDiemCitationViolation } from "../errors";

const VALID_PER_DIEM_HANDLES = new Set([
  "GSA_PERDIEM_CONUS",
  "DSSR_FOREIGN_TRAVEL",
  "JTR_MILITARY_TRAVEL",
  "GSA_FTR",
]);

export function evaluateAllowability_31_205_46(
  input: AllowabilityInput,
  emitter: GcAuditEmitter,
): AllowabilityResult {
  const handle = resolveGovConCitationHandle("FAR_31_205_46_TRAVEL");
  if (!input.perDiemCitationHandleId || !VALID_PER_DIEM_HANDLES.has(input.perDiemCitationHandleId)) {
    const msg = "FAR 31.205-46 travel requires GSA/DoS/DoD JTR citation handle";
    emitEscalationAudit(emitter, {
      code: "GOVCON_PER_DIEM_CITATION_MISSING",
      message: msg,
      subSegmentId: input.subSegmentId,
      handleId: handle.handleId,
    });
    emitter.emitDcaaRateAudit({
      subSegmentId: input.subSegmentId,
      decisionType: "far-31-205-allowability",
      evidence: { subsection: "46", perDiemCitation: input.perDiemCitationHandleId ?? null },
      outcome: "rejected-escalation",
      handleId: handle.handleId,
    });
    throw PerDiemCitationViolation(msg);
  }
  resolveGovConCitationHandle(input.perDiemCitationHandleId);
  emitter.emitDcaaRateAudit({
    subSegmentId: input.subSegmentId,
    decisionType: "far-31-205-allowability",
    evidence: { subsection: "46", perDiemCitation: input.perDiemCitationHandleId },
    outcome: "allowed",
    handleId: handle.handleId,
  });
  return { allowed: true, handleId: handle.handleId, escalationAudits: [] };
}
