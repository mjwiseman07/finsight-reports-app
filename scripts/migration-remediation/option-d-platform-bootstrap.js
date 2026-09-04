#!/usr/bin/env node
/**
 * Supabase platform-bootstrap preflight for Option D.
 *
 * Validates exact required platform objects — schema names alone are insufficient.
 * Does not create objects, dump/restore catalogs, or invent fake Storage tables.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const CONTRACT_PATH = path.join(
  ROOT,
  "docs/migration-remediation/option-d-platform-prerequisite-contract.json",
);

const REQUIRED_STORAGE_BUCKET_COLUMNS = [
  { name: "id", dataType: "text" },
  { name: "name", dataType: "text" },
  { name: "public", dataType: "boolean" },
  { name: "file_size_limit", dataType: "bigint" },
  { name: "allowed_mime_types", dataType: "ARRAY" },
];

const REQUIRED_STORAGE_OBJECT_COLUMNS = [
  { name: "id", dataType: "uuid" },
  { name: "bucket_id", dataType: "text" },
  { name: "name", dataType: "text" },
];

const REQUIRED_SCHEMAS = ["public", "auth", "storage", "extensions", "supabase_migrations"];
const REQUIRED_ROLES = ["anon", "authenticated", "service_role"];
const REQUIRED_EXTENSIONS = [{ name: "pgcrypto", schema: "extensions" }];
const REQUIRED_AUTH_FUNCTIONS = ["uid"];
const APP_MIGRATION_VERSION_RE = /^(202605|202606|202607|202608|202609)/;

function normalizeColumnSpec(col) {
  if (typeof col === "string") return { name: col, dataType: null };
  return { name: col.name, dataType: col.dataType || null };
}

function defaultPlatformContract() {
  return {
    version: "option_d_platform_prerequisites_v2",
    failClosedOnUnknownPlatformState: true,
    dumpRestoreRejected: true,
    initializationMode: "supabase_cli_platform_only_temp_workdir",
    requiredSchemas: REQUIRED_SCHEMAS,
    requiredRoles: REQUIRED_ROLES,
    requiredExtensions: REQUIRED_EXTENSIONS,
    requiredRelations: [
      {
        schema: "storage",
        name: "buckets",
        kind: "table",
        requiredColumns: REQUIRED_STORAGE_BUCKET_COLUMNS,
        requireOwner: true,
        requireGrants: true,
        requireRlsProbe: true,
      },
      {
        schema: "storage",
        name: "objects",
        kind: "table",
        requiredColumns: REQUIRED_STORAGE_OBJECT_COLUMNS,
        requireOwner: true,
        requireGrants: true,
        requireRlsProbe: true,
        requiredConstraints: [{ type: "FOREIGN KEY", columns: ["bucket_id"] }],
      },
      {
        schema: "supabase_migrations",
        name: "schema_migrations",
        kind: "table",
        requiredColumns: [{ name: "version", dataType: "text" }],
        allowEmpty: true,
      },
    ],
    requiredFunctions: [{ schema: "auth", name: "uid", argTypes: [], requireSignature: true }],
    platformManagedSchemas: [
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
      "pgbouncer",
    ],
    applicationMustBeAbsent: {
      publicRelations: true,
      publicFunctions: true,
      appMigrationVersions: true,
    },
    evidenceBinding: {
      requireCliVersion: true,
      requirePostgresVersion: true,
      requirePlatformWorkdirFingerprint: true,
    },
  };
}

function loadPlatformContract(contractPath = CONTRACT_PATH) {
  if (fs.existsSync(contractPath)) {
    return JSON.parse(fs.readFileSync(contractPath, "utf8"));
  }
  return defaultPlatformContract();
}

function columnMapFor(rel, inventory) {
  const key = `${rel.schema}.${rel.name}`.toLowerCase();
  const typed = inventory.columnsDetailedByRelation?.[key];
  if (Array.isArray(typed) && typed.length) {
    const map = new Map();
    for (const c of typed) {
      map.set(String(c.name).toLowerCase(), {
        name: c.name,
        dataType: String(c.dataType || c.udtName || "").toLowerCase(),
        udtName: String(c.udtName || "").toLowerCase(),
      });
    }
    return map;
  }
  const names = inventory.columnsByRelation?.[key] || [];
  const map = new Map();
  for (const n of names) map.set(String(n).toLowerCase(), { name: n, dataType: null, udtName: null });
  return map;
}

function dataTypeMatches(expected, actual) {
  if (!expected) return true;
  const e = String(expected).toLowerCase();
  const a = String(actual || "").toLowerCase();
  if (!a) return false;
  if (e === "array") return a === "array" || a.startsWith("_") || a.endsWith("[]");
  if (e === "bigint") return a === "bigint" || a === "int8";
  if (e === "boolean") return a === "boolean" || a === "bool";
  if (e === "text") return a === "text" || a === "varchar" || a === "character varying";
  if (e === "uuid") return a === "uuid";
  return a === e || a.includes(e);
}

/**
 * Pure evaluation over a collected platform inventory.
 */
