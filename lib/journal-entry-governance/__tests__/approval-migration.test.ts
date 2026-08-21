import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260821042800_journal_entry_approvals.sql",
);

describe("JE-2 approval migration contract", () => {
  const src = readFileSync(MIGRATION, "utf8");

  it("creates journal_entry_approvals with APPROVED|REJECTED only", () => {
    expect(src).toContain("CREATE TABLE IF NOT EXISTS public.journal_entry_approvals");
    expect(src).toContain("CHECK (decision IN ('APPROVED', 'REJECTED'))");
    expect(src).not.toContain("AUTO_APPROVED");
    expect(src).not.toContain("GOVERNED_AUTO");
    expect(src).toContain("CHECK (approval_mode = 'REVIEW_REQUIRED')");
  });

  it("is immutable and mirrors engagement SELECT RLS", () => {
    expect(src).toContain("journal_entry_approvals_deny_mutation");
    expect(src).toContain("BEFORE UPDATE");
    expect(src).toContain("BEFORE DELETE");
    expect(src).toContain("company_users");
    expect(src).toContain("firm_memberships");
    expect(src).toContain("FOR SELECT");
    expect(src).toContain("TO authenticated");
  });

  it("atomic persist publishes approved/rejected events", () => {
    expect(src).toContain("persist_journal_entry_approval");
    expect(src).toContain("journal_entry.approved");
    expect(src).toContain("journal_entry.rejected");
    expect(src).toContain("journal_entry_proposal");
    expect(src).toContain("publish_ledger_event");
  });

  it("does not create execution table or mutate proposals", () => {
    expect(src).not.toContain("journal_entry_executions");
    expect(src).not.toMatch(/UPDATE\s+public\.journal_entry_proposals/i);
  });

  it("one APPROVED per proposal_hash+policy_hash binding", () => {
    expect(src).toContain("journal_entry_approvals_one_approved_idx");
    expect(src).toContain("WHERE decision = 'APPROVED'");
  });
});
