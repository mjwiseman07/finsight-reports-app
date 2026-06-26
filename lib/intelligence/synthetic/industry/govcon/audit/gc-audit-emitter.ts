/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 *
 * Single entry-point emitter for dcaa-rate-audit (anti-pattern guard #7).
 */

import type { AuditLogWriter, AuditEntryPartial } from "../../../standards/audit/types";
import {
  createDcaaRateAuditEvent,
  DCAA_RATE_AUDIT_CHANNEL_ID,
  DCAA_RATE_AUDIT_EVIDENCE_VERSION,
  DCAA_RATE_AUDIT_RETENTION_YEARS,
  type DcaaRateAuditDecisionType,
  type DcaaRateAuditOutcome,
} from "../../../audit/channels/dcaa-rate-audit";
import type { GovConSubSegmentId } from "../../../standards/govcon/__init__/types";

export interface GcAuditEmitter {
  emitDcaaRateAudit(params: {
    subSegmentId: GovConSubSegmentId;
    decisionType: DcaaRateAuditDecisionType;
    evidence: Record<string, unknown>;
    outcome: DcaaRateAuditOutcome;
    handleId: string;
  }): void;
  emitEscalation(params: Record<string, unknown>): void;
  getDcaaEvents(): ReturnType<typeof createDcaaRateAuditEvent>[];
  getEscalationEvents(): Record<string, unknown>[];
}

export function createGcAuditEmitter(writer?: AuditLogWriter): GcAuditEmitter {
  const dcaaEvents: ReturnType<typeof createDcaaRateAuditEvent>[] = [];
  const escalationEvents: Record<string, unknown>[] = [];

  return {
    emitDcaaRateAudit(params) {
      const event = createDcaaRateAuditEvent(params);
      dcaaEvents.push(event);
      const entry: AuditEntryPartial = {
        kind: "orgEdge.reconciliation",
        actor: { actorId: "gc-wave-2", actorType: "system", via: "org-edge" },
        subject: {},
        payload: { ...event, gcAuditChannel: DCAA_RATE_AUDIT_CHANNEL_ID },
      };
      if (writer) writer.append(entry);
    },
    emitEscalation(params) {
      escalationEvents.push({ channel: "escalation-audit", ...params });
      const entry: AuditEntryPartial = {
        kind: "role.escalation.created",
        actor: { actorId: "gc-wave-2", actorType: "system", via: "org-edge" },
        subject: {},
        payload: { channel: "escalation-audit", ...params },
      };
      if (writer) writer.append(entry);
    },
    getDcaaEvents() {
      return [...dcaaEvents];
    },
    getEscalationEvents() {
      return [...escalationEvents];
    },
  };
}

export function emitEscalationAudit(
  emitter: GcAuditEmitter,
  params: {
    code: string;
    message: string;
    subSegmentId: GovConSubSegmentId;
    handleId: string;
  },
): { channel: "escalation-audit"; code: string; message: string } {
  const event = { channel: "escalation-audit" as const, code: params.code, message: params.message };
  emitter.emitEscalation({ ...event, subSegmentId: params.subSegmentId, handleId: params.handleId });
  return event;
}

export function assertDcaaEventSchema(event: ReturnType<typeof createDcaaRateAuditEvent>): boolean {
  return (
    event.channelId === DCAA_RATE_AUDIT_CHANNEL_ID &&
    event.containsGovernmentContractData === true &&
    event.evidenceVersion === DCAA_RATE_AUDIT_EVIDENCE_VERSION &&
    event.retentionPolicyYears === DCAA_RATE_AUDIT_RETENTION_YEARS
  );
}
