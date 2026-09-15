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
} from "../../scripts/security/free-review-lead-session-apply-core.js";
import {
  MIGRATION_SHA256,
  MIGRATION_BYTES,
  MIGRATION_VERSION,
  MIGRATION_PATH,
  MIGRATION_BLOB_OID,
  PRIOR_HISTORY_COUNT,
  ATTESTED_FREEZE_ENV,
  ARTIFACT_COMMIT,
} from "../../scripts/security/free-review-lead-session-apply-constants.js";
import { loadAndVerifyGitBlob } from "../../scripts/security/git-blob-authority.js";

const ROOT = process.cwd();

const {
  startDisposablePg,
  seedApplicatorWorld,
  baseApplyInputs,
  resolveFreezeFromAuth,
} = require("./helpers/frls-applicator-sim.js");

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

describe("FRLS transport + sanitization (no docker)", () => {
  it("rejects generic DATABASE_URL, CONTAINMENT channel, and missing FRLS URL", () => {
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
      resolveDatabaseUrlFromEnv({ [DATABASE_URL_ENV]: "not-a-url" }),
    ).toThrow(/MALFORMED_DATABASE_URL/);
  });

  it("recursively redacts DSN, stack, cause, and sensitive keys", () => {
    const err = new Error(
      `boom postgres://user:secret@db.example:5432/postgres ${DATABASE_URL_ENV}=secret`,
    );
    err.stack = "Error: boom postgres://user:secret@host/db";
    err.cause = { connectionString: "postgres://user:secret@host/db", token_hash: "abc" };
    const s = sanitizeValue(err) as {
      message: string;
      cause?: Record<string, unknown>;
    };
    expect(s.message).not.toMatch(/secret/);
    expect(s.cause?.connectionString).toBe("[redacted]");
    expect(s.cause?.token_hash).toBe("[redacted]");
    expect(sanitizeError(err)).not.toMatch(/secret/);
  });

  it("ignores corrupted worktree migration bytes; git blob authority wins", async () => {
    const migrationPath = path.join(ROOT, MIGRATION_PATH);
    const backup = fs.readFileSync(migrationPath);
    fs.writeFileSync(migrationPath, "-- CORRUPTED WORKTREE SQL\nDROP TABLE public.free_review_leads;\n");
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

  it("redacts lead_id and token_hash in synthetic probe evidence", async () => {
    const synthLeadId = randomUUID();
    const tokenHash = "e".repeat(64);
    const err = new Error(`probe failed lead_id=${synthLeadId} token_hash=${tokenHash}`);
    err.cause = { lead_id: synthLeadId, token_hash: tokenHash };
    const s = sanitizeValue(err) as { cause?: Record<string, unknown> };
    expect(JSON.stringify(s)).not.toContain(synthLeadId);
    expect(JSON.stringify(s)).not.toContain(tokenHash);
    expect(s.cause?.token_hash).toBe("[redacted]");
    expect(s.cause?.lead_id).toBe("[redacted]");
  });

  it("rejects --database-url via CLI with zero SQL attempts", () => {
    const { parseFrlsStdout } = require("./helpers/frls-evidence.js");
    const r = spawnSync(
      process.execPath,
      [
        "scripts/security/apply-free-review-lead-session.js",
        "--database-url",
        "postgres://u:p@127.0.0.1:1/db",
        "--mode",
        "dry-run",
      ],
      { cwd: ROOT, encoding: "utf8", windowsHide: true },
    );
    expect(r.status).not.toBe(0);
    const ev = parseFrlsStdout(r.stdout);
    expect(String(ev.error || ev.reason_code)).toMatch(/PROHIBITED_CREDENTIAL_CHANNEL/);
    expect(ev.sqlApplicationAttempts).toBe(0);
    expect(JSON.stringify(ev)).not.toMatch(/u:p@/);
  });
});

describe.skipIf(!dockerOk)("Free Review lead-session applicator (local simulation)", () => {
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
      DROP TABLE IF EXISTS public.free_review_lead_sessions CASCADE;
      DROP FUNCTION IF EXISTS public.rotate_free_review_lead_session(uuid, text, timestamptz) CASCADE;
      DROP FUNCTION IF EXISTS public.cleanup_free_review_lead_sessions(integer) CASCADE;
      DROP FUNCTION IF EXISTS public.prevent_active_free_review_lead_session_delete() CASCADE;
      DROP TABLE IF EXISTS public.free_review_leads CASCADE;
    `);
    await seedApplicatorWorld(client);
    await client.end();
  }

  it("dry-run returns DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION with zero SQL attempts and no advisory lock", async () => {
    await resetWorld();
    const evidence = await runApplicator(baseApplyInputs(pg.url, { mode: "dry-run" }));
    expect(evidence.verdict).toBe("DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION");
    expect(evidence.sqlApplicationAttempts).toBe(0);
    expect(evidence.advisory_lock_acquired).toBe(false);
    expect(evidence.version_absent).toBe(true);
    expect(evidence.migration_objects_absent).toBe(true);
    expect(evidence.transaction_mutation).toBe(false);
    expect(JSON.stringify(evidence)).not.toMatch(/postgres:postgres|password=/i);
    expect(evidence.source_authority?.single_sealed_version_only).toBe(true);
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
        baseApplyInputs(pg.url, {
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
      baseApplyInputs(pg.url, { mode: "apply", applyAuthorizationToken: "nope" }),
    );
    expect(evidence.sqlApplicationAttempts).toBe(0);
    expect(evidence.error).toMatch(/APPLY_NOT_AUTHORIZED/);
  });

  it("exact apply inserts one history row; statements[1] matches git blob", async () => {
    await resetWorld();
    const evidence = await runApplicator(
      baseApplyInputs(pg.url, {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    );
    expect(evidence.verdict).toBe("APPLY_COMMITTED");
    expect(evidence.sqlApplicationAttempts).toBe(1);
    expect(evidence.advisory_lock_acquired).toBe(true);
    expect(evidence.stored_statement_digest).toBe(MIGRATION_SHA256);
    expect(evidence.stored_statement_bytes).toBe(MIGRATION_BYTES);
    expect(evidence.synthetic_probes?.rotate_ok).toBe(true);
    expect(evidence.synthetic_probes?.delete_guard_active).toBe(true);

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
    await client.end();
  });

  it("forced failure before history insert rolls back", async () => {
    await resetWorld();
    const evidence = await runApplicator(
      baseApplyInputs(pg.url, {
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
      baseApplyInputs(pg.url, {
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
      baseApplyInputs(pg.url, {
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
      baseApplyInputs(pg.url, {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    );
    expect(evidence.verdict).toBe("APPLY_ROLLED_BACK");
    expect(String(evidence.error)).toMatch(/lock|timeout|cancel/i);

    await blocker.query("ROLLBACK");
    await blocker.end();
  }, 30000);

  it("concurrency unique index prevents two unrevoked sessions per lead", async () => {
    await resetWorld();
    const applyEvidence = await runApplicator(
      baseApplyInputs(pg.url, {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    );
    expect(applyEvidence.verdict).toBe("APPLY_COMMITTED");

    const client = new Client({ connectionString: pg.url });
    await client.connect();
    const leadId = randomUUID();
    await client.query(
      `
      INSERT INTO public.free_review_leads (id, first_name, last_name, business_name, email, status)
      VALUES ($1, 'A', 'B', 'Co', 'c@example.invalid', 'lead_captured')
      `,
      [leadId],
    );
    const hash1 = "b".repeat(64);
    const hash2 = "c".repeat(64);
    const exp = new Date(Date.now() + 3600000).toISOString();
    await client.query(
      `SELECT public.rotate_free_review_lead_session($1::uuid, $2::text, $3::timestamptz)`,
      [leadId, hash1, exp],
    );
    await expect(
      client.query(
        `
        INSERT INTO public.free_review_lead_sessions (lead_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        `,
        [leadId, hash2, exp],
      ),
    ).rejects.toThrow(/unique|duplicate/i);
    await client.end();
  });

  it("delete guard blocks removal of active unrevoked unexpired session", async () => {
    await resetWorld();
    await runApplicator(
      baseApplyInputs(pg.url, {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    );
    const client = new Client({ connectionString: pg.url });
    await client.connect();
    const leadId = randomUUID();
    await client.query(
      `
      INSERT INTO public.free_review_leads (id, first_name, last_name, business_name, email, status)
      VALUES ($1, 'D', 'G', 'Co', 'd@example.invalid', 'lead_captured')
      `,
      [leadId],
    );
    const hash = "d".repeat(64);
    const exp = new Date(Date.now() + 3600000).toISOString();
    await client.query(
      `SELECT public.rotate_free_review_lead_session($1::uuid, $2::text, $3::timestamptz)`,
      [leadId, hash, exp],
    );
    await expect(
      client.query(`DELETE FROM public.free_review_lead_sessions WHERE lead_id = $1`, [leadId]),
    ).rejects.toThrow(/cannot_delete_active_lead_session/);
    await client.end();
  });

  it("hostile env attestation mismatch fails closed before DB", async () => {
    await resetWorld();
    const { freeze } = resolveFreezeFromAuth();
    const evidence = await runApplicator(
      baseApplyInputs(pg.url, {
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