function evaluatePlatformBootstrap(inventory, contract = loadPlatformContract()) {
  const failures = [];

  if (!inventory || typeof inventory !== "object") {
    return {
      ok: false,
      failures: [{ rule: "missing_platform_inventory", detail: "platform inventory object absent" }],
    };
  }

  if (inventory.platformInventoryComplete !== true) {
    failures.push({
      rule: "incomplete_platform_inventory",
      detail: "platformInventoryComplete must be true; unknown platform state fails closed",
    });
  }

  if (inventory.platformStateKnown === false) {
    failures.push({
      rule: "unknown_platform_state",
      detail: "Platform version/state could not be determined; fail closed",
      platformVersion: inventory.platformVersion || null,
    });
  }

  if (contract.evidenceBinding?.requireCliVersion && !inventory.supabaseCliVersion) {
    failures.push({
      rule: "missing_supabase_cli_version_evidence",
      detail: "Bind evidence to exact Supabase CLI version (supabase --version)",
    });
  }
  if (contract.evidenceBinding?.requirePostgresVersion && !inventory.platformVersion) {
    failures.push({
      rule: "missing_postgres_version_evidence",
      detail: "Bind evidence to exact local Postgres server_version",
    });
  }
  if (
    contract.evidenceBinding?.requirePlatformWorkdirFingerprint &&
    inventory.platformOnlyTarget === true &&
    !inventory.platformWorkdirFingerprint
  ) {
    failures.push({
      rule: "missing_platform_workdir_fingerprint",
      detail:
        "Platform-only target requires workdir fingerprint proving empty application migrations directory",
    });
  }

  if (inventory.platformWorkdirFingerprint) {
    const fp = inventory.platformWorkdirFingerprint;
    if (fp.migrationsSqlCount !== 0) {
      failures.push({
        rule: "platform_workdir_contains_application_migrations",
        detail:
          "Neutral temp workdir must contain zero migration SQL files; supabase start would apply them",
        migrationsSqlCount: fp.migrationsSqlCount,
        sample: (fp.migrationFiles || []).slice(0, 10),
      });
    }
    if (fp.containsAdvisacorPath === true) {
      failures.push({
        rule: "platform_workdir_is_advisacor_repo",
        detail: "Platform-only stack must not use the Advisacor repository supabase/ directory",
      });
    }
  }

  const migrationVersions = Array.isArray(inventory.schemaMigrationVersions)
    ? inventory.schemaMigrationVersions.map(String)
    : [];
  const appVersions = migrationVersions.filter((v) => APP_MIGRATION_VERSION_RE.test(v));
  if (appVersions.length) {
    failures.push({
      rule: "app_migrations_applied_during_platform_startup",
      detail:
        "Advisacor-shaped migration versions present — platform startup applied application migrations or target is not platform-only",
      sample: appVersions.slice(0, 10),
    });
  }

  const schemas = new Set((inventory.schemas || []).map((s) => String(s).toLowerCase()));
  for (const required of contract.requiredSchemas || []) {
    if (!schemas.has(String(required).toLowerCase())) {
      failures.push({
        rule: "missing_required_schema",
        schema: required,
        detail: `Required platform schema missing: ${required}`,
      });
    }
  }

  const roles = new Set((inventory.roles || []).map((r) => String(r).toLowerCase()));
  for (const role of contract.requiredRoles || []) {
    if (!roles.has(String(role).toLowerCase())) {
      failures.push({
        rule: "missing_required_role",
        role,
        detail: `Required role missing: ${role}`,
      });
    }
  }

  const extensions = Array.isArray(inventory.extensions) ? inventory.extensions : [];
  for (const ext of contract.requiredExtensions || []) {
    const hit = extensions.find(
      (e) =>
        String(e.name).toLowerCase() === String(ext.name).toLowerCase() &&
        (!ext.schema || String(e.schema).toLowerCase() === String(ext.schema).toLowerCase()),
    );
    if (!hit) {
      failures.push({
        rule: "missing_required_extension",
        extension: ext,
        detail: `Required extension missing: ${ext.schema ? ext.schema + "." : ""}${ext.name}`,
      });
    } else if (ext.requireOwner && hit.owner && ext.owner && hit.owner !== ext.owner) {
      failures.push({
        rule: "extension_owner_mismatch",
        extension: ext.name,
        expectedOwner: ext.owner,
        observedOwner: hit.owner,
      });
    }
  }

  const relations = Array.isArray(inventory.relations) ? inventory.relations : [];
  const owners = inventory.relationOwners || {};
  const grants = inventory.relationGrants || {};
  const rls = inventory.relationRls || {};
  const constraints = inventory.relationConstraints || {};

  for (const rel of contract.requiredRelations || []) {
    const key = `${rel.schema}.${rel.name}`.toLowerCase();
    const found = relations.find(
      (r) =>
        String(r.schema).toLowerCase() === String(rel.schema).toLowerCase() &&
        String(r.name).toLowerCase() === String(rel.name).toLowerCase(),
    );
    if (!found) {
      failures.push({
        rule: "missing_required_relation",
        relation: `${rel.schema}.${rel.name}`,
        detail: `Required platform relation missing: ${rel.schema}.${rel.name}`,
      });
      continue;
    }

    const cols = columnMapFor(rel, inventory);
    for (const raw of rel.requiredColumns || []) {
      const spec = normalizeColumnSpec(raw);
      const hit = cols.get(String(spec.name).toLowerCase());
      if (!hit) {
        failures.push({
          rule: "missing_required_column",
          relation: `${rel.schema}.${rel.name}`,
          column: spec.name,
        });
        continue;
      }
      if (spec.dataType && !dataTypeMatches(spec.dataType, hit.dataType || hit.udtName)) {
        failures.push({
          rule: "column_type_mismatch",
          relation: `${rel.schema}.${rel.name}`,
          column: spec.name,
          expectedDataType: spec.dataType,
          observedDataType: hit.dataType || hit.udtName,
        });
      }
    }

    if (rel.requireOwner) {
      const owner = owners[key];
      if (!owner) {
        failures.push({
          rule: "missing_relation_owner_evidence",
          relation: `${rel.schema}.${rel.name}`,
        });
      } else if (rel.expectedOwner && owner !== rel.expectedOwner) {
        failures.push({
          rule: "relation_owner_mismatch",
          relation: `${rel.schema}.${rel.name}`,
          expectedOwner: rel.expectedOwner,
          observedOwner: owner,
        });
      }
    }

    if (rel.requireGrants) {
      const g = grants[key];
      if (!Array.isArray(g)) {
        failures.push({
          rule: "missing_relation_grant_evidence",
          relation: `${rel.schema}.${rel.name}`,
        });
      } else if (Array.isArray(rel.requiredGrants)) {
        for (const need of rel.requiredGrants) {
          const ok = g.some(
            (row) =>
              String(row.grantee).toLowerCase() === String(need.grantee).toLowerCase() &&
              String(row.privilege).toLowerCase() === String(need.privilege).toLowerCase(),
          );
          if (!ok) {
            failures.push({
              rule: "relation_grant_mismatch",
              relation: `${rel.schema}.${rel.name}`,
              requiredGrant: need,
            });
          }
        }
      }
    }

    if (rel.requireRlsProbe) {
      if (typeof rls[key] !== "boolean") {
        failures.push({
          rule: "missing_relation_rls_evidence",
          relation: `${rel.schema}.${rel.name}`,
        });
      } else if (typeof rel.rlsEnabled === "boolean" && rls[key] !== rel.rlsEnabled) {
        failures.push({
          rule: "relation_rls_mismatch",
          relation: `${rel.schema}.${rel.name}`,
          expectedRlsEnabled: rel.rlsEnabled,
          observedRlsEnabled: rls[key],
        });
      }
    }

    for (const need of rel.requiredConstraints || []) {
      const list = constraints[key];
      if (!Array.isArray(list)) {
        failures.push({
          rule: "missing_relation_constraint_evidence",
          relation: `${rel.schema}.${rel.name}`,
          requiredConstraint: need,
        });
        continue;
      }
      const ok = list.some((c) => {
        const typeOk =
          String(c.type || c.constraintType || "").toUpperCase() ===
          String(need.type).toUpperCase();
        if (!typeOk) return false;
        if (!need.columns?.length) return true;
        const colsLower = (c.columns || []).map((x) => String(x).toLowerCase());
        return need.columns.every((col) => colsLower.includes(String(col).toLowerCase()));
      });
      if (!ok) {
        failures.push({
          rule: "required_constraint_missing",
          relation: `${rel.schema}.${rel.name}`,
          requiredConstraint: need,
        });
      }
    }
  }

  const functions = Array.isArray(inventory.functions) ? inventory.functions : [];
  for (const fn of contract.requiredFunctions || []) {
    const hit = functions.find(
      (f) =>
        String(f.schema).toLowerCase() === String(fn.schema).toLowerCase() &&
        String(f.name).toLowerCase() === String(fn.name).toLowerCase(),
    );
    if (!hit) {
      failures.push({
        rule: "missing_required_function",
        function: `${fn.schema}.${fn.name}`,
      });
      continue;
    }
    if (fn.requireSignature && hit.identityArgs == null && hit.arguments == null) {
      failures.push({
        rule: "missing_function_signature_evidence",
        function: `${fn.schema}.${fn.name}`,
      });
    }
    if (fn.enforceArgTypes === true && Array.isArray(fn.argTypes) && hit.identityArgs != null) {
      const observed = String(hit.identityArgs);
      const expected = fn.argTypes.join(", ");
      if (observed !== expected) {
        failures.push({
          rule: "function_signature_mismatch",
          function: `${fn.schema}.${fn.name}`,
          expectedArgTypes: expected,
          observedIdentityArgs: observed,
        });
      }
    }
  }

  if (schemas.has("storage")) {
    const hasBuckets = relations.some((r) => r.schema === "storage" && r.name === "buckets");
    const hasObjects = relations.some((r) => r.schema === "storage" && r.name === "objects");
    if (!hasBuckets || !hasObjects) {
      failures.push({
        rule: "storage_schema_without_catalog_tables",
        detail:
          "storage schema present but storage.buckets and/or storage.objects absent — incomplete platform bootstrap",
        hasBuckets,
        hasObjects,
      });
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    contractVersion: contract.version || null,
    dumpRestoreRejected: contract.dumpRestoreRejected === true,
  };
}

async function collectPlatformInventory(client, opts = {}) {
  let platformInventoryComplete = true;
  let platformStateKnown = true;
  let platformVersion = null;

  try {
    const ver = await client.query("SHOW server_version");
    platformVersion = ver.rows[0]?.server_version || null;
  } catch {
    platformStateKnown = false;
    platformInventoryComplete = false;
  }

  const schemaRes = await client.query(
    `SELECT nspname AS name FROM pg_namespace
      WHERE nspname NOT LIKE 'pg_temp_%' AND nspname NOT LIKE 'pg_toast_temp_%'
      ORDER BY 1`,
  );
  const schemas = schemaRes.rows.map((r) => r.name);

  const roleRes = await client.query(
    `SELECT rolname AS name FROM pg_roles WHERE rolname = ANY($1::text[]) ORDER BY 1`,
    [REQUIRED_ROLES],
  );
  const roles = roleRes.rows.map((r) => r.name);

  const extRes = await client.query(
    `SELECT e.extname AS name, n.nspname AS schema, pg_get_userbyid(e.extowner) AS owner
       FROM pg_extension e
       JOIN pg_namespace n ON n.oid = e.extnamespace
      ORDER BY 1`,
  );
  const extensions = extRes.rows.map((r) => ({
    name: r.name,
    schema: r.schema,
    owner: r.owner,
  }));

  const relRes = await client.query(
    `SELECT n.nspname AS schema, c.relname AS name, c.relkind AS kind,
            pg_get_userbyid(c.relowner) AS owner,
            c.relrowsecurity AS rls_enabled
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = ANY($1::text[])
        AND c.relkind IN ('r','p','v','m')
      ORDER BY 1, 2`,
    [["storage", "auth", "supabase_migrations", "extensions"]],
  );
  const relations = relRes.rows.map((r) => ({
    schema: r.schema,
    name: r.name,
    kind: r.kind,
  }));
  const relationOwners = {};
  const relationRls = {};
  for (const r of relRes.rows) {
    const key = `${r.schema}.${r.name}`.toLowerCase();
    relationOwners[key] = r.owner;
    relationRls[key] = Boolean(r.rls_enabled);
  }

  const colRes = await client.query(
    `SELECT table_schema AS schema, table_name AS name, column_name AS column,
            data_type AS data_type, udt_name AS udt_name
       FROM information_schema.columns
      WHERE table_schema = ANY($1::text[])
      ORDER BY 1, 2, ordinal_position`,
    [["storage", "auth", "supabase_migrations"]],
  );
  const columnsByRelation = {};
  const columnsDetailedByRelation = {};
  for (const row of colRes.rows) {
    const key = `${row.schema}.${row.name}`.toLowerCase();
    if (!columnsByRelation[key]) columnsByRelation[key] = [];
    if (!columnsDetailedByRelation[key]) columnsDetailedByRelation[key] = [];
    columnsByRelation[key].push(row.column);
    columnsDetailedByRelation[key].push({
      name: row.column,
      dataType: row.data_type,
      udtName: row.udt_name,
    });
  }

  const grantRes = await client.query(
    `SELECT table_schema AS schema, table_name AS name, grantee, privilege_type AS privilege
       FROM information_schema.role_table_grants
      WHERE table_schema = ANY($1::text[])
      ORDER BY 1, 2, 3, 4`,
    [["storage", "auth", "supabase_migrations"]],
  );
  const relationGrants = {};
  for (const row of grantRes.rows) {
    const key = `${row.schema}.${row.name}`.toLowerCase();
    if (!relationGrants[key]) relationGrants[key] = [];
    relationGrants[key].push({ grantee: row.grantee, privilege: row.privilege });
  }

  const conRes = await client.query(
    `SELECT n.nspname AS schema, c.relname AS name, tc.constraint_type AS type,
            array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS columns
       FROM information_schema.table_constraints tc
       JOIN pg_class c ON c.relname = tc.table_name
       JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = tc.table_schema
       LEFT JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = tc.constraint_name
        AND kcu.table_schema = tc.table_schema
        AND kcu.table_name = tc.table_name
      WHERE tc.table_schema = ANY($1::text[])
      GROUP BY n.nspname, c.relname, tc.constraint_type, tc.constraint_name
      ORDER BY 1, 2`,
    [["storage", "auth", "supabase_migrations"]],
  );
  const relationConstraints = {};
  for (const row of conRes.rows) {
    const key = `${row.schema}.${row.name}`.toLowerCase();
    if (!relationConstraints[key]) relationConstraints[key] = [];
    relationConstraints[key].push({
      type: row.type,
      columns: row.columns || [],
    });
  }

  const fnRes = await client.query(
    `SELECT n.nspname AS schema, p.proname AS name,
            pg_get_function_identity_arguments(p.oid) AS identity_args
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname IN ('auth', 'storage', 'extensions')
      ORDER BY 1, 2`,
  );
  const functions = fnRes.rows.map((r) => ({
    schema: r.schema,
    name: r.name,
    identityArgs: r.identity_args,
  }));

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

  return {
    platformVersion,
    platformStateKnown,
    platformInventoryComplete,
    supabaseCliVersion: opts.supabaseCliVersion || null,
    platformOnlyTarget: opts.platformOnlyTarget === true,
    platformWorkdirFingerprint: opts.platformWorkdirFingerprint || null,
    schemas,
    roles,
    extensions,
    relations,
    relationOwners,
    relationGrants,
    relationRls,
    relationConstraints,
    columnsByRelation,
    columnsDetailedByRelation,
    functions,
    schemaMigrationVersions,
  };
}

function fingerprintPlatformWorkdir(workdirAbs, repoRoot = ROOT) {
  const migrationsDir = path.join(workdirAbs, "supabase", "migrations");
  let migrationFiles = [];
  if (fs.existsSync(migrationsDir)) {
    migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  }
  const resolvedWorkdir = path.resolve(workdirAbs);
  const resolvedRepo = path.resolve(repoRoot);
  const containsAdvisacorPath =
    resolvedWorkdir === resolvedRepo ||
    resolvedWorkdir.startsWith(resolvedRepo + path.sep);
  return {
    workdir: resolvedWorkdir,
    migrationsSqlCount: migrationFiles.length,
    migrationFiles,
    containsAdvisacorPath,
  };
}

module.exports = {
  CONTRACT_PATH,
  REQUIRED_STORAGE_BUCKET_COLUMNS,
  REQUIRED_STORAGE_OBJECT_COLUMNS,
  REQUIRED_SCHEMAS,
  REQUIRED_ROLES,
  REQUIRED_EXTENSIONS,
  REQUIRED_AUTH_FUNCTIONS,
  APP_MIGRATION_VERSION_RE,
  defaultPlatformContract,
  loadPlatformContract,
  evaluatePlatformBootstrap,
  collectPlatformInventory,
  fingerprintPlatformWorkdir,
  normalizeColumnSpec,
  dataTypeMatches,
};
