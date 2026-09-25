/**
 * Read-only catalog probes and post-commit verification for the sealed
 * accounting-automation applicator. Evidence is booleans, counts, and codes.
 * Never returns SQL text, credentials, connection strings, or row payloads.
 */
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const {
  MIGRATIONS,
  POST_HISTORY_COUNT,
  PRIOR_HISTORY_COUNT,
  FEATURE_FLAG_ENV,
} = require("./ra-pro-accounting-automation-apply-constants");
const { sha256Buffer } = require("./git-blob-authority");

const TARGET_TABLES = Object.freeze([
  "ra_pro_weekly_completeness_runs",
  "ra_pro_weekly_completeness_findings",
  "ra_pro_month_end_review_packages",
]);

const TARGET_FUNCTIONS = Object.freeze([
  ["weekly_persist_absent", "public.persist_ra_pro_weekly_completeness(jsonb,jsonb)"],
  ["month_end_persist_absent", "public.persist_ra_pro_month_end_review_package(jsonb)"],
]);

const TARGET_INDEXES = Object.freeze([
  "ra_pro_weekly_runs_firm_period_idx",
  "ra_pro_weekly_runs_client_period_idx",
  "ra_pro_weekly_findings_run_idx",
  "ra_pro_month_end_firm_period_idx",
  "ra_pro_month_end_client_period_idx",
]);

const TARGET_POLICIES = Object.freeze([
  "ra_pro_weekly_runs_service_role_insert",
  "ra_pro_weekly_runs_service_role_select",
  "ra_pro_weekly_runs_firm_member_select",
  "ra_pro_weekly_findings_service_role_insert",
  "ra_pro_weekly_findings_service_role_select",
  "ra_pro_weekly_findings_firm_member_select",
  "ra_pro_month_end_service_insert",
  "ra_pro_month_end_service_select",
  "ra_pro_month_end_member_select",
]);

const POST_COMMIT_POLICIES = Object.freeze([
  ["ra_pro_weekly_completeness_runs", "ra_pro_weekly_runs_service_role_insert", "a", "service_role"],
  ["ra_pro_weekly_completeness_runs", "ra_pro_weekly_runs_service_role_select", "r", "service_role"],
  ["ra_pro_weekly_completeness_runs", "ra_pro_weekly_runs_firm_member_select", "r", "authenticated"],
  ["ra_pro_weekly_completeness_findings", "ra_pro_weekly_findings_service_role_insert", "a", "service_role"],
  ["ra_pro_weekly_completeness_findings", "ra_pro_weekly_findings_service_role_select", "r", "service_role"],
  ["ra_pro_weekly_completeness_findings", "ra_pro_weekly_findings_firm_member_select", "r", "authenticated"],
  ["ra_pro_month_end_review_packages", "ra_pro_month_end_service_insert", "a", "service_role"],
  ["ra_pro_month_end_review_packages", "ra_pro_month_end_service_select", "r", "service_role"],
  ["ra_pro_month_end_review_packages", "ra_pro_month_end_member_select", "r", "authenticated"],
]);

const SENTINELS = Object.freeze([
  ["invoices", "public.invoices"],
  ["bills", "public.bills"],
  ["payments", "public.payments"],
  ["journal_entries", "public.journal_entries"],
  ["provider_writes", "public.provider_write_attempts"],
]);

const VERIFICATION_STATEMENT_TIMEOUT = "30s";

function probeError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

