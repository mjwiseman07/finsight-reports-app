/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 *
 * K-I audit emission — all FA audit events route through 42.7 audit framework.
 */

import type { AuditLogWriter, AuditEntryPartial } from "../../../standards/audit/types";
import type { ActorRef } from "../../../standards/resolver/memory/types";
import type { FrameworkHint } from "../kernel/fa-framework-binding";
import type { FundCapabilityKey } from "../../contracts/fund-accounting/FABasisContracts";

export type FAAuditChannel =
  | "treatment-resolver-audit"
  | "memory-framework-dimension"
  | "escalation-audit"
  | "panel-decision-audit"
  | "org-edge-audit";

const CHANNEL_TO_KIND: Record<FAAuditChannel, AuditEntryPartial["kind"]> = {
  "treatment-resolver-audit": "panel.decision",
  "memory-framework-dimension": "cache.write",
  "escalation-audit": "role.escalation.created",
  "panel-decision-audit": "panel.decision.execute",
  "org-edge-audit": "orgEdge.reconciliation",
};

export interface FAAuditEmitter {
  emit(channel: FAAuditChannel, payload: Record<string, unknown>): void;
  getEntries(): AuditEntryPartial[];
}

export function createFAAuditEmitter(
  writer?: AuditLogWriter,
  actor?: ActorRef,
): FAAuditEmitter {
  const entries: AuditEntryPartial[] = [];
  const defaultActor: ActorRef = actor ?? {
    actorId: "fa-wave-2-verifier",
    actorType: "system",
    via: "org-edge",
  };

  return {
    emit(channel, payload) {
      const entry: AuditEntryPartial = {
        kind: CHANNEL_TO_KIND[channel],
        actor: defaultActor,
        subject: {
          orgId: typeof payload.entityId === "string" ? payload.entityId : undefined,
          framework: typeof payload.framework === "string" ? (payload.framework as never) : undefined,
        },
        payload: { ...payload, faAuditChannel: channel },
      };
      entries.push(entry);
      if (writer) {
        writer.append(entry);
      }
    },
    getEntries() {
      return [...entries];
    },
  };
}

export function emitTreatmentResolverAudit(
  emitter: FAAuditEmitter,
  params: {
    entityId: string;
    capabilityKey: FundCapabilityKey;
    framework: FrameworkHint;
    citationHandle: string;
    timestamp: string;
  },
): void {
  emitter.emit("treatment-resolver-audit", {
    entityId: params.entityId,
    capabilityKey: params.capabilityKey,
    framework: params.framework,
    citationHandle: params.citationHandle,
    resolutionTimestamp: params.timestamp,
  });
}

export function emitMemoryFrameworkDimension(
  emitter: FAAuditEmitter,
  params: {
    entityId: string;
    framework: FrameworkHint;
    capabilityKey: FundCapabilityKey;
    cacheKey: string;
  },
): void {
  emitter.emit("memory-framework-dimension", {
    entityId: params.entityId,
    framework: params.framework,
    capabilityKey: params.capabilityKey,
    cacheKey: params.cacheKey,
  });
}

export function emitEscalationAudit(
  emitter: FAAuditEmitter,
  params: {
    entityId: string;
    reason: string;
    severity: "medium" | "high" | "critical";
    violationType: string;
  },
): void {
  emitter.emit("escalation-audit", {
    entityId: params.entityId,
    reason: params.reason,
    severity: params.severity,
    violationType: params.violationType,
  });
}

export function emitPanelDecisionAudit(
  emitter: FAAuditEmitter,
  params: {
    entityId: string;
    decision: string;
    multiPartySignatures: string[];
  },
): void {
  emitter.emit("panel-decision-audit", {
    entityId: params.entityId,
    decision: params.decision,
    multiPartySignatures: params.multiPartySignatures,
  });
}

export function emitOrgEdgeAudit(
  emitter: FAAuditEmitter,
  params: {
    entityId: string;
    callingIndustry: string;
    capabilityKey: FundCapabilityKey;
  },
): void {
  emitter.emit("org-edge-audit", {
    entityId: params.entityId,
    callingIndustry: params.callingIndustry,
    capabilityKey: params.capabilityKey,
  });
}
