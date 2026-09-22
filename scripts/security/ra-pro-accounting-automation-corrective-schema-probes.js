/**
 * Catalog probes and post-corrective verification for the sealed
 * accounting-automation CORRECTIVE applicator. Evidence is booleans, counts,
 * and codes — never SQL text, credentials, or row payloads.
 */
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const {
  MIGRATIONS,
  ORIGINAL_COMMITTED_MIGRATIONS,
  POST_HISTORY_COUNT,
  PRIOR_HISTORY_COUNT,
  FEATURE_FLAG_ENV,
  CORRECTIVE_TABLES,
} = require("./ra-pro-accounting-automation-corrective-apply-constants");
const { sha256Buffer } = require("./git-blob-authority");

const TARGET_FUNCTIONS = Object.freeze([
  "public.persist_ra_pro_weekly_completeness(jsonb,jsonb)",
  "public.persist_ra_pro_month_end_review_package(jsonb)",
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

async function tablePrivilegeMatrix(client) {
  const rows = [];
  for (const table of CORRECTIVE_TABLES) {
    const fq = `public.${table}`;
    const { rows: r } = await client.query(
      `SELECT
         has_table_privilege('service_role', $1, 'SELECT') AS svc_select,
         has_table_privilege('service_role', $1, 'INSERT') AS svc_insert,
         has_table_privilege('service_role', $1, 'UPDATE') AS svc_update,
         has_table_privilege('service_role', $1, 'DELETE') AS svc_delete,
         has_table_privilege('service_role', $1, 'TRUNCATE') AS svc_truncate,
         has_table_privilege('authenticated', $1, 'SELECT') AS auth_select,
         has_table_privilege('authenticated', $1, 'INSERT') AS auth_insert,
         has_table_privilege('authenticated', $1, 'UPDATE') AS auth_update,
         has_table_privilege('authenticated', $1, 'DELETE') AS auth_delete,
         has_table_privilege('anon', $1, 'SELECT') AS anon_select,
         has_table_privilege('anon', $1, 'INSERT') AS anon_insert,
         has_table_privilege('anon', $1, 'UPDATE') AS anon_update,
         has_table_privilege('anon', $1, 'DELETE') AS anon_delete`,
      [fq],
    );
    rows.push({ table, ...r[0] });
  }
  return rows;
}

/**
 * Detailed catalog grant check. Returns differing privileges array
 * (role, object, privilege, expected, observed) — not just a boolean.
 */
async function verifyServiceRoleCatalogGrants(client) {
  const differing = [];
  const matrix = await tablePrivilegeMatrix(client);
  for (const row of matrix) {
    const object = `public.${row.table}`;
    const expect = [
      ["service_role", "SELECT", true, row.svc_select],
      ["service_role", "INSERT", true, row.svc_insert],
      ["service_role", "UPDATE", false, row.svc_update],
      ["service_role", "DELETE", false, row.svc_delete],
      ["service_role", "TRUNCATE", false, row.svc_truncate],
      ["authenticated", "SELECT", true, row.auth_select],
      ["authenticated", "INSERT", false, row.auth_insert],
      ["authenticated", "UPDATE", false, row.auth_update],
      ["authenticated", "DELETE", false, row.auth_delete],
      ["anon", "SELECT", false, row.anon_select],
      ["anon", "INSERT", false, row.anon_insert],
      ["anon", "UPDATE", false, row.anon_update],
      ["anon", "DELETE", false, row.anon_delete],
    ];
    for (const [role, privilege, expected, observed] of expect) {
      if (Boolean(observed) !== expected) {
        differing.push({ role, object, privilege, expected, observed: Boolean(observed) });
      }
    }
  }

  const execExpect = [
    ["service_role", TARGET_FUNCTIONS[0], true],
    ["authenticated", TARGET_FUNCTIONS[0], false],
    ["anon", TARGET_FUNCTIONS[0], false],
    ["service_role", TARGET_FUNCTIONS[1], true],
    ["authenticated", TARGET_FUNCTIONS[1], false],
    ["anon", TARGET_FUNCTIONS[1], false],
  ];
  for (const [role, object, expected] of execExpect) {
    const { rows } = await client.query(
      `SELECT has_function_privilege($1, $2::regprocedure, 'EXECUTE') AS ok`,
      [role, object],
    );
    const observed = rows[0].ok === true;
    if (observed !== expected) {
      differing.push({ role, object, privilege: "EXECUTE", expected, observed });
    }
  }

  return {
    ok: differing.length === 0,
    differing_privileges: differing,
    grants_match: differing.filter((d) => d.privilege !== "EXECUTE").length === 0,
    catalog_execute_ok: differing.filter((d) => d.privilege === "EXECUTE").length === 0,
  };
}

async function verifyCatalogExecutePrivileges(client) {
  const grants = await verifyServiceRoleCatalogGrants(client);
  return {
    ok: grants.catalog_execute_ok,
    differing_privileges: grants.differing_privileges.filter((d) => d.privilege === "EXECUTE"),
  };
}

async function collectCorrectiveDryRunProbes(client, options = {}) {
  const env = options.env || process.env;
  const history = await client.query(
    `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
  );
  const historyCount = history.rows[0].c;

  const originalVersions = ORIGINAL_COMMITTED_MIGRATIONS.map((m) => m.version);
  const versionRows = await client.query(
    `SELECT version, count(*)::int AS c, statements
     FROM supabase_migrations.schema_migrations
     WHERE version = ANY($1::text[])
     GROUP BY version, statements`,
    [[...originalVersions, MIGRATIONS[0].version]],
  );

  const versionCounts = {};
  const digestMatch = {};
  for (const migration of ORIGINAL_COMMITTED_MIGRATIONS) {
    versionCounts[migration.version] = 0;
    digestMatch[migration.version] = false;
  }
  versionCounts[MIGRATIONS[0].version] = 0;

  for (const row of versionRows.rows) {
    versionCounts[row.version] = (versionCounts[row.version] || 0) + row.c;
    const original = ORIGINAL_COMMITTED_MIGRATIONS.find((m) => m.version === row.version);
    if (original) {
      const statements = row.statements || [];
      digestMatch[row.version] =
        statements.length === 1 &&
        sha256Buffer(Buffer.from(statements[0], "utf8")) === original.sha256 &&
        Buffer.byteLength(statements[0], "utf8") === original.bytes;
    }
  }

  const tables = await client.query(
    `SELECT c.relname, c.relrowsecurity, pg_get_userbyid(c.relowner) AS owner_name
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY($1::text[])`,
    [CORRECTIVE_TABLES],
  );
  const tableOk =
    tables.rows.length === CORRECTIVE_TABLES.length &&
    tables.rows.every((r) => r.relrowsecurity === true && r.owner_name === "postgres");

  const policies = await client.query(
    `SELECT count(*)::int AS c FROM pg_policy pol WHERE pol.polname = ANY($1::text[])`,
    [TARGET_POLICIES],
  );

  const weeklyFn = await client.query(`SELECT to_regprocedure($1) IS NOT NULL AS ok`, [
    TARGET_FUNCTIONS[0],
  ]);
  const monthFn = await client.query(`SELECT to_regprocedure($1) IS NOT NULL AS ok`, [
    TARGET_FUNCTIONS[1],
  ]);

  let excessServiceRoleDml = false;
  if (tableOk) {
    const grantMatrix = await tablePrivilegeMatrix(client);
    excessServiceRoleDml = grantMatrix.some(
      (row) => row.svc_update === true || row.svc_delete === true || row.svc_truncate === true,
    );
  }

  const originalsOnce =
    ORIGINAL_COMMITTED_MIGRATIONS.every((m) => versionCounts[m.version] === 1) &&
    ORIGINAL_COMMITTED_MIGRATIONS.every((m) => digestMatch[m.version] === true);
  const correctiveAbsent = versionCounts[MIGRATIONS[0].version] === 0;

  const checks = {
    history_count: historyCount === PRIOR_HISTORY_COUNT,
    originals_present_once: originalsOnce,
    corrective_absent: correctiveAbsent,
    tables_rls_postgres: tableOk,
    policies_present: policies.rows[0].c === TARGET_POLICIES.length,
    functions_present: weeklyFn.rows[0].ok === true && monthFn.rows[0].ok === true,
  };
  const failed = Object.entries(checks)
    .filter(([, ok]) => ok !== true)
    .map(([name]) => name);

  return {
    ok: failed.length === 0,
    failed,
    view: {
      read_only: true,
      history_count: historyCount,
      history_contract: { prior: PRIOR_HISTORY_COUNT, post: POST_HISTORY_COUNT },
      originals_present_once: originalsOnce,
      corrective_absent: correctiveAbsent,
      tables_rls_postgres: tableOk,
      policies_present: checks.policies_present,
      functions_present: checks.functions_present,
      excess_service_role_dml: excessServiceRoleDml,
      automation_enabled: env[FEATURE_FLAG_ENV] === "true",
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

async function captureCorrectiveRowCounts(client) {
  const counts = {};
  for (const table of CORRECTIVE_TABLES) {
    const { rows } = await client.query(`SELECT count(*)::int AS c FROM public.${table}`);
    counts[table] = rows[0].c;
  }
  return counts;
}

/**
 * Fixture-based persistence probe. NO DISABLE TRIGGER ALL.
 * Inserts FK parents as postgres, then SET LOCAL ROLE service_role.
 */
async function probeIdempotentPersistenceWithFixtures(client) {
  const result = {
    ok: false,
    session_role_model: "set_role_not_jwt",
    service_role_rpc_sqlstate: null,
    idempotent_reuse_sqlstate: null,
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
    await client.query("INSERT INTO public.accounting_connections(id) VALUES ($1)", [connectionId]);
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
      idempotency_key: "c".repeat(64),
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
      idempotency_key: "d".repeat(64),
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
    const sqlstate = err && err.code ? String(err.code) : "UNKNOWN";
    result.service_role_rpc_sqlstate = sqlstate;
    result.idempotent_reuse_sqlstate = sqlstate;
    result.check_code =
      sqlstate === "42501" ? "SERVICE_ROLE_RPC_PRIVILEGE_DENIED" : "SERVICE_ROLE_RPC_FAILED";
    result.ok = false;
    return result;
  }
}

async function verifyPostCorrective(client, options = {}) {
  const env = options.env || process.env;
  const packed = options.packed || [];
  const rowCountsBefore = options.rowCountsBefore || {};
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
    service_role_rpc_ok: false,
    idempotent_reuse: false,
    service_role_rpc_sqlstate: null,
    idempotent_reuse_sqlstate: null,
    session_role_model: "set_role_not_jwt",
    differing_privileges: [],
    sentinel_unchanged: false,
    sentinels: {},
    row_counts_unchanged: false,
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
      [CORRECTIVE_TABLES],
    );
    view.tables_present = tables.rows.length === CORRECTIVE_TABLES.length;
    view.rls_enabled =
      view.tables_present && tables.rows.every((row) => row.relrowsecurity === true);
    if (!view.tables_present) failed.push("tables_present");
    if (!view.rls_enabled) failed.push("rls_enabled");

    const functions = await client.query(`
      SELECT
        to_regprocedure('public.persist_ra_pro_weekly_completeness(jsonb,jsonb)') IS NOT NULL AS weekly_sig,
        to_regprocedure('public.persist_ra_pro_month_end_review_package(jsonb)') IS NOT NULL AS month_sig
    `);
    view.functions_present =
      functions.rows[0].weekly_sig === true && functions.rows[0].month_sig === true;
    if (!view.functions_present) failed.push("functions_present");

    const policies = await client.query(
      `SELECT c.relname, pol.polname, pol.polcmd, r.rolname
       FROM pg_policy pol
       JOIN pg_class c ON c.oid = pol.polrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_roles r ON r.oid = ANY (pol.polroles)
       WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])`,
      [CORRECTIVE_TABLES],
    );
    const found = new Set(
      policies.rows.map((row) => `${row.relname}|${row.polname}|${row.polcmd}|${row.rolname}`),
    );
    view.policies_present =
      policies.rows.length >= POST_COMMIT_POLICIES.length &&
      POST_COMMIT_POLICIES.every(([table, name, cmd, role]) =>
        found.has(`${table}|${name}|${cmd}|${role}`),
      );
    if (!view.policies_present) failed.push("policies_present");

    const grants = await verifyServiceRoleCatalogGrants(client);
    view.differing_privileges = grants.differing_privileges;
    view.grants_match = grants.grants_match;
    view.service_role_execute_ok = grants.catalog_execute_ok;
    if (!view.grants_match) failed.push("grants_match");
    if (!view.service_role_execute_ok) failed.push("service_role_execute");

    const rpcProbe = await probeIdempotentPersistenceWithFixtures(client);
    view.session_role_model = rpcProbe.session_role_model;
    view.service_role_rpc_sqlstate = rpcProbe.service_role_rpc_sqlstate;
    view.idempotent_reuse_sqlstate = rpcProbe.idempotent_reuse_sqlstate;
    view.idempotent_reuse = rpcProbe.ok === true;
    view.service_role_rpc_ok = rpcProbe.ok === true;
    if (!view.service_role_rpc_ok) failed.push("service_role_rpc");
    if (!view.idempotent_reuse) failed.push("idempotent_reuse");

    await client.query("ROLLBACK");
    view.verification_rows_rolled_back = true;
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

  const rowCountsAfter = await captureCorrectiveRowCounts(client);
  view.row_counts_unchanged = CORRECTIVE_TABLES.every(
    (table) => (rowCountsBefore[table] ?? 0) === (rowCountsAfter[table] ?? 0),
  );
  if (!view.row_counts_unchanged) failed.push("row_counts_unchanged");

  view.ok = failed.length === 0;
  view.failed_checks = failed;
  return { ok: view.ok, failed, view };
}

module.exports = {
  CORRECTIVE_TABLES,
  TARGET_POLICIES,
  captureCorrectiveRowCounts,
  captureSentinelCounts,
  collectCorrectiveDryRunProbes,
  probeIdempotentPersistenceWithFixtures,
  verifyCatalogExecutePrivileges,
  verifyPostCorrective,
  verifyServiceRoleCatalogGrants,
};
