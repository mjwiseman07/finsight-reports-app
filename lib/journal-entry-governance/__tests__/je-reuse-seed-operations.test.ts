/**
 * Non-database unit coverage for JE_REUSE one-statement seed operations.
 */
// @ts-nocheck
import { describe, expect, it, vi } from "vitest";
import {
  JE_REUSE_SEED_OPERATIONS,
  JE_REUSE_SEED_PHASE_NAMES,
  JE_REUSE_IDEMPOTENCY_KEY_RE,
  JE_REUSE_SEED_IDEMPOTENCY_KEYS,
  assertJeReuseIdempotencyKey,
  countExecutableSqlStatements,
  countSqlPlaceholders,
  runJeReuseSeedOperations,
} from "./je-reuse-seed-operations.js";
import {
  requireJeReuseSetup,
  runJeReuseDisposableSetup,
} from "./je-reuse-disposable-setup.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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
  idempotency: { ...JE_REUSE_SEED_IDEMPOTENCY_KEYS },
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

  it("every seeded idempotency key satisfies ^[a-f0-9]{64}$ and keys are distinct", () => {
    expect(String(JE_REUSE_IDEMPOTENCY_KEY_RE)).toBe(String(/^[a-f0-9]{64}$/));
    const keys = Object.values(JE_REUSE_SEED_IDEMPOTENCY_KEYS);
    for (const key of keys) {
      expect(assertJeReuseIdempotencyKey(key).ok).toBe(true);
      expect(key).toMatch(JE_REUSE_IDEMPOTENCY_KEY_RE);
    }
    expect(new Set(keys).size).toBe(keys.length);
    expect(JE_REUSE_SEED_IDEMPOTENCY_KEYS.approval).not.toBe(
      JE_REUSE_SEED_IDEMPOTENCY_KEYS.approval2,
    );
    expect(JE_REUSE_SEED_IDEMPOTENCY_KEYS.approval2).toBe("9".repeat(64));
    expect(JE_REUSE_SEED_IDEMPOTENCY_KEYS.approval2).not.toMatch(/g/);
  });

  it("rejects wrong prefix, characters, length for idempotency grammar", () => {
    expect(assertJeReuseIdempotencyKey("g".repeat(64)).ok).toBe(false);
    expect(assertJeReuseIdempotencyKey("G".repeat(64)).ok).toBe(false);
    expect(assertJeReuseIdempotencyKey("a".repeat(63)).ok).toBe(false);
    expect(assertJeReuseIdempotencyKey("a".repeat(65)).ok).toBe(false);
    expect(assertJeReuseIdempotencyKey("advje_" + "a".repeat(58)).ok).toBe(false);
    expect(assertJeReuseIdempotencyKey("").ok).toBe(false);
  });

  it("secondary approval seed binds approval2 id with distinct policy_hash and valid key", () => {
    const secondary = JE_REUSE_SEED_OPERATIONS.find(
      (o) => o.name === "seed_journal_entry_approval_secondary",
    );
    const values = secondary.params(SAMPLE_CTX);
    expect(values[0]).toBe(SAMPLE_CTX.ids.approval2);
    expect(values[5]).toBe(SAMPLE_CTX.hashB);
    expect(values[5]).not.toBe(SAMPLE_CTX.hash);
    expect(values[7]).toBe(JE_REUSE_SEED_IDEMPOTENCY_KEYS.approval2);
    expect(values[7]).not.toBe(JE_REUSE_SEED_IDEMPOTENCY_KEYS.approval);
  });

  it("suite seedFixture uses JE_REUSE_SEED_IDEMPOTENCY_KEYS (no g-repeat)", () => {
    const suiteSrc = readFileSync(
      join(__dirname, "execution-reservation.postgres.integration.test.ts"),
      "utf8",
    );
    expect(suiteSrc).toContain("JE_REUSE_SEED_IDEMPOTENCY_KEYS");
    expect(suiteSrc).not.toMatch(/approval2:\s*`\$\{"g"\.repeat\(64\)\}`/);
    expect(suiteSrc).not.toMatch(/approval2:\s*"g"\.repeat\(64\)/);
    const mig = readFileSync(
      join(
        __dirname,
        "../../../supabase/migrations/20260821042800_journal_entry_approvals.sql",
      ),
      "utf8",
    );
    expect(mig).toMatch(
      /journal_entry_approvals_idempotency_key_check[\s\S]*?\^\[a-f0-9\]\{64\}\$/,
    );
    expect(mig).not.toMatch(
      /DROP CONSTRAINT\s+journal_entry_approvals_idempotency_key_check/i,
    );
  });

  it("invalid seeded key fails closed before SQL and remains a SETUP failure with rollback", async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    await expect(
      runJeReuseSeedOperations(
        {},
        {
          ...SAMPLE_CTX,
          idempotency: {
            ...JE_REUSE_SEED_IDEMPOTENCY_KEYS,
            approval2: "g".repeat(64),
          },
        },
        { query },
      ),
    ).rejects.toMatchObject({
      code: "23514",
      jeReuseSeedPhase: "seed_idempotency_precheck_approval2",
    });
    expect(query).not.toHaveBeenCalled();

    const client = {
      connect: vi.fn(async () => {}),
      query: vi.fn(async (sql) => {
        if (String(sql).includes("BEGIN") || String(sql).includes("ROLLBACK")) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
      end: vi.fn(async () => {}),
    };
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
      seedFixture: async () =>
        runJeReuseSeedOperations(
          {},
          {
            ...SAMPLE_CTX,
            idempotency: {
              ...JE_REUSE_SEED_IDEMPOTENCY_KEYS,
              approval2: "g".repeat(64),
            },
          },
          { query: async () => ({ rows: [] }) },
        ),
    });
    expect(result.ok).toBe(false);
    expect(result.phase).toBe("seed_idempotency_precheck_approval2");
    expect(result.sqlstate).toBe("23514");
    expect(result.rolledBackOnFailure).toBe(true);
    expect(() => requireJeReuseSetup(result)).toThrow(/seed_idempotency_precheck/);
  });
});
