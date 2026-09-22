"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Sealed pre-correction privilege/object schema for corrective evidence gates.
 * Contracts describe excess grants present before corrective apply; post-commit
 * verification (schema-probes) requires their absence. No production contact.
 */

const {
  ORIGINAL_COMMITTED_MIGRATIONS,
  CORRECTIVE_TABLES,
  CONSUMED_ORIGINAL_ATTEMPT_ID,
  PRIOR_HISTORY_COUNT,
  EXPECTED_PROJECT_REF,
  MIGRATIONS,
} = require("./ra-pro-accounting-automation-corrective-apply-constants");

const BASE_TABLE_PRIVS = Object.freeze([
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "TRUNCATE",
  "REFERENCES",
  "TRIGGER",
]);

const EXCESS_PRIVS = Object.freeze([
  "UPDATE",
  "DELETE",
  "TRUNCATE",
  "REFERENCES",
  "TRIGGER",
]);

const SUBJECT_ROLES = Object.freeze(["service_role", "authenticated", "anon"]);
const CATALOG_ROLES = Object.freeze(["service_role", "authenticated", "anon", "PUBLIC"]);

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

const SENTINEL_RELATIONS = Object.freeze([
  "invoices",
  "bills",
  "payments",
  "journal_entries",
  "provider_write_attempts",
]);

const WEBHOOK_STATUSES = Object.freeze(["received", "processing", "retryable"]);

const TABLE_COLUMNS = Object.freeze({
  ra_pro_weekly_completeness_runs: Object.freeze([
    Object.freeze({ name: "id", type: "uuid", nullable: false }),
    Object.freeze({ name: "firm_id", type: "uuid", nullable: false }),
    Object.freeze({ name: "firm_client_id", type: "uuid", nullable: false }),
    Object.freeze({ name: "company_id", type: "uuid", nullable: false }),
    Object.freeze({ name: "accounting_sync_id", type: "uuid", nullable: false }),
    Object.freeze({ name: "provider", type: "text", nullable: false }),
    Object.freeze({ name: "week_ending", type: "date", nullable: false }),
    Object.freeze({ name: "status", type: "text", nullable: false }),
    Object.freeze({ name: "finding_count", type: "int4", nullable: false }),
    Object.freeze({ name: "summary", type: "jsonb", nullable: false }),
    Object.freeze({ name: "idempotency_key", type: "text", nullable: false }),
    Object.freeze({ name: "completed_at", type: "timestamptz", nullable: false }),
    Object.freeze({ name: "created_at", type: "timestamptz", nullable: false }),
  ]),
  ra_pro_weekly_completeness_findings: Object.freeze([
    Object.freeze({ name: "id", type: "uuid", nullable: false }),
    Object.freeze({ name: "run_id", type: "uuid", nullable: false }),
    Object.freeze({ name: "category", type: "text", nullable: false }),
    Object.freeze({ name: "code", type: "text", nullable: false }),
    Object.freeze({ name: "severity", type: "text", nullable: false }),
    Object.freeze({ name: "item_count", type: "int4", nullable: false }),
    Object.freeze({ name: "amount_cents", type: "int8", nullable: true }),
    Object.freeze({ name: "evidence", type: "jsonb", nullable: false }),
    Object.freeze({ name: "created_at", type: "timestamptz", nullable: false }),
  ]),
  ra_pro_month_end_review_packages: Object.freeze([
    Object.freeze({ name: "id", type: "uuid", nullable: false }),
    Object.freeze({ name: "firm_id", type: "uuid", nullable: false }),
    Object.freeze({ name: "firm_client_id", type: "uuid", nullable: false }),
    Object.freeze({ name: "company_id", type: "uuid", nullable: false }),
    Object.freeze({ name: "accounting_sync_id", type: "uuid", nullable: false }),
    Object.freeze({ name: "provider", type: "text", nullable: false }),
    Object.freeze({ name: "period_end", type: "date", nullable: false }),
    Object.freeze({ name: "status", type: "text", nullable: false }),
    Object.freeze({ name: "review_package", type: "jsonb", nullable: false }),
    Object.freeze({ name: "idempotency_key", type: "text", nullable: false }),
    Object.freeze({ name: "completed_at", type: "timestamptz", nullable: false }),
    Object.freeze({ name: "created_at", type: "timestamptz", nullable: false }),
  ]),
});

