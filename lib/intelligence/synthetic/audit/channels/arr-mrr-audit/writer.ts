import * as fs from "node:fs";
import * as path from "node:path";
import { redactArrMrrPayload } from "./redaction";
import { validateArrMrrAuditEntry } from "./validator";
import {
  ARR_MRR_AUDIT_CHANNEL_ID,
  ARR_MRR_AUDIT_EVIDENCE_VERSION,
  ARR_MRR_AUDIT_RETENTION_YEARS,
  type ArrMrrAuditEntry,
  type ArrMrrAuditOutcome,
} from "./types";
import { deriveArrMrrAuditContextPure } from "./pure-core";

export interface FileArrMrrAuditWriterDeps {
  baseDir: string;
}

export class FileArrMrrAuditWriter {
  private headHash = "GENESIS";
  private sequence = 0;

  constructor(private readonly deps: FileArrMrrAuditWriterDeps) {
    fs.mkdirSync(deps.baseDir, { recursive: true });
  }

  append(outcome: ArrMrrAuditOutcome, evidence: Record<string, unknown>): ArrMrrAuditEntry {
    const ctx = deriveArrMrrAuditContextPure({ outcome, evidence });
    const entry: ArrMrrAuditEntry = {
      channelId: ARR_MRR_AUDIT_CHANNEL_ID,
      emittedAt: new Date().toISOString(),
      outcome: ctx.outcome,
      evidence: redactArrMrrPayload(ctx.evidence),
      containsSaaSARRData: true,
      evidenceVersion: ARR_MRR_AUDIT_EVIDENCE_VERSION,
      retentionYears: ARR_MRR_AUDIT_RETENTION_YEARS,
      previousHash: this.headHash,
    };
    validateArrMrrAuditEntry(entry);
    const line = JSON.stringify(entry);
    const entryHash = Buffer.from(line).toString("base64url").slice(0, 32);
    entry.entryHash = entryHash;
    const file = path.join(this.deps.baseDir, "arr-mrr-audit.jsonl");
    fs.appendFileSync(file, JSON.stringify({ ...entry, entryHash }) + "\n");
    this.headHash = entryHash;
    this.sequence += 1;
    return entry;
  }

  headHashValue(): string {
    return this.headHash;
  }

  failClosedWriteDisabled(): never {
    throw new Error("ARR_MRR_AUDIT_FAIL_CLOSED");
  }
}