async function collectDryRunSchemaProbes(client) {
  const history = await client.query(
    `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
  );
  const historyCount = history.rows[0].c;
  const versionRows = await client.query(
    `SELECT version, count(*)::int AS c
     FROM supabase_migrations.schema_migrations
     WHERE version = ANY($1::text[])
     GROUP BY version`,
    [MIGRATIONS.map((migration) => migration.version)],
  );
  const versionCounts = {};
  for (const migration of MIGRATIONS) versionCounts[migration.version] = 0;
  for (const row of versionRows.rows) versionCounts[row.version] = row.c;

  const relations = await client.query(
    `SELECT c.relname
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = ANY($1::text[])`,
    [[...TARGET_TABLES, ...TARGET_INDEXES]],
  );
  const presentRelations = new Set(relations.rows.map((row) => row.relname));

  const functions = await client.query(
    `SELECT to_regprocedure($1) IS NULL AS absent`,
    [TARGET_FUNCTIONS[0][1]],
  );
  const monthFunction = await client.query(`SELECT to_regprocedure($1) IS NULL AS absent`, [
    TARGET_FUNCTIONS[1][1],
  ]);

  const policies = await client.query(
    `SELECT count(*)::int AS c
     FROM pg_policy pol
     WHERE pol.polname = ANY($1::text[])`,
    [TARGET_POLICIES],
  );

  const shape = await client.query(`
    SELECT
      EXISTS (
        SELECT 1
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_type t ON t.oid = a.atttypid
        JOIN pg_index i ON i.indrelid = c.oid
        WHERE n.nspname = 'public' AND c.relname = 'firms' AND a.attname = 'id'
          AND t.typname = 'uuid' AND a.attnum > 0 AND NOT a.attisdropped
          AND i.indisunique AND i.indnkeyatts = 1 AND i.indkey[0] = a.attnum
      ) AS firms_id_uuid_key,
      EXISTS (
        SELECT 1
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_type t ON t.oid = a.atttypid
        JOIN pg_index i ON i.indrelid = c.oid
        WHERE n.nspname = 'public' AND c.relname = 'companies' AND a.attname = 'id'
          AND t.typname = 'uuid' AND a.attnum > 0 AND NOT a.attisdropped
          AND i.indisunique AND i.indnkeyatts = 1 AND i.indkey[0] = a.attnum
      ) AS companies_id_uuid_key,
      EXISTS (
        SELECT 1
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_type t ON t.oid = a.atttypid
        JOIN pg_index i ON i.indrelid = c.oid
        WHERE n.nspname = 'public' AND c.relname = 'firm_clients' AND a.attname = 'id'
          AND t.typname = 'uuid' AND a.attnum > 0 AND NOT a.attisdropped
          AND i.indisunique AND i.indnkeyatts = 1 AND i.indkey[0] = a.attnum
      ) AS firm_clients_id_uuid_key,
      EXISTS (
        SELECT 1
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_type t ON t.oid = a.atttypid
        WHERE n.nspname = 'public' AND c.relname = 'firm_clients' AND a.attname = 'firm_id'
          AND t.typname = 'uuid' AND a.attnum > 0 AND NOT a.attisdropped
      ) AS firm_clients_firm_id_uuid,
      EXISTS (
        SELECT 1
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_type t ON t.oid = a.atttypid
        JOIN pg_index i ON i.indrelid = c.oid
        WHERE n.nspname = 'public' AND c.relname = 'accounting_syncs' AND a.attname = 'id'
          AND t.typname = 'uuid' AND a.attnum > 0 AND NOT a.attisdropped
          AND i.indisunique AND i.indnkeyatts = 1 AND i.indkey[0] = a.attnum
      ) AS accounting_syncs_id_uuid_key,
      (
        EXISTS (
          SELECT 1 FROM pg_attribute a
          JOIN pg_class c ON c.oid = a.attrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          JOIN pg_type t ON t.oid = a.atttypid
          WHERE n.nspname = 'public' AND c.relname = 'firm_memberships' AND a.attname = 'firm_id'
            AND t.typname = 'uuid' AND NOT a.attisdropped
        )
        AND EXISTS (
          SELECT 1 FROM pg_attribute a
          JOIN pg_class c ON c.oid = a.attrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          JOIN pg_type t ON t.oid = a.atttypid
          WHERE n.nspname = 'public' AND c.relname = 'firm_memberships' AND a.attname = 'user_id'
            AND t.typname = 'uuid' AND NOT a.attisdropped
        )
        AND EXISTS (
          SELECT 1 FROM pg_attribute a
          JOIN pg_class c ON c.oid = a.attrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          JOIN pg_type t ON t.oid = a.atttypid
          WHERE n.nspname = 'public' AND c.relname = 'firm_memberships' AND a.attname = 'status'
            AND t.typname IN ('text', 'varchar') AND NOT a.attisdropped
        )
      ) AS firm_memberships_shape,
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_type t ON t.oid = p.prorettype
        WHERE n.nspname = 'auth' AND p.proname = 'uid' AND t.typname = 'uuid'
      ) AS auth_uid_uuid,
      (
        EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon' AND rolsuper = false)
        AND EXISTS (
          SELECT 1 FROM pg_roles
          WHERE rolname = 'authenticated' AND rolsuper = false AND rolbypassrls = false
        )
        AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
      ) AS roles_compatible,
      EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'gen_random_uuid'
      ) AS gen_random_uuid_present
  `);

  const shapeRow = shape.rows[0];
  const checks = {
    history_count: historyCount === PRIOR_HISTORY_COUNT,
    versions_absent: MIGRATIONS.every((migration) => versionCounts[migration.version] === 0),
    weekly_runs_absent: !presentRelations.has("ra_pro_weekly_completeness_runs"),
    weekly_findings_absent: !presentRelations.has("ra_pro_weekly_completeness_findings"),
    month_end_packages_absent: !presentRelations.has("ra_pro_month_end_review_packages"),
    weekly_persist_absent: functions.rows[0].absent === true,
    month_end_persist_absent: monthFunction.rows[0].absent === true,
    target_indexes_absent: TARGET_INDEXES.every((name) => !presentRelations.has(name)),
    target_policies_absent: policies.rows[0].c === 0,
    firms_id_uuid_key: shapeRow.firms_id_uuid_key === true,
    companies_id_uuid_key: shapeRow.companies_id_uuid_key === true,
    firm_clients_id_uuid_key: shapeRow.firm_clients_id_uuid_key === true,
    firm_clients_firm_id_uuid: shapeRow.firm_clients_firm_id_uuid === true,
    accounting_syncs_id_uuid_key: shapeRow.accounting_syncs_id_uuid_key === true,
    firm_memberships_shape: shapeRow.firm_memberships_shape === true,
    auth_uid_uuid: shapeRow.auth_uid_uuid === true,
    roles_compatible: shapeRow.roles_compatible === true,
    gen_random_uuid_present: shapeRow.gen_random_uuid_present === true,
  };
  const failed = Object.entries(checks)
    .filter(([, ok]) => ok !== true)
    .map(([name]) => name);
  const targetTablesAbsent =
    checks.weekly_runs_absent && checks.weekly_findings_absent && checks.month_end_packages_absent;
  const targetFunctionsAbsent = checks.weekly_persist_absent && checks.month_end_persist_absent;
  const prerequisitesPresent =
    checks.firms_id_uuid_key &&
    checks.companies_id_uuid_key &&
    checks.firm_clients_id_uuid_key &&
    checks.firm_clients_firm_id_uuid &&
    checks.accounting_syncs_id_uuid_key &&
    checks.firm_memberships_shape &&
    checks.auth_uid_uuid &&
    checks.roles_compatible &&
    checks.gen_random_uuid_present;
  const schemaDriftDetected = failed.some((name) => name !== "history_count" && name !== "versions_absent");

  return {
    ok: failed.length === 0,
    failed,
    versionsAbsent: MIGRATIONS.filter((migration) => versionCounts[migration.version] === 0).map(
      (migration) => migration.version,
    ),
    view: {
      read_only: true,
      history_count: historyCount,
      history_contract: { prior: PRIOR_HISTORY_COUNT, post: POST_HISTORY_COUNT },
      target_versions_absent: checks.versions_absent,
      target_tables_absent: targetTablesAbsent,
      target_functions_absent: targetFunctionsAbsent,
      prerequisites_present: prerequisitesPresent,
      schema_drift_detected: schemaDriftDetected,
      checks,
      failed_checks: failed,
    },
  };
}

async function captureSentinelCounts(client) {
  const counts = {};
  for (const [name, relation] of SENTINELS) {
    const present = await client.query(`SELECT to_regclass($1) AS reg`, [relation]);
    if (!present.rows[0].reg) {
      counts[name] = null;
      continue;
    }
    const counted = await client.query(`SELECT count(*)::int AS c FROM ${relation}`);
    counts[name] = counted.rows[0].c;
  }
  return counts;
}

function sentinelStatus(before, after) {
  const status = {};
  let unchanged = true;
  for (const [name] of SENTINELS) {
    if (before[name] == null && after[name] == null) {
      status[name] = "absent";
      continue;
    }
    if (before[name] == null || after[name] == null || before[name] !== after[name]) {
      status[name] = "changed";
      unchanged = false;
      continue;
    }
    status[name] = "unchanged";
  }
  return { status, unchanged };
}

async function expectPermissionDenied(client, sql) {
  await client.query("SAVEPOINT probe_denied");
  let denied = false;
  try {
    await client.query("SET LOCAL ROLE authenticated");
    await client.query(sql);
  } catch (err) {
    denied = err.code === "42501" || /permission denied/i.test(String(err.message || ""));
    if (!denied) {
      await client.query("ROLLBACK TO SAVEPOINT probe_denied");
      throw err;
    }
  }
  await client.query("ROLLBACK TO SAVEPOINT probe_denied");
  return denied;
}

/**
 * Runtime idempotency probe under SET LOCAL ROLE service_role.
 * Creates valid FK fixture rows as the setup role (session user), then invokes
 * persist RPCs twice without disabling FK/RI triggers. Never claims a JWT
 * service_role session — pooler project-bound connections use SET ROLE only.
 */
async function probeIdempotentPersistence(client) {
  const result = {
    ok: false,
    session_role_model: "set_role_not_jwt",
    sqlstate: null,
    check_code: null,
    weekly_run_count: null,
    month_package_count: null,
  };
  await client.query("SAVEPOINT probe_rpc");
  try {
    const firmId = (await client.query("SELECT gen_random_uuid() AS id")).rows[0].id;
    const companyId = (await client.query("SELECT gen_random_uuid() AS id")).rows[0].id;
    const clientId = (await client.query("SELECT gen_random_uuid() AS id")).rows[0].id;
    const connectionId = (await client.query("SELECT gen_random_uuid() AS id")).rows[0].id;
    const syncId = (await client.query("SELECT gen_random_uuid() AS id")).rows[0].id;
    await client.query("INSERT INTO public.firms(id) VALUES ($1)", [firmId]);
    await client.query("INSERT INTO public.companies(id) VALUES ($1)", [companyId]);
    await client.query(
      "INSERT INTO public.firm_clients(id, firm_id, company_id) VALUES ($1, $2, $3)",
      [clientId, firmId, companyId],
    );
    await client.query("INSERT INTO public.accounting_connections(id) VALUES ($1)", [
      connectionId,
    ]);
    await client.query(
      "INSERT INTO public.accounting_syncs(id, connection_id) VALUES ($1, $2)",
      [syncId, connectionId],
    );
    const weekly = {
      firm_id: firmId,
      firm_client_id: clientId,
      company_id: companyId,
      accounting_sync_id: syncId,
      provider: "quickbooks",
      week_ending: "2026-09-20",
      status: "clear",
      finding_count: 0,
      summary: { review_only: true, provider_writes: false },
      idempotency_key: "a".repeat(64),
      completed_at: "2026-09-17T18:00:00Z",
    };
    const month = {
      firm_id: firmId,
      firm_client_id: clientId,
      company_id: companyId,
      accounting_sync_id: syncId,
      provider: "xero",
      period_end: "2026-08-31",
      status: "ready",
      review_package: { review_only: true, provider_writes: false },
      idempotency_key: "b".repeat(64),
      completed_at: "2026-09-17T18:00:00Z",
    };
    await client.query("SET LOCAL ROLE service_role");
    const weeklyFirst = await client.query(
      "SELECT run_id, reused FROM public.persist_ra_pro_weekly_completeness($1::jsonb, '[]'::jsonb)",
      [JSON.stringify(weekly)],
    );
    const weeklySecond = await client.query(
      "SELECT run_id, reused FROM public.persist_ra_pro_weekly_completeness($1::jsonb, '[]'::jsonb)",
      [JSON.stringify(weekly)],
    );
    const monthFirst = await client.query(
      "SELECT package_id, reused FROM public.persist_ra_pro_month_end_review_package($1::jsonb)",
      [JSON.stringify(month)],
    );
    const monthSecond = await client.query(
      "SELECT package_id, reused FROM public.persist_ra_pro_month_end_review_package($1::jsonb)",
      [JSON.stringify(month)],
    );
    const counts = await client.query(`
      SELECT
        (SELECT count(*)::int FROM public.ra_pro_weekly_completeness_runs) AS runs,
        (SELECT count(*)::int FROM public.ra_pro_month_end_review_packages) AS packages
    `);
    await client.query("RESET ROLE");
    result.weekly_run_count = counts.rows[0].runs;
    result.month_package_count = counts.rows[0].packages;
    result.ok =
      weeklyFirst.rows[0].reused === false &&
      weeklySecond.rows[0].reused === true &&
      weeklyFirst.rows[0].run_id === weeklySecond.rows[0].run_id &&
      monthFirst.rows[0].reused === false &&
      monthSecond.rows[0].reused === true &&
      monthFirst.rows[0].package_id === monthSecond.rows[0].package_id &&
      counts.rows[0].runs === 1 &&
      counts.rows[0].packages === 1;
    if (!result.ok) result.check_code = "IDEMPOTENT_REUSE_MISMATCH";
    await client.query("ROLLBACK TO SAVEPOINT probe_rpc");
    return result;
  } catch (err) {
    await client.query("ROLLBACK TO SAVEPOINT probe_rpc").catch(() => {});
    result.sqlstate = err && err.code ? String(err.code) : "UNKNOWN";
    result.check_code =
      result.sqlstate === "42501" ? "SERVICE_ROLE_RPC_PRIVILEGE_DENIED" : "SERVICE_ROLE_RPC_FAILED";
    result.ok = false;
    return result;
  }
}

async function verifyPostCommit(client, options = {}) {
  const env = options.env || process.env;
  const packed = options.packed || [];
  const failed = [];
  const view = {
    ok: false,
    history_count: null,
    version_counts: {},
    tables_present: false,
    functions_present: false,
    rls_enabled: false,
    policies_present: false,
    grants_match: false,
    service_role_execute_ok: false,
    browser_write_denied: false,
    service_role_rpc_ok: false,
    idempotent_reuse: false,
    service_role_rpc_sqlstate: null,
    idempotent_reuse_sqlstate: null,
    service_role_rpc_check_code: null,
    session_role_model: "set_role_not_jwt",
    sentinel_unchanged: false,
    sentinels: {},
    automation_enabled: env[FEATURE_FLAG_ENV] === "true",
    verification_rows_rolled_back: false,
    failed_checks: failed,
  };
  if (view.automation_enabled) failed.push("automation_enabled");

  await client.query("BEGIN");
  try {
    await client.query(`SET LOCAL statement_timeout = '${VERIFICATION_STATEMENT_TIMEOUT}'`);
    if (options.injectFailure === "verification_timeout") {
      await client.query("SET LOCAL statement_timeout = '1ms'");
      await client.query("SELECT pg_sleep(0.2)");
    }

    const history = await client.query(
      `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
    );
    view.history_count = history.rows[0].c;
    if (view.history_count !== POST_HISTORY_COUNT) failed.push("history_count");

    for (const item of packed) {
      const stored = await client.query(
        `SELECT statements FROM supabase_migrations.schema_migrations WHERE version = $1`,
        [item.migration.version],
      );
      view.version_counts[item.migration.version] = stored.rows.length;
      if (stored.rows.length !== 1) {
        failed.push(`version_once:${item.migration.version}`);
        continue;
      }
      const statements = stored.rows[0].statements || [];
      const digestOk =
        statements.length === 1 &&
        sha256Buffer(Buffer.from(statements[0], "utf8")) === item.loaded.sha256 &&
        Buffer.byteLength(statements[0], "utf8") === item.loaded.bytes;
      if (!digestOk) failed.push(`version_seal:${item.migration.version}`);
    }

    const tables = await client.query(
      `SELECT c.relname, c.relrowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY($1::text[])`,
      [TARGET_TABLES],
    );
    view.tables_present = tables.rows.length === TARGET_TABLES.length;
    view.rls_enabled =
      view.tables_present && tables.rows.every((row) => row.relrowsecurity === true);
    if (!view.tables_present) failed.push("tables_present");
    if (!view.rls_enabled) failed.push("rls_enabled");

    const functions = await client.query(`
      SELECT p.proname, p.prosecdef, array_to_string(p.proconfig, ',') AS config,
             to_regprocedure('public.persist_ra_pro_weekly_completeness(jsonb,jsonb)') IS NOT NULL AS weekly_sig,
             to_regprocedure('public.persist_ra_pro_month_end_review_package(jsonb)') IS NOT NULL AS month_sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN (
          'persist_ra_pro_weekly_completeness',
          'persist_ra_pro_month_end_review_package'
        )
    `);
    const weeklyFn = functions.rows.find((row) => row.proname === "persist_ra_pro_weekly_completeness");
    const monthFn = functions.rows.find((row) => row.proname === "persist_ra_pro_month_end_review_package");
    view.functions_present = Boolean(
      weeklyFn &&
        monthFn &&
        functions.rows[0].weekly_sig === true &&
        functions.rows[0].month_sig === true &&
        weeklyFn.prosecdef === false &&
        monthFn.prosecdef === false &&
        String(weeklyFn.config || "").includes("search_path") &&
        String(monthFn.config || "").includes("search_path"),
    );
    if (!view.functions_present) failed.push("functions_present");

    const policies = await client.query(
      `SELECT c.relname, pol.polname, pol.polcmd, r.rolname
       FROM pg_policy pol
       JOIN pg_class c ON c.oid = pol.polrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_roles r ON r.oid = ANY (pol.polroles)
       WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])`,
      [TARGET_TABLES],
    );
    const found = new Set(
      policies.rows.map((row) => `${row.relname}|${row.polname}|${row.polcmd}|${row.rolname}`),
    );
    view.policies_present =
      policies.rows.length === POST_COMMIT_POLICIES.length &&
      POST_COMMIT_POLICIES.every(([table, name, cmd, role]) =>
        found.has(`${table}|${name}|${cmd}|${role}`),
      );
    if (!view.policies_present) failed.push("policies_present");

    const grants = await client.query(`
      SELECT
        has_table_privilege('authenticated', 'public.ra_pro_weekly_completeness_runs', 'SELECT') AS auth_select,
        has_table_privilege('authenticated', 'public.ra_pro_weekly_completeness_runs', 'INSERT') AS auth_insert,
        has_table_privilege('authenticated', 'public.ra_pro_weekly_completeness_runs', 'UPDATE') AS auth_update,
        has_table_privilege('authenticated', 'public.ra_pro_weekly_completeness_runs', 'DELETE') AS auth_delete,
        has_table_privilege('anon', 'public.ra_pro_weekly_completeness_runs', 'SELECT') AS anon_select,
        has_table_privilege('service_role', 'public.ra_pro_weekly_completeness_runs', 'SELECT') AS svc_select,
        has_table_privilege('service_role', 'public.ra_pro_weekly_completeness_runs', 'INSERT') AS svc_insert,
        has_table_privilege('service_role', 'public.ra_pro_weekly_completeness_runs', 'UPDATE') AS svc_update,
        has_table_privilege('service_role', 'public.ra_pro_weekly_completeness_runs', 'DELETE') AS svc_delete,
        has_table_privilege('authenticated', 'public.ra_pro_weekly_completeness_findings', 'INSERT') AS findings_auth_insert,
        has_table_privilege('authenticated', 'public.ra_pro_month_end_review_packages', 'SELECT') AS month_auth_select,
        has_table_privilege('authenticated', 'public.ra_pro_month_end_review_packages', 'INSERT') AS month_auth_insert,
        has_table_privilege('service_role', 'public.ra_pro_month_end_review_packages', 'INSERT') AS month_svc_insert,
        has_function_privilege('service_role', 'public.persist_ra_pro_weekly_completeness(jsonb,jsonb)', 'EXECUTE') AS weekly_exec,
        has_function_privilege('authenticated', 'public.persist_ra_pro_weekly_completeness(jsonb,jsonb)', 'EXECUTE') AS weekly_auth_exec,
        has_function_privilege('anon', 'public.persist_ra_pro_weekly_completeness(jsonb,jsonb)', 'EXECUTE') AS weekly_anon_exec,
        has_function_privilege('service_role', 'public.persist_ra_pro_month_end_review_package(jsonb)', 'EXECUTE') AS month_exec,
        has_function_privilege('authenticated', 'public.persist_ra_pro_month_end_review_package(jsonb)', 'EXECUTE') AS month_auth_exec
    `);
    const grant = grants.rows[0];
    // Catalog table privileges only — EXECUTE is checked separately.
    view.grants_match = Boolean(
      grant.auth_select === true &&
        grant.auth_insert === false &&
        grant.auth_update === false &&
        grant.auth_delete === false &&
        grant.anon_select === false &&
        grant.svc_select === true &&
        grant.svc_insert === true &&
        grant.svc_update === false &&
        grant.svc_delete === false &&
        grant.findings_auth_insert === false &&
        grant.month_auth_select === true &&
        grant.month_auth_insert === false &&
        grant.month_svc_insert === true,
    );
    if (!view.grants_match) failed.push("grants_match");

    view.service_role_execute_ok = Boolean(
      grant.weekly_exec === true &&
        grant.weekly_auth_exec === false &&
        grant.weekly_anon_exec === false &&
        grant.month_exec === true &&
        grant.month_auth_exec === false,
    );
    if (!view.service_role_execute_ok) failed.push("service_role_execute");

    const deniedInsert = await expectPermissionDenied(
      client,
      "INSERT INTO public.ra_pro_weekly_completeness_runs DEFAULT VALUES",
    );
    const deniedDelete = await expectPermissionDenied(
      client,
      "DELETE FROM public.ra_pro_month_end_review_packages",
    );
    const deniedRpc = await expectPermissionDenied(
      client,
      "SELECT * FROM public.persist_ra_pro_weekly_completeness('{}'::jsonb, '[]'::jsonb)",
    );
    view.browser_write_denied = deniedInsert && deniedDelete && deniedRpc;
    if (!view.browser_write_denied) failed.push("browser_write_denied");

    const rpcProbe = await probeIdempotentPersistence(client);
    view.session_role_model = rpcProbe.session_role_model;
    view.service_role_rpc_sqlstate = rpcProbe.sqlstate;
    view.idempotent_reuse_sqlstate = rpcProbe.sqlstate;
    view.service_role_rpc_check_code = rpcProbe.check_code;
    view.idempotent_reuse = rpcProbe.ok === true;
    view.service_role_rpc_ok = rpcProbe.ok === true;
    if (!view.service_role_rpc_ok) failed.push("service_role_rpc");
    if (!view.idempotent_reuse) failed.push("idempotent_reuse");
    if (rpcProbe.sqlstate) failed.push(`rpc_sqlstate:${rpcProbe.sqlstate}`);
    if (rpcProbe.check_code) failed.push(`rpc_check:${rpcProbe.check_code}`);

    await client.query("ROLLBACK");
    const leftover = await client.query(`
      SELECT
        (SELECT count(*)::int FROM public.ra_pro_weekly_completeness_runs) AS runs,
        (SELECT count(*)::int FROM public.ra_pro_month_end_review_packages) AS packages
    `);
    view.verification_rows_rolled_back =
      leftover.rows[0].runs === 0 && leftover.rows[0].packages === 0;
    if (!view.verification_rows_rolled_back) failed.push("verification_rows_rolled_back");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (options.injectFailure === "verification_timeout" || err.code === "57014") {
      const timeout = probeError("VERIFICATION_TIMEOUT");
      timeout.verificationFailed = true;
      throw timeout;
    }
    const wrapped = probeError(err.code || "POST_COMMIT_VERIFICATION_FAILED");
    wrapped.verificationFailed = true;
    throw wrapped;
  }

  const after = await captureSentinelCounts(client);
  const sentinels = sentinelStatus(options.sentinelBefore || {}, after);
  view.sentinels = sentinels.status;
  view.sentinel_unchanged = sentinels.unchanged;
  if (!view.sentinel_unchanged) failed.push("sentinel_unchanged");

  view.ok = failed.length === 0;
  view.failed_checks = failed;
  return { ok: view.ok, failed, view };
}

module.exports = {
  TARGET_POLICIES,
  TARGET_TABLES,
  captureSentinelCounts,
  collectDryRunSchemaProbes,
  verifyPostCommit,
};
