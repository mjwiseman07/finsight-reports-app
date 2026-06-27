import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";
import {
  ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID,
  ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION,
  type EngagementLetterAuditOutcome,
} from "../../../audit/channels/engagement-letter-audit";
import type { ProfServicesSubSegment } from "../sub-segment-classifier/types";

export interface PsAuditEmitter {
  emitEngagementLetter(outcome: EngagementLetterAuditOutcome, evidence: Record<string, unknown>): void;
  emitEscalation(code: string, message: string): void;
  getEngagementLetterEvents(): Record<string, unknown>[];
  getEscalationEvents(): Record<string, unknown>[];
}

export function createPsAuditEmitter(): PsAuditEmitter {
  const el: Record<string, unknown>[] = [];
  const esc: Record<string, unknown>[] = [];
  return {
    emitEngagementLetter(outcome, evidence) {
      el.push({
        channel: ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID,
        outcome,
        evidence,
        evidenceVersion: ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION,
        containsProfessionalEngagementData: true,
      });
    },
    emitEscalation(code, message) {
      esc.push({ channel: "escalation-audit", code, message });
    },
    getEngagementLetterEvents() { return [...el]; },
    getEscalationEvents() { return [...esc]; },
  };
}

export function emitDualAudit(
  emitter: PsAuditEmitter,
  params: { code: string; message: string; subSegment?: ProfServicesSubSegment },
) {
  emitter.emitEscalation(params.code, params.message);
  emitter.emitEngagementLetter("rejected-escalation", params);
}

