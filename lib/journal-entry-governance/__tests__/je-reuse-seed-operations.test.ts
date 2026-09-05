/**
 * Non-database unit coverage for JE_REUSE one-statement seed operations.
 */
// @ts-nocheck
import { describe, expect, it, vi } from "vitest";
import {
  JE_REUSE_SEED_OPERATIONS,
  JE_REUSE_SEED_PHASE_NAMES,
  countExecutableSqlStatements,
  countSqlPlaceholders,
  runJeReuseSeedOperations,
} from "./je-reuse-seed-operations.js";
import {
  requireJeReuseSetup,
  runJeReuseDisposableSetup,
} from "./je-reuse-disposable-setup.js";

const SAMPLE_CTX = {
  ids: {
    user: "aaaaaaaa-0101-4101-8101-000000000101",
    company: "aaaaaaaa-0103-4103-8103-000000000103",
    engagement: "aaaaaaaa-0104-4104-8104-000000000104",
    connection: "aaaaaaaa-0105-4105-8105-000000000105",
    sync: "aaaaaaaa-0106-4106-8106-000000000106",
    ccRun: "aaaaaaaa-0107-4107-8107-000000000107",
    proposal: "aaaaaaaa-0108-4108-8108-000000000108",
    approval: "aaaaaaaa-0109-4109-8109-000000000109",
    approval2: "aaaaaaaa-0114-4114-8114-000000000114",
  },
  hash: "a".repeat(64),
  hashB: "b".repeat(64),
  idempotency: {
    ccRun: "d".repeat(64),
    proposal: "e".repeat(64),
    approval: "f".repeat(64),
    approval2: "g".repeat(64),
  },
};

describe("JE_REUSE seed operations (non-database)", () => {
  it("defines ordered dependency seed phases", () => {
    expect(JE_REUSE_SEED_PHASE_NAMES).toEqual([
      "seed_auth_users",
      "seed_companies",
      "seed_audit_ready_engagements",
      "seed_accounting_connections",
      "seed_accounting_syncs",
      "seed_continuous_close_runs",
      "seed_journal_entry_proposals",
      "seed_journal_entry_approval_primary",
      "seed_journal_entry_approval_secondary",
    ]);
    expect(JE_REUSE_SEED_OPERATIONS.map((o) => o.name)).toEqual([
      ...JE_REUSE_SEED_PHASE_NAMES,
    ]);
  });

  it("every seed query is exactly one executable statement with matching params", () => {
    for (const op of JE_REUSE_SEED_OPERATIONS) {
      expect(countExecutableSqlStatements(op.sql)).toBe(1);
      expect(op.sql).not.toMatch(/;\s*\S/); // no mid-string second statement
      const placeholders = countSqlPlaceholders(op.sql);
      const values = op.params(SAMPLE_CTX);
      expect(values).toHaveLength(placeholders);
      expect(op.sql).not.toMatch(/\$\{/); // no interpolation templates
      expect(op.sql).not.toMatch(SAMPLE_CTX.ids.user);
      expect(op.sql).not.toMatch(SAMPLE_CTX.hash);
    }
  });

  it("preserves SUCCESS validation_status and distinct secondary approval policy_hash", () => {
    const sync = JE_REUSE_SEED_OPERATIONS.find((o) => o.name === "seed_accounting_syncs");
    expect(sync?.sql).toMatch(/'SUCCESS'/);
    expect(sync?.sql).not.toMatch(/'valid'/i);

    const primary = JE_REUSE_SEED_OPERATIONS.find(
      (o) => o.name === "seed_journal_entry_approval_primary",
    );
    const secondary = JE_REUSE_SEED_OPERATIONS.find(
      (o) => o.name === "seed_journal_entry_approval_secondary",
    );
    const pParams = primary.params(SAMPLE_CTX);
    const sParams = secondary.params(SAMPLE_CTX);
    // policy_hash is $6 for both approval inserts
    expect(pParams[5]).toBe(SAMPLE_CTX.hash);
    expect(sParams[5]).toBe(SAMPLE_CTX.hashB);
    expect(sParams[5]).not.toBe(pParams[5]);
  });

  it("does not implement or use a generic semicolon SQL splitter for execution", () => {
    const src = require("node:fs").readFileSync(
      require("node:path").join(__dirname, "je-reuse-seed-operations.js"),
      "utf8",
    );
    expect(src).not.toMatch(/split\s*\(\s*['"`];['"`]/);
    expect(src).toMatch(/Never split SQL on semicolons for execution/);
  });

  it("runs operations in order and stops subsequent seeds on first failure", async () => {
    const calls = [];
    const query = vi.fn(async (sql, params) => {
      calls.push({ sql, params });
      if (calls.length === 3) {
        const err = new Error("forced");
        err.code = "23505";
        throw err;
      }
      return { rows: [] };
    });
    await expect(
      runJeReuseSeedOperations({}, SAMPLE_CTX, { query }),
    ).rejects.toMatchObject({
      code: "23505",
      jeReuseSeedPhase: "seed_audit_ready_engagements",
    });
    expect(calls).toHaveLength(3);
    expect(
      JE_REUSE_SEED_OPERATIONS.slice(0, 3).map((o) => o.name),
    ).toEqual([
      "seed_auth_users",
      "seed_companies",
      "seed_audit_ready_engagements",
    ]);
  });

  it("setup failure records named seed phase, rolls back, and cannot appear as skipped", async () => {
    const client = {
      connect: vi.fn(async () => {}),
      query: vi.fn(async (sql) => {
        if (String(sql).includes("BEGIN")) return { rows: [] };
        if (String(sql).toUpperCase().includes("CREATE")) return { rows: [] };
        if (String(sql).includes("ROLLBACK")) return { rows: [] };
        return { rows: [] };
      }),
      end: vi.fn(async () => {}),
    };
    const seedErr = Object.assign(new Error("dup"), {
      code: "23505",
      jeReuseSeedPhase: "seed_accounting_syncs",
    });
    const result = await runJeReuseDisposableSetup({
      databaseUrl: "postgresql://u:p@127.0.0.1:54322/postgres?sslmode=disable",
      migrationPath: "/tmp/fake.sql",
      Client: function FakeClient() {
        return client;
      },
      resolveConfig: async () => ({
        ok: true,
        config: {
          connectionString:
            "postgresql://u:p@127.0.0.1:54322/postgres?sslmode=disable",
          ssl: false,
          transport: "plaintext_loopback",
        },
      }),
      readFileSync: () => "CREATE TABLE IF NOT EXISTS t(id int);",
      seedFixture: async () => {
        throw seedErr;
      },
    });
    expect(result.ok).toBe(false);
    expect(result.phase).toBe("seed_accounting_syncs");
    expect(result.sqlstate).toBe("23505");
    expect(result.rolledBackOnFailure).toBe(true);
    expect(result.client).toBeNull();
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(() => requireJeReuseSetup(result)).toThrow(/seed_accounting_syncs/);
    try {
      requireJeReuseSetup(result);
    } catch (e) {
      expect(String(e.message)).not.toMatch(/skipped/i);
      expect(e.code).toBe("23505");
    }
  });
});
