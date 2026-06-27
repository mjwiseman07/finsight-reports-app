import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import { POC_PROGRESS_AUDIT_CHANNEL_ID, POC_PROGRESS_AUDIT_EVIDENCE_VERSION, type POCProgressAuditOutcome } from "../../../audit/channels/poc-progress-audit";
import type { ConstructionSubSegment } from "../sub-segment-classifier/types";

export interface ConAuditEmitter {
  emitPocProgress(outcome: POCProgressAuditOutcome, evidence: Record<string, unknown>): void;
  emitEscalation(code: string, message: string): void;
  getPocEvents(): Record<string, unknown>[];
  getEscalationEvents(): Record<string, unknown>[];
}

export function createConAuditEmitter(): ConAuditEmitter {
  const poc: Record<string, unknown>[] = [];
  const esc: Record<string, unknown>[] = [];
  return {
    emitPocProgress(outcome, evidence) {
      poc.push({
        channel: POC_PROGRESS_AUDIT_CHANNEL_ID,
        outcome,
        evidence,
        evidenceVersion: POC_PROGRESS_AUDIT_EVIDENCE_VERSION,
        containsConstructionContractData: true,
      });
    },
    emitEscalation(code, message) {
      esc.push({ channel: "escalation-audit", code, message });
    },
    getPocEvents() { return [...poc]; },
    getEscalationEvents() { return [...esc]; },
  };
}

export function emitDualAudit(
  emitter: ConAuditEmitter,
  params: { code: string; message: string; subSegment?: ConstructionSubSegment },
) {
  emitter.emitEscalation(params.code, params.message);
  emitter.emitPocProgress("rejected-escalation", params);
}

