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

  const tables = await client.query(
    `select tablename from pg_tables
     where schemaname = 'public'
       and tablename in (
         'firm_client_users',
         'engagement_review_visibility',
         'je_backup_packets',
         'review_item_packet_exports'
       )
     order by tablename`,
  );
  console.log("TABLES:", tables.rows.map((r) => r.tablename).join(", ") || "(none)");

  const policies = await client.query(
    `select polname from pg_policy
     where polrelid = 'public.pre_close_review_items'::regclass
     order by polname`,
  );
  console.log("PRE_CLOSE_POLICIES:", policies.rows.map((r) => r.polname).join(", ") || "(none)");

  const constraints = await client.query(
    `select conname, pg_get_constraintdef(oid) as def
     from pg_constraint
     where conname in (
       'ai_action_log_action_category_check',
       'ledger_events_event_category_check'
     )
     order by conname`,
  );
  for (const row of constraints.rows) {
    console.log(`CONSTRAINT ${row.conname}:`, row.def);
  }

  try {
    const buckets = await client.query(
      `select id from storage.buckets
       where id in ('je-backup', 'review-item-packets')
       order by id`,
    );
    console.log("BUCKETS:", buckets.rows.map((r) => r.id).join(", ") || "(none)");
  } catch (err) {
    console.log(
      "BUCKETS: (readonly denied)",
      err instanceof Error ? err.message.split("\n")[0] : String(err),
    );
  }

  try {
    const migration = await client.query(
      `select version from supabase_migrations.schema_migrations
       where version like '%d6_4d%' or version like '%20260706180000%'
       order by version`,
    );
    console.log("MIGRATION_ROWS:", migration.rows.map((r) => r.version).join(", ") || "(none)");
  } catch (err) {
    console.log(
      "MIGRATION_ROWS: (unavailable)",
      err instanceof Error ? err.message.split("\n")[0] : String(err),
    );
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
