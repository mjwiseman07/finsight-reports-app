/* eslint-disable @typescript-eslint/no-require-imports */

function loadReadonlyDatabaseUrlFromEnvLocal() {
  if (process.env.SUPABASE_READONLY_DATABASE_URL) return;

  try {
    require("dotenv").config({ path: ".env.local" });
    return;
  } catch {
    // dotenv is optional for this verifier; fall back to reading only the key we need.
  }

  const fs = require("fs");
  const envPath = ".env.local";
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  const line = lines.find((entry) => /^\s*SUPABASE_READONLY_DATABASE_URL\s*=/.test(entry));
  if (!line) return;

  let value = line.replace(/^\s*SUPABASE_READONLY_DATABASE_URL\s*=\s*/, "").trim();
  const isDoubleQuoted = value.startsWith('"') && value.endsWith('"');
  const isSingleQuoted = value.startsWith("'") && value.endsWith("'");
  if (isDoubleQuoted || isSingleQuoted) value = value.slice(1, -1);

  process.env.SUPABASE_READONLY_DATABASE_URL = value;
}

loadReadonlyDatabaseUrlFromEnvLocal();

const databaseUrl = process.env.SUPABASE_READONLY_DATABASE_URL;

const requiredTables = [
  "company_memory_records",
  "company_memory_record_sources",
  "company_memory_record_lineage",
  "company_memory_record_audit",
  "company_memory_record_versions",
  "company_memory_record_retention_events",
];

const requiredColumns = [
  ["company_memory_records", "memory_id"],
  ["company_memory_records", "memory_group_id"],
  ["company_memory_records", "memory_key"],
  ["company_memory_records", "record_version"],
  ["company_memory_records", "company_id"],
  ["company_memory_records", "memory_type"],
  ["company_memory_records", "memory_status"],
  ["company_memory_records", "persistence_status"],
  ["company_memory_records", "governance_status"],
  ["company_memory_records", "refresh_status"],
  ["company_memory_records", "intelligence_scope"],
  ["company_memory_records", "intelligence_record_type"],
  ["company_memory_records", "domain"],
  ["company_memory_records", "subdomain"],
  ["company_memory_records", "topic"],
  ["company_memory_records", "industry"],
  ["company_memory_records", "entity_scope"],
  ["company_memory_records", "entity_type"],
  ["company_memory_records", "entity_id"],
  ["company_memory_records", "consolidation_group_id"],
  ["company_memory_records", "source_system"],
  ["company_memory_records", "tenant_id"],
  ["company_memory_records", "record_input_id"],
  ["company_memory_records", "record_input_determinism_hash"],
  ["company_memory_records", "persistence_determinism_hash"],
  ["company_memory_records", "confidence_score"],
  ["company_memory_records", "confidence_reason"],
  ["company_memory_records", "evidence_strength"],
  ["company_memory_records", "data_completeness_score"],
  ["company_memory_records", "audience_level"],
  ["company_memory_records", "legal_hold"],
  ["company_memory_records", "retention_expires_at"],
  ["company_memory_records", "payload"],
  ["company_memory_records", "scenario_metadata"],
  ["company_memory_records", "external_signal_metadata"],
  ["company_memory_records", "governance_metadata"],
  ["company_memory_records", "evidence_metadata"],
  ["company_memory_record_sources", "source_id"],
  ["company_memory_record_sources", "memory_id"],
  ["company_memory_record_sources", "memory_group_id"],
  ["company_memory_record_sources", "company_id"],
  ["company_memory_record_sources", "source_type"],
  ["company_memory_record_sources", "source_system"],
  ["company_memory_record_sources", "source_record_id"],
  ["company_memory_record_sources", "source_report"],
  ["company_memory_record_sources", "source_period"],
  ["company_memory_record_sources", "source_last_updated"],
  ["company_memory_record_sources", "source_reference_id"],
  ["company_memory_record_sources", "snapshot_id"],
  ["company_memory_record_sources", "period_key"],
  ["company_memory_record_sources", "tenant_id"],
  ["company_memory_record_sources", "source_set_hash"],
  ["company_memory_record_sources", "source_metadata"],
  ["company_memory_record_lineage", "lineage_id"],
  ["company_memory_record_lineage", "memory_id"],
  ["company_memory_record_lineage", "memory_group_id"],
  ["company_memory_record_lineage", "company_id"],
  ["company_memory_record_lineage", "record_input_id"],
  ["company_memory_record_lineage", "candidate_id"],
  ["company_memory_record_lineage", "promotion_id"],
  ["company_memory_record_lineage", "approval_id"],
  ["company_memory_record_lineage", "retrieval_id"],
  ["company_memory_record_lineage", "retrieval_lineage_id"],
  ["company_memory_record_lineage", "record_input_determinism_hash"],
  ["company_memory_record_lineage", "promotion_determinism_hash"],
  ["company_memory_record_lineage", "retrieval_determinism_hash"],
  ["company_memory_record_lineage", "persistence_determinism_hash"],
  ["company_memory_record_lineage", "source_reference_ids"],
  ["company_memory_record_lineage", "snapshot_ids"],
  ["company_memory_record_lineage", "lineage_hash"],
  ["company_memory_record_lineage", "source_set_hash"],
  ["company_memory_record_lineage", "lineage_metadata"],
  ["company_memory_record_audit", "audit_id"],
  ["company_memory_record_audit", "company_id"],
  ["company_memory_record_audit", "memory_id"],
  ["company_memory_record_audit", "memory_group_id"],
  ["company_memory_record_audit", "event_type"],
  ["company_memory_record_audit", "event_hash"],
  ["company_memory_record_audit", "persistence_run_id"],
  ["company_memory_record_audit", "request_id"],
  ["company_memory_record_audit", "previous_memory_id"],
  ["company_memory_record_audit", "new_memory_id"],
  ["company_memory_record_audit", "previous_status"],
  ["company_memory_record_audit", "new_status"],
  ["company_memory_record_audit", "audit_payload"],
  ["company_memory_record_versions", "version_id"],
  ["company_memory_record_versions", "company_id"],
  ["company_memory_record_versions", "memory_group_id"],
  ["company_memory_record_versions", "memory_id"],
  ["company_memory_record_versions", "memory_key"],
  ["company_memory_record_versions", "record_version"],
  ["company_memory_record_versions", "version_status"],
  ["company_memory_record_versions", "superseded_by_memory_id"],
  ["company_memory_record_retention_events", "retention_event_id"],
  ["company_memory_record_retention_events", "company_id"],
  ["company_memory_record_retention_events", "memory_id"],
  ["company_memory_record_retention_events", "memory_group_id"],
  ["company_memory_record_retention_events", "event_type"],
  ["company_memory_record_retention_events", "event_hash"],
  ["company_memory_record_retention_events", "legal_hold_before"],
  ["company_memory_record_retention_events", "legal_hold_after"],
  ["company_memory_record_retention_events", "retention_expires_at_before"],
  ["company_memory_record_retention_events", "retention_expires_at_after"],
  ["company_memory_record_retention_events", "retention_payload"],
];

