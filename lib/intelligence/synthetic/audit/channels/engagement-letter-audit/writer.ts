import * as fs from "node:fs";
import * as path from "node:path";
import { redactEngagementLetterPayload } from "./redaction";
import { validateEngagementLetterAuditEntry } from "./validator";
import {
  ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID,
  ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION,
  ENGAGEMENT_LETTER_AUDIT_RETENTION_YEARS,
  type EngagementLetterAuditEntry,
  type EngagementLetterAuditOutcome,
} from "./types";
import { deriveEngagementLetterAuditContextPure } from "./pure-core";

export interface FileEngagementLetterAuditWriterDeps {
  baseDir: string;
}

export class FileEngagementLetterAuditWriter {
  private headHash = "GENESIS";
  private sequence = 0;

  constructor(private readonly deps: FileEngagementLetterAuditWriterDeps) {
    fs.mkdirSync(deps.baseDir, { recursive: true });
  }

  append(outcome: EngagementLetterAuditOutcome, evidence: Record<string, unknown>): EngagementLetterAuditEntry {
    const ctx = deriveEngagementLetterAuditContextPure({ outcome, evidence });
    const entry: EngagementLetterAuditEntry = {
      channelId: ENGAGEMENT_LETTER_AUDIT_CHANNEL_ID,
      emittedAt: new Date().toISOString(),
      outcome: ctx.outcome,
      evidence: redactEngagementLetterPayload(ctx.evidence),
      containsProfessionalEngagementData: true,
      evidenceVersion: ENGAGEMENT_LETTER_AUDIT_EVIDENCE_VERSION,
      retentionYears: ENGAGEMENT_LETTER_AUDIT_RETENTION_YEARS,
      previousHash: this.headHash,
    };
    validateEngagementLetterAuditEntry(entry);
    const line = JSON.stringify(entry);
    const entryHash = Buffer.from(line).toString("base64url").slice(0, 32);
    entry.entryHash = entryHash;
    const file = path.join(this.deps.baseDir, "engagement-letter-audit.jsonl");
    fs.appendFileSync(file, JSON.stringify({ ...entry, entryHash }) + "\n");
    this.headHash = entryHash;
    this.sequence += 1;
    return entry;
  }

  headHashValue(): string {
    return this.headHash;
  }

  failClosedWriteDisabled(): never {
    throw new Error("ENGAGEMENT_LETTER_AUDIT_FAIL_CLOSED");
  }
}