const TABLE_INDEXES = Object.freeze({
  ra_pro_weekly_completeness_runs: Object.freeze([
    Object.freeze({ name: "ra_pro_weekly_runs_firm_period_idx", unique: false, columns: Object.freeze(["firm_id", "week_ending"]) }),
    Object.freeze({ name: "ra_pro_weekly_runs_client_period_idx", unique: false, columns: Object.freeze(["firm_client_id", "week_ending"]) }),
  ]),
  ra_pro_weekly_completeness_findings: Object.freeze([
    Object.freeze({ name: "ra_pro_weekly_findings_run_idx", unique: false, columns: Object.freeze(["run_id", "severity", "category"]) }),
  ]),
  ra_pro_month_end_review_packages: Object.freeze([
    Object.freeze({ name: "ra_pro_month_end_firm_period_idx", unique: false, columns: Object.freeze(["firm_id", "period_end"]) }),
    Object.freeze({ name: "ra_pro_month_end_client_period_idx", unique: false, columns: Object.freeze(["firm_client_id", "period_end"]) }),
  ]),
});

const TABLE_CONSTRAINTS = Object.freeze({
  ra_pro_weekly_completeness_runs: Object.freeze([
    Object.freeze({ name: "ra_pro_weekly_completeness_runs_pkey", kind: "primary_key" }),
    Object.freeze({ name: "ra_pro_weekly_completeness_runs_idempotency_key_key", kind: "unique" }),
    Object.freeze({ name: "ra_pro_weekly_completeness_runs_firm_client_id_week_ending_accounting_sync_id_key", kind: "unique" }),
    Object.freeze({ name: "ra_pro_weekly_completeness_runs_firm_id_fkey", kind: "foreign_key" }),
    Object.freeze({ name: "ra_pro_weekly_completeness_runs_firm_client_id_fkey", kind: "foreign_key" }),
    Object.freeze({ name: "ra_pro_weekly_completeness_runs_company_id_fkey", kind: "foreign_key" }),
    Object.freeze({ name: "ra_pro_weekly_completeness_runs_accounting_sync_id_fkey", kind: "foreign_key" }),
    Object.freeze({ name: "check_provider", kind: "check", token: "provider" }),
    Object.freeze({ name: "check_status", kind: "check", token: "status" }),
    Object.freeze({ name: "check_finding_count", kind: "check", token: "finding_count" }),
    Object.freeze({ name: "check_idempotency_key", kind: "check", token: "idempotency_key" }),
  ]),
  ra_pro_weekly_completeness_findings: Object.freeze([
    Object.freeze({ name: "ra_pro_weekly_completeness_findings_pkey", kind: "primary_key" }),
    Object.freeze({ name: "ra_pro_weekly_completeness_findings_run_id_code_key", kind: "unique" }),
    Object.freeze({ name: "ra_pro_weekly_completeness_findings_run_id_fkey", kind: "foreign_key" }),
    Object.freeze({ name: "check_category", kind: "check", token: "category" }),
    Object.freeze({ name: "check_code", kind: "check", token: "code" }),
    Object.freeze({ name: "check_severity", kind: "check", token: "severity" }),
    Object.freeze({ name: "check_item_count", kind: "check", token: "item_count" }),
  ]),
  ra_pro_month_end_review_packages: Object.freeze([
    Object.freeze({ name: "ra_pro_month_end_review_packages_pkey", kind: "primary_key" }),
    Object.freeze({ name: "ra_pro_month_end_review_packages_idempotency_key_key", kind: "unique" }),
    Object.freeze({ name: "ra_pro_month_end_review_packages_firm_client_id_period_end_accounting_sync_id_key", kind: "unique" }),
    Object.freeze({ name: "ra_pro_month_end_review_packages_firm_id_fkey", kind: "foreign_key" }),
    Object.freeze({ name: "ra_pro_month_end_review_packages_firm_client_id_fkey", kind: "foreign_key" }),
    Object.freeze({ name: "ra_pro_month_end_review_packages_company_id_fkey", kind: "foreign_key" }),
    Object.freeze({ name: "ra_pro_month_end_review_packages_accounting_sync_id_fkey", kind: "foreign_key" }),
    Object.freeze({ name: "check_provider", kind: "check", token: "provider" }),
    Object.freeze({ name: "check_status", kind: "check", token: "status" }),
    Object.freeze({ name: "check_idempotency_key", kind: "check", token: "idempotency_key" }),
    Object.freeze({ name: "check_review_only", kind: "check", token: "review_only" }),
    Object.freeze({ name: "check_provider_writes", kind: "check", token: "provider_writes" }),
  ]),
});

