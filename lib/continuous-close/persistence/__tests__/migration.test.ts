import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION = "supabase/migrations/20260819045253_continuous_close_runs.sql";
const URM_RLS = "supabase/migrations/20260815000000_urm2_reconciling_items_persistence.sql";
const AUTH = "lib/audit-ready/server-auth.ts";

const read = (rel: string) =>
  readFileSync(join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");

const sql = () => read(MIGRATION);

function selectPolicy(src: string): string {
  const start = src.indexOf("CREATE POLICY continuous_close_runs_select");
  const grant = src.indexOf("GRANT SELECT ON public.continuous_close_runs");
  expect(start).toBeGreaterThan(-1);
  expect(grant).toBeGreaterThan(start);
  return src.slice(start, grant);
}

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
  });

  it("keeps immutability triggers unchanged", () => {
    const src = sql();
    expect(src).toContain("continuous_close_runs_deny_mutation");
    expect(src).toContain("BEFORE UPDATE ON public.continuous_close_runs");
    expect(src).toContain("BEFORE DELETE ON public.continuous_close_runs");
    expect(src).toContain("RAISE EXCEPTION 'continuous_close_runs rows are immutable'");
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

  it("idempotent unique conflict returns the existing row without publishing", () => {
    const src = sql();
    const rpcStart = src.indexOf("CREATE OR REPLACE FUNCTION public.persist_continuous_close_observe_run");
    const rpc = src.slice(rpcStart);
    expect(rpc).toContain("WHERE idempotency_key = p_row->>'idempotency_key'");
    expect(rpc).toContain("reused := true");
    expect(rpc).toContain("ledger_event_id := NULL");
    expect(rpc.indexOf("IF FOUND THEN")).toBeLessThan(rpc.indexOf("INSERT INTO public.continuous_close_runs"));
    expect(rpc.indexOf("publish_ledger_event")).toBeGreaterThan(
      rpc.indexOf("INSERT INTO public.continuous_close_runs"),
    );
  });
});

describe("continuous_close_runs SELECT RLS authority", () => {
  it("mirrors engagement read semantics from server-auth and URM-2", () => {
    const auth = read(AUTH);
    const urm = read(URM_RLS);
    expect(auth).toContain("canRead: true");
    expect(auth).toContain("from('company_users')");
    expect(auth).toContain("from('firm_memberships')");
    expect(auth).toContain(".eq('status', 'active')");
    expect(urm).toContain("ar_reconciling_items_engagement_read");
    expect(urm).toContain("firm_memberships");
  });

  it("allows SELECT for an active company member of the engagement company", () => {
    const policy = selectPolicy(sql());
    expect(policy).toContain("FOR SELECT");
    expect(policy).toContain("TO authenticated");
    expect(policy).toContain("e.id = continuous_close_runs.engagement_id");
    expect(policy).toContain("e.company_id IS NOT NULL");
    expect(policy).toContain("cu.company_id = e.company_id");
    expect(policy).toContain("cu.user_id = (SELECT auth.uid())");
    expect(policy).toContain("cu.status = 'active'");
  });

  it("allows SELECT for an active firm member of the engagement firm", () => {
    const policy = selectPolicy(sql());
    expect(policy).toContain("e.firm_id IS NOT NULL");
    expect(policy).toContain("FROM public.firm_memberships fm");
    expect(policy).toContain("fm.firm_id = e.firm_id");
    expect(policy).toContain("fm.user_id = (SELECT auth.uid())");
    expect(policy).toContain("fm.status = 'active'");
  });

  it("denies users with neither company nor firm access (no open SELECT)", () => {
    const policy = selectPolicy(sql());
    expect(policy).toContain("USING (");
    expect(policy).toContain("EXISTS (");
    expect(policy).not.toMatch(/USING\s*\(\s*true\s*\)/);
  });

  it("scopes firm membership to the run engagement firm (cross-firm denied)", () => {
    const policy = selectPolicy(sql());
    expect(policy).toContain("fm.firm_id = e.firm_id");
    expect(policy).not.toMatch(/fm\.firm_id\s*=\s*continuous_close_runs/);
    expect(policy).toContain("e.id = continuous_close_runs.engagement_id");
  });

  it("requires active firm membership (inactive denied)", () => {
    const policy = selectPolicy(sql());
    expect(policy).toContain("fm.status = 'active'");
    expect(policy).not.toMatch(/fm\.status\s*<>/);
    expect(policy).not.toMatch(/fm\.status\s+IN/i);
  });

  it("requires active company membership (inactive denied)", () => {
    const policy = selectPolicy(sql());
    expect(policy).toContain("cu.status = 'active'");
    expect(policy).not.toMatch(/cu\.status\s*<>/);
    expect(policy).not.toMatch(/cu\.status\s+IN/i);
  });

  it("does not invent a firm_client_id membership path absent from server-auth", () => {
    const policy = selectPolicy(sql());
    const auth = read(AUTH);
    expect(auth).toContain("firm_client_id");
    expect(auth).not.toMatch(/from\('firm_clients'\)/);
    expect(policy).not.toContain("firm_client_id");
  });

  it("does not put super-admin email allowlisting into SQL", () => {
    const src = sql();
    expect(src).not.toContain("isAllowedSuperAdminEmail");
    expect(src).not.toContain("super_admin");
    expect(src).not.toMatch(/auth\.jwt\(\).*email/);
  });
});

describe("continuous_close_runs write RLS", () => {
  it("does not grant authenticated INSERT", () => {
    const src = sql();
    expect(src).toContain("GRANT SELECT ON public.continuous_close_runs TO authenticated");
    expect(src).not.toMatch(/GRANT INSERT ON public\.continuous_close_runs TO authenticated/);
    expect(src).not.toMatch(/FOR INSERT\s+TO authenticated/);
  });

  it("does not grant authenticated UPDATE", () => {
    const src = sql();
    expect(src).not.toMatch(/GRANT UPDATE ON public\.continuous_close_runs TO authenticated/);
    expect(src).not.toMatch(/FOR UPDATE\s+TO authenticated/);
  });

  it("does not grant authenticated DELETE", () => {
    const src = sql();
    expect(src).not.toMatch(/GRANT DELETE ON public\.continuous_close_runs TO authenticated/);
    expect(src).not.toMatch(/FOR DELETE\s+TO authenticated/);
  });

  it("keeps service-role write/all policy", () => {
    const src = sql();
    expect(src).toContain("continuous_close_runs_service_role_all");
    expect(src).toContain("FOR ALL");
    expect(src).toContain("TO service_role");
    expect(src).toContain("GRANT ALL ON public.continuous_close_runs TO service_role");
  });
});
