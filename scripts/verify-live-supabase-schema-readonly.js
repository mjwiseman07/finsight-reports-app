/* eslint-disable @typescript-eslint/no-require-imports */

const databaseUrl = process.env.SUPABASE_READONLY_DATABASE_URL;

const requiredTables = [
  "si_historical_snapshots",
  "si_snapshot_payloads",
  "si_snapshot_audit",
  "si_snapshot_backfill_runs",
  "si_snapshot_retrieval_log",
  "si_snapshot_retention_events",
];

const requiredIndexes = [
  "si_historical_snapshots_identity_version_idx",
  "si_historical_snapshots_status_period_idx",
  "si_historical_snapshots_latest_finalized_idx",
  "si_historical_snapshots_connection_created_idx",
  "si_historical_snapshots_sync_id_idx",
  "si_historical_snapshots_write_source_created_idx",
  "si_historical_snapshots_persistence_version_created_idx",
  "si_snapshot_payloads_snapshot_id_idx",
  "si_snapshot_payloads_company_created_idx",
  "si_snapshot_audit_company_created_idx",
  "si_snapshot_audit_normalized_data_hash_idx",
  "si_snapshot_audit_payload_hash_idx",
  "si_snapshot_audit_company_quality_score_idx",
  "si_snapshot_backfill_runs_company_source_created_idx",
  "si_snapshot_backfill_runs_status_created_idx",
  "si_snapshot_backfill_runs_connection_created_idx",
  "si_snapshot_retrieval_log_company_created_idx",
  "si_snapshot_retrieval_log_requested_by_created_idx",
  "si_snapshot_retrieval_log_source_tenant_created_idx",
  "si_snapshot_retention_events_company_created_idx",
  "si_snapshot_retention_events_snapshot_created_idx",
  "si_snapshot_retention_events_type_created_idx",
  "si_snapshot_retention_events_legal_hold_created_idx",
];

const requiredConstraints = [
  "si_historical_snapshots_snapshot_id_unique",
  "si_historical_snapshots_identity_version_unique",
  "si_historical_snapshots_status_check",
  "si_historical_snapshots_storage_schema_version_positive_check",
  "si_historical_snapshots_persistence_version_positive_check",
  "si_historical_snapshots_write_source_check",
  "si_snapshot_payloads_snapshot_id_unique",
  "si_snapshot_payloads_storage_schema_version_positive_check",
  "si_snapshot_audit_snapshot_id_unique",
  "si_snapshot_audit_storage_schema_version_positive_check",
  "si_snapshot_retention_events_event_id_unique",
  "si_snapshot_retention_events_type_check",
];

const requiredFunctions = [
  "prevent_si_snapshot_metadata_mutation",
  "prevent_si_snapshot_child_mutation_when_parent_locked",
];

const requiredTriggers = [
  { tableName: "si_historical_snapshots", triggerName: "prevent_si_snapshot_metadata_mutation" },
  { tableName: "si_snapshot_payloads", triggerName: "prevent_si_snapshot_payload_mutation_when_parent_locked" },
  { tableName: "si_snapshot_audit", triggerName: "prevent_si_snapshot_audit_mutation_when_parent_locked" },
];

const writeSources = ["sync", "backfill", "repair", "migration", "manual_import"];
const retentionEvents = [
  "retained",
  "archived",
  "restored",
  "deleted",
  "legal_hold_applied",
  "legal_hold_released",
  "retention_extended",
  "retention_expired",
];

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (condition) pass(message);
  else fail(message);
}

function redact(value) {
  if (!value) return value;
  let redacted = value;
  if (databaseUrl) redacted = redacted.split(databaseUrl).join("[SUPABASE_READONLY_DATABASE_URL]");
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.password) redacted = redacted.split(parsed.password).join("[redacted-password]");
  } catch {
    // Ignore invalid URLs; the verifier will report the connection failure safely.
  }
  return redacted;
}

function loadPgClient() {
  try {
    return require("pg").Client;
  } catch {
    throw new Error("Missing dependency: pg. Add it in Security Checkpoint B3 before running live verification.");
  }
}

async function select(client, sql, params = []) {
  if (!/^\s*select\b/i.test(sql)) {
    throw new Error("Verifier attempted a non-SELECT query. Aborting read-only verification.");
  }
  return client.query(sql, params);
}

function includesText(value, expected) {
  return String(value || "").toLowerCase().includes(expected.toLowerCase());
}