const FUNCTION_SHAPES = Object.freeze([
  Object.freeze({
    signature: "public.persist_ra_pro_weekly_completeness(jsonb,jsonb)",
    security: "INVOKER",
    search_path: "pg_catalog, public",
    language: "plpgsql",
  }),
  Object.freeze({
    signature: "public.persist_ra_pro_month_end_review_package(jsonb)",
    security: "INVOKER",
    search_path: "pg_catalog, public",
    language: "plpgsql",
  }),
]);

function blocked(codePrefix, suffix, message) {
  const code = `${codePrefix}_${suffix}`;
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  return error;
}

function sortStrings(values) {
  return [...values].map(String).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function sortPrivilegeArray(values) {
  return sortStrings(values || []);
}

function canonicalizePrivilegeList(values) {
  return sortPrivilegeArray(values);
}

function canonicalizeInherited(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list
    .map((row) => ({
      ancestor: String(row.ancestor || ""),
      privileges: canonicalizePrivilegeList(row.privileges || []),
    }))
    .sort((a, b) => {
      if (a.ancestor !== b.ancestor) return a.ancestor < b.ancestor ? -1 : 1;
      return JSON.stringify(a.privileges).localeCompare(JSON.stringify(b.privileges));
    });
}

function canonicalizeUnexpected(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list
    .map((row) => ({
      grantee: String(row.grantee || ""),
      privileges: canonicalizePrivilegeList(row.privileges || []),
    }))
    .sort((a, b) => {
      if (a.grantee !== b.grantee) return a.grantee < b.grantee ? -1 : 1;
      return JSON.stringify(a.privileges).localeCompare(JSON.stringify(b.privileges));
    });
}

function deepEqualCanonical(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function effectiveFromDirect(directPrivs, maintainSupported) {
  const set = new Set(directPrivs);
  const matrix = {};
  for (const priv of BASE_TABLE_PRIVS) {
    matrix[priv] = set.has(priv);
  }
  if (maintainSupported) {
    matrix.MAINTAIN = set.has("MAINTAIN");
  }
  return matrix;
}

function buildExpectedPrivilegeSurfaces(serverVersionNum) {
  if (!Number.isInteger(serverVersionNum) || serverVersionNum <= 0) {
    throw blocked("CORRECTIVE_EVIDENCE", "VERSION", "server_version_num required");
  }
  const maintainSupported = serverVersionNum >= 170000;
  const serviceDirect = canonicalizePrivilegeList(
    maintainSupported ? [...BASE_TABLE_PRIVS, "MAINTAIN"] : [...BASE_TABLE_PRIVS],
  );
  const authDirect = canonicalizePrivilegeList(["SELECT"]);
  const emptyDirect = [];

  const tables = {};
  for (const table of CORRECTIVE_TABLES) {
    tables[table] = {
      owner: "postgres",
      direct_catalog: {
        service_role: serviceDirect,
        authenticated: authDirect,
        anon: emptyDirect,
        PUBLIC: emptyDirect,
      },
      effective: {
        service_role: effectiveFromDirect(serviceDirect, maintainSupported),
        authenticated: effectiveFromDirect(authDirect, maintainSupported),
        anon: effectiveFromDirect(emptyDirect, maintainSupported),
      },
      inherited_contributions: {
        service_role: [],
        authenticated: [],
        anon: [],
      },
      unexpected_grantees: [],
    };
  }

  const execute = {};
  for (const signature of TARGET_FUNCTIONS) {
    execute[signature] = {
      service_role: true,
      authenticated: false,
      anon: false,
      PUBLIC: false,
    };
  }

  return {
    server_version_num: serverVersionNum,
    maintain_applicability: maintainSupported ? "checked" : "not_supported",
    tables,
    execute,
  };
}

function assertKeys(obj, keys, codePrefix, suffix) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw blocked(codePrefix, suffix, "object required");
  }
  const got = Object.keys(obj).sort();
  const want = [...keys].sort();
  if (got.length !== want.length || got.some((k, i) => k !== want[i])) {
    throw blocked(codePrefix, suffix, "schema keys");
  }
}

