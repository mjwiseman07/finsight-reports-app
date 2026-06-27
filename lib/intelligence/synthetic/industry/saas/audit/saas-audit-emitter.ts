import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import {
  ARR_MRR_AUDIT_CHANNEL_ID,
  ARR_MRR_AUDIT_EVIDENCE_VERSION,
  type ArrMrrAuditOutcome,
} from "../../../audit/channels/arr-mrr-audit";
import type { SaaSSubSegment } from "../sub-segment-classifier/types";

export interface SaasAuditEmitter {
  emitArrMrr(outcome: ArrMrrAuditOutcome, evidence: Record<string, unknown>): void;
  emitEscalation(code: string, message: string): void;
  getArrMrrEvents(): Record<string, unknown>[];
  getEscalationEvents(): Record<string, unknown>[];
}

export function createSaasAuditEmitter(): SaasAuditEmitter {
  const arr: Record<string, unknown>[] = [];
  const esc: Record<string, unknown>[] = [];
  return {
    emitArrMrr(outcome, evidence) {
      arr.push({
        channel: ARR_MRR_AUDIT_CHANNEL_ID,
        outcome,
        evidence,
        evidenceVersion: ARR_MRR_AUDIT_EVIDENCE_VERSION,
        containsSaaSARRData: true,
      });
    },
    emitEscalation(code, message) {
      esc.push({ channel: "escalation-audit", code, message });
    },
    getArrMrrEvents() { return [...arr]; },
    getEscalationEvents() { return [...esc]; },
  };
}

export function emitDualAudit(
  emitter: SaasAuditEmitter,
  params: { code: string; message: string; subSegment?: SaaSSubSegment },
) {
  emitter.emitEscalation(params.code, params.message);
  emitter.emitArrMrr("rejected-escalation", params);
}

