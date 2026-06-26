/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 */

import type { GcAuditEmitter } from "../audit/gc-audit-emitter";
import type { CasEvaluationInput } from "../types";
import { resolveGovConCitationHandle } from "../../../standards/govcon/handles";
import { emitEscalationAudit } from "../audit/gc-audit-emitter";
import { evaluateCas401 } from "./cas-401";

export function reconcileDs1Disclosure(
  input: CasEvaluationInput & { disclosedPractice: string; resolvedPractice: string; contractAwardUsd: number },
  emitter: GcAuditEmitter,
): { reconciled: boolean } {
  const handle = resolveGovConCitationHandle("CASB_DS_1_FORM");
  const requiresFull = input.contractAwardUsd >= 50_000_000;
  const requiresModified = input.contractAwardUsd >= 7_500_000;
  if (!requiresModified) {
    emitter.emitDcaaRateAudit({ subSegmentId: "C", decisionType: "cas-application", evidence: { ds1: "below-threshold" }, outcome: "allowed", handleId: handle.handleId });
    return { reconciled: true };
  }
  const cas401 = evaluateCas401(input, emitter);
  if (!cas401.compliant) return { reconciled: false };
  if (input.disclosedPractice !== input.resolvedPractice) {
    emitEscalationAudit(emitter, { code: "GOVCON_DS1_MISMATCH", message: "DS-1 disclosed practice mismatch", subSegmentId: "C", handleId: handle.handleId });
    emitter.emitDcaaRateAudit({ subSegmentId: "C", decisionType: "cas-application", evidence: { mismatch: true, requiresFull }, outcome: "rejected-escalation", handleId: handle.handleId });
    return { reconciled: false };
  }
  emitter.emitDcaaRateAudit({ subSegmentId: "C", decisionType: "cas-application", evidence: { ds1: "reconciled", requiresFull }, outcome: "allowed", handleId: handle.handleId });
  return { reconciled: true };
}
