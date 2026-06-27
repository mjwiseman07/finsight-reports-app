import * as fs from "node:fs";
import * as path from "node:path";
import { redactPOCProgressPayload } from "./redaction";
import { validatePOCProgressAuditEntry } from "./validator";
import {
  POC_PROGRESS_AUDIT_CHANNEL_ID,
  POC_PROGRESS_AUDIT_EVIDENCE_VERSION,
  POC_PROGRESS_AUDIT_RETENTION_YEARS,
  type POCProgressAuditEntry,
  type POCProgressAuditOutcome,
} from "./types";
import { derivePOCProgressAuditContextPure } from "./pure-core";

export interface FilePOCProgressAuditWriterDeps {
  baseDir: string;
}

export class FilePOCProgressAuditWriter {
  private headHash = "GENESIS";
  private sequence = 0;

  constructor(private readonly deps: FilePOCProgressAuditWriterDeps) {
    fs.mkdirSync(deps.baseDir, { recursive: true });
  }

  append(outcome: POCProgressAuditOutcome, evidence: Record<string, unknown>): POCProgressAuditEntry {
    const ctx = derivePOCProgressAuditContextPure({ outcome, evidence });
    const entry: POCProgressAuditEntry = {
      channelId: POC_PROGRESS_AUDIT_CHANNEL_ID,
      emittedAt: new Date().toISOString(),
      outcome: ctx.outcome,
      evidence: redactPOCProgressPayload(ctx.evidence),
      containsConstructionContractData: true,
      evidenceVersion: POC_PROGRESS_AUDIT_EVIDENCE_VERSION,
      retentionYears: POC_PROGRESS_AUDIT_RETENTION_YEARS,
      previousHash: this.headHash,
    };
    validatePOCProgressAuditEntry(entry);
    const line = JSON.stringify(entry);
    const entryHash = Buffer.from(line).toString("base64url").slice(0, 32);
    entry.entryHash = entryHash;
    const file = path.join(this.deps.baseDir, "poc-progress-audit.jsonl");
    fs.appendFileSync(file, JSON.stringify({ ...entry, entryHash }) + "\n");
    this.headHash = entryHash;
    this.sequence += 1;
    return entry;
  }

  headHashValue(): string {
    return this.headHash;
  }

  failClosedWriteDisabled(): never {
    throw new Error("POC_PROGRESS_AUDIT_FAIL_CLOSED");
  }
}
