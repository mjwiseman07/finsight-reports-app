import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = "supabase/migrations/20260820233219_journal_entry_proposals.sql";
const CC_MIGRATION = "supabase/migrations/20260819045253_continuous_close_runs.sql";

const read = (rel: string) =>
  readFileSync(join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

const sql = () => read(MIGRATION);

function selectPolicy(src: string): string {
  const start = src.indexOf("CREATE POLICY journal_entry_proposals_select");
  const grant = src.indexOf("GRANT SELECT ON public.journal_entry_proposals");
  expect(start).toBeGreaterThan(-1);
  expect(grant).toBeGreaterThan(start);
  return src.slice(start, grant);
}

describe("journal_entry_proposals migration", () => {
  it("creates immutable proposal table with required checks", () => {
    const src = sql();
    expect(src).toContain("CREATE TABLE IF NOT EXISTS public.journal_entry_proposals");
    expect(src).toContain("CHECK (origin_type IN ('ACCRUAL', 'RECLASS'))");
    expect(src).toContain("CHECK (status = 'SUBMITTED')");
    expect(src).toContain("UNIQUE (idempotency_key)");
    expect(src).toContain("source_continuous_close_run_id");
    expect(src).toContain("REFERENCES public.continuous_close_runs(id)");
    expect(src).toContain("ON DELETE RESTRICT");
    expect(src).toContain("REFERENCES public.accounting_syncs(id)");
  });

  it("keeps immutability triggers", () => {
    const src = sql();
    expect(src).toContain("BEFORE UPDATE ON public.journal_entry_proposals");
    expect(src).toContain("BEFORE DELETE ON public.journal_entry_proposals");
    expect(src).toContain("journal_entry_proposals rows are immutable");
  });

  it("persists proposal + ledger receipt atomically", () => {
    const src = sql();
    expect(src).toContain("persist_journal_entry_proposal");
    expect(src).toContain("journal_entry.proposed");
    expect(src).toContain("journal_entry_proposal");
    expect(src).toContain("publish_ledger_event");
    expect(src).toContain("WHEN unique_violation");
    expect(src).toContain("GRANT EXECUTE ON FUNCTION public.persist_journal_entry_proposal");
    expect(src).toContain("TO service_role");
  });

  it("idempotent reuse returns existing without publishing", () => {
    const src = sql();
    const rpc = src.slice(src.indexOf("CREATE OR REPLACE FUNCTION public.persist_journal_entry_proposal"));
    expect(rpc).toContain("reused := true");
    expect(rpc).toContain("ledger_event_id := NULL");
    expect(rpc.indexOf("publish_ledger_event")).toBeGreaterThan(
      rpc.indexOf("INSERT INTO public.journal_entry_proposals"),
    );
  });

  it("does not create approval or execution tables", () => {
    const src = sql();
    expect(src).not.toContain("journal_entry_approvals");
    expect(src).not.toContain("journal_entry_executions");
  });

  it("mirrors continuous_close_runs SELECT RLS authority", () => {
    const policy = selectPolicy(sql());
    const cc = read(CC_MIGRATION);
    expect(policy).toContain("e.id = journal_entry_proposals.engagement_id");
    expect(policy).toContain("cu.company_id = e.company_id");
    expect(policy).toContain("fm.firm_id = e.firm_id");
    expect(policy).toContain("cu.status = 'active'");
    expect(policy).toContain("fm.status = 'active'");
    expect(cc).toContain("continuous_close_runs_select");
  });

  it("denies authenticated writes", () => {
    const src = sql();
    expect(src).toContain("GRANT SELECT ON public.journal_entry_proposals TO authenticated");
    expect(src).not.toMatch(/FOR INSERT\s+TO authenticated/);
    expect(src).not.toMatch(/FOR UPDATE\s+TO authenticated/);
    expect(src).not.toMatch(/FOR DELETE\s+TO authenticated/);
    expect(src).toContain("journal_entry_proposals_service_role_all");
  });

  it("does not put super-admin email allowlisting into SQL", () => {
    const src = sql();
    expect(src).not.toContain("isAllowedSuperAdminEmail");
    expect(src).not.toContain("super_admin");
  });
});
