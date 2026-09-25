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

const SVC_EFFECTIVE_PRIVILEGES = Object.freeze([
  ["SELECT", true],
  ["INSERT", true],
  ["UPDATE", false],
  ["DELETE", false],
  ["TRUNCATE", false],
  ["REFERENCES", false],
  ["TRIGGER", false],
]);

const AUTH_EFFECTIVE_PRIVILEGES = Object.freeze([
  ["SELECT", true],
  ["INSERT", false],
  ["UPDATE", false],
  ["DELETE", false],
  ["TRUNCATE", false],
  ["REFERENCES", false],
  ["TRIGGER", false],
]);

const ANON_EFFECTIVE_PRIVILEGES = Object.freeze([
  ["SELECT", false],
  ["INSERT", false],
  ["UPDATE", false],
  ["DELETE", false],
  ["TRUNCATE", false],
  ["REFERENCES", false],
  ["TRIGGER", false],
]);

const ALLOWED_DIRECT_ACL = Object.freeze({
  service_role: Object.freeze(new Set(["SELECT", "INSERT"])),
  authenticated: Object.freeze(new Set(["SELECT"])),
  anon: Object.freeze(new Set()),
});

function probeError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function sanitizeCheckToken(value) {
  const cleaned = String(value || "")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64);
  return cleaned || "unknown";
}

function pushDiffering(differing, entry) {
  differing.push({
    role: entry.role,
    object: entry.object,
    privilege: entry.privilege,
    expected: entry.expected,
    observed: entry.observed,
    source: entry.source || "effective",
    check_code: entry.check_code || null,
  });
}

async function getServerVersionNum(client) {
  const { rows } = await client.query(
    `SELECT current_setting('server_version_num')::int AS n`,
  );
  return rows[0].n;
}

/**
 * Effective privilege matrix via has_table_privilege (includes inherited grants).
 * MAINTAIN is only queried when server_version_num >= 170000.
 */
