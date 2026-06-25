import type { FrameworkId } from "../resolver/org-edge/types";
import type { ActorRef } from "../resolver/memory/types";

export type AuditEventKind =
  | "cache.hit"
  | "cache.miss"
  | "cache.write"
  | "cache.evict.lru"
  | "cache.evict.ttl"
  | "cache.invalidate.org"
  | "cache.purge.phi"
  | "cache.dispose"
  | "role.escalation.created"
  | "role.escalation.resolved"
  | "panel.decision.execute"
  | "panel.decision.hire-up"
  | "panel.decision.escalate"
  | "org-edge.override.applied"
  | "org-edge.disagreement.emitted"
  | "escalation.evaluated";

export interface AuditEntry {
  readonly sequenceNumber: number;
  readonly timestampMs: number;
  readonly timestampISO: string;
  readonly kind: AuditEventKind;
  readonly actor: ActorRef;
  readonly subject: {
    readonly orgId?: string;
    readonly tenantId?: string;
    readonly framework?: FrameworkId;
    readonly electionFingerprint?: string | null;
    readonly cacheKeyRedacted?: string;
  };
  readonly payload: Readonly<Record<string, unknown>>;
  readonly prevHash: string;
  readonly entryHash: string;
  readonly schemaVersion: "42.7E.1";
  readonly complianceClass: "SOC1+SOC2-T2+HIPAA";
}

export type AuditEntryPartial = Omit<
  AuditEntry,
  | "sequenceNumber"
  | "timestampMs"
  | "timestampISO"
  | "prevHash"
  | "entryHash"
  | "schemaVersion"
  | "complianceClass"
>;

export interface AuditLogWriter {
  append(entry: AuditEntryPartial): void;
  flush(): Promise<void>;
  headHash(): string;
  state(): { totalEntries: number; currentFile: string; headHash: string };
}

export interface RetentionPolicy {
  readonly minDays: 365;
  readonly soc1Days: number;
  readonly hipaaDays: number;
  readonly purgeAllowed: boolean;
  readonly requireFsync?: boolean;
}

export type { ActorRef };

export type EscalationDecisionOutcome =
  | "no-escalation"
  | "escalate-tier-up"
  | "escalate-to-founder"
  | "decline-out-of-scope";

export type MaterialityTier = "low" | "medium" | "high" | "critical";
export type ComplexityTier = "simple" | "moderate" | "complex" | "novel";
export type TenantClassification = "standard" | "phi-covered";

/**
 * Payload shape for kind: escalation.evaluated (Phase 42.7B.1).
 * Emitted on every evaluation regardless of outcome (B1.D1).
 */
export interface EscalationEvaluatedEntry {
  readonly event: "escalation-evaluated";
  readonly callerPersonaHandle: string;
  readonly callerTenantId: string;
  readonly callerSessionId: string;
  readonly callerOrgHandle: string;
  readonly materialityTier: MaterialityTier;
  readonly complexityTier: ComplexityTier;
  readonly topicHandle: string;
  readonly industryHandle: string;
  readonly decisionOutcome: EscalationDecisionOutcome;
  readonly targetPersonaHandle: string | null;
  readonly citationHandlesConsulted: readonly string[];
  readonly matchedRules: readonly string[];
  readonly unresolvedConflicts: readonly string[];
  readonly tenantClassification: TenantClassification;
}

export function validateEscalationEvaluatedEntry(entry: EscalationEvaluatedEntry): void {
  const requiredStrings: Array<keyof EscalationEvaluatedEntry> = [
    "event",
    "callerPersonaHandle",
    "callerTenantId",
    "callerSessionId",
    "callerOrgHandle",
    "materialityTier",
    "complexityTier",
    "topicHandle",
    "industryHandle",
    "decisionOutcome",
    "tenantClassification",
  ];
  for (const field of requiredStrings) {
    const value = entry[field];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`EscalationEvaluatedEntry missing or empty field: ${field}`);
    }
  }
  if (entry.event !== "escalation-evaluated") {
    throw new Error(`EscalationEvaluatedEntry invalid event: ${entry.event}`);
  }
  if (!Object.prototype.hasOwnProperty.call(entry, "targetPersonaHandle")) {
    throw new Error("EscalationEvaluatedEntry missing targetPersonaHandle");
  }
  const outcomes: EscalationDecisionOutcome[] = [
    "no-escalation",
    "escalate-tier-up",
    "escalate-to-founder",
    "decline-out-of-scope",
  ];
  if (!outcomes.includes(entry.decisionOutcome)) {
    throw new Error(`EscalationEvaluatedEntry invalid decisionOutcome: ${entry.decisionOutcome}`);
  }
  if (!Array.isArray(entry.citationHandlesConsulted)) {
    throw new Error("EscalationEvaluatedEntry citationHandlesConsulted must be array");
  }
  if (!Array.isArray(entry.matchedRules)) {
    throw new Error("EscalationEvaluatedEntry matchedRules must be array");
  }
  if (!Array.isArray(entry.unresolvedConflicts)) {
    throw new Error("EscalationEvaluatedEntry unresolvedConflicts must be array");
  }
}

