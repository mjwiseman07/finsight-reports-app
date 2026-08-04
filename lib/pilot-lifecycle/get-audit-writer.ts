/**
 * Phase MEM-LIFECYCLE Block 4 — audit writer factory.
 *
 * Serverless-safe lazy singleton. Uses /tmp on Vercel (per-invocation writable,
 * ephemeral) or PILOT_LIFECYCLE_AUDIT_DIR for local dev.
 *
 * NOTE: This is a stopgap. The DB row in pilot_lifecycle_events is the
 * authoritative record — the AuditLogWriter is a secondary mirror for the
 * Standards Resolver protocol. A future block swaps this for a Supabase-backed
 * writer so multi-invocation continuity is preserved.
 */
import * as os from "node:os";
import * as path from "node:path";
import {
  DEFAULT_RETENTION_POLICY,
  FileAppendAuditLogWriter,
} from "@/lib/intelligence/synthetic/standards/audit";
import type { AuditLogWriter } from "@/lib/intelligence/synthetic/standards/audit/types";

let _writer: AuditLogWriter | null = null;

export function getPilotLifecycleAuditWriter(): AuditLogWriter {
  if (_writer) return _writer;
  const baseDir =
    process.env.PILOT_LIFECYCLE_AUDIT_DIR ??
    path.join("/tmp", "audit-logs", "pilot-lifecycle");
  _writer = new FileAppendAuditLogWriter({
    baseDir,
    clock: { nowMs: () => Date.now() },
    retentionPolicy: DEFAULT_RETENTION_POLICY,
    hostname: process.env.VERCEL_REGION ?? os.hostname(),
  });
  return _writer;
}

/** Test-only: reset for isolated test runs. Never call in production code. */
export function __resetPilotLifecycleAuditWriterForTests(): void {
  _writer = null;
}