function assertExact(value, expected, codePrefix, suffix, label) {
  if (value !== expected) throw blocked(codePrefix, suffix, `${label} mismatch`);
}

function assertBooleanMatrix(matrix, maintainSupported, codePrefix, suffix, label) {
  if (!matrix || typeof matrix !== "object") {
    throw blocked(codePrefix, suffix, `${label} matrix missing`);
  }
  for (const priv of BASE_TABLE_PRIVS) {
    if (typeof matrix[priv] !== "boolean") {
      throw blocked(codePrefix, suffix, `${label}.${priv} must be boolean`);
    }
  }
  if (maintainSupported) {
    if (typeof matrix.MAINTAIN !== "boolean") {
      throw blocked(codePrefix, suffix, `${label}.MAINTAIN must be boolean on PG17`);
    }
  } else if (Object.prototype.hasOwnProperty.call(matrix, "MAINTAIN")) {
    throw blocked(codePrefix, suffix, `${label}.MAINTAIN forbidden below PG17`);
  }
}

function assertDirectArray(arr, maintainSupported, codePrefix, suffix, label) {
  if (!Array.isArray(arr)) throw blocked(codePrefix, suffix, `${label} direct array`);
  const sorted = canonicalizePrivilegeList(arr);
  if (!deepEqualCanonical(arr, sorted) && !deepEqualCanonical(canonicalizePrivilegeList(arr), sorted)) {
    // allow unsorted input only if we canonicalize before compare; require no duplicates
  }
  if (new Set(arr).size !== arr.length) {
    throw blocked(codePrefix, suffix, `${label} duplicate privileges`);
  }
  for (const priv of arr) {
    if (!BASE_TABLE_PRIVS.includes(priv) && priv !== "MAINTAIN") {
      throw blocked(codePrefix, suffix, `${label} unknown privilege ${priv}`);
    }
    if (priv === "MAINTAIN" && !maintainSupported) {
      throw blocked(codePrefix, suffix, `${label} MAINTAIN below PG17`);
    }
  }
  if (!maintainSupported && arr.includes("MAINTAIN")) {
    throw blocked(codePrefix, suffix, `${label} MAINTAIN below PG17`);
  }
}

function assertNoContradiction(direct, effective, maintainSupported, codePrefix, table, role) {
  const directSet = new Set(direct);
  const privs = maintainSupported ? [...BASE_TABLE_PRIVS, "MAINTAIN"] : [...BASE_TABLE_PRIVS];
  for (const priv of privs) {
    const d = directSet.has(priv);
    const e = effective[priv] === true;
    if (!d && e) {
      throw blocked(
        codePrefix,
        "PRIVILEGE_CONTRADICTION",
        `${table}.${role}.${priv} direct-clean/effective-dirty`,
      );
    }
    if (d && !e) {
      throw blocked(
        codePrefix,
        "PRIVILEGE_CONTRADICTION",
        `${table}.${role}.${priv} direct-dirty/effective-clean`,
      );
    }
  }
}

