#!/usr/bin/env node
/**
 * Supabase platform-bootstrap preflight for Option D disposable DBs.
 *
 * Validates exact required platform objects/columns/roles/extensions —
 * schema names alone are insufficient.
 *
 * Does not create objects, dump production, or invent fake Storage tables.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const CONTRACT_PATH = path.join(
  ROOT,
  "docs/migration-remediation/option-d-platform-prerequisite-contract.json",
);

/** Minimal Storage catalog columns required by audited Option D migrations. */
const REQUIRED_STORAGE_BUCKET_COLUMNS = [
  "id",
  "name",
  "public",
  "file_size_limit",
  "allowed_mime_types",
];

const REQUIRED_STORAGE_OBJECT_COLUMNS = ["id", "bucket_id", "name"];

const REQUIRED_SCHEMAS = ["public", "auth", "storage", "extensions", "supabase_migrations"];

const REQUIRED_ROLES = ["anon", "authenticated", "service_role"];

const REQUIRED_EXTENSIONS = [
  { name: "pgcrypto", schema: "extensions" },
];

const REQUIRED_AUTH_FUNCTIONS = ["uid"];

/**
 * Static contract used when the machine-readable audit file is absent.
 * Prefer loading docs/.../option-d-platform-prerequisite-contract.json.
 */
function defaultPlatformContract() {
  return {
    version: "option_d_platform_prerequisites_v1",
    failClosedOnUnknownPlatformState: true,
    requiredSchemas: REQUIRED_SCHEMAS,
    requiredRoles: REQUIRED_ROLES,
    requiredExtensions: REQUIRED_EXTENSIONS,
    requiredRelations: [
      {
        schema: "storage",
        name: "buckets",
        kind: "table",
        requiredColumns: REQUIRED_STORAGE_BUCKET_COLUMNS,
      },
      {
        schema: "storage",
        name: "objects",
        kind: "table",
        requiredColumns: REQUIRED_STORAGE_OBJECT_COLUMNS,
      },
      {
        schema: "supabase_migrations",
        name: "schema_migrations",
        kind: "table",
        requiredColumns: ["version"],
        allowEmpty: true,
      },
    ],
    requiredFunctions: [
      { schema: "auth", name: "uid", argTypes: [] },
    ],
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
  };
}

function loadPlatformContract(contractPath = CONTRACT_PATH) {
  if (fs.existsSync(contractPath)) {
    return JSON.parse(fs.readFileSync(contractPath, "utf8"));
  }
  return defaultPlatformContract();
}

/**
 * Pure evaluation over a collected platform inventory.
 * @param {object} inventory
 * @param {object} [contract]
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

  const schemas = new Set(
    (inventory.schemas || []).map((s) => String(s).toLowerCase()),
  );
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
    }
  }

  const relations = Array.isArray(inventory.relations) ? inventory.relations : [];
  const columnsByRelation = inventory.columnsByRelation || {};

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
        detail: `Required platform relation missing: ${rel.schema}.${rel.name} (schema-only bootstrap is insufficient)`,
      });
      continue;
    }
    const cols = new Set(
      (columnsByRelation[key] || columnsByRelation[`${rel.schema}.${rel.name}`] || []).map((c) =>
        String(c).toLowerCase(),
      ),
    );
    for (const col of rel.requiredColumns || []) {
      if (!cols.has(String(col).toLowerCase())) {
        failures.push({
          rule: "missing_required_column",
          relation: `${rel.schema}.${rel.name}`,
          column: col,
          detail: `Required column missing on ${rel.schema}.${rel.name}: ${col}`,
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
        detail: `Required platform function missing: ${fn.schema}.${fn.name}`,
      });
    }
  }

  // Explicit negative: storage schema without tables
  if (schemas.has("storage")) {
    const hasBuckets = relations.some(
      (r) => r.schema === "storage" && r.name === "buckets",
    );
    const hasObjects = relations.some(
      (r) => r.schema === "storage" && r.name === "objects",
    );
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
  };
}

/**
 * Collect platform inventory from a live client (read-only).
 */
async function collectPlatformInventory(client) {
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
    `SELECT e.extname AS name, n.nspname AS schema
       FROM pg_extension e
       JOIN pg_namespace n ON n.oid = e.extnamespace
      ORDER BY 1`,
  );
  const extensions = extRes.rows.map((r) => ({ name: r.name, schema: r.schema }));

  const relRes = await client.query(
    `SELECT n.nspname AS schema, c.relname AS name, c.relkind AS kind
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

  const colRes = await client.query(
    `SELECT table_schema AS schema, table_name AS name, column_name AS column
       FROM information_schema.columns
      WHERE table_schema = ANY($1::text[])
      ORDER BY 1, 2, 3`,
    [["storage", "auth", "supabase_migrations"]],
  );
  const columnsByRelation = {};
  for (const row of colRes.rows) {
    const key = `${row.schema}.${row.name}`.toLowerCase();
    if (!columnsByRelation[key]) columnsByRelation[key] = [];
    columnsByRelation[key].push(row.column);
  }

  const fnRes = await client.query(
    `SELECT n.nspname AS schema, p.proname AS name
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname IN ('auth', 'storage', 'extensions')
      ORDER BY 1, 2`,
  );
  const functions = fnRes.rows.map((r) => ({ schema: r.schema, name: r.name }));

  return {
    platformVersion,
    platformStateKnown,
    platformInventoryComplete,
    schemas,
    roles,
    extensions,
    relations,
    columnsByRelation,
    functions,
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
  defaultPlatformContract,
  loadPlatformContract,
  evaluatePlatformBootstrap,
  collectPlatformInventory,
};
