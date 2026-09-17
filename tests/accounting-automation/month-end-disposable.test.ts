/**
 * Disposable Postgres rehearsal for RA Pro month-end review packages.
 * Synthetic only; never connects to Supabase or production. Requires Docker.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// `pg` is a runtime dependency in this repository but its declarations are not.
// @ts-expect-error pg declarations are intentionally absent
import { Client } from "pg";

type PgClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
  connect: () => Promise<void>;
  end: () => Promise<void>;
};

const dockerOk =
  spawnSync("docker", ["info"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 15_000,
  }).status === 0;

const WEEKLY_MIGRATION = "supabase/migrations/20260917044537_ra_pro_weekly_completeness_findings.sql";
const MONTH_END_MIGRATION = "supabase/migrations/20260917180140_ra_pro_month_end_review_packages.sql";

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

describe.skipIf(!dockerOk)("month-end review package persistence (disposable Postgres)", () => {
  let container = "";
  let url = "";
  let tempDir = "";

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
    const db = new Client({ connectionString: url }) as PgClient;
    await db.connect();
    if (role !== "postgres") await db.query(`SET ROLE ${role}`);
    if (userId) await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId]);
    return db;
  }

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-month-end-"));
    container = `ra-pro-month-end-${randomBytes(4).toString("hex")}`;
    const port = 57_000 + Math.floor(Math.random() * 900);
    url = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
    docker([
      "run",
      "-d",
      "--rm",
      "--name",
      container,
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-p",
      `${port}:5432`,
      "postgres:16-alpine",
    ]);
    const deadline = Date.now() + 90_000;
    let ready = false;
    while (Date.now() < deadline) {
      const probe = spawnSync("docker", ["exec", container, "pg_isready", "-U", "postgres"], {
        windowsHide: true,
      });
      if (probe.status === 0) {
        ready = true;
        break;
      }
      sleep(500);
    }
    if (!ready) {
      spawnSync("docker", ["rm", "-f", container], { windowsHide: true });
      throw new Error(`postgres container ${container} failed readiness within timeout`);
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
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        firm_id uuid NOT NULL REFERENCES public.firms(id),
        user_id uuid NOT NULL,
        status text NOT NULL
      );
      CREATE TABLE public.companies (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.firm_clients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        firm_id uuid NOT NULL REFERENCES public.firms(id),
        company_id uuid REFERENCES public.companies(id)
      );
      CREATE TABLE public.accounting_connections (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.accounting_syncs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        connection_id uuid NOT NULL REFERENCES public.accounting_connections(id)
      );
      -- Sentinel tables to prove month-end persist never writes provider/ledger artifacts.
      CREATE TABLE public.provider_write_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.invoices (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.bills (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.journal_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
      GRANT SELECT ON public.firm_memberships TO authenticated;
      GRANT SELECT ON public.provider_write_attempts, public.invoices, public.bills,
        public.payments, public.journal_entries TO service_role;
    `;
    docker(["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], boot);
    docker(
      ["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"],
      fs.readFileSync(path.join(process.cwd(), WEEKLY_MIGRATION)),
    );
    docker(
      ["exec", "-i", container, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"],
      fs.readFileSync(path.join(process.cwd(), MONTH_END_MIGRATION)),
    );

    fs.writeFileSync(
      path.join(tempDir, "applied.json"),
      JSON.stringify({ weekly: WEEKLY_MIGRATION, month_end: MONTH_END_MIGRATION }),
    );
  }, 120_000);

  afterAll(() => {
    if (container) spawnSync("docker", ["rm", "-f", container], { windowsHide: true });
    if (tempDir && fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
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
      await db.query("INSERT INTO firm_clients(id, firm_id, company_id) VALUES ($1,$2,$3)", [
        clientId,
        firmId,
        companyId,
      ]);
      await db.query("INSERT INTO accounting_connections(id) VALUES ($1)", [connectionId]);
      await db.query("INSERT INTO accounting_syncs(id, connection_id) VALUES ($1,$2)", [
        syncId,
        connectionId,
      ]);
      return { firmId, clientId, companyId, syncId };
    } finally {
      await db.end();
    }
  }

  function packagePayload(
    ids: Awaited<ReturnType<typeof seed>>,
    key: string,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      firm_id: ids.firmId,
      firm_client_id: ids.clientId,
      company_id: ids.companyId,
      accounting_sync_id: ids.syncId,
      provider: "quickbooks",
      period_end: "2026-08-31",
      status: "ready",
      review_package: {
        review_only: true,
        provider_writes: false,
        status: "ready",
        period_end: "2026-08-31",
      },
      idempotency_key: key,
      completed_at: "2026-09-17T18:01:00Z",
      ...overrides,
    };
  }

  async function assertNoLedgerWrites(db: PgClient) {
    const counts = await db.query(`
      SELECT
        (SELECT count(*)::int FROM provider_write_attempts) provider_writes,
        (SELECT count(*)::int FROM invoices) invoices,
        (SELECT count(*)::int FROM bills) bills,
        (SELECT count(*)::int FROM payments) payments,
        (SELECT count(*)::int FROM journal_entries) journal_entries
    `);
    expect(counts.rows[0]).toEqual({
      provider_writes: 0,
      invoices: 0,
      bills: 0,
      payments: 0,
      journal_entries: 0,
    });
  }

  it("applies after weekly migration and persists atomically with review-only constraints", async () => {
    const probe = await client();
    try {
      const tables = await probe.query(`
        SELECT relname
          FROM pg_class
         WHERE relname IN (
           'ra_pro_weekly_completeness_runs',
           'ra_pro_month_end_review_packages'
         )
         ORDER BY relname
      `);
      expect(tables.rows.map((row) => row.relname)).toEqual([
        "ra_pro_month_end_review_packages",
        "ra_pro_weekly_completeness_runs",
      ]);
      const rls = await probe.query(`
        SELECT c.relrowsecurity AS rls
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND c.relname = 'ra_pro_month_end_review_packages'
      `);
      expect(rls.rows[0].rls).toBe(true);
    } finally {
      await probe.end();
    }

    const ids = await seed();
    const key = "a".repeat(64);
    const db = await client("service_role");
    try {
      const first = await db.query(
        "SELECT * FROM persist_ra_pro_month_end_review_package($1::jsonb)",
        [JSON.stringify(packagePayload(ids, key))],
      );
      const second = await db.query(
        "SELECT * FROM persist_ra_pro_month_end_review_package($1::jsonb)",
        [JSON.stringify(packagePayload(ids, key))],
      );
      expect(first.rows[0].reused).toBe(false);
      expect(second.rows[0]).toMatchObject({
        package_id: first.rows[0].package_id,
        reused: true,
      });
      const stored = await db.query(
        `SELECT count(*)::int n,
                bool_and((review_package->>'review_only')::boolean) review_only,
                bool_and((review_package->>'provider_writes')::boolean IS FALSE) no_writes
           FROM ra_pro_month_end_review_packages
          WHERE idempotency_key = $1`,
        [key],
      );
      expect(stored.rows[0]).toEqual({ n: 1, review_only: true, no_writes: true });

      await expect(
        db.query("SELECT * FROM persist_ra_pro_month_end_review_package($1::jsonb)", [
          JSON.stringify(
            packagePayload(ids, "b".repeat(64), {
              review_package: { review_only: false, provider_writes: false },
            }),
          ),
        ]),
      ).rejects.toThrow(/check constraint|review_only/i);

      await expect(
        db.query("SELECT * FROM persist_ra_pro_month_end_review_package($1::jsonb)", [
          JSON.stringify(
            packagePayload(ids, "c".repeat(64), {
              review_package: { review_only: true, provider_writes: true },
            }),
          ),
        ]),
      ).rejects.toThrow(/check constraint|provider_writes/i);

      await expect(
        db.query("SELECT * FROM persist_ra_pro_month_end_review_package($1::jsonb)", [
          JSON.stringify(packagePayload(ids, "d".repeat(64), { provider: "sage" })),
        ]),
      ).rejects.toThrow(/check constraint|provider/i);

      await expect(
        db.query("SELECT * FROM persist_ra_pro_month_end_review_package($1::jsonb)", [
          JSON.stringify(packagePayload(ids, "e".repeat(64), { status: "posted" })),
        ]),
      ).rejects.toThrow(/check constraint|status/i);

      await assertNoLedgerWrites(db);
    } finally {
      await db.end();
    }
  });

  it("concurrent duplicates produce exactly one package", async () => {
    const ids = await seed();
    const key = "f".repeat(64);
    const args = [JSON.stringify(packagePayload(ids, key))];
    const dbs = await Promise.all(Array.from({ length: 8 }, () => client("service_role")));
    try {
      const settled = await Promise.all(
        dbs.map((db) =>
          db.query("SELECT * FROM persist_ra_pro_month_end_review_package($1::jsonb)", args),
        ),
      );
      expect(new Set(settled.map((result) => result.rows[0].package_id)).size).toBe(1);
      const counts = await dbs[0].query(
        "SELECT count(*)::int n FROM ra_pro_month_end_review_packages WHERE idempotency_key = $1",
        [key],
      );
      expect(counts.rows[0].n).toBe(1);
      await assertNoLedgerWrites(dbs[0]);
    } finally {
      await Promise.all(dbs.map((db) => db.end()));
    }
  });

  it("allows only active firm members to read and denies authenticated writes", async () => {
    const ids = await seed();
    const memberId = randomUUID();
    const inactiveId = randomUUID();
    const outsiderId = randomUUID();
    const owner = await client();
    try {
      await owner.query(
        "INSERT INTO firm_memberships(firm_id,user_id,status) VALUES ($1,$2,'active'), ($1,$3,'inactive')",
        [ids.firmId, memberId, inactiveId],
      );
    } finally {
      await owner.end();
    }

    const service = await client("service_role");
    try {
      await service.query("SELECT * FROM persist_ra_pro_month_end_review_package($1::jsonb)", [
        JSON.stringify(packagePayload(ids, "1".repeat(64))),
      ]);
      await assertNoLedgerWrites(service);
    } finally {
      await service.end();
    }

    const member = await client("authenticated", memberId);
    const inactive = await client("authenticated", inactiveId);
    const outsider = await client("authenticated", outsiderId);
    try {
      expect(
        (await member.query("SELECT count(*)::int n FROM ra_pro_month_end_review_packages")).rows[0]
          .n,
      ).toBe(1);
      expect(
        (await inactive.query("SELECT count(*)::int n FROM ra_pro_month_end_review_packages")).rows[0]
          .n,
      ).toBe(0);
      expect(
        (await outsider.query("SELECT count(*)::int n FROM ra_pro_month_end_review_packages")).rows[0]
          .n,
      ).toBe(0);

      await expect(
        member.query("SELECT * FROM persist_ra_pro_month_end_review_package('{}'::jsonb)"),
      ).rejects.toThrow(/permission denied/i);
      await expect(member.query("INSERT INTO ra_pro_month_end_review_packages DEFAULT VALUES")).rejects.toThrow(
        /permission denied/i,
      );
      await expect(member.query("UPDATE ra_pro_month_end_review_packages SET status = 'ready'")).rejects.toThrow(
        /permission denied/i,
      );
      await expect(member.query("DELETE FROM ra_pro_month_end_review_packages")).rejects.toThrow(
        /permission denied/i,
      );
    } finally {
      await member.end();
      await inactive.end();
      await outsider.end();
    }
  });
});
