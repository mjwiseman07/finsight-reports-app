/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsPHI: true
 *
 * K-I audit emitter — 6 channels (5 standard + phi-access-audit).
 */

import type { AuditLogWriter, AuditEntryPartial } from "../../../standards/audit/types";
import type { ActorRef } from "../../../standards/resolver/memory/types";
import type { HealthcareCapabilityKey } from "../../contracts/healthcare/HCBasisContracts";
import type { FrameworkHint } from "../kernel/hc-framework-binding";
import { redactForAudit, assertNoPhiInAuditReason } from "../kernel/hc-phi-classifier";

export type HCAuditChannel =
  | "treatment-resolver-audit"
  | "memory-framework-dimension"
  | "escalation-audit"
  | "panel-decision-audit"
  | "org-edge-audit"
  | "phi-access-audit";

const CHANNEL_TO_KIND: Record<HCAuditChannel, AuditEntryPartial["kind"]> = {
  "treatment-resolver-audit": "panel.decision",
  "memory-framework-dimension": "cache.write",
  "escalation-audit": "role.escalation.created",
  "panel-decision-audit": "panel.decision.execute",
  "org-edge-audit": "orgEdge.reconciliation",
  "phi-access-audit": "cache.purge.phi",
};

export interface HCAuditEmitter {
  emit(channel: HCAuditChannel, payload: Record<string, unknown>): void;
  getEntries(): AuditEntryPartial[];
}

export function createHCAuditEmitter(
  writer?: AuditLogWriter,
  actor?: ActorRef,
): HCAuditEmitter {
  const entries: AuditEntryPartial[] = [];
  const defaultActor: ActorRef = actor ?? {
    kind: "system",
    id: "hc-wave-2-verifier",
    via: "org-edge",
  };

  return {
    emit(channel, payload) {
      if (typeof payload.reason === "string") {
        assertNoPhiInAuditReason(payload.reason);
      }
      const safePayload =
        channel === "phi-access-audit" ? redactForAudit(payload) : { ...payload };
      const entry: AuditEntryPartial = {
        kind: CHANNEL_TO_KIND[channel],
        actor: defaultActor,
        subject: {
          orgId: typeof payload.entityId === "string" ? payload.entityId : undefined,
          tenantId: typeof payload.tenantId === "string" ? payload.tenantId : undefined,
          framework: typeof payload.framework === "string" ? (payload.framework as never) : undefined,
        },
        payload: { ...safePayload, hcAuditChannel: channel },
      };
      entries.push(entry);
      if (writer) writer.append(entry);
    },
    getEntries() {
      return [...entries];
    },
  };
}

export function emitTreatmentResolverAudit(
  emitter: HCAuditEmitter,
  params: {
    entityId: string;
    tenantId: string;
    capabilityKey: HealthcareCapabilityKey;
    framework: FrameworkHint;
    citationHandle: string;
    timestamp: string;
  },
): void {
  emitter.emit("treatment-resolver-audit", {
    entityId: params.entityId,
    tenantId: params.tenantId,
    capabilityKey: params.capabilityKey,
    framework: params.framework,
    citationHandle: params.citationHandle,
    resolutionTimestamp: params.timestamp,
  });
}

export function emitPhiAccessAudit(
  emitter: HCAuditEmitter,
  params: {
    tenantId: string;
    classification: "phi" | "part-2" | "non-phi";
    accessReason: string;
    capabilityKey: HealthcareCapabilityKey;
    accessorId: string;
    payloadToken: string;
  },
): void {
  emitter.emit("phi-access-audit", {
    tenantId: params.tenantId,
    classification: params.classification,
    accessReason: params.accessReason,
    capabilityKey: params.capabilityKey,
    accessorId: params.accessorId,
    payloadToken: params.payloadToken,
  });
}

export function emitEscalationAudit(
  emitter: HCAuditEmitter,
  params: {
    entityId: string;
    tenantId: string;
    reason: string;
    severity: "medium" | "high" | "critical";
    violationType: string;
  },
): void {
  emitter.emit("escalation-audit", {
    entityId: params.entityId,
    tenantId: params.tenantId,
    reason: params.reason,
    severity: params.severity,
    violationType: params.violationType,
  });
}

export function emitPanelDecisionAudit(
  emitter: HCAuditEmitter,
  params: {
    entityId: string;
    tenantId: string;
    decision: string;
    multiPartySignatures: string[];
    flag?: string;
  },
): void {
  emitter.emit("panel-decision-audit", {
    entityId: params.entityId,
    tenantId: params.tenantId,
    decision: params.decision,
    multiPartySignatures: params.multiPartySignatures,
    flag: params.flag,
  });
}

export function emitOrgEdgeAudit(
  emitter: HCAuditEmitter,
  params: {
    entityId: string;
    tenantId: string;
    category: string;
    capabilityKey?: HealthcareCapabilityKey;
  },
): void {
  emitter.emit("org-edge-audit", {
    entityId: params.entityId,
    tenantId: params.tenantId,
    category: params.category,
    capabilityKey: params.capabilityKey,
  });
}

export function emitMemoryFrameworkDimension(
  emitter: HCAuditEmitter,
  params: {
    entityId: string;
    tenantId: string;
    framework: FrameworkHint;
    capabilityKey: HealthcareCapabilityKey;
    cacheKey: string;
    phiDerived?: boolean;
  },
): void {
  emitter.emit("memory-framework-dimension", {
    entityId: params.entityId,
    tenantId: params.tenantId,
    framework: params.framework,
    capabilityKey: params.capabilityKey,
    cacheKey: params.cacheKey,
    phiDerived: params.phiDerived === true,
  });
}