function assertPreCorrectionPrivilegeSurfaces(observed, codePrefix) {
  if (!observed || typeof observed !== "object") {
    throw blocked(codePrefix, "PRIVILEGE", "privilege_surfaces missing");
  }
  const versionNum = observed.server_version_num;
  if (!Number.isInteger(versionNum) || versionNum <= 0) {
    throw blocked(codePrefix, "VERSION", "server_version_num required");
  }
  const maintainSupported = versionNum >= 170000;
  const expectedApplicability = maintainSupported ? "checked" : "not_supported";
  assertExact(
    observed.maintain_applicability,
    expectedApplicability,
    codePrefix,
    "MAINTAIN",
    "maintain_applicability",
  );

  const expected = buildExpectedPrivilegeSurfaces(versionNum);
  assertKeys(observed, ["server_version_num", "maintain_applicability", "tables", "execute"], codePrefix, "PRIVILEGE");
  assertKeys(observed.tables, CORRECTIVE_TABLES, codePrefix, "PRIVILEGE");

  for (const table of CORRECTIVE_TABLES) {
    const row = observed.tables[table];
    assertKeys(
      row,
      ["owner", "direct_catalog", "effective", "inherited_contributions", "unexpected_grantees"],
      codePrefix,
      "PRIVILEGE",
    );
    assertExact(row.owner, "postgres", codePrefix, "OWNER", `${table} owner`);
    assertKeys(row.direct_catalog, CATALOG_ROLES, codePrefix, "PRIVILEGE");
    assertKeys(row.effective, SUBJECT_ROLES, codePrefix, "PRIVILEGE");
    assertKeys(row.inherited_contributions, SUBJECT_ROLES, codePrefix, "PRIVILEGE");

    for (const role of CATALOG_ROLES) {
      assertDirectArray(row.direct_catalog[role], maintainSupported, codePrefix, "PRIVILEGE", `${table}.${role}`);
    }

    for (const role of SUBJECT_ROLES) {
      assertBooleanMatrix(row.effective[role], maintainSupported, codePrefix, "PRIVILEGE", `${table}.${role}`);
      assertNoContradiction(
        canonicalizePrivilegeList(row.direct_catalog[role]),
        row.effective[role],
        maintainSupported,
        codePrefix,
        table,
        role,
      );
    }

    for (const role of CATALOG_ROLES) {
      const gotDirect = canonicalizePrivilegeList(row.direct_catalog[role]);
      const wantDirect = expected.tables[table].direct_catalog[role];
      if (!deepEqualCanonical(gotDirect, wantDirect)) {
        throw blocked(codePrefix, "PRIVILEGE_DEFECT", `${table}.${role} direct catalog mismatch`);
      }
    }

    for (const role of SUBJECT_ROLES) {
      const wantEff = expected.tables[table].effective[role];
      for (const priv of Object.keys(wantEff)) {
        if (row.effective[role][priv] !== wantEff[priv]) {
          throw blocked(codePrefix, "PRIVILEGE_DEFECT", `${table}.${role}.effective.${priv}`);
        }
      }
      const inherited = canonicalizeInherited(row.inherited_contributions[role]);
      if (inherited.length !== 0) {
        throw blocked(codePrefix, "PRIVILEGE_INHERITED", `${table}.${role} inherited excess not empty`);
      }
      for (const entry of inherited) {
        const excess = entry.privileges.filter(
          (p) => EXCESS_PRIVS.includes(p) || (maintainSupported && p === "MAINTAIN"),
        );
        if (excess.length) {
          throw blocked(codePrefix, "PRIVILEGE_INHERITED", `${table}.${role}<=${entry.ancestor}`);
        }
      }
    }

    const unexpected = canonicalizeUnexpected(row.unexpected_grantees);
    if (unexpected.length !== 0) {
      throw blocked(codePrefix, "PRIVILEGE_UNEXPECTED", `${table} unexpected grantees present`);
    }
  }

  assertKeys(observed.execute, TARGET_FUNCTIONS, codePrefix, "EXECUTE");
  for (const signature of TARGET_FUNCTIONS) {
    const exec = observed.execute[signature];
    assertKeys(exec, CATALOG_ROLES, codePrefix, "EXECUTE");
    assertExact(exec.service_role, true, codePrefix, "EXECUTE", `${signature} service_role`);
    assertExact(exec.authenticated, false, codePrefix, "EXECUTE", `${signature} authenticated`);
    assertExact(exec.anon, false, codePrefix, "EXECUTE", `${signature} anon`);
    assertExact(exec.PUBLIC, false, codePrefix, "EXECUTE", `${signature} PUBLIC`);
  }
}

