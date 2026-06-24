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
  | "org-edge.disagreement.emitted";

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
