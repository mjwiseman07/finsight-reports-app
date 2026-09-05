/**
 * Non-database unit coverage for JE_REUSE disposable setup helpers.
 */
// @ts-nocheck
import { describe, expect, it, vi } from "vitest";
import {
  JE_REUSE_SETUP_PHASES,
  SETUP_TEST_TITLE,
  buildSetupFailureDiagnostic,
  extractPgSqlstate,
  requireJeReuseSetup,
  runJeReuseDisposableSetup,
} from "./je-reuse-disposable-setup.js";

describe("JE_REUSE disposable setup (non-database)", () => {
  it("exposes ordered setup phases including migration and seed", () => {
    expect(JE_REUSE_SETUP_PHASES).toEqual([
      "resolve_client_config",
      "connect",
      "begin_transaction",
      "apply_je_execution_migration",
      "seed_fixture_rows",
      "register_cleanup",
    ]);
    expect(SETUP_TEST_TITLE).toBe("SETUP: disposable database preparation");
  });

  it("extracts SQLSTATE from pg-shaped errors", () => {
    expect(extractPgSqlstate({ code: "23514", message: "x" })).toBe("23514");
    expect(extractPgSqlstate({ code: "42P01" })).toBe("42P01");
    expect(extractPgSqlstate({ message: "no code" })).toBeNull();
  });

  it("builds redacted setup diagnostics without credentials", () => {
    const d = buildSetupFailureDiagnostic({
      phase: "seed_fixture_rows",
      err: {
        code: "23514",
        message:
          'new row violates check constraint "accounting_syncs_validation_status_enum" postgresql://postgres:s3cret@127.0.0.1:54322/postgres',
      },
      databaseUrl: "postgresql://postgres:s3cret@127.0.0.1:54322/postgres",
    });
    expect(d.ok).toBe(false);
    expect(d.phase).toBe("seed_fixture_rows");
    expect(d.sqlstate).toBe("23514");
    expect(d.sanitizedMessage).not.toMatch(/s3cret/);
    expect(d.redactedTarget).toBe("host=127.0.0.1;port=54322;db=postgres");
    expect(d.credentialsIncludedInEvidence).toBe(false);
    expect(d.summary).toMatch(/phase=seed_fixture_rows/);
    expect(d.summary).toMatch(/sqlstate=23514/);
    expect(JSON.stringify(d)).not.toMatch(/s3cret/);
  });

  it("requireJeReuseSetup throws a failure (not a skip signal) when setup failed", () => {
    expect(() =>
      requireJeReuseSetup({
        ok: false,
        phase: "seed_fixture_rows",
        sqlstate: "23514",
        summary: "JE_REUSE setup failed at phase=seed_fixture_rows sqlstate=23514: check",
        client: null,
      }),
    ).toThrow(/phase=seed_fixture_rows/);
  });

  it("runJeReuseDisposableSetup records the first failing phase without throwing", async () => {
    const client = {
      connect: vi.fn(async () => {}),
      query: vi.fn(async (sql) => {
        if (String(sql).includes("BEGIN")) return { rows: [] };
        if (String(sql).includes("CREATE")) return { rows: [] };
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
          hostname: "127.0.0.1",
          port: 54322,
          database: "postgres",
          sslmode: "disable",
          credentialsIncludedInEvidence: false,
        },
        redacted: "host=127.0.0.1;port=54322;db=postgres",
      }),
      readFileSync: () => "CREATE TABLE IF NOT EXISTS t(id int);",
      seedFixture: async () => {
        throw Object.assign(
          new Error(
            'new row for relation "accounting_syncs" violates check constraint "accounting_syncs_validation_status_enum"',
          ),
          { code: "23514" },
        );
      },
    });
    expect(result.ok).toBe(false);
    expect(result.phase).toBe("seed_fixture_rows");
    expect(result.sqlstate).toBe("23514");
    expect(result.client).toBeNull();
    expect(result.summary).toMatch(/seed_fixture_rows/);
    expect(JSON.stringify(result)).not.toMatch(/:p@/);
    expect(client.query).toHaveBeenCalled();
    expect(client.end).toHaveBeenCalled();
  });

  it("seedFixture contract forbids obsolete validation_status=valid", async () => {
    const fs = await import("node:fs");
    const suiteSrc = fs.readFileSync(
      new URL("./execution-reservation.postgres.integration.test.ts", import.meta.url),
      "utf8",
    );
    const seedSrc = fs.readFileSync(
      new URL("./je-reuse-seed-operations.js", import.meta.url),
      "utf8",
    );
    expect(suiteSrc).not.toMatch(/'valid',\s*now\(\)/);
    expect(seedSrc).not.toMatch(/'valid',\s*now\(\)/);
    expect(seedSrc).toMatch(/'SUCCESS',\s*now\(\)/);
    expect(seedSrc).toContain("validation_status");
    expect(suiteSrc).toContain("runJeReuseSeedOperations");
    expect(suiteSrc).toContain("it(SETUP_TEST_TITLE");
    expect(suiteSrc).toContain("requireJeReuseSetup");
    // beforeAll must not throw setup errors (stores result instead)
    expect(suiteSrc).toMatch(/setup = await runJeReuseDisposableSetup/);
  });
});
