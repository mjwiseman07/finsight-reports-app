import * as fs from "node:fs";
import * as path from "node:path";
import type { Clock } from "../resolver/memory/ttl-clock";
import { hashAuditEntryBase } from "./hash-chain";
import { redactPayload } from "./redaction";
import type { AuditEntry, AuditEntryPartial, AuditLogWriter, RetentionPolicy } from "./types";
import { validateRetentionPolicy } from "./retention-policy";

export interface FileAppendAuditLogWriterDeps {
  readonly baseDir: string;
  readonly clock: Clock;
  readonly retentionPolicy: RetentionPolicy;
  readonly hostname: string;
}

const SYSTEM_ACTOR = {
  kind: "system" as const,
  id: "audit-log-writer",
  via: "direct-api" as const,
};

export class FileAppendAuditLogWriter implements AuditLogWriter {
  private headHashValue: string;
  private sequenceNumber = 0;
  private currentFile: string;
  private currentDate: string;
  private fileDescriptor: number | null = null;

  constructor(private readonly deps: FileAppendAuditLogWriterDeps) {
    validateRetentionPolicy(deps.retentionPolicy);
    this.currentDate = this.utcDate();
    this.currentFile = this.fileFor(this.currentDate);
    this.ensureDir();
    this.headHashValue = this.recoverHeadHash();
  }

  append(partial: AuditEntryPartial): void {
    this.validateActor(partial.actor);
    const now = this.deps.clock.nowMs();
    const todayDate = this.utcDate(now);
    if (todayDate !== this.currentDate) {
      this.rotateTo(todayDate, now);
    }
    this.writeEntry(partial, now);
  }

  async flush(): Promise<void> {
    if (!fs.existsSync(this.currentFile)) {
      return;
    }
    const fd = fs.openSync(this.currentFile, "a");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
  }

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

  private validateActor(actor: AuditEntryPartial["actor"]): void {
    if (!actor?.id) {
      throw new Error("AuditEntry actor.id required");
    }
    if (!["human", "ai-worker", "system", "cron"].includes(actor.kind)) {
      throw new Error(`AuditEntry actor.kind invalid: ${actor.kind}`);
    }
    if (!["panel-consumer", "role-adapter", "org-edge", "direct-api", "admin-script"].includes(actor.via)) {
      throw new Error(`AuditEntry actor.via invalid: ${actor.via}`);
    }
  }

  private hashOf(base: Record<string, unknown>): string {
    return hashAuditEntryBase(base);
  }

  private utcDate(ms?: number): string {
    const date = new Date(ms ?? this.deps.clock.nowMs());
    return date.toISOString().slice(0, 10);
  }

  private fileFor(date: string): string {
    return path.join(this.deps.baseDir, `audit-${date}-${this.deps.hostname}.jsonl`);
  }

  private recoverHeadHash(): string {
    if (!fs.existsSync(this.currentFile)) {
      return "GENESIS";
    }
    const content = fs.readFileSync(this.currentFile, "utf8").trim();
    if (!content) {
      return "GENESIS";
    }
    const lines = content.split("\n");
    const lastLine = lines[lines.length - 1];
    try {
      const parsed = JSON.parse(lastLine) as AuditEntry;
      if (parsed.entryHash) {
        this.sequenceNumber = parsed.sequenceNumber ?? lines.length;
        return parsed.entryHash;
      }
    } catch {
      return "GENESIS";
    }
    return "GENESIS";
  }

  private rotateTo(newDate: string, now: number): void {
    this.writeEntry(
      {
        kind: "cache.dispose",
        actor: SYSTEM_ACTOR,
        subject: {},
        payload: { phase: "rotation-end", file: this.currentFile },
      },
      now,
    );
    this.currentDate = newDate;
    this.currentFile = this.fileFor(newDate);
    this.writeEntry(
      {
        kind: "cache.dispose",
        actor: SYSTEM_ACTOR,
        subject: {},
        payload: { phase: "rotation-start", file: this.currentFile },
      },
      now,
    );
  }

  private writeEntry(partial: AuditEntryPartial, now: number): void {
    this.sequenceNumber += 1;
    const base = {
      sequenceNumber: this.sequenceNumber,
      timestampMs: now,
      timestampISO: new Date(now).toISOString(),
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
    const line = `${JSON.stringify(entry)}\n`;

    try {
      fs.appendFileSync(this.currentFile, line, { flag: "a" });
      if (this.deps.retentionPolicy.requireFsync !== false) {
        const fd = fs.openSync(this.currentFile, "a");
        fs.fsyncSync(fd);
        fs.closeSync(fd);
      }
    } catch (error) {
      throw new Error(`AuditLogWriter append failed: ${(error as Error).message}`);
    }

    this.headHashValue = entryHash;
  }

  private ensureDir(): void {
    fs.mkdirSync(this.deps.baseDir, { recursive: true });
  }
}
