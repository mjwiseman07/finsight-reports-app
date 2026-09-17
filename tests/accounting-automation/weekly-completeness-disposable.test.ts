/**
 * Disposable Postgres rehearsal for RA Pro weekly completeness persistence.
 * Synthetic only; never connects to Supabase or production. Requires Docker.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

const dockerOk = spawnSync("docker", ["info"], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 15_000,
}).status === 0;

const MIGRATION = "supabase/migrations/20260917044537_ra_pro_weekly_completeness_findings.sql";

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

describe.skipIf(!dockerOk)("weekly completeness persistence (disposable Postgres)", () => {
  let container = "";
  let url = "";

  function docker(args: string[], input?: string | Buffer) {
    const result = spawnSync("docker", args, {
      input,
      encoding: "utf8",
      windowsHide: true,
      timeout: 120_000,
      maxBuffer: 20 * 1024 * 1024,
    });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
    return result.stdout;
  }

  async function client(role = "postgres", userId?: string) {
    const db = new Client({ connectionString: url });
    await db.connect();
    if (role !== "postgres") await db.query(`SET ROLE ${role}`);
    if (userId) await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
    return db;
  }

  beforeAll(() => {
    container = `ra-pro-weekly-${randomBytes(4).toString("hex")}`;
    const port = 57_000 + Math.floor(Math.random() * 900);
    url = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
    docker(["run", "-d", "--rm", "--name", container, "-e", "POSTGRES_PASSWORD=postgres", "-p", `${port}:5432`, "postgres:16-alpine"]);
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const ready = spawnSync("docker", ["exec", container, "pg_isready", "-U", "postgres"], { windowsHide: true });
      if (ready.status === 0) break;
      sleep(300);
    }
    const boot = `
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      CREATE TABLE public.firms (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.firm_memberships (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), firm_id uuid NOT NULL REFERENCES public.firms(id),
        user_id uuid NOT NULL, status text NOT NULL
      );
      CREATE TABLE public.companies (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.firm_clients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), firm_id uuid NOT NULL REFERENCES public.firms(id),
        company_id uuid REFERENCES public.companies(id)
      );
      CREATE TABLE public.accounting_connections (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.accounting_syncs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), connection_id uuid NOT NULL REFERENCES public.accounting_connections(id)
      );
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
      GRANT SELECT ON public.firm_memberships TO authenticated;
    `;
    docker(["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], boot);
    docker(["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], fs.readFileSync(path.join(process.cwd(), MIGRATION)));
  }, 120_000);

  afterAll(() => {
    if (container) spawnSync("docker", ["rm", "-f", container], { windowsHide: true });
  });

  async function seed() {
    const db = await client();
    try {
      const firmId = randomUUID();
      const clientId = randomUUID();
      const companyId = randomUUID();
      const connectionId = randomUUID();
      const syncId = randomUUID();
      await db.query("INSERT INTO firms(id) VALUES ($1)", [firmId]);
      await db.query("INSERT INTO companies(id) VALUES ($1)", [companyId]);
      await db.query("INSERT INTO firm_clients(id, firm_id, company_id) VALUES ($1,$2,$3)", [clientId, firmId, companyId]);
      await db.query("INSERT INTO accounting_connections(id) VALUES ($1)", [connectionId]);
      await db.query("INSERT INTO accounting_syncs(id, connection_id) VALUES ($1,$2)", [syncId, connectionId]);
      return { firmId, clientId, companyId, syncId };
    } finally {
      await db.end();
    }
  }

  function runPayload(ids: Awaited<ReturnType<typeof seed>>, key: string) {
    return {
      firm_id: ids.firmId,
      firm_client_id: ids.clientId,
      company_id: ids.companyId,
      accounting_sync_id: ids.syncId,
      provider: "quickbooks",
      week_ending: "2026-09-20",
      status: "review_required",
      finding_count: 1,
      summary: { review_only: true, provider_writes: false },
      idempotency_key: key,
      completed_at: "2026-09-17T06:30:00Z",
    };
  }

  it("persists atomically and reuses an idempotent retry", async () => {
    const ids = await seed();
    const key = "a".repeat(64);
    const db = await client("service_role");
    try {
      const args = [JSON.stringify(runPayload(ids, key)), JSON.stringify([{ category: "bank_activity", code: "bank_activity_requires_review", severity: "review", item_count: 2, amount_cents: 1200, evidence: { source: "normalized_transactions" } }])];
      const first = await db.query("SELECT * FROM persist_ra_pro_weekly_completeness($1::jsonb,$2::jsonb)", args);
      const second = await db.query("SELECT * FROM persist_ra_pro_weekly_completeness($1::jsonb,$2::jsonb)", args);
      expect(first.rows[0].reused).toBe(false);
      expect(second.rows[0]).toMatchObject({ run_id: first.rows[0].run_id, reused: true });
      const counts = await db.query("SELECT (SELECT count(*)::int FROM ra_pro_weekly_completeness_runs) runs, (SELECT count(*)::int FROM ra_pro_weekly_completeness_findings) findings");
      expect(counts.rows[0]).toEqual({ runs: 1, findings: 1 });
    } finally {
      await db.end();
    }
  });

  it("concurrent duplicates produce exactly one run and finding set", async () => {
    const ids = await seed();
    const key = "b".repeat(64);
    const args = [JSON.stringify(runPayload(ids, key)), JSON.stringify([{ category: "source_data", code: "accounting_snapshot_stale", severity: "block", item_count: 1, amount_cents: null, evidence: {} }])];
    const dbs = await Promise.all(Array.from({ length: 8 }, () => client("service_role")));
    try {
      const settled = await Promise.all(dbs.map((db) => db.query("SELECT * FROM persist_ra_pro_weekly_completeness($1::jsonb,$2::jsonb)", args)));
      expect(new Set(settled.map((result) => result.rows[0].run_id)).size).toBe(1);
      const counts = await dbs[0].query(
        `SELECT count(*)::int runs,
                (SELECT count(*)::int
                   FROM ra_pro_weekly_completeness_findings f
                   JOIN ra_pro_weekly_completeness_runs r ON r.id = f.run_id
                  WHERE r.idempotency_key = $1) findings
           FROM ra_pro_weekly_completeness_runs
          WHERE idempotency_key = $1`,
        [key],
      );
      expect(counts.rows[0]).toEqual({ runs: 1, findings: 1 });
    } finally {
      await Promise.all(dbs.map((db) => db.end()));
    }
  });

  it("allows only active firm members to read and denies authenticated writes", async () => {
    const ids = await seed();
    const memberId = randomUUID();
    const outsiderId = randomUUID();
    const owner = await client();
    try {
      await owner.query("INSERT INTO firm_memberships(firm_id,user_id,status) VALUES ($1,$2,'active')", [ids.firmId, memberId]);
    } finally {
      await owner.end();
    }
    const service = await client("service_role");
    try {
      await service.query("SELECT * FROM persist_ra_pro_weekly_completeness($1::jsonb,$2::jsonb)", [JSON.stringify(runPayload(ids, "c".repeat(64))), JSON.stringify([])]);
    } finally {
      await service.end();
    }

    const member = await client("authenticated", memberId);
    const outsider = await client("authenticated", outsiderId);
    try {
      expect((await member.query("SELECT count(*)::int n FROM ra_pro_weekly_completeness_runs")).rows[0].n).toBe(1);
      expect((await outsider.query("SELECT count(*)::int n FROM ra_pro_weekly_completeness_runs")).rows[0].n).toBe(0);
      await expect(member.query("SELECT * FROM persist_ra_pro_weekly_completeness('{}'::jsonb,'[]'::jsonb)")).rejects.toThrow(/permission denied/i);
      await expect(member.query("DELETE FROM ra_pro_weekly_completeness_runs")).rejects.toThrow(/permission denied/i);
    } finally {
      await member.end();
      await outsider.end();
    }
  });
});
