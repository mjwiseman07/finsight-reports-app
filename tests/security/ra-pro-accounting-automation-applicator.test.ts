/**
 * Disposable + unit coverage for RA Pro accounting-automation dual-migration applicator.
 * Synthetic Docker Postgres only — never production.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error pg types optional in this repo
import { Client } from "pg";
import {
  ADVISORY_LOCK,
  APPLY_AUTHORIZATION_TOKEN,
  DATABASE_URL_ENV,
  FEATURE_FLAG_ENV,
  runApplicator,
  resolveDatabaseUrlFromEnv,
  assertAuthorizationPublished,
  assertBundleAuthority,
  sanitizeValue,
} from "../../scripts/security/ra-pro-accounting-automation-apply-core.js";
import {
  ARTIFACT_COMMIT,
  MIGRATIONS,
  POST_HISTORY_COUNT,
  PRIOR_HISTORY_COUNT,
  STANDALONE_BUNDLE_BYTES,
  STANDALONE_BUNDLE_OID,
  STANDALONE_BUNDLE_PATH,
  STANDALONE_BUNDLE_SHA256,
} from "../../scripts/security/ra-pro-accounting-automation-apply-constants.js";
import { loadAndVerifyGitBlob } from "../../scripts/security/git-blob-authority.js";

type PgClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
  connect: () => Promise<void>;
  end: () => Promise<void>;
};

const dockerOk =
  spawnSync("docker", ["info"], { encoding: "utf8", windowsHide: true, timeout: 15_000 }).status ===
  0;

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function sha256(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

describe("RA Pro accounting-automation applicator (unit)", () => {
  it("refuses unpublished authorization before any database contact", () => {
    expect(() => assertAuthorizationPublished({})).toThrow(/AUTHORIZATION_PINS_UNPUBLISHED/);
  });

  it("rejects cutover/FRLS/containment/generic credential channels", () => {
    expect(() => resolveDatabaseUrlFromEnv({ DATABASE_URL: "postgres://x@127.0.0.1/db" })).toThrow(
      /PROHIBITED_CREDENTIAL_CHANNEL/,
    );
    expect(() =>
      resolveDatabaseUrlFromEnv({
        RA_PRO_CUTOVER_APPLY_DATABASE_URL: "postgres://x@127.0.0.1/db",
      }),
    ).toThrow(/PROHIBITED_CREDENTIAL_CHANNEL/);
    expect(() =>
      resolveDatabaseUrlFromEnv({
        CONTAINMENT_APPLY_DATABASE_URL: "postgres://x@127.0.0.1/db",
      }),
    ).toThrow(/PROHIBITED_CREDENTIAL_CHANNEL/);
    expect(() =>
      resolveDatabaseUrlFromEnv({
        FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL: "postgres://x@127.0.0.1/db",
      }),
    ).toThrow(/PROHIBITED_CREDENTIAL_CHANNEL/);
    expect(() =>
      resolveDatabaseUrlFromEnv({
        [DATABASE_URL_ENV]: "postgres://x@127.0.0.1/db",
        [FEATURE_FLAG_ENV]: "true",
      }),
    ).toThrow(/ENABLE_RA_PRO_ACCOUNTING_AUTOMATION=true is forbidden/);
  });

  it("redacts database URLs from evidence", () => {
    const s = sanitizeValue({
      message: `fail ${DATABASE_URL_ENV}=postgres://user:secret@127.0.0.1/db`,
    }) as { message: string };
    expect(s.message).not.toMatch(/secret/);
  });

  it("apply ceremony entry refuses unpublished prior/pre-apply pins without credentials", () => {
    const run = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts/security/enter-ra-pro-accounting-automation-apply.ps1",
        "-Mode",
        "apply",
      ],
      { cwd: process.cwd(), encoding: "utf8", windowsHide: true },
    );
    expect(run.status).toBe(1);
    const payload = JSON.parse(run.stdout.trim().split(/\r?\n/).pop() || "{}");
    expect(payload.reason).toBe("AUTHORIZATION_PINS_UNPUBLISHED");
    expect(payload.mode).toBe("apply");
    expect(payload.productionContact).toBe(false);
  });

  it("dry-run accepts published precondition without prior/apply pins (fails closed only on missing URL)", async () => {
    const result = await runApplicator({
      mode: "dry-run",
      env: {}, // no database URL
    });
    expect(result.verdict).toBe("DRY_RUN_BLOCKED");
    expect(String(result.error_code || result.result_code || "")).toMatch(/MISSING_INPUT|MALFORMED_DATABASE_URL/);
    expect(String(result.error_code || "")).not.toMatch(/AUTHORIZATION_PINS_UNPUBLISHED/);
    expect(result.authorization_scope).toBe("dry_run_precondition_only");
    expect(result.precondition_evidence?.sha256).toBe(
      "8714cea78cf04defdc3bfa63555aca507220fb4ec985b3709fdef629a34499b8",
    );
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
    expect(result.sqlApplicationAttempts ?? 0).toBe(0);
    expect(result.migration_sql_attempts ?? 0).toBe(0);
  });

  it("apply still rejects unpublished prior/pre-apply pins before credentials", async () => {
    const result = await runApplicator({
      mode: "apply",
      authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      env: { [DATABASE_URL_ENV]: "postgres://x@127.0.0.1/db" },
    });
    expect(result.verdict).toBe("APPLY_BLOCKED");
    expect(String(result.error_code || result.result_code || "")).toMatch(/AUTHORIZATION_PINS_UNPUBLISHED/);
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
    expect(result.sqlApplicationAttempts ?? 0).toBe(0);
  });

  it("standalone bundle executes under Node and fails closed without packaging errors", () => {
    const check = spawnSync(process.execPath, ["--check", STANDALONE_BUNDLE_PATH], {
      cwd: process.cwd(),
      encoding: "utf8",
      windowsHide: true,
    });
    expect(check.status, check.stderr).toBe(0);

    const run = spawnSync(process.execPath, [STANDALONE_BUNDLE_PATH], {
      cwd: process.cwd(),
      encoding: "utf8",
      windowsHide: true,
      env: { ...process.env },
    });
    const out = `${run.stdout || ""}${run.stderr || ""}`;
    expect(out).not.toMatch(/SyntaxError|Cannot find module|Identifier 'module'/);
    expect(run.status).not.toBe(0);
    const payload = JSON.parse(out.trim().split(/\r?\n/).filter(Boolean).pop() || "{}");
    expect(
      String(payload.reason || payload.result_code || payload.error_code || payload.error || ""),
    ).toMatch(/MISSING_INPUT|MALFORMED_DATABASE_URL|BUNDLE_/);
    expect(String(payload.error_code || payload.result_code || "")).not.toMatch(
      /AUTHORIZATION_PINS_UNPUBLISHED/,
    );
    expect(payload.databaseConnectionAttempts ?? 0).toBe(0);
    expect(payload.sqlApplicationAttempts ?? 0).toBe(0);
  });

  it("enforces committed bundle OID/SHA/bytes before credentials", () => {
    const ok = assertBundleAuthority({});
    expect(ok.oid).toBe(STANDALONE_BUNDLE_OID);
    expect(ok.sha256).toBe(STANDALONE_BUNDLE_SHA256);
    expect(ok.bytes).toBe(STANDALONE_BUNDLE_BYTES);
    expect(ok.path).toBe(STANDALONE_BUNDLE_PATH);

    expect(() =>
      assertBundleAuthority({
        bundleSealsOverride: {
          path: STANDALONE_BUNDLE_PATH,
          oid: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          sha256: STANDALONE_BUNDLE_SHA256,
          bytes: STANDALONE_BUNDLE_BYTES,
        },
      }),
    ).toThrow(/BLOCKED_PIN_MISMATCH|BUNDLE_AUTHORITY_MISMATCH|OID/);

    expect(() =>
      assertBundleAuthority({
        bundleSealsOverride: {
          path: STANDALONE_BUNDLE_PATH,
          oid: STANDALONE_BUNDLE_OID,
          sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          bytes: STANDALONE_BUNDLE_BYTES,
        },
      }),
    ).toThrow(/BLOCKED_PIN_MISMATCH|BUNDLE_AUTHORITY_MISMATCH|SHA-256/);

    expect(() =>
      assertBundleAuthority({
        bundleSealsOverride: {
          path: STANDALONE_BUNDLE_PATH,
          oid: STANDALONE_BUNDLE_OID,
          sha256: STANDALONE_BUNDLE_SHA256,
          bytes: STANDALONE_BUNDLE_BYTES + 1,
        },
      }),
    ).toThrow(/BLOCKED_PIN_MISMATCH|BUNDLE_AUTHORITY_MISMATCH|byte/);

    expect(() =>
      assertBundleAuthority({
        bundleSealsOverride: {
          path: STANDALONE_BUNDLE_PATH,
          oid: "PENDING_BUNDLE_OID_PLACEHOLDER_000000000000",
          sha256: STANDALONE_BUNDLE_SHA256,
          bytes: STANDALONE_BUNDLE_BYTES,
        },
      }),
    ).toThrow(/BUNDLE_AUTHORITY_UNPUBLISHED/);
  });

  it("refuses harness activation via env or argv; CLI dry-run never bypasses missing URL", () => {
    expect(() =>
      assertBundleAuthority({
        env: { RA_PRO_ACCOUNTING_AUTOMATION_ALLOW_HARNESS: "1" },
      }),
    ).toThrow(/HARNESS_VIA_ENV_FORBIDDEN/);
    expect(() =>
      assertBundleAuthority({
        argv: ["node", "apply.js", "--allow-unpublished-harness"],
      }),
    ).toThrow(/HARNESS_VIA_ARGV_FORBIDDEN/);

    const cli = spawnSync(
      process.execPath,
      ["scripts/security/apply-ra-pro-accounting-automation.js", "--dry-run"],
      { cwd: process.cwd(), encoding: "utf8", windowsHide: true, env: { ...process.env } },
    );
    expect(cli.status).toBe(1);
    const payload = JSON.parse(`${cli.stdout || ""}${cli.stderr || ""}`.trim().split(/\r?\n/).pop() || "{}");
    expect(String(payload.reason || payload.result_code || payload.error_code || "")).toMatch(
      /MISSING_INPUT|MALFORMED_DATABASE_URL|BUNDLE_/,
    );
    expect(String(payload.error_code || payload.result_code || "")).not.toMatch(
      /AUTHORIZATION_PINS_UNPUBLISHED/,
    );
    expect(payload.databaseConnectionAttempts ?? 0).toBe(0);
  });
});

describe.skipIf(!dockerOk)("RA Pro accounting-automation applicator (disposable Postgres)", () => {
  let container = "";
  let url = "";

  function docker(args: string[], input?: string | Buffer) {
    const result = spawnSync("docker", args, {
      input,
      encoding: "utf8",
      windowsHide: true,
      timeout: 180_000,
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

  function applyInputs(overrides: Record<string, unknown> = {}) {
    return {
      mode: "apply" as const,
      allowUnpublishedForHarness: true,
      authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      artifactCommit: ARTIFACT_COMMIT,
      env: { [DATABASE_URL_ENV]: url },
      ...overrides,
    };
  }

  beforeAll(async () => {
    container = `ra-acct-apply-${randomBytes(4).toString("hex")}`;
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
      sleep(400);
    }
    if (!ready) throw new Error("postgres readiness timeout");

    const boot = `
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE SCHEMA supabase_migrations;
      CREATE TABLE supabase_migrations.schema_migrations (
        version text PRIMARY KEY,
        name text,
        statements text[]
      );
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

    // Seed exactly PRIOR_HISTORY_COUNT synthetic history rows (188) via pg client.
    const seeder = new Client({ connectionString: url }) as PgClient;
    await seeder.connect();
    try {
      for (let i = 0; i < PRIOR_HISTORY_COUNT; i += 1) {
        const version = String(20000000000000 + i);
        await seeder.query(
          `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
           VALUES ($1, $2, ARRAY[$3]::text[])`,
          [version, `seed_${i}`, `-- seed ${i}`],
        );
      }
      const check = await seeder.query(
        `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
      );
      if (check.rows[0].c !== PRIOR_HISTORY_COUNT) {
        throw new Error(`seed history count ${check.rows[0].c} != ${PRIOR_HISTORY_COUNT}`);
      }
    } finally {
      await seeder.end();
    }
  }, 180_000);

  afterAll(() => {
    if (container) spawnSync("docker", ["rm", "-f", container], { windowsHide: true });
  });

  async function assertSentinelsUnchanged(db: PgClient) {
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

  it("dry-run is ready with zero SQL attempts when history is 188", async () => {
    const result = await runApplicator({
      mode: "dry-run",
      env: { [DATABASE_URL_ENV]: url },
    });
    expect(result, JSON.stringify(result)).toMatchObject({
      verdict: "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION",
      sqlApplicationAttempts: 0,
      migration_sql_attempts: 0,
      databaseConnectionAttempts: 1,
      authorization_scope: "dry_run_precondition_only",
      prior_history_count: PRIOR_HISTORY_COUNT,
    });
    expect(result.versions_absent).toEqual(MIGRATIONS.map((m) => m.version));
    expect(result.advisory_lock_acquired).toBe(true);
  });

  it("applies both sealed migrations atomically and stores exact LF blobs", async () => {
    const result = await runApplicator(applyInputs());
    expect(result, JSON.stringify(result)).toMatchObject({
      verdict: "APPLY_COMMITTED",
      sqlApplicationAttempts: 2,
    });

    const db = await client();
    try {
      const hist = await db.query(
        `SELECT count(*)::int c FROM supabase_migrations.schema_migrations`,
      );
      expect(hist.rows[0].c).toBe(POST_HISTORY_COUNT);

      for (const migration of MIGRATIONS) {
        const packed = loadAndVerifyGitBlob({
          commit: ARTIFACT_COMMIT,
          path: migration.path,
          expectedOid: migration.oid,
          expectedSha256: migration.sha256,
          expectedBytes: migration.bytes,
        });
        const { rows } = await db.query(
          `SELECT count(*)::int c, statements FROM supabase_migrations.schema_migrations WHERE version=$1 GROUP BY statements`,
          [migration.version],
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].c).toBe(1);
        const stmts = rows[0].statements as string[];
        expect(stmts).toHaveLength(1);
        expect(sha256(stmts[0])).toBe(migration.sha256);
        expect(Buffer.byteLength(stmts[0], "utf8")).toBe(migration.bytes);
        expect(stmts[0]).toBe(packed.buffer.toString("utf8"));
      }

      const objects = await db.query(`
        SELECT
          (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND c.relname='ra_pro_weekly_completeness_runs') weekly_rls,
          (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND c.relname='ra_pro_month_end_review_packages') month_rls,
          (SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='public' AND p.proname='persist_ra_pro_weekly_completeness') weekly_secdef,
          (SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='public' AND p.proname='persist_ra_pro_month_end_review_package') month_secdef,
          (SELECT array_to_string(p.proconfig, ',') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='public' AND p.proname='persist_ra_pro_weekly_completeness') weekly_config,
          (SELECT array_to_string(p.proconfig, ',') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='public' AND p.proname='persist_ra_pro_month_end_review_package') month_config
      `);
      expect(objects.rows[0].weekly_rls).toBe(true);
      expect(objects.rows[0].month_rls).toBe(true);
      expect(objects.rows[0].weekly_secdef).toBe(false);
      expect(objects.rows[0].month_secdef).toBe(false);
      expect(String(objects.rows[0].weekly_config)).toMatch(/search_path/);
      expect(String(objects.rows[0].month_config)).toMatch(/search_path/);
      await assertSentinelsUnchanged(db);
    } finally {
      await db.end();
    }
  });

  it("refuses repeat apply when versions already present", async () => {
    const result = await runApplicator(applyInputs());
    expect(result.verdict).toBe("APPLY_ROLLED_BACK");
    expect(result.error_code).toBe("VERSION_ALREADY_PRESENT");
  });

  it("authenticated is read-only; service_role persists; idempotent + concurrent reuse", async () => {
    const owner = await client();
    const firmId = randomUUID();
    const clientId = randomUUID();
    const companyId = randomUUID();
    const connectionId = randomUUID();
    const syncId = randomUUID();
    const memberId = randomUUID();
    try {
      await owner.query("INSERT INTO firms(id) VALUES ($1)", [firmId]);
      await owner.query("INSERT INTO companies(id) VALUES ($1)", [companyId]);
      await owner.query("INSERT INTO firm_clients(id, firm_id, company_id) VALUES ($1,$2,$3)", [
        clientId,
        firmId,
        companyId,
      ]);
      await owner.query("INSERT INTO accounting_connections(id) VALUES ($1)", [connectionId]);
      await owner.query("INSERT INTO accounting_syncs(id, connection_id) VALUES ($1,$2)", [
        syncId,
        connectionId,
      ]);
      await owner.query(
        "INSERT INTO firm_memberships(firm_id,user_id,status) VALUES ($1,$2,'active')",
        [firmId, memberId],
      );
    } finally {
      await owner.end();
    }

    const weeklyPayload = {
      firm_id: firmId,
      firm_client_id: clientId,
      company_id: companyId,
      accounting_sync_id: syncId,
      provider: "quickbooks",
      week_ending: "2026-09-20",
      status: "clear",
      finding_count: 0,
      summary: { review_only: true, provider_writes: false },
      idempotency_key: "a".repeat(64),
      completed_at: "2026-09-17T18:00:00Z",
    };
    const monthPayload = {
      firm_id: firmId,
      firm_client_id: clientId,
      company_id: companyId,
      accounting_sync_id: syncId,
      provider: "xero",
      period_end: "2026-08-31",
      status: "ready",
      review_package: { review_only: true, provider_writes: false, status: "ready" },
      idempotency_key: "b".repeat(64),
      completed_at: "2026-09-17T18:00:00Z",
    };

    const service = await client("service_role");
    try {
      const first = await service.query(
        "SELECT * FROM persist_ra_pro_weekly_completeness($1::jsonb,$2::jsonb)",
        [JSON.stringify(weeklyPayload), JSON.stringify([])],
      );
      const second = await service.query(
        "SELECT * FROM persist_ra_pro_weekly_completeness($1::jsonb,$2::jsonb)",
        [JSON.stringify(weeklyPayload), JSON.stringify([])],
      );
      expect(first.rows[0].reused).toBe(false);
      expect(second.rows[0]).toMatchObject({ run_id: first.rows[0].run_id, reused: true });

      const args = [JSON.stringify(monthPayload)];
      const dbs = await Promise.all(Array.from({ length: 8 }, () => client("service_role")));
      try {
        const settled = await Promise.all(
          dbs.map((db) =>
            db.query("SELECT * FROM persist_ra_pro_month_end_review_package($1::jsonb)", args),
          ),
        );
        expect(new Set(settled.map((r) => r.rows[0].package_id)).size).toBe(1);
      } finally {
        await Promise.all(dbs.map((db) => db.end()));
      }
      await assertSentinelsUnchanged(service);
    } finally {
      await service.end();
    }

    const member = await client("authenticated", memberId);
    try {
      expect(
        (await member.query("SELECT count(*)::int n FROM ra_pro_weekly_completeness_runs")).rows[0]
          .n,
      ).toBe(1);
      expect(
        (await member.query("SELECT count(*)::int n FROM ra_pro_month_end_review_packages")).rows[0]
          .n,
      ).toBe(1);
      await expect(
        member.query("SELECT * FROM persist_ra_pro_weekly_completeness('{}'::jsonb,'[]'::jsonb)"),
      ).rejects.toThrow(/permission denied/i);
      await expect(
        member.query("SELECT * FROM persist_ra_pro_month_end_review_package('{}'::jsonb)"),
      ).rejects.toThrow(/permission denied/i);
      await expect(member.query("DELETE FROM ra_pro_weekly_completeness_runs")).rejects.toThrow(
        /permission denied/i,
      );
      await expect(member.query("DELETE FROM ra_pro_month_end_review_packages")).rejects.toThrow(
        /permission denied/i,
      );
    } finally {
      await member.end();
    }
  });

  it("rolls back when injected failure occurs before history insert", async () => {
    const name = `ra-acct-rollback-${randomBytes(3).toString("hex")}`;
    const port = 58_800 + Math.floor(Math.random() * 100);
    const localUrl = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
    docker([
      "run",
      "-d",
      "--rm",
      "--name",
      name,
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-p",
      `${port}:5432`,
      "postgres:16-alpine",
    ]);
    try {
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        const probe = spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres"], {
          windowsHide: true,
        });
        if (probe.status === 0) break;
        sleep(400);
      }
      sleep(400);
      const boot = `
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
        CREATE SCHEMA supabase_migrations;
        CREATE TABLE supabase_migrations.schema_migrations (
          version text PRIMARY KEY, name text, statements text[]
        );
        CREATE TABLE public.firms (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
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
        CREATE TABLE public.firm_memberships (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          firm_id uuid NOT NULL REFERENCES public.firms(id),
          user_id uuid NOT NULL,
          status text NOT NULL
        );
        CREATE ROLE anon NOLOGIN;
        CREATE ROLE authenticated NOLOGIN;
        CREATE ROLE service_role NOLOGIN BYPASSRLS;
        CREATE SCHEMA auth;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
          SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
        $$;
        GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
        GRANT SELECT ON public.firm_memberships TO authenticated;
      `;
      docker(["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], boot);
      const seeder = new Client({ connectionString: localUrl }) as PgClient;
      await seeder.connect();
      try {
        for (let i = 0; i < PRIOR_HISTORY_COUNT; i += 1) {
          await seeder.query(
            `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
             VALUES ($1,$2,ARRAY[$3]::text[])`,
            [String(20000000000000 + i), `seed_${i}`, "-- seed"],
          );
        }
      } finally {
        await seeder.end();
      }

      const rolled = await runApplicator(
        applyInputs({ injectFailure: "before_history", env: { [DATABASE_URL_ENV]: localUrl } }),
      );
      expect(rolled.verdict).toBe("APPLY_ROLLED_BACK");
      const db = new Client({ connectionString: localUrl }) as PgClient;
      await db.connect();
      try {
        const hist = await db.query(
          `SELECT count(*)::int c FROM supabase_migrations.schema_migrations`,
        );
        expect(hist.rows[0].c).toBe(PRIOR_HISTORY_COUNT);
        for (const migration of MIGRATIONS) {
          const present = await db.query(
            `SELECT count(*)::int c FROM supabase_migrations.schema_migrations WHERE version=$1`,
            [migration.version],
          );
          expect(present.rows[0].c).toBe(0);
        }
      } finally {
        await db.end();
      }
    } finally {
      spawnSync("docker", ["rm", "-f", name], { windowsHide: true });
    }
  });

  it("refuses when only the first migration version is already present", async () => {
    const name = `ra-acct-onever-${randomBytes(3).toString("hex")}`;
    const port = 58_900 + Math.floor(Math.random() * 80);
    const localUrl = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
    docker([
      "run",
      "-d",
      "--rm",
      "--name",
      name,
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-p",
      `${port}:5432`,
      "postgres:16-alpine",
    ]);
    try {
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        const probe = spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres"], {
          windowsHide: true,
        });
        if (probe.status === 0) break;
        sleep(400);
      }
      sleep(400);
      docker(
        ["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"],
        `
        CREATE SCHEMA supabase_migrations;
        CREATE TABLE supabase_migrations.schema_migrations (
          version text PRIMARY KEY, name text, statements text[]
        );
      `,
      );
      const seeder = new Client({ connectionString: localUrl }) as PgClient;
      await seeder.connect();
      try {
        for (let i = 0; i < PRIOR_HISTORY_COUNT; i += 1) {
          await seeder.query(
            `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
             VALUES ($1,$2,ARRAY[$3]::text[])`,
            [String(20000000000000 + i), `seed_${i}`, "-- seed"],
          );
        }
        const packed = loadAndVerifyGitBlob({
          commit: ARTIFACT_COMMIT,
          path: MIGRATIONS[0].path,
          expectedOid: MIGRATIONS[0].oid,
          expectedSha256: MIGRATIONS[0].sha256,
          expectedBytes: MIGRATIONS[0].bytes,
        });
        await seeder.query(
          `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
           VALUES ($1,$2,ARRAY[$3]::text[])`,
          [MIGRATIONS[0].version, MIGRATIONS[0].name, packed.buffer.toString("utf8")],
        );
      } finally {
        await seeder.end();
      }
      const result = await runApplicator(
        applyInputs({ env: { [DATABASE_URL_ENV]: localUrl } }),
      );
      expect(result.verdict).toBe("APPLY_ROLLED_BACK");
      expect(result.error_code).toBe("VERSION_ALREADY_PRESENT");
    } finally {
      spawnSync("docker", ["rm", "-f", name], { windowsHide: true });
    }
  });

  it("refuses wrong history count", async () => {
    const name = `ra-acct-histdrift-${randomBytes(3).toString("hex")}`;
    const port = 58_960 + Math.floor(Math.random() * 30);
    const localUrl = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
    docker([
      "run",
      "-d",
      "--rm",
      "--name",
      name,
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-p",
      `${port}:5432`,
      "postgres:16-alpine",
    ]);
    try {
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        const probe = spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres"], {
          windowsHide: true,
        });
        if (probe.status === 0) break;
        sleep(400);
      }
      sleep(400);
      docker(
        ["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"],
        `
        CREATE SCHEMA supabase_migrations;
        CREATE TABLE supabase_migrations.schema_migrations (
          version text PRIMARY KEY, name text, statements text[]
        );
      `,
      );
      const seeder = new Client({ connectionString: localUrl }) as PgClient;
      await seeder.connect();
      try {
        for (let i = 0; i < PRIOR_HISTORY_COUNT + 1; i += 1) {
          await seeder.query(
            `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
             VALUES ($1,$2,ARRAY[$3]::text[])`,
            [String(20000000000000 + i), `seed_${i}`, "-- seed"],
          );
        }
      } finally {
        await seeder.end();
      }
      const result = await runApplicator(
        applyInputs({ env: { [DATABASE_URL_ENV]: localUrl } }),
      );
      expect(result.verdict).toBe("APPLY_ROLLED_BACK");
      expect(result.error_code).toBe("HISTORY_COUNT_MISMATCH");
    } finally {
      spawnSync("docker", ["rm", "-f", name], { windowsHide: true });
    }
  });

  it("refuses tampered migration blob pins", async () => {
    const blocked = await runApplicator(
      applyInputs({ artifactCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" }),
    );
    expect(blocked.verdict).toBe("APPLY_BLOCKED");
    expect(String(blocked.error_code || blocked.result_code)).toMatch(
      /GIT_BLOB_LOAD_FAILED|BLOCKED_PIN_MISMATCH|APPLY_BLOCKED|OID|SHA256/,
    );
  });

  it("reports lock contention when advisory lock is held", async () => {
    const holder = await client();
    await holder.query("BEGIN");
    await holder.query("SELECT pg_advisory_xact_lock($1::int,$2::int)", [
      ADVISORY_LOCK.key1,
      ADVISORY_LOCK.key2,
    ]);
    try {
      const result = await runApplicator(applyInputs({ lockTimeoutMs: 0, mode: "dry-run" }));
      expect(result.verdict).toBe("DRY_RUN_BLOCKED");
      expect(result.error_code).toBe("ADVISORY_LOCK_CONTENTION");
    } finally {
      await holder.query("ROLLBACK");
      await holder.end();
    }
  });

  it("classifies indeterminate outcomes when commit injection fires on a clean DB path", async () => {
    // Spin a sibling disposable world with history 188 and no target versions.
    const name = `ra-acct-indet-${randomBytes(3).toString("hex")}`;
    const port = 58_000 + Math.floor(Math.random() * 800);
    const localUrl = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
    docker([
      "run",
      "-d",
      "--rm",
      "--name",
      name,
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-p",
      `${port}:5432`,
      "postgres:16-alpine",
    ]);
    try {
      const deadline = Date.now() + 90_000;
      let ready = false;
      while (Date.now() < deadline) {
        const probe = spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres"], {
          windowsHide: true,
        });
        if (probe.status === 0) {
          ready = true;
          break;
        }
        sleep(400);
      }
      if (!ready) throw new Error("sibling postgres readiness timeout");
      sleep(500);
      const boot = `
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
        CREATE SCHEMA supabase_migrations;
        CREATE TABLE supabase_migrations.schema_migrations (
          version text PRIMARY KEY, name text, statements text[]
        );
        CREATE TABLE public.firms (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
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
        CREATE TABLE public.firm_memberships (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          firm_id uuid NOT NULL REFERENCES public.firms(id),
          user_id uuid NOT NULL,
          status text NOT NULL
        );
        CREATE ROLE anon NOLOGIN;
        CREATE ROLE authenticated NOLOGIN;
        CREATE ROLE service_role NOLOGIN BYPASSRLS;
        CREATE SCHEMA auth;
        CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
          SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
        $$;
        GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
        GRANT SELECT ON public.firm_memberships TO authenticated;
      `;
      docker(["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], boot);
      const seeder = new Client({ connectionString: localUrl }) as PgClient;
      await seeder.connect();
      try {
        for (let i = 0; i < PRIOR_HISTORY_COUNT; i += 1) {
          await seeder.query(
            `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
             VALUES ($1, $2, ARRAY[$3]::text[])`,
            [String(20000000000000 + i), `seed_${i}`, "-- seed"],
          );
        }
      } finally {
        await seeder.end();
      }

      // Wait briefly so postgres accepts concurrent applicator connections.
      sleep(500);

      const during = await runApplicator({
        ...applyInputs({ injectFailure: "during_commit", env: { [DATABASE_URL_ENV]: localUrl } }),
      });
      expect(during, JSON.stringify(during)).toMatchObject({
        verdict: "INDETERMINATE_OUTCOME",
      });
      expect(String(during.reconciliation?.outcome || "")).toMatch(
        /NOT_APPLIED_CONFIRMED|APPLIED_CONFIRMED_AFTER_RECONCILIATION|INDETERMINATE/,
      );

      const committed = await runApplicator({
        ...applyInputs({ env: { [DATABASE_URL_ENV]: localUrl } }),
      });
      expect(committed, JSON.stringify(committed)).toMatchObject({ verdict: "APPLY_COMMITTED" });

      const afterAck = await runApplicator({
        ...applyInputs({
          injectFailure: "after_commit_ack",
          env: { [DATABASE_URL_ENV]: localUrl },
        }),
      });
      expect(["APPLY_ROLLED_BACK", "INDETERMINATE_OUTCOME"]).toContain(afterAck.verdict);
    } finally {
      spawnSync("docker", ["rm", "-f", name], { windowsHide: true });
    }
  });
});