const requiredConstraints = [
  "company_memory_record_sources_memory_id_fkey",
  "company_memory_record_lineage_memory_id_fkey",
  "company_memory_record_audit_memory_id_fkey",
  "company_memory_record_versions_memory_id_fkey",
  "company_memory_record_versions_superseded_by_memory_id_fkey",
  "company_memory_record_retention_events_memory_id_fkey",
  "company_memory_records_company_group_version_unique",
  "company_memory_records_record_input_hash_unique",
  "company_memory_records_persistence_hash_unique",
  "company_memory_record_lineage_company_memory_lineage_hash_unique",
  "company_memory_record_audit_company_event_hash_unique",
  "company_memory_record_retention_events_company_event_hash_unique",
  "company_memory_record_versions_company_group_version_unique",
  "company_memory_records_record_version_check",
  "company_memory_records_confidence_score_check",
  "company_memory_records_data_completeness_score_check",
  "company_memory_records_entity_scope_check",
  "company_memory_records_persistence_status_check",
  "company_memory_records_intelligence_scope_check",
  "company_memory_record_versions_record_version_check",
  "company_memory_record_versions_version_status_check",
  "company_memory_record_audit_event_type_check",
  "company_memory_record_retention_events_event_type_check",
];

const requiredIndexes = [
  "cmr_company_group_version_idx",
  "cmr_record_input_hash_idx",
  "cmr_persistence_hash_idx",
  "cmr_memory_key_status_idx",
  "cmr_memory_key_group_idx",
  "cmr_entity_scope_id_idx",
  "cmr_entity_type_id_idx",
  "cmr_consolidation_group_idx",
  "cmr_source_system_tenant_idx",
  "cmr_domain_subdomain_status_idx",
  "cmr_topic_status_idx",
  "cmr_record_type_status_idx",
  "cmr_industry_domain_status_idx",
  "cmr_governance_status_idx",
  "cmr_refresh_status_idx",
  "cmr_legal_hold_retention_idx",
  "cmr_active_records_idx",
  "cmr_legal_hold_true_idx",
  "cmr_needs_review_idx",
  "cmr_needs_reprocessing_idx",
  "cmr_history_status_idx",
  "cmrs_company_memory_idx",
  "cmrs_source_record_idx",
  "cmrs_snapshot_idx",
  "cmrs_source_set_hash_idx",
  "cmrs_source_type_source_id_idx",
  "cmrs_source_tenant_period_idx",
  "cmrl_company_memory_idx",
  "cmrl_company_group_idx",
  "cmrl_candidate_idx",
  "cmrl_promotion_idx",
  "cmrl_retrieval_lineage_idx",
  "cmrl_lineage_hash_idx",
  "cmra_memory_created_idx",
  "cmra_group_created_idx",
  "cmra_event_created_idx",
  "cmra_persistence_run_idx",
  "cmra_request_idx",
  "cmra_event_hash_idx",
  "cmrv_group_version_idx",
  "cmrv_memory_key_idx",
  "cmrv_status_created_idx",
  "cmrv_active_group_idx",
  "cmre_memory_created_idx",
  "cmre_event_created_idx",
  "cmre_legal_hold_after_idx",
  "cmre_retention_expires_after_idx",
  "cmre_legal_hold_true_idx",
];

