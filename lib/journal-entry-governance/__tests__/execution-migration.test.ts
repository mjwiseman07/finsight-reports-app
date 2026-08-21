import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260821183525_journal_entry_executions.sql",
);

describe("JE-3A execution migration contract", () => {
  const src = readFileSync(MIGRATION, "utf8");

  it("creates journal_entry_executions with full status vocabulary", () => {
    expect(src).toContain("CREATE TABLE IF NOT EXISTS public.journal_entry_executions");
    expect(src).toContain("'RESERVED'");
    expect(src).toContain("'PRECHECK_FAILED'");
    expect(src).toContain("'READY_TO_POST'");
    expect(src).toContain("'POSTING'");
    expect(src).toContain("'UNKNOWN_COMMIT'");
    expect(src).toContain("'VERIFIED'");
    expect(src).toContain("'REVERSAL_REQUIRED'");
  });

  it("enforces one approval → one execution and hash/provider checks", () => {
    expect(src).toContain("UNIQUE (approval_id)");
    expect(src).toContain("UNIQUE (idempotency_key)");
    expect(src).toContain("UNIQUE (correlation_marker)");
    expect(src).toContain("CHECK (provider = 'quickbooks')");
    expect(src).toContain("state_version");
    expect(src).toContain("CHECK (state_version > 0)");
    expect(src).toMatch(/proposal_hash ~ '\^\[a-f0-9\]\{64\}\$'/);
  });

  it("mirrors engagement SELECT RLS; no authenticated writes", () => {
    expect(src).toContain("FOR SELECT");
    expect(src).toContain("TO authenticated");
    expect(src).toContain("company_users");
    expect(src).toContain("firm_memberships");
    expect(src).toContain("TO service_role");
    expect(src).not.toMatch(/FOR INSERT\s+TO authenticated/);
    expect(src).not.toMatch(/FOR UPDATE\s+TO authenticated/);
  });

  it("atomic reservation + transition RPCs publish Patent #6 events", () => {
    expect(src).toContain("persist_journal_entry_execution_reservation");
    expect(src).toContain("transition_journal_entry_execution");
    expect(src).toContain("journal_entry.execution_requested");
    expect(src).toContain("journal_entry.execution_ready");
    expect(src).toContain("journal_entry.execution_precheck_failed");
    expect(src).toContain("journal_entry_execution");
    expect(src).toContain("publish_ledger_event");
    expect(src).toContain("advisacor.je_execution_transition");
  });

  it("forbids UNKNOWN_COMMIT → POSTING in transition RPC", () => {
    expect(src).toContain("UNKNOWN_COMMIT → POSTING is intentionally NOT allowed");
    expect(src).not.toMatch(/UNKNOWN_COMMIT['"].*POSTING/);
  });

  it("does not create je_post_attempts rows or call poster", () => {
    expect(src).not.toMatch(/INSERT INTO\s+public\.je_post_attempts/i);
    expect(src).not.toContain("journal-entry-poster");
    expect(src).not.toMatch(/GOVERNED_AUTO\s*=/);
  });
});