function canonicalizeColumns(cols) {
  return [...(cols || [])]
    .map((c) => ({
      name: String(c.name),
      type: String(c.type),
      nullable: Boolean(c.nullable),
    }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

function canonicalizeIndexes(indexes) {
  return [...(indexes || [])]
    .map((idx) => ({
      name: String(idx.name),
      unique: Boolean(idx.unique),
      columns: sortStrings(idx.columns || []),
    }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

function canonicalizeConstraints(constraints) {
  return [...(constraints || [])]
    .map((c) => ({
      name: String(c.name),
      kind: String(c.kind),
      ...(c.token ? { token: String(c.token) } : {}),
    }))
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
      if (a.name !== b.name) return a.name < b.name ? -1 : 1;
      return String(a.token || "").localeCompare(String(b.token || ""));
    });
}

function canonicalizePolicies(policies) {
  return [...(policies || [])]
    .map((p) => ({
      name: String(p.name),
      cmd: String(p.cmd),
      role: String(p.role),
    }))
    .sort((a, b) => {
      if (a.name !== b.name) return a.name < b.name ? -1 : 1;
      if (a.cmd !== b.cmd) return a.cmd < b.cmd ? -1 : 1;
      return a.role < b.role ? -1 : a.role > b.role ? 1 : 0;
    });
}

function assertPreCorrectionObjects(observed, codePrefix) {
  if (!observed || typeof observed !== "object") {
    throw blocked(codePrefix, "OBJECT", "objects missing");
  }
  assertKeys(
    observed,
    ["tables", "functions", "provider_sentinels", "partial_corrective_state", "row_counts"],
    codePrefix,
    "OBJECT",
  );
  assertExact(observed.partial_corrective_state, false, codePrefix, "PARTIAL_STATE", "partial_corrective_state");

  if (!Array.isArray(observed.tables) || observed.tables.length !== CORRECTIVE_TABLES.length) {
    throw blocked(codePrefix, "OBJECT", "tables length");
  }
  const byName = new Map(observed.tables.map((t) => [t.name, t]));
  for (const table of CORRECTIVE_TABLES) {
    if (!byName.has(table)) throw blocked(codePrefix, "OBJECT", `missing table ${table}`);
  }

  for (const table of CORRECTIVE_TABLES) {
    const row = byName.get(table);
    assertKeys(
      row,
      ["name", "owner", "rls_enabled", "columns", "indexes", "constraints", "policies"],
      codePrefix,
      "OBJECT",
    );
    assertExact(row.name, table, codePrefix, "OBJECT", "name");
    assertExact(row.owner, "postgres", codePrefix, "OWNER", table);
    assertExact(row.rls_enabled, true, codePrefix, "OBJECT", `${table} rls`);

    const cols = canonicalizeColumns(row.columns);
    const wantCols = canonicalizeColumns(TABLE_COLUMNS[table]);
    if (!deepEqualCanonical(cols, wantCols)) {
      throw blocked(codePrefix, "OBJECT_COLUMNS", `${table} columns drift`);
    }

    const indexes = canonicalizeIndexes(row.indexes);
    const wantIdx = canonicalizeIndexes(TABLE_INDEXES[table]);
    if (!deepEqualCanonical(indexes, wantIdx)) {
      throw blocked(codePrefix, "OBJECT_INDEXES", `${table} indexes drift`);
    }

    const constraints = canonicalizeConstraints(row.constraints);
    const wantCons = canonicalizeConstraints(TABLE_CONSTRAINTS[table]);
    if (!deepEqualCanonical(constraints, wantCons)) {
      throw blocked(codePrefix, "OBJECT_CONSTRAINTS", `${table} constraints drift`);
    }

    const policies = canonicalizePolicies(row.policies);
    const wantPolicies = canonicalizePolicies(
      POST_COMMIT_POLICIES.filter((p) => p[0] === table).map((p) => ({
        name: p[1],
        cmd: p[2],
        role: p[3],
      })),
    );
    if (!deepEqualCanonical(policies, wantPolicies)) {
      throw blocked(codePrefix, "OBJECT_POLICIES", `${table} policies drift`);
    }
  }

  if (!Array.isArray(observed.functions) || observed.functions.length !== FUNCTION_SHAPES.length) {
    throw blocked(codePrefix, "OBJECT_FUNCTIONS", "function count");
  }
  const fnCanon = [...observed.functions]
    .map((f) => ({
      signature: String(f.signature),
      security: String(f.security),
      search_path: String(f.search_path),
      language: String(f.language),
    }))
    .sort((a, b) => a.signature.localeCompare(b.signature));
  const wantFn = [...FUNCTION_SHAPES]
    .map((f) => ({ ...f }))
    .sort((a, b) => a.signature.localeCompare(b.signature));
  if (!deepEqualCanonical(fnCanon, wantFn)) {
    throw blocked(codePrefix, "OBJECT_FUNCTIONS", "function shape drift");
  }

  assertKeys(observed.provider_sentinels, SENTINEL_RELATIONS, codePrefix, "SENTINEL");
  for (const rel of SENTINEL_RELATIONS) {
    const s = observed.provider_sentinels[rel];
    assertKeys(s, ["present", "count"], codePrefix, "SENTINEL");
    if (s.present !== true) throw blocked(codePrefix, "SENTINEL", `${rel} must be present`);
    if (!Number.isInteger(s.count) || s.count < 0) {
      throw blocked(codePrefix, "SENTINEL", `${rel} count`);
    }
  }

  assertKeys(observed.row_counts, CORRECTIVE_TABLES, codePrefix, "ROW_COUNTS");
  for (const table of CORRECTIVE_TABLES) {
    const n = observed.row_counts[table];
    if (!Number.isInteger(n) || n < 0) {
      throw blocked(codePrefix, "ROW_COUNTS", `${table} row_count`);
    }
  }
}

function validateOriginals(db, codePrefix) {
  const originals = db.original_committed_migrations;
  if (!Array.isArray(originals) || originals.length !== ORIGINAL_COMMITTED_MIGRATIONS.length) {
    throw blocked(codePrefix, "ORIGINALS", "original migration count");
  }
  for (const expected of ORIGINAL_COMMITTED_MIGRATIONS) {
    const got = originals.find((row) => row.version === expected.version);
    if (!got) throw blocked(codePrefix, "ORIGINALS", `missing ${expected.version}`);
    assertExact(got.count, 1, codePrefix, "ORIGINALS", "count");
    assertExact(got.digest_match, true, codePrefix, "ORIGINALS", "digest");
    assertExact(got.oid, expected.oid, codePrefix, "ORIGINALS", "oid");
    assertExact(got.sha256, expected.sha256, codePrefix, "ORIGINALS", "sha256");
    assertExact(got.bytes, expected.bytes, codePrefix, "ORIGINALS", "bytes");
  }
}

function validatePreCorrectionDatabaseReadonly(db, { codePrefix = "CORRECTIVE_PRECONDITION" } = {}) {
  assertExact(db.project_ref, EXPECTED_PROJECT_REF, codePrefix, "PROJECT_MISMATCH", "project_ref");
  assertExact(db.history_count, PRIOR_HISTORY_COUNT, codePrefix, "HISTORY_DRIFT", "history");
  validateOriginals(db, codePrefix);
  assertExact(db.corrective_version, MIGRATIONS[0].version, codePrefix, "CORRECTIVE", "version");
  assertExact(db.corrective_version_count, 0, codePrefix, "CORRECTIVE", "count");

  assertPreCorrectionPrivilegeSurfaces(db.privilege_surfaces, codePrefix);
  assertPreCorrectionObjects(db.objects, codePrefix);

  assertExact(db.linked_firms_count, 0, codePrefix, "LINKED_FIRMS", "linked firms");
  const inventory = db.authorizing_inventory;
  assertKeys(inventory, ["predicate", "total", "company_owned", "firm_owned", "dual_owner"], codePrefix, "INVENTORY");
  assertExact(inventory.predicate, "review_assist_pro_active_and_complimentary", codePrefix, "INVENTORY", "predicate");
  assertExact(inventory.total, 4, codePrefix, "INVENTORY", "total");
  assertExact(inventory.company_owned, 3, codePrefix, "INVENTORY", "company");
  assertExact(inventory.firm_owned, 1, codePrefix, "INVENTORY", "firm");
  assertExact(inventory.dual_owner, 0, codePrefix, "INVENTORY", "dual");
  if (inventory.company_owned + inventory.firm_owned + inventory.dual_owner !== inventory.total) {
    throw blocked(codePrefix, "INVENTORY", "inventory sum");
  }
  if (
    !Array.isArray(db.webhook_non_terminal_statuses) ||
    db.webhook_non_terminal_statuses.join(",") !== WEBHOOK_STATUSES.join(",")
  ) {
    throw blocked(codePrefix, "WEBHOOK", "statuses");
  }
  assertExact(db.webhook_non_terminal_count, 0, codePrefix, "WEBHOOK", "count");
  assertExact(db.consumed_dual_attempt_id, CONSUMED_ORIGINAL_ATTEMPT_ID, codePrefix, "DUAL_ATTEMPT", "consumed attempt");
}

function buildSyntheticPrivilegeSurfaces(serverVersionNum = 160000) {
  return buildExpectedPrivilegeSurfaces(serverVersionNum);
}

function buildSyntheticObjects(rowCounts = null) {
  const counts = rowCounts || {
    ra_pro_weekly_completeness_runs: 0,
    ra_pro_weekly_completeness_findings: 0,
    ra_pro_month_end_review_packages: 0,
  };
  const tables = CORRECTIVE_TABLES.map((name) => ({
    name,
    owner: "postgres",
    rls_enabled: true,
    columns: TABLE_COLUMNS[name].map((c) => ({ ...c })),
    indexes: TABLE_INDEXES[name].map((i) => ({ name: i.name, unique: i.unique, columns: [...i.columns] })),
    constraints: TABLE_CONSTRAINTS[name].map((c) => ({ ...c })),
    policies: POST_COMMIT_POLICIES.filter((p) => p[0] === name).map((p) => ({
      name: p[1],
      cmd: p[2],
      role: p[3],
    })),
  }));
  const provider_sentinels = {};
  for (const rel of SENTINEL_RELATIONS) {
    provider_sentinels[rel] = { present: true, count: 0 };
  }
  return {
    tables,
    functions: FUNCTION_SHAPES.map((f) => ({ ...f })),
    provider_sentinels,
    partial_corrective_state: false,
    row_counts: { ...counts },
  };
}

module.exports = {
  BASE_TABLE_PRIVS,
  EXCESS_PRIVS,
  SUBJECT_ROLES,
  CATALOG_ROLES,
  TARGET_FUNCTIONS,
  TARGET_POLICIES,
  POST_COMMIT_POLICIES,
  SENTINEL_RELATIONS,
  WEBHOOK_STATUSES,
  TABLE_COLUMNS,
  TABLE_INDEXES,
  TABLE_CONSTRAINTS,
  FUNCTION_SHAPES,
  sortStrings,
  sortPrivilegeArray,
  canonicalizePrivilegeList,
  canonicalizeInherited,
  canonicalizeUnexpected,
  deepEqualCanonical,
  buildExpectedPrivilegeSurfaces,
  buildSyntheticPrivilegeSurfaces,
  buildSyntheticObjects,
  assertPreCorrectionPrivilegeSurfaces,
  assertPreCorrectionObjects,
  validatePreCorrectionDatabaseReadonly,
};
