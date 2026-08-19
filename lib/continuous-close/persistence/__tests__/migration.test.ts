import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = "supabase/migrations/20260819045253_continuous_close_runs.sql";

const sql = () => readFileSync(join(process.cwd(), MIGRATION), "utf8").replace(/\r\n/g, "\n");

describe("continuous_close_runs migration", () => {
  it("creates an append-only OBSERVE table with required checks", () => {
    const src = sql();
    expect(src).toContain("CREATE TABLE IF NOT EXISTS public.continuous_close_runs");
    expect(src).toContain("CHECK (mode = 'OBSERVE')");
    expect(src).toContain("CHECK (readiness IN ('READY', 'READY_WITH_REVIEW', 'BLOCKED'))");
    expect(src).toContain("CHECK (status = 'completed')");
    expect(src).toContain("UNIQUE (idempotency_key)");
    expect(src).toContain("REFERENCES public.accounting_syncs(id)");
    expect(src).toContain("ON DELETE RESTRICT");
    expect(src).toContain("REFERENCES public.audit_ready_engagements(id)");
    expect(src).toContain("continuous_close_runs_deny_mutation");
    expect(src).toContain("BEFORE UPDATE");
    expect(src).toContain("BEFORE DELETE");
  });

  it("scopes authenticated SELECT through company_users and service-role writes", () => {
    const src = sql();
    expect(src).toContain("ENABLE ROW LEVEL SECURITY");
    expect(src).toContain("continuous_close_runs_select");
    expect(src).toContain("company_users");
    expect(src).toContain("TO authenticated");
    expect(src).toContain("TO service_role");
    expect(src).toContain("GRANT SELECT ON public.continuous_close_runs TO authenticated");
  });

  it("persists the CC row and ledger receipt in one RPC transaction", () => {
    const src = sql();
    expect(src).toContain("persist_continuous_close_observe_run");
    expect(src).toContain("publish_ledger_event");
    expect(src).toContain("continuous_close.observe.completed");
    expect(src).toContain("WHEN unique_violation");
    expect(src).toContain("GRANT EXECUTE ON FUNCTION public.persist_continuous_close_observe_run");
    expect(src).toContain("TO service_role");
    expect(src).toContain("REVOKE ALL ON FUNCTION public.persist_continuous_close_observe_run");
  });
});
