// @ts-nocheck
/**
 * Compile gate: apply JE-3A execution reservation migration inside a rolled-back transaction.
 * Requires JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL (disposable Postgres only).
 *
 * Usage:
 *   set JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL=postgresql://...
 *   node scripts/smoke/je3a-execution-reservation-postgres-gate.js
 */
const fs = require("node:fs");
const path = require("node:path");
const pg = require("pg");

function loadEnv(file) {
  try {
    fs.readFileSync(file, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eq = trimmed.indexOf("=");
        if (eq === -1) return;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
      });
  } catch {
    // optional
  }
}

loadEnv(".env.local");
loadEnv(".env");

const url = process.env.JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL;
if (!url) {
  console.error("MISSING JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL");
  process.exit(2);
}

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260821183525_journal_entry_executions.sql",
  ),
  "utf8",
);

function buildConnectionString(value) {
  try {
    const parsed = new URL(value);
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return value;
  }
}

async function main() {
  const client = new pg.Client({
    connectionString: buildConnectionString(url),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(migration);
    const verify = await client.query(
      `SELECT proname, prosecdef
         FROM pg_proc
        WHERE proname IN (
          'persist_journal_entry_execution_reservation',
          'transition_journal_entry_execution',
          'je_execution_immutable_binding_matches'
        )
        ORDER BY proname`,
    );
    if (verify.rows.length !== 3) {
      throw new Error(`expected 3 functions, got ${verify.rows.length}`);
    }
    if (!verify.rows.every((r) => r.prosecdef)) {
      throw new Error("expected SECURITY DEFINER on reservation/transition RPCs");
    }
    await client.query("ROLLBACK");
    console.log(
      JSON.stringify({
        ok: true,
        compile: "pass",
        functions: verify.rows.map((r) => r.proname),
        rolledBack: true,
      }),
    );
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    console.error("COMPILE_GATE_FAIL", err?.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
