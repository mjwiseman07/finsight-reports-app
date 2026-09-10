import { createHash } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  runApplicator,
  ADVISORY_LOCK,
} from "../../scripts/security/credential-browser-containment-apply-core.js";
import {
  ARTIFACT_COMMIT,
  MIGRATION_PATH,
  MIGRATION_BLOB_OID,
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
    expect(evidence.source_authority.kind).toBe("git_blob");
    expect(evidence.prior_history_count).toBe(PRIOR_HISTORY_COUNT);
    expect(JSON.stringify(evidence)).not.toMatch(/FAKE_ACCESS_TOKEN|postgres:postgres|password=/i);
  });

  it("pin mismatches never open a successful apply path (zero attempts)", async () => {
    await resetWorld();
    const cases = [
      { migrationSha256: "ff".repeat(32) },
      { migrationBytes: 99999 },
      { migrationBlobOid: "deadbeef".repeat(5) },
      { projectRef: "not-the-project" },
      { version: "20990101000000" },
      { name: "wrong" },
    ];
    for (const overrides of cases) {
      const evidence = await runApplicator(
        baseApplyInputs(pg.url, { mode: "apply", applyAuthorized: true, ...overrides }),
      );
      expect(evidence.sqlApplicationAttempts).toBe(0);
      expect(evidence.verdict).not.toBe("APPLY_COMMITTED");
    }
  });

  it("exact apply inserts one history row and contains privileges; statements[1] matches git blob", async () => {
    await resetWorld();
    const evidence = await runApplicator(
      baseApplyInputs(pg.url, { mode: "apply", applyAuthorized: true }),
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

    const { rows: countRows } = await client.query(
      `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
    );
    expect(countRows[0].c).toBe(PRIOR_HISTORY_COUNT + 1);

    const { rows: priv } = await client.query(`
      SELECT has_column_privilege('authenticated','public.accounting_connections','access_token','SELECT') AS tok
    `);
    expect(priv[0].tok).toBe(false);
    await client.end();
  });

  it("forced failure before history insert rolls back privileges", async () => {
    await resetWorld();
    const evidence = await runApplicator(
      baseApplyInputs(pg.url, {
        mode: "apply",
        applyAuthorized: true,
        injectFailure: "before_history",
      }),
    );
    expect(evidence.verdict).toBe("APPLY_ROLLED_BACK");
    expect(evidence.sqlApplicationAttempts).toBe(1);
    expect(evidence.rollback_verify?.version_absent).toBe(true);
    expect(evidence.rollback_verify?.pre_change_restored).toBe(true);

    const client = new Client({ connectionString: pg.url });
    await client.connect();
    const { rows } = await client.query(`
      SELECT has_column_privilege('authenticated','public.accounting_connections','access_token','SELECT') AS tok
    `);
    expect(rows[0].tok).toBe(true);
    await client.end();
  });

  it("forced failure after history insert rolls back history and privileges", async () => {
    await resetWorld();
    const evidence = await runApplicator(
      baseApplyInputs(pg.url, {
        mode: "apply",
        applyAuthorized: true,
        injectFailure: "after_history",
      }),
    );
    expect(evidence.verdict).toBe("APPLY_ROLLED_BACK");
    expect(evidence.rollback_verify?.version_absent).toBe(true);
    expect(evidence.rollback_verify?.pre_change_restored).toBe(true);
  });

  it("prior-history mutation is detected and rolled back", async () => {
    await resetWorld();
    const evidence = await runApplicator(
      baseApplyInputs(pg.url, {
        mode: "apply",
        applyAuthorized: true,
        injectFailure: "mutate_prior",
      }),
    );
    expect(evidence.verdict).toBe("APPLY_ROLLED_BACK");
    expect(evidence.error).toMatch(/PRIOR_HISTORY_MUTATION_DETECTED/);
    expect(evidence.rollback_verify?.version_absent).toBe(true);
  });

  it("repeated apply refuses because version exists", async () => {
    await resetWorld();
    const first = await runApplicator(
      baseApplyInputs(pg.url, { mode: "apply", applyAuthorized: true }),
    );
    expect(first.verdict).toBe("APPLY_COMMITTED");
    const second = await runApplicator(
      baseApplyInputs(pg.url, { mode: "apply", applyAuthorized: true }),
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

    const evidencePromise = runApplicator(
      baseApplyInputs(pg.url, { mode: "apply", applyAuthorized: true }),
    );
    const evidence = await evidencePromise;
    expect(evidence.verdict).toBe("APPLY_ROLLED_BACK");
    expect(String(evidence.error)).toMatch(/lock|timeout|cancel/i);

    await blocker.query("ROLLBACK");
    await blocker.end();
  }, 30000);

  it("apply without opt-in is refused with zero attempts", async () => {
    await resetWorld();
    const evidence = await runApplicator(
      baseApplyInputs(pg.url, { mode: "apply", applyAuthorized: false }),
    );
    expect(evidence.sqlApplicationAttempts).toBe(0);
    expect(evidence.verdict).toMatch(/BLOCKED|APPLY_BLOCKED/);
  });
});

// silence unused import lint in editors
void ARTIFACT_COMMIT;
void MIGRATION_PATH;
void MIGRATION_BLOB_OID;
void MIGRATION_BYTES;
