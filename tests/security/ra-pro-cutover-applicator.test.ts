import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  runApplicator,
  ADVISORY_LOCK,
  sanitizeValue,
  sanitizeError,
  resolveDatabaseUrlFromEnv,
  DATABASE_URL_ENV,
  APPLY_AUTHORIZATION_TOKEN,
} from "../../scripts/security/ra-pro-cutover-apply-core.js";
import {
  MIGRATION_SHA256,
  MIGRATION_BYTES,
  MIGRATION_VERSION,
  MIGRATION_PATH,
  MIGRATION_BLOB_OID,
  PRIOR_HISTORY_COUNT,
  ATTESTED_FREEZE_ENV,
  ARTIFACT_COMMIT,
  FORBIDDEN_FRLS_DATABASE_URL_ENV,
} from "../../scripts/security/ra-pro-cutover-apply-constants.js";
import { loadAndVerifyGitBlob } from "../../scripts/security/git-blob-authority.js";

const ROOT = process.cwd();

const {
  startDisposablePg,
  seedApplicatorWorld,
  baseApplyInputs,
  resolveFreezeFromAuth,
} = require("./helpers/ra-pro-cutover-applicator-sim.js");

const dockerOk = (() => {
  try {
    const r = spawnSync("docker", ["version"], {
      encoding: "utf8",
      timeout: 15000,
      windowsHide: true,
    });
    return r.status === 0;
  } catch {
    return false;
  }
})();

function applyInputs(url: string, overrides: Record<string, unknown> = {}) {
  return baseApplyInputs(url, {
    allowUnpublishedPriorDryRunForHarness: true,
    ...overrides,
  });
}

describe("RA Pro cutover transport + sanitization (no docker)", () => {
  it("rejects generic DATABASE_URL, CONTAINMENT, FRLS channel, and missing RA Pro URL", () => {
    expect(() => resolveDatabaseUrlFromEnv({})).toThrow(/MISSING_INPUT/);
    expect(() =>
      resolveDatabaseUrlFromEnv({ DATABASE_URL: "postgres://x:y@127.0.0.1/db" }),
    ).toThrow(/PROHIBITED_CREDENTIAL_CHANNEL/);
    expect(() =>
      resolveDatabaseUrlFromEnv({
        CONTAINMENT_APPLY_DATABASE_URL: "postgres://x:y@127.0.0.1/db",
      }),
    ).toThrow(/PROHIBITED_CREDENTIAL_CHANNEL/);
    expect(() =>
      resolveDatabaseUrlFromEnv({
        [FORBIDDEN_FRLS_DATABASE_URL_ENV]: "postgres://x:y@127.0.0.1/db",
      }),
    ).toThrow(/PROHIBITED_CREDENTIAL_CHANNEL/);
    expect(() =>
      resolveDatabaseUrlFromEnv({ [DATABASE_URL_ENV]: "not-a-url" }),
    ).toThrow(/MALFORMED_DATABASE_URL/);
  });

  it("recursively redacts DSN, firm/company ids, stripe, and sensitive keys", () => {
    const firmId = randomUUID();
    const companyId = randomUUID();
    const err = new Error(
      `boom postgres://user:secret@db.example:5432/postgres ${DATABASE_URL_ENV}=secret firm_id=${firmId} company_id=${companyId} stripe_customer_id=cus_ABC`,
    );
    err.stack = "Error: boom postgres://user:secret@host/db";
    err.cause = {
      connectionString: "postgres://user:secret@host/db",
      firm_id: firmId,
      company_id: companyId,
      stripe_customer_id: "cus_ABC",
    };
    const s = sanitizeValue(err) as {
      message: string;
      cause?: Record<string, unknown>;
    };
    expect(s.message).not.toMatch(/secret/);
    expect(s.message).not.toContain(firmId);
    expect(s.message).not.toContain(companyId);
    expect(s.cause?.connectionString).toBe("[redacted]");
    expect(s.cause?.firm_id).toBe("[redacted]");
    expect(s.cause?.company_id).toBe("[redacted]");
    expect(s.cause?.stripe_customer_id).toBe("[redacted]");
    expect(sanitizeError(err)).not.toMatch(/secret/);
  });

  it("ignores corrupted worktree migration bytes; git blob authority wins", async () => {
    const migrationPath = path.join(ROOT, MIGRATION_PATH);
    const backup = fs.readFileSync(migrationPath);
    fs.writeFileSync(migrationPath, "-- CORRUPTED WORKTREE SQL\nDROP TABLE public.firms;\n");
    try {
      const loaded = loadAndVerifyGitBlob({
        commit: ARTIFACT_COMMIT,
        path: MIGRATION_PATH,
        expectedOid: MIGRATION_BLOB_OID,
        expectedSha256: MIGRATION_SHA256,
        expectedBytes: MIGRATION_BYTES,
      });
      expect(loaded.sha256).toBe(MIGRATION_SHA256);
      expect(loaded.buffer.toString("utf8")).not.toMatch(/CORRUPTED WORKTREE/);
    } finally {
      fs.writeFileSync(migrationPath, backup);
    }
  });

  it("rejects --database-url via CLI with zero SQL attempts", () => {
    const { parseRaProStdout } = require("./helpers/ra-pro-cutover-evidence.js");
    const r = spawnSync(
      process.execPath,
      [
        "scripts/security/apply-ra-pro-cutover.js",
        "--database-url",
        "postgres://u:p@127.0.0.1:1/db",
        "--mode",
        "dry-run",
      ],
      { cwd: ROOT, encoding: "utf8", windowsHide: true },
    );
    expect(r.status).not.toBe(0);
    const ev = parseRaProStdout(r.stdout);
    expect(String(ev.error || ev.reason_code)).toMatch(/PROHIBITED_CREDENTIAL_CHANNEL/);
    expect(ev.sqlApplicationAttempts).toBe(0);
    expect(JSON.stringify(ev)).not.toMatch(/u:p@/);
  });

  it("apply refuses unpublished prior dry-run pins before DB contact", async () => {
    const evidence = await runApplicator(
      baseApplyInputs("postgres://postgres:postgres@127.0.0.1:1/postgres", {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
        // no harness bypass
      }),
    );
    expect(evidence.verdict).toBe("APPLY_BLOCKED");
    expect(evidence.sqlApplicationAttempts).toBe(0);
    expect(evidence.databaseConnectionAttempts).toBe(0);
    expect(String(evidence.error_code || evidence.error)).toMatch(
      /PRIOR_DRY_RUN_PINS_UNPUBLISHED/,
    );
  });
});

