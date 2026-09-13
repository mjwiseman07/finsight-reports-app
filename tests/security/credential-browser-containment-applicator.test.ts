import { createHash } from "node:crypto";
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
} from "../../scripts/security/credential-browser-containment-apply-core.js";
import {
  MIGRATION_SHA256,
  MIGRATION_BYTES,
  MIGRATION_VERSION,
  PRIOR_HISTORY_COUNT,
} from "../../scripts/security/credential-browser-containment-constants.js";

const {
  startDisposablePg,
  seedApplicatorWorld,
  baseApplyInputs,
} = require("./helpers/containment-applicator-sim.js");

const dockerOk = (() => {
  try {
    const { spawnSync } = require("node:child_process");
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

describe("credential transport + sanitization (no docker)", () => {
  it("rejects generic DATABASE_URL and missing CONTAINMENT_APPLY_DATABASE_URL", () => {
    expect(() => resolveDatabaseUrlFromEnv({})).toThrow(/MISSING_INPUT/);
    expect(() =>
      resolveDatabaseUrlFromEnv({ DATABASE_URL: "postgres://x:y@127.0.0.1/db" }),
    ).toThrow(/PROHIBITED_CREDENTIAL_CHANNEL/);
    expect(() =>
      resolveDatabaseUrlFromEnv({ [DATABASE_URL_ENV]: "not-a-url" }),
    ).toThrow(/MALFORMED_DATABASE_URL/);
  });

  it("recursively redacts DSN, stack, cause, and argv-like objects", () => {
    const err = new Error("boom postgres://user:secret@db.example:5432/postgres");
    err.stack = "Error: boom postgres://user:secret@host/db\n    at Object.<anonymous> (argv --database-url postgres://user:secret@host/db)";
    err.cause = { connectionString: "postgres://user:secret@host/db", password: "secret" };
    const s = sanitizeValue(err) as {
      message: string;
      stack?: string;
      cause?: Record<string, unknown>;
    };
    expect(s.message).not.toMatch(/secret/);
    expect(s.stack || "").not.toMatch(/secret/);
    expect(s.cause?.connectionString).toBe("[redacted]");
    expect(s.cause?.password).toBe("[redacted]");
    expect(sanitizeError(err)).not.toMatch(/secret/);
  });
});

describe.skipIf(!dockerOk)("credential browser containment applicator (local simulation)", () => {
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
      DROP VIEW IF EXISTS public.qbo_connections_unified CASCADE;
      DROP TABLE IF EXISTS public.accounting_connections CASCADE;
      DROP TABLE IF EXISTS public.quickbooks_connections CASCADE;
    `);
    await seedApplicatorWorld(client);
    await client.end();
  }

  it("dry-run returns DRY_RUN_READY with zero SQL application attempts", async () => {
    await resetWorld();
    const evidence = await runApplicator(baseApplyInputs(pg.url, { mode: "dry-run" }));
    expect(evidence.verdict).toBe("DRY_RUN_READY");
    expect(evidence.sqlApplicationAttempts).toBe(0);
    expect(JSON.stringify(evidence)).not.toMatch(/FAKE_ACCESS_TOKEN|postgres:postgres|password=/i);
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

  it("conflicting dry-run + apply token fails closed with zero attempts", async () => {
    await resetWorld();
    const evidence = await runApplicator(
      baseApplyInputs(pg.url, {
        mode: "dry-run",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    );
    expect(evidence.sqlApplicationAttempts).toBe(0);
    expect(evidence.verdict).toMatch(/BLOCKED|DRY_RUN_BLOCKED/);
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
    expect(evidence.stored_statement_digest).toBe(MIGRATION_SHA256);
    expect(evidence.stored_statement_bytes).toBe(MIGRATION_BYTES);

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

  it("forced failure before history insert rolls back privileges", async () => {
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
  });

  it("forced failure after history insert rolls back history and privileges", async () => {
    await resetWorld();
    const evidence = await runApplicator(
      baseApplyInputs(pg.url, {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
        injectFailure: "after_history",
      }),
    );
    expect(evidence.verdict).toBe("APPLY_ROLLED_BACK");
    expect(evidence.rollback_verify?.version_absent).toBe(true);
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
    expect(evidence.verdict).not.toBe("APPLY_ROLLED_BACK");
    expect(evidence.reconciliation?.classification).toBe("NOT_APPLIED_CONFIRMED");
  });

  it("connection loss after COMMIT ack yields INDETERMINATE and APPLIED_CONFIRMED_AFTER_RECONCILIATION", async () => {
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

  it("prior-history mutation is detected and rolled back", async () => {
    await resetWorld();
    const evidence = await runApplicator(
      baseApplyInputs(pg.url, {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
        injectFailure: "mutate_prior",
      }),
    );
    expect(evidence.verdict).toBe("APPLY_ROLLED_BACK");
    expect(evidence.error).toMatch(/PRIOR_HISTORY_MUTATION_DETECTED/);
  });

  it("repeated apply refuses because version exists", async () => {
    await resetWorld();
    const first = await runApplicator(
      baseApplyInputs(pg.url, {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    );
    expect(first.verdict).toBe("APPLY_COMMITTED");
    const second = await runApplicator(
      baseApplyInputs(pg.url, {
        mode: "apply",
        applyAuthorizationToken: APPLY_AUTHORIZATION_TOKEN,
      }),
    );
    expect(second.verdict).toBe("APPLY_ROLLED_BACK");
    expect(second.error).toMatch(/VERSION_ALREADY_PRESENT/);
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
});

void PRIOR_HISTORY_COUNT;
