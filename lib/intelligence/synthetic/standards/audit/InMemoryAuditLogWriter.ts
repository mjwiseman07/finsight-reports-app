import { hashAuditEntryBase } from "./hash-chain";
import { redactPayload } from "./redaction";
import type { AuditEntry, AuditEntryPartial, AuditLogWriter } from "./types";

export class InMemoryAuditLogWriter implements AuditLogWriter {
  private readonly entries: AuditEntry[] = [];
  private headHashValue = "GENESIS";
  private sequenceNumber = 0;
  private readonly currentFile = "in-memory";

  constructor() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("InMemoryAuditLogWriter is not allowed in production");
    }
  }

  append(partial: AuditEntryPartial): void {
    if (!partial.actor?.id) {
      throw new Error("AuditEntry actor.id required");
    }
    if (!["human", "ai-worker", "system", "cron"].includes(partial.actor.kind)) {
      throw new Error(`AuditEntry actor.kind invalid: ${partial.actor.kind}`);
    }
    if (!["panel-consumer", "role-adapter", "org-edge", "direct-api", "admin-script"].includes(partial.actor.via)) {
      throw new Error(`AuditEntry actor.via invalid: ${partial.actor.via}`);
    }

    this.sequenceNumber += 1;
    const timestampMs = Date.now();
    const base = {
      sequenceNumber: this.sequenceNumber,
      timestampMs,
      timestampISO: new Date(timestampMs).toISOString(),
      prevHash: this.headHashValue,
      schemaVersion: "42.7E.1" as const,
      complianceClass: "SOC1+SOC2-T2+HIPAA" as const,
      kind: partial.kind,
      actor: partial.actor,
      subject: partial.subject,
      payload: redactPayload(partial.payload) as Readonly<Record<string, unknown>>,
    };
    const entryHash = hashAuditEntryBase(base);
    const entry: AuditEntry = { ...base, entryHash };
    this.entries.push(Object.freeze(entry));
    this.headHashValue = entryHash;
  }

  async flush(): Promise<void> {}

  headHash(): string {
    return this.headHashValue;
  }

  state(): { totalEntries: number; currentFile: string; headHash: string } {
    return {
      totalEntries: this.sequenceNumber,
      currentFile: this.currentFile,
      headHash: this.headHashValue,
    };
  }

  getEntries(): readonly AuditEntry[] {
    return Object.freeze([...this.entries]);
  }
}
