#!/usr/bin/env node
/**
 * Fresh disposable DB gate for Option D.
 * Rejects existing / partially replayed application databases before any write.
 * Does NOT reset or delete the target.
 */
const path = require("path");

/** Database name must be intentionally disposable (not ambiguous `postgres`). */
const DISPOSABLE_DB_NAME_RE = /^option_d_[a-z0-9_]+$/;

/**
 * Supabase-managed schemas that may exist on a fresh local stack.
 * Application DDL must not live here for the fresh-DB claim.
 */
const ALLOWED_SCHEMAS = new Set([
  "pg_catalog",
  "information_schema",
  "pg_toast",
  "auth",
  "storage",
  "realtime",
  "extensions",
  "graphql",
  "graphql_public",
  "supabase_functions",
  "supabase_migrations",
  "vault",
  "pgsodium",
  "pgtle",
  "cron",
  "net",
  "pgbouncer",
]);

/**
 * Documented public relations allowed on a virgin Supabase local DB.
 * Empty by default — any public app table rejects the fresh claim.
 * Add only proven platform bootstrap names after review.
 */
const ALLOWED_PUBLIC_RELATIONS = new Set([
  // intentionally empty
]);

/** Sentinel application relations — any one means not fresh. */
const APP_SENTINEL_RELATIONS = [
  "companies",
  "firms",
  "firm_clients",
  "subscriptions",
  "journal_entry_executions",
  "journal_entry_proposals",
  "accounting_connections",
  "si_historical_snapshots",
  "company_memory_records",
  "client_active_rules",
  "pilot_slots",
];

const APP_MIGRATION_VERSION_RE = /^(202605|202606|202607|202608|202609)/;

/**
 * @param {{
 *   databaseName: string,
 *   expectedDisposableName: string,
 *   publicRelations: string[],
 *   schemaMigrationVersions?: string[],
 * }} inventory
 */
function evaluateFreshDisposableDatabase(inventory) {
  const failures = [];
  const dbName = String(inventory.databaseName || "").trim();
  const expected = String(inventory.expectedDisposableName || "").trim();

  if (!expected) {
    failures.push({
      rule: "missing_OPTION_D_DISPOSABLE_DB_NAME",
      detail: "Set OPTION_D_DISPOSABLE_DB_NAME to the intentional empty local DB name (option_d_*).",
    });
  } else if (!DISPOSABLE_DB_NAME_RE.test(expected)) {
    failures.push({
      rule: "disposable_db_name_pattern",
      detail: "OPTION_D_DISPOSABLE_DB_NAME must match /^option_d_[a-z0-9_]+$/",
    });
  }

  if (expected && dbName && dbName !== expected) {
    failures.push({
      rule: "database_name_mismatch",
      detail: `URL database "${dbName}" != OPTION_D_DISPOSABLE_DB_NAME "${expected}"`,
    });
  }

  if (dbName && !DISPOSABLE_DB_NAME_RE.test(dbName)) {
    failures.push({
      rule: "database_name_not_disposable_pattern",
      detail: `Refusing ambiguous database name "${dbName}". Create a fresh DB named option_d_* .`,
    });
  }

  const publicRelations = [...(inventory.publicRelations || [])].map((r) => r.toLowerCase());
  const unexpectedPublic = publicRelations.filter((r) => !ALLOWED_PUBLIC_RELATIONS.has(r));
  if (unexpectedPublic.length) {
    failures.push({
      rule: "preexisting_public_relations",
      detail: `Public relations present (not a virgin DB): ${unexpectedPublic.slice(0, 20).join(", ")}`,
      relations: unexpectedPublic,
    });
  }

  const sentinels = publicRelations.filter((r) => APP_SENTINEL_RELATIONS.includes(r));
  if (sentinels.length) {
    failures.push({
      rule: "application_sentinel_relations_present",
      detail: `Application schema already present: ${sentinels.join(", ")}`,
      relations: sentinels,
    });
  }

  const versions = inventory.schemaMigrationVersions || [];
  const appVersions = versions.filter((v) => APP_MIGRATION_VERSION_RE.test(String(v)));
  if (appVersions.length) {
    failures.push({
      rule: "partial_or_prior_app_replay_detected",
      detail: `schema_migrations already contains app versions (${appVersions.length}); refuse reuse as clean evidence`,
      sample: appVersions.slice(0, 10),
    });
  }

  return {
    ok: failures.length === 0,
    failures,
    publicRelationCount: publicRelations.length,
    appMigrationVersionCount: appVersions.length,
  };
}

function databaseNameFromUrl(dbUrl) {
  try {
    const u = new URL(dbUrl);
    return decodeURIComponent((u.pathname || "").replace(/^\//, "") || "");
  } catch {
    return "";
  }
}

/**
 * Query-side inventory collector (requires connected pg Client).
 * Read-only — does not mutate.
 */
async function collectDatabaseInventory(client) {
  const dbRes = await client.query("SELECT current_database() AS name");
  const databaseName = dbRes.rows[0]?.name || "";

  const relRes = await client.query(
    `SELECT c.relname AS name
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r','p','v','m','f')
      ORDER BY 1`,
  );
  const publicRelations = relRes.rows.map((r) => r.name);

  let schemaMigrationVersions = [];
  const migTable = await client.query(
    `SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS exists`,
  );
  if (migTable.rows[0]?.exists) {
    const mig = await client.query(
      `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version`,
    );
    schemaMigrationVersions = mig.rows.map((r) => String(r.version));
  }

  return { databaseName, publicRelations, schemaMigrationVersions };
}

module.exports = {
  DISPOSABLE_DB_NAME_RE,
  ALLOWED_SCHEMAS,
  ALLOWED_PUBLIC_RELATIONS,
  APP_SENTINEL_RELATIONS,
  evaluateFreshDisposableDatabase,
  databaseNameFromUrl,
  collectDatabaseInventory,
};