describe.skipIf(!dockerOk)("RA Pro cutover applicator (local simulation)", () => {
  let pg: { name: string; url: string; stop: () => Promise<void> };

  beforeAll(async () => {
    pg = await startDisposablePg();
    const client = new Client({ connectionString: pg.url });
    await client.connect();
    await seedApplicatorWorld(client);
    await client.end();
  }, 120000);

  afterAll(async () => {
    if (pg) await pg.stop();
  });

  async function resetWorld() {
    const client = new Client({ connectionString: pg.url });
    await client.connect();
    await client.query(`
      DROP SCHEMA IF EXISTS supabase_migrations CASCADE;
      DROP FUNCTION IF EXISTS public.bootstrap_checkout_firm_workspace(uuid, text, uuid) CASCADE;
      DROP FUNCTION IF EXISTS public.bootstrap_checkout_company_workspace(uuid, text, text) CASCADE;
      DROP FUNCTION IF EXISTS public.activate_review_assist_pro_subscription(uuid, uuid, text, text, text, text, text, text) CASCADE;
      DROP FUNCTION IF EXISTS public.ra_pro_lock_firm_capacity(uuid[]) CASCADE;
      DROP FUNCTION IF EXISTS public.firms_protect_billing_company_id() CASCADE;
      DROP FUNCTION IF EXISTS public.firms_enforce_ra_pro_client_cap() CASCADE;
      DROP FUNCTION IF EXISTS public.firms_enforce_ra_pro_seat_cap() CASCADE;
      DROP FUNCTION IF EXISTS public.claim_stripe_webhook_event(text, text, boolean, integer) CASCADE;
      DROP FUNCTION IF EXISTS public.finalize_stripe_webhook_event(text, uuid, text, text) CASCADE;
      DROP TABLE IF EXISTS public.stripe_webhook_events CASCADE;
      DROP TABLE IF EXISTS public.pilot_slots CASCADE;
      DROP TABLE IF EXISTS public.firm_clients CASCADE;
      DROP TABLE IF EXISTS public.firm_memberships CASCADE;
      DROP TABLE IF EXISTS public.firms CASCADE;
      DROP TABLE IF EXISTS public.company_users CASCADE;
      DROP TABLE IF EXISTS public.companies CASCADE;
    `);
    await seedApplicatorWorld(client);
    await client.end();
  }

  it("dry-run returns DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION with zero SQL attempts and no advisory lock", async () => {
    await resetWorld();
    const evidence = await runApplicator(applyInputs(pg.url, { mode: "dry-run" }));
    expect(evidence.verdict).toBe("DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION");
    expect(evidence.sqlApplicationAttempts).toBe(0);
    expect(evidence.advisory_lock_acquired).toBe(false);
    expect(evidence.version_absent).toBe(true);
    expect(evidence.migration_objects_absent).toBe(true);
    expect(evidence.transaction_mutation).toBe(false);
    expect(evidence.prior_history_count).toBe(PRIOR_HISTORY_COUNT);
    expect(JSON.stringify(evidence)).not.toMatch(/postgres:postgres|password=/i);
    expect(evidence.source_authority?.single_sealed_version_only).toBe(true);
    expect(evidence.decision_authority?.actions?.NO_CUTOVER).toBe(4);
  });

  it("pin mismatches never open SQL (zero attempts)", async () => {
    await resetWorld();
    const cases = [
      { migrationSha256: "ff".repeat(32) },
      { migrationBytes: 99999 },
      { migrationBlobOid: "deadbeef".repeat(5) },
      { projectRef: "not-the-project" },
      { version: "20990101000000" },
      { name: "wrong" },
      { artifactCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      {
        prHead: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        authorizedPrHead: "cccccccccccccccccccccccccccccccccccccccc",
      },
    ];
    for (const overrides of cases) {
      const evidence = await runApplicator(
        applyInputs(pg.url, {
          mode: "apply",
          applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
          ...overrides,
        }),
      );
      expect(evidence.sqlApplicationAttempts).toBe(0);
      expect(evidence.verdict).not.toBe("APPLY_COMMITTED");
    }
  });

  it("apply without exact authorization token fails with zero attempts", async () => {
    await resetWorld();
    const evidence = await runApplicator(
      applyInputs(pg.url, { mode: "apply", applyAuthorizationToken: "nope" }),
    );
    expect(evidence.sqlApplicationAttempts).toBe(0);
    expect(evidence.error).toMatch(/APPLY_NOT_AUTHORIZED/);
  });

  it("exact apply inserts one history row; statements[1] matches git blob", async () => {
    await resetWorld();
    const evidence = await runApplicator(
      applyInputs(pg.url, {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    );
    expect(evidence.verdict).toBe("APPLY_COMMITTED");
    expect(evidence.sqlApplicationAttempts).toBe(1);
    expect(evidence.advisory_lock_acquired).toBe(true);
    expect(evidence.stored_statement_digest).toBe(MIGRATION_SHA256);
    expect(evidence.stored_statement_bytes).toBe(MIGRATION_BYTES);
    expect(evidence.synthetic_probes?.billing_company_id_column).toBe(true);
    expect(evidence.synthetic_probes?.linked_firms_zero).toBe(true);
    expect(evidence.synthetic_probes?.bootstrap_firm_service_only).toBe(true);

    const client = new Client({ connectionString: pg.url });
    await client.connect();
    const { rows } = await client.query(
      `SELECT version, name, statements FROM supabase_migrations.schema_migrations WHERE version = $1`,
      [MIGRATION_VERSION],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].statements).toHaveLength(1);
    const stored = rows[0].statements[0];
    expect(createHash("sha256").update(stored, "utf8").digest("hex")).toBe(MIGRATION_SHA256);
    expect(Buffer.byteLength(stored, "utf8")).toBe(MIGRATION_BYTES);
    const { rows: hist } = await client.query(
      `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
    );
    expect(hist[0].c).toBe(PRIOR_HISTORY_COUNT + 1);
    await client.end();
  });

  it("repeat apply refuses when version already present", async () => {
    await resetWorld();
    const first = await runApplicator(
      applyInputs(pg.url, {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    );
    expect(first.verdict).toBe("APPLY_COMMITTED");
    const second = await runApplicator(
      applyInputs(pg.url, {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    );
    expect(second.verdict).not.toBe("APPLY_COMMITTED");
    expect(String(second.error || second.error_code)).toMatch(/VERSION_ALREADY_PRESENT/);
  });

  it("forced failure before history insert rolls back", async () => {
    await resetWorld();
    const evidence = await runApplicator(
      applyInputs(pg.url, {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
        injectFailure: "before_history",
      }),
    );
    expect(evidence.verdict).toBe("APPLY_ROLLED_BACK");
    expect(evidence.rollback_verify?.version_absent).toBe(true);
    expect(evidence.rollback_verify?.pre_change_restored).toBe(true);
  });

  it("connection loss during COMMIT yields INDETERMINATE and NOT_APPLIED_CONFIRMED", async () => {
    await resetWorld();
    const evidence = await runApplicator(
      applyInputs(pg.url, {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
        injectFailure: "during_commit",
      }),
    );
    expect(evidence.verdict).toBe("INDETERMINATE_OUTCOME");
    expect(evidence.reconciliation?.classification).toBe("NOT_APPLIED_CONFIRMED");
  });

  it("connection loss after COMMIT ack yields APPLIED_CONFIRMED_AFTER_RECONCILIATION", async () => {
    await resetWorld();
    const evidence = await runApplicator(
      applyInputs(pg.url, {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
        injectFailure: "after_commit_ack",
      }),
    );
    expect(evidence.verdict).toBe("INDETERMINATE_OUTCOME");
    expect(evidence.reconciliation?.classification).toBe(
      "APPLIED_CONFIRMED_AFTER_RECONCILIATION",
    );
  });

  it("lock contention times out safely", async () => {
    await resetWorld();
    const blocker = new Client({ connectionString: pg.url });
    await blocker.connect();
    await blocker.query("BEGIN");
    await blocker.query("SELECT pg_advisory_xact_lock($1::int, $2::int)", [
      ADVISORY_LOCK.key1,
      ADVISORY_LOCK.key2,
    ]);

    const evidence = await runApplicator(
      applyInputs(pg.url, {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    );
    expect(evidence.verdict).toBe("APPLY_ROLLED_BACK");
    expect(String(evidence.error)).toMatch(/lock|timeout|cancel/i);

    await blocker.query("ROLLBACK");
    await blocker.end();
  }, 30000);

  it("stale history count fails closed", async () => {
    await resetWorld();
    const client = new Client({ connectionString: pg.url });
    await client.connect();
    await client.query(
      `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
       VALUES ('20991231999999', 'extra', ARRAY['-- extra'])`,
    );
    await client.end();
    const evidence = await runApplicator(applyInputs(pg.url, { mode: "dry-run" }));
    expect(evidence.verdict).toBe("DRY_RUN_BLOCKED");
    expect(String(evidence.error || evidence.error_code)).toMatch(/HISTORY_COUNT_MISMATCH/);
  });

  it("hostile env attestation mismatch fails closed before DB", async () => {
    await resetWorld();
    const { freeze } = resolveFreezeFromAuth();
    const evidence = await runApplicator(
      applyInputs(pg.url, {
        mode: "dry-run",
        env: {
          [DATABASE_URL_ENV]: pg.url,
          [ATTESTED_FREEZE_ENV]: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        authorizedPrHead: freeze,
        prHead: freeze,
      }),
    );
    expect(evidence.sqlApplicationAttempts).toBe(0);
    expect(evidence.databaseConnectionAttempts).toBe(0);
    expect(String(evidence.error_code || evidence.error)).toMatch(/BLOCKED_PIN_MISMATCH/);
  });
});

void PRIOR_HISTORY_COUNT;
void ARTIFACT_COMMIT;