async function tablePrivilegeMatrix(client) {
  const versionNum = await getServerVersionNum(client);
  const maintainSupported = versionNum >= 170000;
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
         has_table_privilege('service_role', $1, 'REFERENCES') AS svc_references,
         has_table_privilege('service_role', $1, 'TRIGGER') AS svc_trigger,
         has_table_privilege('authenticated', $1, 'SELECT') AS auth_select,
         has_table_privilege('authenticated', $1, 'INSERT') AS auth_insert,
         has_table_privilege('authenticated', $1, 'UPDATE') AS auth_update,
         has_table_privilege('authenticated', $1, 'DELETE') AS auth_delete,
         has_table_privilege('authenticated', $1, 'TRUNCATE') AS auth_truncate,
         has_table_privilege('authenticated', $1, 'REFERENCES') AS auth_references,
         has_table_privilege('authenticated', $1, 'TRIGGER') AS auth_trigger,
         has_table_privilege('anon', $1, 'SELECT') AS anon_select,
         has_table_privilege('anon', $1, 'INSERT') AS anon_insert,
         has_table_privilege('anon', $1, 'UPDATE') AS anon_update,
         has_table_privilege('anon', $1, 'DELETE') AS anon_delete,
         has_table_privilege('anon', $1, 'TRUNCATE') AS anon_truncate,
         has_table_privilege('anon', $1, 'REFERENCES') AS anon_references,
         has_table_privilege('anon', $1, 'TRIGGER') AS anon_trigger`,
      [fq],
    );
    let svcMaintain = null;
    let authMaintain = null;
    let anonMaintain = null;
    let maintainStatus = "not_supported";
    if (maintainSupported) {
      const m = await client.query(
        `SELECT
           has_table_privilege('service_role', $1, 'MAINTAIN') AS svc_maintain,
           has_table_privilege('authenticated', $1, 'MAINTAIN') AS auth_maintain,
           has_table_privilege('anon', $1, 'MAINTAIN') AS anon_maintain`,
        [fq],
      );
      svcMaintain = m.rows[0].svc_maintain === true;
      authMaintain = m.rows[0].auth_maintain === true;
      anonMaintain = m.rows[0].anon_maintain === true;
      maintainStatus = "checked";
    }
    rows.push({
      table,
      maintain_status: maintainStatus,
      server_version_num: versionNum,
      ...r[0],
      svc_maintain: svcMaintain,
      auth_maintain: authMaintain,
      anon_maintain: anonMaintain,
    });
  }
  return { rows, maintainSupported, versionNum };
}

/**
 * Direct ACL via aclexplode(pg_class.relacl). Owner (postgres) full rights are
 * permitted; PUBLIC and unexpected grantees are not.
 */
async function catalogAclRows(client) {
  const { rows } = await client.query(
    `SELECT
       c.relname AS table_name,
       n.nspname AS schema_name,
       pg_get_userbyid(c.relowner) AS owner_name,
       CASE
         WHEN a.grantee = 0 THEN 'PUBLIC'
         ELSE COALESCE(r.rolname, a.grantee::text)
       END AS grantee,
       a.privilege_type,
       a.grantee AS grantee_oid
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     LEFT JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a ON true
     LEFT JOIN pg_roles r ON r.oid = a.grantee
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relname = ANY($1::text[])
     ORDER BY c.relname, grantee, a.privilege_type`,
    [CORRECTIVE_TABLES],
  );
  return rows;
}

async function recursiveGrantedRoles(client, roleName) {
  const { rows } = await client.query(
    `WITH RECURSIVE granted AS (
       SELECT r.oid AS member_oid, g.oid AS role_oid, g.rolname
       FROM pg_roles r
       JOIN pg_auth_members m ON m.member = r.oid
       JOIN pg_roles g ON g.oid = m.roleid
       WHERE r.rolname = $1
       UNION
       SELECT granted.member_oid, g.oid, g.rolname
       FROM granted
       JOIN pg_auth_members m ON m.member = granted.role_oid
       JOIN pg_roles g ON g.oid = m.roleid
     )
     SELECT DISTINCT rolname FROM granted ORDER BY rolname`,
    [roleName],
  );
  return rows.map((row) => row.rolname);
}

/**
 * Full privilege verification: catalog ACL + effective has_table_privilege +
 * inherited-role excess reporting. EXECUTE is collected separately.
 */
async function verifyServiceRoleCatalogGrants(client) {
  const differing = [];
  const checkCodes = [];
  const { rows: matrix, maintainSupported, versionNum } = await tablePrivilegeMatrix(client);

  for (const row of matrix) {
    const object = `public.${row.table}`;
    const roleSpecs = [
      ["service_role", SVC_EFFECTIVE_PRIVILEGES, {
        SELECT: row.svc_select,
        INSERT: row.svc_insert,
        UPDATE: row.svc_update,
        DELETE: row.svc_delete,
        TRUNCATE: row.svc_truncate,
        REFERENCES: row.svc_references,
        TRIGGER: row.svc_trigger,
        MAINTAIN: row.svc_maintain,
      }],
      ["authenticated", AUTH_EFFECTIVE_PRIVILEGES, {
        SELECT: row.auth_select,
        INSERT: row.auth_insert,
        UPDATE: row.auth_update,
        DELETE: row.auth_delete,
        TRUNCATE: row.auth_truncate,
        REFERENCES: row.auth_references,
        TRIGGER: row.auth_trigger,
        MAINTAIN: row.auth_maintain,
      }],
      ["anon", ANON_EFFECTIVE_PRIVILEGES, {
        SELECT: row.anon_select,
        INSERT: row.anon_insert,
        UPDATE: row.anon_update,
        DELETE: row.anon_delete,
        TRUNCATE: row.anon_truncate,
        REFERENCES: row.anon_references,
        TRIGGER: row.anon_trigger,
        MAINTAIN: row.anon_maintain,
      }],
    ];
    for (const [role, specs, observedMap] of roleSpecs) {
      for (const [privilege, expected] of specs) {
        const observed = Boolean(observedMap[privilege]);
        if (observed !== expected) {
          const code = `effective:${sanitizeCheckToken(role)}:${sanitizeCheckToken(privilege)}`;
          checkCodes.push(code);
          pushDiffering(differing, {
            role,
            object,
            privilege,
            expected,
            observed,
            source: "effective",
            check_code: code,
          });
        }
      }
      if (maintainSupported) {
        const expectedMaintain = false;
        const observedMaintain = Boolean(observedMap.MAINTAIN);
        if (observedMaintain !== expectedMaintain) {
          const code = `effective:${sanitizeCheckToken(role)}:MAINTAIN`;
          checkCodes.push(code);
          pushDiffering(differing, {
            role,
            object,
            privilege: "MAINTAIN",
            expected: expectedMaintain,
            observed: observedMaintain,
            source: "effective",
            check_code: code,
          });
        }
      }
    }
  }

  if (!maintainSupported) {
    checkCodes.push("maintain:not_supported");
  }

  const aclRows = await catalogAclRows(client);
  const byTable = new Map();
  for (const table of CORRECTIVE_TABLES) byTable.set(table, []);
  for (const row of aclRows) {
    if (!byTable.has(row.table_name)) continue;
    byTable.get(row.table_name).push(row);
  }

  for (const table of CORRECTIVE_TABLES) {
    const object = `public.${table}`;
    const entries = byTable.get(table) || [];
    const owners = new Set(entries.map((e) => e.owner_name).filter(Boolean));
    const ownerName = owners.values().next().value || "postgres";
    const privByGrantee = new Map();
    for (const entry of entries) {
      if (!entry.grantee || !entry.privilege_type) continue;
      if (!privByGrantee.has(entry.grantee)) privByGrantee.set(entry.grantee, new Set());
      privByGrantee.get(entry.grantee).add(entry.privilege_type);
    }

    for (const [grantee, privs] of privByGrantee.entries()) {
      if (grantee === ownerName) continue; // owner ACL permissible
      if (grantee === "PUBLIC") {
        for (const privilege of privs) {
          const code = `catalog:PUBLIC:${sanitizeCheckToken(privilege)}`;
          checkCodes.push(code);
          pushDiffering(differing, {
            role: "PUBLIC",
            object,
            privilege,
            expected: false,
            observed: true,
            source: "catalog",
            check_code: code,
          });
        }
        continue;
      }
      const allowed = ALLOWED_DIRECT_ACL[grantee];
      if (!allowed) {
        for (const privilege of privs) {
          const code = `catalog:unexpected_grantee:${sanitizeCheckToken(grantee)}:${sanitizeCheckToken(privilege)}`;
          checkCodes.push(code);
          pushDiffering(differing, {
            role: grantee,
            object,
            privilege,
            expected: false,
            observed: true,
            source: "catalog",
            check_code: code,
          });
        }
        continue;
      }
      for (const privilege of privs) {
        if (!allowed.has(privilege)) {
          const code = `catalog:${sanitizeCheckToken(grantee)}:${sanitizeCheckToken(privilege)}`;
          checkCodes.push(code);
          pushDiffering(differing, {
            role: grantee,
            object,
            privilege,
            expected: false,
            observed: true,
            source: "catalog",
            check_code: code,
          });
        }
      }
      for (const privilege of allowed) {
        if (!privs.has(privilege)) {
          const code = `catalog_missing:${sanitizeCheckToken(grantee)}:${sanitizeCheckToken(privilege)}`;
          checkCodes.push(code);
          pushDiffering(differing, {
            role: grantee,
            object,
            privilege,
            expected: true,
            observed: false,
            source: "catalog",
            check_code: code,
          });
        }
      }
    }

    for (const [role, allowed] of Object.entries(ALLOWED_DIRECT_ACL)) {
      const privs = privByGrantee.get(role) || new Set();
      for (const privilege of allowed) {
        if (!privs.has(privilege)) {
          // already recorded above if we iterated; ensure presence when grantee absent entirely
          if (!privByGrantee.has(role)) {
            const code = `catalog_missing:${sanitizeCheckToken(role)}:${sanitizeCheckToken(privilege)}`;
            checkCodes.push(code);
            pushDiffering(differing, {
              role,
              object,
              privilege,
              expected: true,
              observed: false,
              source: "catalog",
              check_code: code,
            });
          }
        }
      }
    }
  }

  // Inherited-role excess: roles granted TO service_role/authenticated/anon that hold table privs.
  const subjectRoles = ["service_role", "authenticated", "anon"];
  const excessPrivs = ["UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"];
  if (maintainSupported) excessPrivs.push("MAINTAIN");
  for (const subject of subjectRoles) {
    const granted = await recursiveGrantedRoles(client, subject);
    for (const ancestor of granted) {
      if (subjectRoles.includes(ancestor) || ancestor === "postgres") continue;
      for (const table of CORRECTIVE_TABLES) {
        const fq = `public.${table}`;
        for (const privilege of excessPrivs) {
          const { rows } = await client.query(
            `SELECT has_table_privilege($1, $2, $3) AS ok`,
            [ancestor, fq, privilege],
          );
          if (rows[0].ok === true) {
            // Only fail when the subject also effectively holds it (inheritance path).
            const { rows: sub } = await client.query(
              `SELECT has_table_privilege($1, $2, $3) AS ok`,
              [subject, fq, privilege],
            );
            if (sub[0].ok === true) {
              const allowed =
                (subject === "service_role" && (privilege === "SELECT" || privilege === "INSERT")) ||
                (subject === "authenticated" && privilege === "SELECT");
              if (!allowed) {
                const code = `inherited:${sanitizeCheckToken(subject)}<=${sanitizeCheckToken(ancestor)}:${sanitizeCheckToken(privilege)}`;
                checkCodes.push(code);
                pushDiffering(differing, {
                  role: subject,
                  object: fq,
                  privilege,
                  expected: false,
                  observed: true,
                  source: "inherited",
                  check_code: code,
                });
              }
            }
          }
        }
      }
    }
  }

  const execDiffering = [];
  const execExpect = [
    ["service_role", TARGET_FUNCTIONS[0], true],
    ["authenticated", TARGET_FUNCTIONS[0], false],
    ["anon", TARGET_FUNCTIONS[0], false],
    ["PUBLIC", TARGET_FUNCTIONS[0], false],
    ["service_role", TARGET_FUNCTIONS[1], true],
    ["authenticated", TARGET_FUNCTIONS[1], false],
    ["anon", TARGET_FUNCTIONS[1], false],
    ["PUBLIC", TARGET_FUNCTIONS[1], false],
  ];
  for (const [role, object, expected] of execExpect) {
    const { rows } = await client.query(
      role === "PUBLIC"
        ? `SELECT has_function_privilege(0, $1::regprocedure, 'EXECUTE') AS ok`
        : `SELECT has_function_privilege($1, $2::regprocedure, 'EXECUTE') AS ok`,
      role === "PUBLIC" ? [object] : [role, object],
    );
    const observed = rows[0].ok === true;
    if (observed !== expected) {
      execDiffering.push({
        role,
        object,
        privilege: "EXECUTE",
        expected,
        observed,
        source: "execute",
        check_code: `execute:${role}`,
      });
    }
  }

  const tableDiffering = differing.filter((d) => d.privilege !== "EXECUTE");
  return {
    ok: tableDiffering.length === 0 && execDiffering.length === 0,
    differing_privileges: [...tableDiffering, ...execDiffering],
    grants_match: tableDiffering.length === 0,
    catalog_execute_ok: execDiffering.length === 0,
    check_codes: [...new Set(checkCodes)],
    maintain_supported: maintainSupported,
    server_version_num: versionNum,
    matrix,
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
    excessServiceRoleDml = grantMatrix.rows.some(
      (row) =>
        row.svc_update === true ||
        row.svc_delete === true ||
        row.svc_truncate === true ||
        row.svc_references === true ||
        row.svc_trigger === true ||
        row.svc_maintain === true,
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
    view.grant_check_codes = grants.check_codes || [];
    view.maintain_supported = grants.maintain_supported === true;
    view.server_version_num = grants.server_version_num || null;
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
  tablePrivilegeMatrix,
  verifyCatalogExecutePrivileges,
  verifyPostCorrective,
  verifyServiceRoleCatalogGrants,
};
