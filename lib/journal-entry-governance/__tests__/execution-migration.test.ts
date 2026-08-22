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

  it("reservation RPC fails closed on approval_id binding mismatch", () => {
    expect(src).toContain("je_execution_immutable_binding_matches");
    expect(src).toContain("je_execution_binding_conflict");
    expect(src).toContain("reuse_reason");
    expect(src).toContain("idempotency_key");
    expect(src).toMatch(
      /approval_id[\s\S]*je_execution_immutable_binding_matches[\s\S]*je_execution_binding_conflict/,
    );
  });

  it("JE-3A transition RPC couples state to Patent #6 event and payload status", () => {
    expect(src).toContain("invalid journal entry execution transition/event pairing");
    expect(src).toContain("event payload status mismatch");
    expect(src).toContain("p_event_payload->>'status'");
    // Exact coupled pairs
    expect(src).toMatch(
      /READY_TO_POST[\s\S]*journal_entry\.execution_ready/,
    );
    expect(src).toMatch(
      /PRECHECK_FAILED[\s\S]*journal_entry\.execution_precheck_failed/,
    );
  });

  it("JE-3A transition RPC does not authorize provider lifecycle mutations", () => {
    const start = src.indexOf(
      "CREATE OR REPLACE FUNCTION public.transition_journal_entry_execution",
    );
    const end = src.indexOf(
      "REVOKE ALL ON FUNCTION public.transition_journal_entry_execution",
      start,
    );
    const rpc = src.slice(start, end);
    // No provider lifecycle statuses as transition endpoints in JE-3A RPC
    expect(rpc).not.toMatch(/p_new_status\s*=\s*'POSTING'/);
    expect(rpc).not.toMatch(/p_expected_status\s*=\s*'POSTING'/);
    expect(rpc).not.toMatch(/p_new_status\s*=\s*'UNKNOWN_COMMIT'/);
    expect(rpc).not.toMatch(/p_new_status\s*=\s*'POSTED_UNVERIFIED'/);
    expect(rpc).not.toMatch(/p_new_status\s*=\s*'VERIFIED'/);
    expect(rpc).not.toMatch(/p_new_status\s*=\s*'REVERSAL_REQUIRED'/);
    expect(rpc).not.toMatch(/p_new_status\s*=\s*'FAILED'/);
    // Exact JE-3A pairs only
    expect(rpc).toContain("p_new_status = 'READY_TO_POST'");
    expect(rpc).toContain("p_new_status = 'PRECHECK_FAILED'");
    expect(rpc).toContain("p_expected_status = 'RESERVED'");
  });

  it("does not create je_post_attempts rows or call poster", () => {
    expect(src).not.toMatch(/INSERT INTO\s+public\.je_post_attempts/i);
    expect(src).not.toContain("journal-entry-poster");
    expect(src).not.toMatch(/GOVERNED_AUTO\s*=/);
  });
});