const requiredFunctions = [
  "prevent_company_memory_record_unsafe_mutation",
  "prevent_company_memory_append_only_mutation",
  "prevent_company_memory_version_unsafe_mutation",
];

const requiredTriggers = [
  { tableName: "company_memory_records", triggerName: "prevent_company_memory_record_unsafe_mutation" },
  { tableName: "company_memory_record_sources", triggerName: "prevent_company_memory_record_sources_mutation" },
  { tableName: "company_memory_record_lineage", triggerName: "prevent_company_memory_record_lineage_mutation" },
  { tableName: "company_memory_record_audit", triggerName: "prevent_company_memory_record_audit_mutation" },
  { tableName: "company_memory_record_retention_events", triggerName: "prevent_company_memory_retention_events_mutation" },
  { tableName: "company_memory_record_versions", triggerName: "prevent_company_memory_version_unsafe_mutation" },
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
    // Ignore invalid URLs; the verifier will report connection failures safely.
  }
  return redacted;
}

function loadPgClient() {
  try {
    return require("pg").Client;
  } catch {
    throw new Error("Missing dependency: pg. Add pg before running live verification.");
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

function buildVerifierConnectionString(value) {
  try {
    const parsed = new URL(value);
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return value;
  }
}

function findPolicy(policies, predicate) {
  return policies.find((policy) => predicate(policy));
}

async function verify() {
  if (!databaseUrl) {
    throw new Error("SUPABASE_READONLY_DATABASE_URL is missing.");
  }

  const Client = loadPgClient();
  const client = new Client({
    connectionString: buildVerifierConnectionString(databaseUrl),
    // Scoped to this read-only Supabase pooler verifier; do not change app runtime TLS behavior.
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  pass("connection succeeded");

  try {
    for (const tableName of requiredTables) {
      const tableResult = await select(
        client,
        `select c.relname
         from pg_catalog.pg_class c
         join pg_catalog.pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relname = $1
           and c.relkind in ('r', 'p')`,
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

      const policies = policyResult.rows;
      const servicePolicy = findPolicy(
        policies,
        (policy) =>
          policy.cmd === "ALL" &&
          includesText(policy.roles, "service_role") &&
          includesText(policy.qual, "true") &&
          includesText(policy.with_check, "true"),
      );
      assert(Boolean(servicePolicy), `${tableName} has service_role manage policy`);

      const readPolicy = findPolicy(
        policies,
        (policy) =>
          policy.cmd === "SELECT" &&
          includesText(policy.roles, "authenticated") &&
          includesText(policy.qual, "company_users") &&
          includesText(policy.qual, `${tableName}.company_id`) &&
          includesText(policy.qual, "auth.uid()") &&
          includesText(policy.qual, "status") &&
          includesText(policy.qual, "active"),
      );
      assert(Boolean(readPolicy), `${tableName} has company-scoped authenticated read policy`);

      assert(!policies.some((policy) => includesText(policy.roles, "anon")), `${tableName} has no anon policy`);
      assert(!policies.some((policy) => includesText(policy.roles, "public")), `${tableName} has no public policy`);
      assert(
        !policies.some((policy) => policy.cmd !== "SELECT" && includesText(policy.roles, "authenticated")),
        `${tableName} has no authenticated write policy`,
      );
      assert(
        !policies.some((policy) => policy.cmd === "SELECT" && !includesText(policy.qual, "company_users")),
        `${tableName} has no company_users-free select policy`,
      );
      assert(
        !policies.some(
          (policy) =>
            policy.cmd === "SELECT" &&
            (includesText(policy.qual, "source_system") || includesText(policy.qual, "tenant_id")) &&
            !includesText(policy.qual, "company_users"),
        ),
        `${tableName} has no source_system-only or tenant_id-only read fallback`,
      );
    }

    for (const [tableName, columnName] of requiredColumns) {
      const columnResult = await select(
        client,
        `select a.attname
         from pg_catalog.pg_attribute a
         join pg_catalog.pg_class c on c.oid = a.attrelid
         join pg_catalog.pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public'
           and c.relname = $1
           and a.attname = $2
           and a.attnum > 0
           and not a.attisdropped`,
        [tableName, columnName],
      );
      assert(columnResult.rowCount === 1, `${tableName}.${columnName} exists`);
    }

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
    assert(
      [...foundConstraints.values()].every((definition) => !includesText(definition, "cascade")),
      "Company Memory Persistence foreign key constraints do not use cascade delete",
    );

    const indexResult = await select(
      client,
      `select indexname, indexdef
       from pg_catalog.pg_indexes
       where schemaname = 'public'
         and indexname = any($1::text[])`,
      [requiredIndexes],
    );
    const foundIndexes = new Map(indexResult.rows.map((row) => [row.indexname, row.indexdef]));
    for (const indexName of requiredIndexes) {
      assert(foundIndexes.has(indexName), `${indexName} index exists`);
    }
    assert(includesText(foundIndexes.get("cmr_active_records_idx"), "memory_status = 'active'"), "active records partial index filters active");
    assert(includesText(foundIndexes.get("cmr_legal_hold_true_idx"), "legal_hold = true"), "legal hold partial index filters legal_hold");
    assert(includesText(foundIndexes.get("cmr_needs_review_idx"), "refresh_status = 'needs_review'"), "needs_review partial index filters needs_review");
    assert(includesText(foundIndexes.get("cmr_needs_reprocessing_idx"), "refresh_status = 'needs_reprocessing'"), "needs_reprocessing partial index filters needs_reprocessing");
    assert(includesText(foundIndexes.get("cmrv_active_group_idx"), "version_status = 'active'"), "active version partial index filters active");

    const functionResult = await select(
      client,
      `select p.proname, pg_catalog.pg_get_functiondef(p.oid) as definition
       from pg_catalog.pg_proc p
       join pg_catalog.pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname = any($1::text[])`,
      [requiredFunctions],
    );
    const foundFunctions = new Map(functionResult.rows.map((row) => [row.proname, row.definition]));
    for (const functionName of requiredFunctions) {
      assert(foundFunctions.has(functionName), `${functionName} function exists`);
    }

    const recordGuard = foundFunctions.get("prevent_company_memory_record_unsafe_mutation") || "";
    assert(includesText(recordGuard, "old.legal_hold = true"), "record guard includes legal-hold delete guard");
    assert(includesText(recordGuard, "old.memory_id is distinct from new.memory_id"), "record guard protects memory_id");
    assert(includesText(recordGuard, "old.persistence_determinism_hash is distinct from new.persistence_determinism_hash"), "record guard protects persistence hash");
    assert(includesText(recordGuard, "pending") && includesText(recordGuard, "persisted") && includesText(recordGuard, "blocked"), "record guard includes approved status transitions");

    const appendOnlyGuard = foundFunctions.get("prevent_company_memory_append_only_mutation") || "";
    assert(includesText(appendOnlyGuard, "append-only") || includesText(appendOnlyGuard, "append only"), "append-only guard exists for audit/retention/source/lineage");

    const versionGuard = foundFunctions.get("prevent_company_memory_version_unsafe_mutation") || "";
    assert(includesText(versionGuard, "old.version_id is distinct from new.version_id"), "version guard protects version identity fields");

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
  console.log("\nLive Company Memory Persistence read-only verification passed.");
}

verify().catch((error) => {
  console.error(redact(error.message));
  process.exitCode = 1;
});
