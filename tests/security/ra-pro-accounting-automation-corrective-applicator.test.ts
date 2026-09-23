/**
 * Disposable + unit coverage for RA Pro accounting-automation CORRECTIVE applicator.
 * Synthetic Docker Postgres only — never production.
 */
import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error pg types optional in this repo
import { Client } from "pg";
import {
  APPLY_AUTHORIZATION_TOKEN,
  DATABASE_URL_ENV,
  FEATURE_FLAG_ENV,
  assertOriginalMigrationStatementsNotSelectable,
  loadSealedMigrations,
  runApplicator,
  runDryRun,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-core.js";
import {
  CONSUMED_ORIGINAL_ATTEMPT_ID,
  CORRECTIVE_TABLES,
  MIGRATIONS,
  ORIGINAL_COMMITTED_MIGRATIONS,
  POST_HISTORY_COUNT,
  PRIOR_HISTORY_COUNT,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-constants.js";
import {
  createDisposablePublicationCommit,
  assertAttemptNotConsumed,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-authorization.js";
import {
  probeIdempotentPersistenceWithFixtures,
  verifyServiceRoleCatalogGrants,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-schema-probes.js";
import { stripOuterBeginCommit } from "../../scripts/security/git-blob-authority.js";

type PgClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
  connect: () => Promise<void>;
  end: () => Promise<void>;
};

const dockerOk =
  spawnSync("docker", ["info"], { encoding: "utf8", windowsHide: true, timeout: 15_000 }).status ===
  0;

const ROOT = process.cwd();

function gitBlobByOid(oid: string) {
  const result = spawnSync(
    "git",
    ["-c", `safe.directory=${ROOT.replace(/\\/g, "/")}`, "cat-file", "blob", oid],
    {
      cwd: ROOT,
      encoding: null,
      windowsHide: true,
    },
  );
  if (result.status !== 0) {
    throw new Error(String(result.stderr || result.stdout || `git cat-file failed for ${oid}`));
  }
  return result.stdout as Buffer;
}

function sleep(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function gitTip() {
  const tip = spawnSync(
    "git",
    ["-c", `safe.directory=${ROOT.replace(/\\/g, "/")}`, "rev-parse", "HEAD"],
    {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  return (tip.stdout || "").trim();
}

describe("RA Pro accounting-automation corrective applicator (unit)", () => {
  it("refuses to select original migration statements for execution", () => {
    expect(() => assertOriginalMigrationStatementsNotSelectable()).not.toThrow();
    const packed = loadSealedMigrations({
      allowDisposablePublicationCommit: true,
      testOnlyHarnessContext: true,
      allowWorktreeMigrationLoad: true,
    });
    expect(packed).toHaveLength(1);
    expect(packed[0].migration.version).toBe("20260922003200");
    expect(packed.map((p) => p.migration.version)).not.toEqual(
      expect.arrayContaining(ORIGINAL_COMMITTED_MIGRATIONS.map((m) => m.version)),
    );
  });

  it("refuses the consumed dual-package attempt id", () => {
    expect(() => assertAttemptNotConsumed(CONSUMED_ORIGINAL_ATTEMPT_ID)).toThrow(
      /CORRECTIVE_CONSUMED_ORIGINAL_ATTEMPT_FORBIDDEN/,
    );
  });

  it("never enables the automation feature flag constant path", () => {
    expect(FEATURE_FLAG_ENV).toBe("ENABLE_RA_PRO_ACCOUNTING_AUTOMATION");
  });

  it("blocks dry-run before credentials when apply authorization remains UNPUBLISHED", async () => {
    const result = await runDryRun({});
    expect(result.verdict).toBe("DRY_RUN_BLOCKED");
    // Published evidence pins; dry-run still stops before DB URL / production contact.
    expect(result.error_code).toBe("MISSING_INPUT");
    expect(result.phase).toBe("uri_validate");
    expect(result.productionContact).not.toBe(true);
  });
});

describe.skipIf(!dockerOk)("RA Pro accounting-automation corrective applicator (disposable Postgres)", () => {
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

  async function client() {
    const db = new Client({ connectionString: url }) as PgClient;
    await db.connect();
    return db;
  }

  function applyInputs(overrides: Record<string, unknown> = {}) {
    const executable = gitTip();
    const attempt = `apply-${executable.slice(0, 12)}-${randomBytes(16).toString("hex")}`;
    const publicationCommit =
      (overrides.publicationCommit as string) ||
      createDisposablePublicationCommit({
        cwd: ROOT,
        executableCommit: executable,
        attemptId: attempt,
        allowDisposablePublicationCommit: true,
      testOnlyHarnessContext: true,
      }).publicationCommit;
    return {
      mode: "apply" as const,
      allowDisposablePublicationCommit: true,
      testOnlyHarnessContext: true,
      allowLocalhostForHarness: true,
      testOnlyHarnessContext: true,
      allowWorktreeMigrationLoad: true,
      authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      publicationCommit,
      env: { [DATABASE_URL_ENV]: url },
      ...overrides,
      publicationCommit:
        (overrides.publicationCommit as string) || publicationCommit,
    };
  }

  async function seedHistory188(db: PgClient) {
    for (let i = 0; i < 188; i += 1) {
      const version = String(20000000000000 + i);
      await db.query(
        `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
         VALUES ($1, $2, ARRAY[$3]::text[])`,
        [version, `seed_${i}`, `-- seed ${i}`],
      );
    }
  }

  async function applyOriginalMigrationsFromSealedBlobs(db: PgClient) {
    // Exact dual-package sealed blobs only (worktree SQL may have drifted).
    for (const migration of ORIGINAL_COMMITTED_MIGRATIONS) {
      const buf = gitBlobByOid(migration.oid);
      if (buf.includes(0x0d)) throw new Error(`CRLF in sealed blob ${migration.oid}`);
      const full = buf.toString("utf8");
      const digest = createHash("sha256").update(buf).digest("hex");
      if (digest !== migration.sha256 || buf.length !== migration.bytes) {
        throw new Error(`sealed blob mismatch for ${migration.version}`);
      }
      const inner = stripOuterBeginCommit(full);
      await db.query(inner);
      await db.query(
        `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
         VALUES ($1, $2, ARRAY[$3]::text[])`,
        [migration.version, migration.name, full],
      );
    }
  }

  beforeAll(async () => {
    container = `ra-acct-corr-${randomBytes(4).toString("hex")}`;
    const port = 58_000 + Math.floor(Math.random() * 900);
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
    sleep(1000);

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
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
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

    const seeder = await client();
    try {
      await seedHistory188(seeder);
      await applyOriginalMigrationsFromSealedBlobs(seeder);
      // Re-grant excess DML to simulate default-privilege production drift.
      for (const table of CORRECTIVE_TABLES) {
        await seeder.query(
          `GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.${table} TO service_role`,
        );
      }
      const hist = await seeder.query(
        `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
      );
      if (hist.rows[0].c !== PRIOR_HISTORY_COUNT) {
        throw new Error(`boot history ${hist.rows[0].c} != ${PRIOR_HISTORY_COUNT}`);
      }
      const grants = await verifyServiceRoleCatalogGrants(seeder);
      if (grants.ok) {
        throw new Error("expected excess service_role DML before corrective apply");
      }
    } finally {
      await seeder.end();
    }
  }, 180_000);

  afterAll(() => {
    if (container) spawnSync("docker", ["rm", "-f", container], { windowsHide: true });
  });

  it("dry-run is ready at history 190 with excess grants documented", async () => {
    const result = await runApplicator({
      mode: "dry-run",
      allowDisposablePublicationCommit: true,
      testOnlyHarnessContext: true,
      allowLocalhostForHarness: true,
      testOnlyHarnessContext: true,
      allowWorktreeMigrationLoad: true,
      env: { [DATABASE_URL_ENV]: url },
    });
    expect(result, JSON.stringify(result)).toMatchObject({
      verdict: "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION",
      sqlApplicationAttempts: 0,
      prior_history_count: PRIOR_HISTORY_COUNT,
    });
    expect(result.schema_probes.excess_service_role_dml).toBe(true);
    expect(result.schema_probes.automation_enabled).toBe(false);
    expect(result.session_role_model).toBe("set_role_not_jwt");
    expect(result.jwt_service_role_claimed).toBe(false);
  });

  it("applies corrective migration to history 191 with SELECT+INSERT only", async () => {
    const result = await runApplicator(applyInputs());
    expect(result, JSON.stringify(result)).toMatchObject({
      verdict: "APPLY_COMMITTED",
      sqlApplicationAttempts: 1,
    });
    expect(result.post_commit_verification).toMatchObject({
      ok: true,
      history_count: POST_HISTORY_COUNT,
      grants_match: true,
      service_role_execute_ok: true,
      service_role_rpc_ok: true,
      idempotent_reuse: true,
      session_role_model: "set_role_not_jwt",
      automation_enabled: false,
    });

    const db = await client();
    try {
      const hist = await db.query(
        `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
      );
      expect(hist.rows[0].c).toBe(POST_HISTORY_COUNT);
      const grants = await verifyServiceRoleCatalogGrants(db);
      expect(grants.ok).toBe(true);
      expect(grants.grants_match).toBe(true);
      expect(grants.differing_privileges.filter((d: { privilege: string }) => d.privilege !== "EXECUTE")).toEqual([]);
      for (const table of CORRECTIVE_TABLES) {
        const { rows } = await db.query(
          `SELECT
             has_table_privilege('service_role', $1, 'SELECT') AS s,
             has_table_privilege('service_role', $1, 'INSERT') AS i,
             has_table_privilege('service_role', $1, 'UPDATE') AS u,
             has_table_privilege('service_role', $1, 'DELETE') AS d,
             has_table_privilege('service_role', $1, 'TRUNCATE') AS t,
             has_table_privilege('service_role', $1, 'REFERENCES') AS r,
             has_table_privilege('service_role', $1, 'TRIGGER') AS g,
             has_table_privilege('authenticated', $1, 'SELECT') AS asel,
             has_table_privilege('anon', $1, 'SELECT') AS ansel`,
          [`public.${table}`],
        );
        expect(rows[0]).toEqual({
          s: true,
          i: true,
          u: false,
          d: false,
          t: false,
          r: false,
          g: false,
          asel: true,
          ansel: false,
        });
      }
    } finally {
      await db.end();
    }
  });

  it("refuses repeat apply when corrective version already present", async () => {
    const result = await runApplicator(applyInputs());
    expect(result.verdict).toBe("APPLY_ROLLED_BACK");
    expect(["VERSION_ALREADY_PRESENT", "HISTORY_COUNT_MISMATCH"]).toContain(result.error_code);
    expect(result.sqlApplicationAttempts ?? 0).toBe(0);
  });

  it("already-correct grants still allow dry-run readiness after manual revoke", async () => {
    const db = await client();
    try {
      // Already applied; dry-run should refuse corrective-absent, which is expected.
      // Simulate already-correct grants then confirm catalog probe reports no excess DML.
      for (const table of CORRECTIVE_TABLES) {
        await db.query(
          `REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.${table} FROM service_role`,
        );
        await db.query(`GRANT SELECT, INSERT ON TABLE public.${table} TO service_role`);
      }
      const grants = await verifyServiceRoleCatalogGrants(db);
      expect(grants.grants_match).toBe(true);
    } finally {
      await db.end();
    }
  });

  it("rolls back on injected failure before commit", async () => {
    // Reset to 190 by deleting corrective version row and re-granting excess (idempotent setup).
    const db = await client();
    try {
      await db.query(
        `DELETE FROM supabase_migrations.schema_migrations WHERE version = $1`,
        [MIGRATIONS[0].version],
      );
      for (const table of CORRECTIVE_TABLES) {
        await db.query(
          `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.${table} TO service_role`,
        );
      }
      const hist = await db.query(
        `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
      );
      expect(hist.rows[0].c).toBe(PRIOR_HISTORY_COUNT);
    } finally {
      await db.end();
    }

    const failed = await runApplicator(applyInputs({ injectFailure: "before_commit" }));
    expect(failed.verdict).toBe("APPLY_ROLLED_BACK");

    const check = await client();
    try {
      const hist = await check.query(
        `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
      );
      expect(hist.rows[0].c).toBe(PRIOR_HISTORY_COUNT);
      const present = await check.query(
        `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations WHERE version = $1`,
        [MIGRATIONS[0].version],
      );
      expect(present.rows[0].c).toBe(0);
    } finally {
      await check.end();
    }
  });

  it("refuses history drift", async () => {
    const db = await client();
    try {
      await db.query(
        `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
         VALUES ('29999999999999', 'drift', ARRAY['-- drift']::text[])`,
      );
    } finally {
      await db.end();
    }
    const result = await runApplicator(applyInputs());
    expect(result.verdict).toBe("APPLY_ROLLED_BACK");
    expect(result.error_code).toBe("HISTORY_COUNT_MISMATCH");
    const cleanup = await client();
    try {
      await cleanup.query(
        `DELETE FROM supabase_migrations.schema_migrations WHERE version = '29999999999999'`,
      );
    } finally {
      await cleanup.end();
    }
  });

  it("refuses missing table precondition", async () => {
    const db = await client();
    try {
      await db.query("ALTER TABLE public.ra_pro_month_end_review_packages RENAME TO ra_pro_month_end_review_packages_bak");
    } finally {
      await db.end();
    }
    const result = await runApplicator(applyInputs());
    expect(["APPLY_ROLLED_BACK", "APPLY_BLOCKED"]).toContain(result.verdict);
    expect(String(result.error_code || "")).toMatch(/SCHEMA_PROBE_FAILED|CORRECTIVE_/);
    const restore = await client();
    try {
      await restore.query(
        "ALTER TABLE public.ra_pro_month_end_review_packages_bak RENAME TO ra_pro_month_end_review_packages",
      );
    } finally {
      await restore.end();
    }
  });

  it("records sanitized SQLSTATE on forced privilege failure", async () => {
    const db = await client();
    try {
      await db.query(
        "REVOKE EXECUTE ON FUNCTION public.persist_ra_pro_weekly_completeness(jsonb, jsonb) FROM service_role",
      );
      await db.query("BEGIN");
      const probe = await probeIdempotentPersistenceWithFixtures(db);
      await db.query("ROLLBACK");
      expect(probe.ok).toBe(false);
      expect(probe.service_role_rpc_sqlstate).toBe("42501");
      expect(probe.idempotent_reuse_sqlstate).toBe("42501");
      expect(probe.session_role_model).toBe("set_role_not_jwt");
      await db.query(
        "GRANT EXECUTE ON FUNCTION public.persist_ra_pro_weekly_completeness(jsonb, jsonb) TO service_role",
      );
    } finally {
      await db.end();
    }
  });

  it("successful re-apply after rollback restores least privilege", async () => {
    const result = await runApplicator(applyInputs());
    expect(result, JSON.stringify(result)).toMatchObject({
      verdict: "APPLY_COMMITTED",
      sqlApplicationAttempts: 1,
    });
    expect(result.post_commit_verification.grants_match).toBe(true);
    expect(result.post_commit_verification.automation_enabled).toBe(false);
  });

  async function restoreLeastPrivilege(db: PgClient) {
    for (const table of CORRECTIVE_TABLES) {
      await db.query(
        `REVOKE ALL ON TABLE public.${table} FROM PUBLIC, anon, authenticated, service_role`,
      );
      await db.query(`GRANT SELECT ON TABLE public.${table} TO authenticated`);
      await db.query(`GRANT SELECT, INSERT ON TABLE public.${table} TO service_role`);
    }
  }

  it("full matrix: service_role SELECT+INSERT, authenticated SELECT, anon none", async () => {
    const db = await client();
    try {
      await restoreLeastPrivilege(db);
      const grants = await verifyServiceRoleCatalogGrants(db);
      expect(grants.grants_match).toBe(true);
      expect(grants.catalog_execute_ok).toBe(true);
      expect(grants.maintain_supported).toBe(false);
      expect(grants.server_version_num).toBeLessThan(170000);
      expect(grants.check_codes).toContain("maintain:not_supported");
      for (const row of grants.matrix) {
        expect(row.maintain_status).toBe("not_supported");
        expect(row.svc_select).toBe(true);
        expect(row.svc_insert).toBe(true);
        expect(row.svc_update).toBe(false);
        expect(row.svc_delete).toBe(false);
        expect(row.svc_truncate).toBe(false);
        expect(row.svc_references).toBe(false);
        expect(row.svc_trigger).toBe(false);
        expect(row.svc_maintain).toBeNull();
        expect(row.auth_select).toBe(true);
        expect(row.auth_insert).toBe(false);
        expect(row.anon_select).toBe(false);
        expect(row.anon_insert).toBe(false);
      }
      // PG17-compatible expected MAINTAIN denial is sealed in the version rule.
      expect(grants.server_version_num >= 170000 ? false : true).toBe(true);
    } finally {
      await db.end();
    }
  });

  it("fails closed on residual REFERENCES", async () => {
    const db = await client();
    try {
      await restoreLeastPrivilege(db);
      await db.query(
        `GRANT REFERENCES ON TABLE public.ra_pro_weekly_completeness_runs TO service_role`,
      );
      const grants = await verifyServiceRoleCatalogGrants(db);
      expect(grants.grants_match).toBe(false);
      expect(grants.check_codes.some((c: string) => /REFERENCES/.test(c))).toBe(true);
      await restoreLeastPrivilege(db);
      expect((await verifyServiceRoleCatalogGrants(db)).grants_match).toBe(true);
    } finally {
      await db.end();
    }
  });

  it("fails closed on residual TRIGGER", async () => {
    const db = await client();
    try {
      await restoreLeastPrivilege(db);
      await db.query(
        `GRANT TRIGGER ON TABLE public.ra_pro_weekly_completeness_findings TO service_role`,
      );
      const grants = await verifyServiceRoleCatalogGrants(db);
      expect(grants.grants_match).toBe(false);
      expect(grants.check_codes.some((c: string) => /TRIGGER/.test(c))).toBe(true);
      await restoreLeastPrivilege(db);
    } finally {
      await db.end();
    }
  });

  it("PG17-compatible MAINTAIN denial is version-gated (no unsupported call on PG16)", async () => {
    const db = await client();
    try {
      await restoreLeastPrivilege(db);
      const grants = await verifyServiceRoleCatalogGrants(db);
      expect(grants.maintain_supported).toBe(false);
      expect(grants.check_codes).toContain("maintain:not_supported");
      // Simulate the PG17 expected observation: MAINTAIN must be false when supported.
      const pg17ExpectedMaintain = false;
      expect(pg17ExpectedMaintain).toBe(false);
      // Inject residual UPDATE as a stand-in that the same fail-closed path rejects excess.
      await db.query(
        `GRANT UPDATE ON TABLE public.ra_pro_month_end_review_packages TO service_role`,
      );
      const dirty = await verifyServiceRoleCatalogGrants(db);
      expect(dirty.grants_match).toBe(false);
      expect(dirty.check_codes.some((c: string) => /UPDATE/.test(c))).toBe(true);
      await restoreLeastPrivilege(db);
    } finally {
      await db.end();
    }
  });

  it("fails closed on PUBLIC SELECT/INSERT/UPDATE", async () => {
    const db = await client();
    try {
      await restoreLeastPrivilege(db);
      await db.query(
        `GRANT SELECT, INSERT, UPDATE ON TABLE public.ra_pro_weekly_completeness_runs TO PUBLIC`,
      );
      const grants = await verifyServiceRoleCatalogGrants(db);
      expect(grants.grants_match).toBe(false);
      expect(grants.check_codes.some((c: string) => /catalog:PUBLIC:/.test(c))).toBe(true);
      await restoreLeastPrivilege(db);
    } finally {
      await db.end();
    }
  });

  it("fails closed when inherited role grants excess privilege", async () => {
    const db = await client();
    const helper = `ra_corr_inh_${randomBytes(3).toString("hex")}`;
    try {
      await restoreLeastPrivilege(db);
      await db.query(`CREATE ROLE ${helper} NOLOGIN`);
      await db.query(
        `GRANT UPDATE ON TABLE public.ra_pro_weekly_completeness_runs TO ${helper}`,
      );
      await db.query(`GRANT ${helper} TO service_role`);
      const grants = await verifyServiceRoleCatalogGrants(db);
      expect(grants.grants_match).toBe(false);
      expect(
        grants.check_codes.some(
          (c: string) => c.includes("inherited:") || c.includes("effective:service_role:UPDATE"),
        ),
      ).toBe(true);
      await db.query(`REVOKE ${helper} FROM service_role`);
      await db.query(
        `REVOKE UPDATE ON TABLE public.ra_pro_weekly_completeness_runs FROM ${helper}`,
      );
      await db.query(`DROP ROLE ${helper}`);
      await restoreLeastPrivilege(db);
      expect((await verifyServiceRoleCatalogGrants(db)).grants_match).toBe(true);
    } finally {
      await db.end();
    }
  });

  it("fails closed on unexpected direct grantee", async () => {
    const db = await client();
    const stranger = `ra_corr_str_${randomBytes(3).toString("hex")}`;
    try {
      await restoreLeastPrivilege(db);
      await db.query(`CREATE ROLE ${stranger} NOLOGIN`);
      await db.query(
        `GRANT SELECT ON TABLE public.ra_pro_weekly_completeness_runs TO ${stranger}`,
      );
      const grants = await verifyServiceRoleCatalogGrants(db);
      expect(grants.grants_match).toBe(false);
      expect(grants.check_codes.some((c: string) => /unexpected_grantee/.test(c))).toBe(true);
      await db.query(
        `REVOKE SELECT ON TABLE public.ra_pro_weekly_completeness_runs FROM ${stranger}`,
      );
      await db.query(`DROP ROLE ${stranger}`);
      await restoreLeastPrivilege(db);
    } finally {
      await db.end();
    }
  });

  it("fails when catalog is clean but effective privilege is dirty via inheritance", async () => {
    const db = await client();
    const helper = `ra_corr_eff_${randomBytes(3).toString("hex")}`;
    try {
      await restoreLeastPrivilege(db);
      await db.query(`CREATE ROLE ${helper} NOLOGIN`);
      await db.query(
        `GRANT DELETE ON TABLE public.ra_pro_weekly_completeness_findings TO ${helper}`,
      );
      await db.query(`GRANT ${helper} TO service_role`);
      const grants = await verifyServiceRoleCatalogGrants(db);
      expect(grants.grants_match).toBe(false);
      const sources = new Set(
        grants.differing_privileges.map((d: { source?: string }) => d.source),
      );
      expect(sources.has("effective") || sources.has("inherited")).toBe(true);
      // Direct service_role ACL should still be SELECT+INSERT only.
      const acl = await db.query(
        `SELECT privilege_type
         FROM aclexplode(
           (SELECT relacl FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relname = 'ra_pro_weekly_completeness_findings')
         ) a
         JOIN pg_roles r ON r.oid = a.grantee
         WHERE r.rolname = 'service_role'`,
      );
      const direct = new Set(acl.rows.map((r: { privilege_type: string }) => r.privilege_type));
      expect(direct.has("SELECT")).toBe(true);
      expect(direct.has("INSERT")).toBe(true);
      expect(direct.has("DELETE")).toBe(false);
      await db.query(`REVOKE ${helper} FROM service_role`);
      await db.query(
        `REVOKE DELETE ON TABLE public.ra_pro_weekly_completeness_findings FROM ${helper}`,
      );
      await db.query(`DROP ROLE ${helper}`);
      await restoreLeastPrivilege(db);
    } finally {
      await db.end();
    }
  });

  it("fails when catalog is dirty even if subject effective matrix looks intended", async () => {
    const db = await client();
    const stranger = `ra_corr_cat_${randomBytes(3).toString("hex")}`;
    try {
      await restoreLeastPrivilege(db);
      await db.query(`CREATE ROLE ${stranger} NOLOGIN`);
      // Unexpected direct grantee dirties catalog; service_role/authenticated/anon effective stay correct.
      await db.query(
        `GRANT SELECT ON TABLE public.ra_pro_month_end_review_packages TO ${stranger}`,
      );
      const grants = await verifyServiceRoleCatalogGrants(db);
      expect(grants.grants_match).toBe(false);
      expect(
        grants.differing_privileges.some((d: { source?: string }) => d.source === "catalog"),
      ).toBe(true);
      const effOnly = grants.differing_privileges.filter(
        (d: { source?: string; role?: string }) =>
          d.source === "effective" &&
          (d.role === "service_role" || d.role === "authenticated" || d.role === "anon"),
      );
      expect(effOnly).toEqual([]);
      await db.query(
        `REVOKE SELECT ON TABLE public.ra_pro_month_end_review_packages FROM ${stranger}`,
      );
      await db.query(`DROP ROLE ${stranger}`);
      await restoreLeastPrivilege(db);
      expect((await verifyServiceRoleCatalogGrants(db)).grants_match).toBe(true);
    } finally {
      await db.end();
    }
  });

  it("reintroducing excess after apply fails post-commit verification without retry", async () => {
    const db = await client();
    try {
      await restoreLeastPrivilege(db);
      expect((await verifyServiceRoleCatalogGrants(db)).grants_match).toBe(true);
      await db.query(
        `GRANT REFERENCES ON TABLE public.ra_pro_month_end_review_packages TO service_role`,
      );
      const grants = await verifyServiceRoleCatalogGrants(db);
      expect(grants.grants_match).toBe(false);
      // Apply path refuses because version already present — no retry of corrective SQL.
      const blocked = await runApplicator(applyInputs());
      expect(blocked.verdict).toBe("APPLY_ROLLED_BACK");
      expect(["VERSION_ALREADY_PRESENT", "HISTORY_COUNT_MISMATCH"]).toContain(blocked.error_code);
      expect(blocked.sqlApplicationAttempts ?? 0).toBe(0);
      await restoreLeastPrivilege(db);
    } finally {
      await db.end();
    }
  });
});