async function verify() {
  if (!databaseUrl) {
    throw new Error("SUPABASE_READONLY_DATABASE_URL is missing.");
  }

  const Client = loadPgClient();
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    for (const tableName of requiredTables) {
      const tableResult = await select(
        client,
        `select table_name
         from information_schema.tables
         where table_schema = 'public'
           and table_name = $1`,
        [tableName],
      );
      assert(tableResult.rowCount === 1, `${tableName} table exists`);

      const rlsResult = await select(
        client,
        `select c.relrowsecurity
         from pg_catalog.pg_class c
         join pg_catalog.pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relname = $1`,
        [tableName],
      );
      assert(rlsResult.rows[0]?.relrowsecurity === true, `${tableName} RLS is enabled`);

      const policyResult = await select(
        client,
        `select policyname, cmd, roles, qual, with_check
         from pg_catalog.pg_policies
         where schemaname = 'public'
           and tablename = $1`,
        [tableName],
      );

      const servicePolicy = policyResult.rows.find((policy) =>
        policy.cmd === "ALL" && includesText(policy.roles, "service_role"),
      );
      assert(Boolean(servicePolicy), `${tableName} has service_role manage policy`);

      const readPolicy = policyResult.rows.find((policy) =>
        policy.cmd === "SELECT" &&
        includesText(policy.roles, "authenticated") &&
        includesText(policy.qual, "company_users") &&
        includesText(policy.qual, "company_id") &&
        includesText(policy.qual, "auth.uid()") &&
        includesText(policy.qual, "status") &&
        includesText(policy.qual, "active"),
      );
      assert(Boolean(readPolicy), `${tableName} has company-scoped authenticated read policy`);
    }

    const requiredColumns = [
      { tableName: "si_historical_snapshots", columnName: "snapshot_storage_schema_version" },
      { tableName: "si_historical_snapshots", columnName: "snapshot_persistence_version" },
      { tableName: "si_historical_snapshots", columnName: "snapshot_write_source" },
      { tableName: "si_snapshot_payloads", columnName: "snapshot_storage_schema_version" },
      { tableName: "si_snapshot_audit", columnName: "snapshot_storage_schema_version" },
      { tableName: "si_snapshot_retention_events", columnName: "legal_hold" },
      { tableName: "si_snapshot_retrieval_log", columnName: "retrieval_window" },
    ];

    for (const { tableName, columnName } of requiredColumns) {
      const columnResult = await select(
        client,
        `select column_name
         from information_schema.columns
         where table_schema = 'public'
           and table_name = $1
           and column_name = $2`,
        [tableName, columnName],
      );
      assert(columnResult.rowCount === 1, `${tableName}.${columnName} exists`);
    }

    const oldWindowResult = await select(
      client,
      `select column_name
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'si_snapshot_retrieval_log'
         and column_name = 'window'`,
    );
    assert(oldWindowResult.rowCount === 0, "si_snapshot_retrieval_log.window does not exist");

    const indexResult = await select(
      client,
      `select indexname, indexdef
       from pg_catalog.pg_indexes
       where schemaname = 'public'
         and indexname = any($1::text[])`,
      [requiredIndexes],
    );
    const foundIndexes = new Set(indexResult.rows.map((row) => row.indexname));
    for (const indexName of requiredIndexes) {
      assert(foundIndexes.has(indexName), `${indexName} index exists`);
    }
    assert(
      indexResult.rows.some((row) =>
        row.indexname === "si_historical_snapshots_latest_finalized_idx" &&
        includesText(row.indexdef, "snapshot_status = 'finalized'"),
      ),
      "Latest finalized index filters finalized snapshots",
    );

    const constraintResult = await select(
      client,
      `select con.conname, pg_catalog.pg_get_constraintdef(con.oid) as definition
       from pg_catalog.pg_constraint con
       join pg_catalog.pg_class rel on rel.oid = con.conrelid
       join pg_catalog.pg_namespace nsp on nsp.oid = rel.relnamespace
       where nsp.nspname = 'public'
         and con.conname = any($1::text[])`,
      [requiredConstraints],
    );
    const foundConstraints = new Map(constraintResult.rows.map((row) => [row.conname, row.definition]));
    for (const constraintName of requiredConstraints) {
      assert(foundConstraints.has(constraintName), `${constraintName} constraint exists`);
    }

    const writeSourceDefinition = foundConstraints.get("si_historical_snapshots_write_source_check") || "";
    for (const source of writeSources) {
      assert(includesText(writeSourceDefinition, source), `snapshot_write_source allows ${source}`);
    }

    const retentionTypeDefinition = foundConstraints.get("si_snapshot_retention_events_type_check") || "";
    for (const eventType of retentionEvents) {
      assert(includesText(retentionTypeDefinition, eventType), `retention event type allows ${eventType}`);
    }

    const functionResult = await select(
      client,
      `select p.proname
       from pg_catalog.pg_proc p
       join pg_catalog.pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname = any($1::text[])`,
      [requiredFunctions],
    );
    const foundFunctions = new Set(functionResult.rows.map((row) => row.proname));
    for (const functionName of requiredFunctions) {
      assert(foundFunctions.has(functionName), `${functionName} function exists`);
    }

    for (const { tableName, triggerName } of requiredTriggers) {
      const triggerResult = await select(
        client,
        `select t.tgname
         from pg_catalog.pg_trigger t
         join pg_catalog.pg_class c on c.oid = t.tgrelid
         join pg_catalog.pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relname = $1
           and t.tgname = $2
           and not t.tgisinternal`,
        [tableName, triggerName],
      );
      assert(triggerResult.rowCount === 1, `${triggerName} trigger exists on ${tableName}`);
    }
  } finally {
    await client.end();
  }

  if (process.exitCode) process.exit(process.exitCode);
  console.log("\nLive Supabase read-only schema verification passed.");
}

verify().catch((error) => {
  console.error(redact(error.message));
  process.exitCode = 1;
});
