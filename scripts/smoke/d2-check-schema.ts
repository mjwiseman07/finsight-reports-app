// @ts-nocheck
/* eslint-disable no-console */
import { readFileSync } from "node:fs";
import pg from "pg";

function loadEnv(path: string) {
  try {
    readFileSync(path, "utf8")
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

const url = process.env.SUPABASE_READONLY_DATABASE_URL;
if (!url) {
  console.log("NO_READONLY_URL");
  process.exit(1);
}

function buildConnectionString(value: string) {
  try {
    const parsed = new URL(value);
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return value;
  }
}

const client = new pg.Client({
  connectionString: buildConnectionString(url),
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log("CONNECTED");

  try {
    await client.query("CREATE TABLE IF NOT EXISTS _d2_migration_probe (id int)");
    console.log("DDL_ALLOWED");
    await client.query("DROP TABLE IF EXISTS _d2_migration_probe");
  } catch (err) {
    console.log("DDL_DENIED:", err instanceof Error ? err.message.split("\n")[0] : String(err));
  }

  const tables = await client.query(
    `SELECT c.relname AS table_name
     FROM pg_catalog.pg_class c
     JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname IN ('je_post_attempts', 'je_posting_audit')
       AND c.relkind IN ('r', 'p')
     ORDER BY c.relname`,
  );
  console.log(
    "D2_TABLES:",
    tables.rows.length ? tables.rows.map((r) => r.table_name).join(", ") : "(none)",
  );
}

main()
  .catch((err) => {
    console.error("ERR", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => client.end());
