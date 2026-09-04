#!/usr/bin/env node
/**
 * Fresh disposable DB gate for Option D.
 * Rejects existing / partially replayed application databases before any write.
 * Does NOT reset or delete the target.
 *
 * Inventory must cover public relations, functions, types, sequences, triggers,
 * and non-allowlisted schemas. Missing inventory sections fail closed.
 *
 * Platform-managed objects (auth/storage catalogs, roles, extensions) are allowed
 * and — when platform inventory is supplied or requirePlatformBootstrap is true —
 * must be positively verified via option-d-platform-bootstrap. Schema names alone
 * are insufficient. Unknown platform state fails closed.
 */
const {
  evaluatePlatformBootstrap,
  collectPlatformInventory,
} = require("./option-d-platform-bootstrap");
/** Database name must be intentionally disposable (not ambiguous `postgres`). */
const DISPOSABLE_DB_NAME_RE = /^option_d_[a-z0-9_]+$/;

/**
 * Supabase-managed / system schemas permitted on a virgin local stack.
 * Any other non-empty user schema rejects the fresh claim.
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
  "public",
]);

/**
 * Documented public relation names allowed on a virgin DB.
 * Empty — any public table/view/matview/foreign table rejects freshness.
 */
const ALLOWED_PUBLIC_RELATIONS = new Set([]);

/** Documented public functions allowed on virgin DB (none). */
const ALLOWED_PUBLIC_FUNCTIONS = new Set([]);

/** Documented public types allowed on virgin DB (none beyond builtins filtered in collector). */
const ALLOWED_PUBLIC_TYPES = new Set([]);

/** Documented public sequences allowed on virgin DB (none). */
const ALLOWED_PUBLIC_SEQUENCES = new Set([]);

/** Documented public triggers allowed on virgin DB (none). */
const ALLOWED_PUBLIC_TRIGGERS = new Set([]);

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

const REQUIRED_INVENTORY_KEYS = [
  "databaseName",
  "schemas",
  "publicRelations",
  "publicFunctions",
  "publicTypes",
  "publicSequences",
  "publicTriggers",
  "schemaMigrationVersions",
  "inventoryComplete",
];

function requireArray(inventory, key, failures) {
  if (!Array.isArray(inventory[key])) {
    failures.push({
      rule: "missing_inventory_evidence",
      section: key,
      detail: `Inventory missing required array section: ${key}`,
    });
    return [];
  }
  return inventory[key];
}

/**
 * @param {object} inventory
 */
function evaluateFreshDisposableDatabase(inventory) {
  const failures = [];

  if (!inventory || typeof inventory !== "object") {
    return {
      ok: false,
      failures: [{ rule: "missing_inventory_evidence", detail: "inventory object absent" }],
    };
  }

  if (inventory.inventoryComplete !== true) {
    failures.push({
      rule: "missing_inventory_evidence",
      detail: "inventoryComplete must be true; partial inventory cannot claim freshness",
    });
  }

  for (const key of REQUIRED_INVENTORY_KEYS) {
    if (!(key in inventory)) {
      failures.push({
        rule: "missing_inventory_evidence",
        section: key,
        detail: `Missing inventory key: ${key}`,
      });
    }
  }

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

  const schemas = requireArray(inventory, "schemas", failures).map((s) => String(s).toLowerCase());
  const unknownSchemas = schemas.filter((s) => !ALLOWED_SCHEMAS.has(s) && !s.startsWith("pg_temp") && !s.startsWith("pg_toast_temp"));
  if (unknownSchemas.length) {
    failures.push({
      rule: "unknown_or_disallowed_schemas",
      detail: `Schemas outside bootstrap allowlist: ${unknownSchemas.slice(0, 20).join(", ")}`,
      schemas: unknownSchemas,
    });
  }

  const publicRelations = requireArray(inventory, "publicRelations", failures).map((r) =>
    String(r).toLowerCase(),
  );
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

  const publicFunctions = requireArray(inventory, "publicFunctions", failures).map((r) =>
    String(r).toLowerCase(),
  );
  const unexpectedFns = publicFunctions.filter((r) => !ALLOWED_PUBLIC_FUNCTIONS.has(r));
  if (unexpectedFns.length) {
    failures.push({
      rule: "preexisting_public_functions",
      detail: `Public functions present: ${unexpectedFns.slice(0, 20).join(", ")}`,
      functions: unexpectedFns,
    });
  }

  const publicTypes = requireArray(inventory, "publicTypes", failures).map((r) =>
    String(r).toLowerCase(),
  );
  const unexpectedTypes = publicTypes.filter((r) => !ALLOWED_PUBLIC_TYPES.has(r));
  if (unexpectedTypes.length) {
    failures.push({
      rule: "preexisting_public_types",
      detail: `Public types present: ${unexpectedTypes.slice(0, 20).join(", ")}`,
      types: unexpectedTypes,
    });
  }

  const publicSequences = requireArray(inventory, "publicSequences", failures).map((r) =>
    String(r).toLowerCase(),
  );
  const unexpectedSeq = publicSequences.filter((r) => !ALLOWED_PUBLIC_SEQUENCES.has(r));
  if (unexpectedSeq.length) {
    failures.push({
      rule: "preexisting_public_sequences",
      detail: `Public sequences present: ${unexpectedSeq.slice(0, 20).join(", ")}`,
      sequences: unexpectedSeq,
    });
  }

  const publicTriggers = requireArray(inventory, "publicTriggers", failures).map((r) =>
    String(r).toLowerCase(),
  );
  const unexpectedTrig = publicTriggers.filter((r) => !ALLOWED_PUBLIC_TRIGGERS.has(r));
  if (unexpectedTrig.length) {
    failures.push({
      rule: "preexisting_public_triggers",
      detail: `Public triggers present: ${unexpectedTrig.slice(0, 20).join(", ")}`,
      triggers: unexpectedTrig,
    });
  }

  // Non-allowlisted schemas must not host application relations
  const foreignSchemaObjects = Array.isArray(inventory.objectsOutsideAllowedSchemas)
    ? inventory.objectsOutsideAllowedSchemas
    : null;
  if (foreignSchemaObjects === null && inventory.inventoryComplete === true) {
    failures.push({
      rule: "missing_inventory_evidence",
      section: "objectsOutsideAllowedSchemas",
      detail: "Missing objectsOutsideAllowedSchemas inventory",
    });
  } else if (Array.isArray(foreignSchemaObjects) && foreignSchemaObjects.length) {
    failures.push({
      rule: "application_objects_outside_allowed_schemas",
      detail: `Objects in non-allowlisted schemas: ${foreignSchemaObjects
        .slice(0, 20)
        .map((o) => `${o.schema}.${o.name}`)
        .join(", ")}`,
      objects: foreignSchemaObjects.slice(0, 50),
    });
  }

  const versions = requireArray(inventory, "schemaMigrationVersions", failures).map(String);
  const appVersions = versions.filter((v) => APP_MIGRATION_VERSION_RE.test(v));
  if (appVersions.length) {
    failures.push({
      rule: "partial_or_prior_app_replay_detected",
      detail: `schema_migrations already contains app versions (${appVersions.length}); refuse reuse as clean evidence`,
      sample: appVersions.slice(0, 10),
    });
  }

  // Any migration history entry that looks like our lineage timestamps is already covered;
  // also reject unknown non-empty history when schema_migrations_present and versions exist
  // that are not recognized platform-only (empty is required for virgin claim).
  if (versions.length > 0) {
    failures.push({
      rule: "unknown_or_nonempty_migration_history",
      detail:
        "Fresh Option D claim requires empty schema_migrations (no recorded versions). Non-empty history cannot be clean-replay evidence.",
      sample: versions.slice(0, 10),
    });
  }

  // Platform bootstrap: positively verify catalogs when required / supplied.
  const requirePlatform =
    inventory.requirePlatformBootstrap === true || inventory.platform != null;
  if (requirePlatform) {
    if (!inventory.platform || typeof inventory.platform !== "object") {
      failures.push({
        rule: "missing_platform_inventory",
        detail:
          "Platform bootstrap inventory required; schema allowlist alone cannot prove storage/auth catalogs exist",
      });
    } else {
      const platformEval = evaluatePlatformBootstrap(inventory.platform);
      if (!platformEval.ok) {
        for (const f of platformEval.failures) {
          failures.push({
            ...f,
            rule: f.rule.startsWith("platform_") ? f.rule : `platform_${f.rule}`,
          });
        }
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    publicRelationCount: publicRelations.length,
    appMigrationVersionCount: appVersions.length,
    allowedSchemas: [...ALLOWED_SCHEMAS].sort(),
    platformBootstrapRequired: requirePlatform,
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
 * Full read-only inventory. Marks inventoryComplete only when all sections collected.
 */
async function collectDatabaseInventory(client) {
  const dbRes = await client.query("SELECT current_database() AS name");
  const databaseName = dbRes.rows[0]?.name || "";

  const schemaRes = await client.query(
    `SELECT nspname AS name
       FROM pg_namespace
      WHERE nspname NOT LIKE 'pg_temp_%'
        AND nspname NOT LIKE 'pg_toast_temp_%'
      ORDER BY 1`,
  );
  const schemas = schemaRes.rows.map((r) => r.name);

  const relRes = await client.query(
    `SELECT c.relname AS name
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r','p','v','m','f')
      ORDER BY 1`,
  );
  const publicRelations = relRes.rows.map((r) => r.name);

  const fnRes = await client.query(
    `SELECT p.proname AS name
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.prokind IN ('f','p','a','w')
      ORDER BY 1`,
  );
  const publicFunctions = fnRes.rows.map((r) => r.name);

  const typeRes = await client.query(
    `SELECT t.typname AS name
       FROM pg_type t
       JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typtype IN ('c','e','d')  -- composite, enum, domain (exclude base/pseudo)
        AND NOT EXISTS (
          SELECT 1 FROM pg_class c
          WHERE c.oid = t.typrelid AND c.relkind = 'r'
        )
      ORDER BY 1`,
  );
  // Also catch enums/domains more simply — include composites not backed by tables via typrelid=0
  const typeRes2 = await client.query(
    `SELECT t.typname AS name
       FROM pg_type t
       JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typtype IN ('e','d')
      ORDER BY 1`,
  );
  const publicTypes = [...new Set([...typeRes.rows, ...typeRes2.rows].map((r) => r.name))];

  const seqRes = await client.query(
    `SELECT c.relname AS name
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'S'
      ORDER BY 1`,
  );
  const publicSequences = seqRes.rows.map((r) => r.name);

  const trigRes = await client.query(
    `SELECT t.tgname AS name
       FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND NOT t.tgisinternal
      ORDER BY 1`,
  );
  const publicTriggers = trigRes.rows.map((r) => r.name);

  const outsideRes = await client.query(
    `SELECT n.nspname AS schema, c.relname AS name, c.relkind AS kind
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname NOT IN (${[...ALLOWED_SCHEMAS].map((_, i) => `$${i + 1}`).join(",")})
        AND n.nspname NOT LIKE 'pg_temp_%'
        AND n.nspname NOT LIKE 'pg_toast_temp_%'
        AND c.relkind IN ('r','p','v','m','f','S')
      ORDER BY 1, 2`,
    [...ALLOWED_SCHEMAS],
  );
  const objectsOutsideAllowedSchemas = outsideRes.rows.map((r) => ({
    schema: r.schema,
    name: r.name,
    kind: r.kind,
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

  const platform = await collectPlatformInventory(client);

  return {
    databaseName,
    schemas,
    publicRelations,
    publicFunctions,
    publicTypes,
    publicSequences,
    publicTriggers,
    objectsOutsideAllowedSchemas,
    schemaMigrationVersions,
    inventoryComplete: true,
    requirePlatformBootstrap: true,
    platform,
  };
}

module.exports = {
  DISPOSABLE_DB_NAME_RE,
  ALLOWED_SCHEMAS,
  ALLOWED_PUBLIC_RELATIONS,
  ALLOWED_PUBLIC_FUNCTIONS,
  ALLOWED_PUBLIC_TYPES,
  ALLOWED_PUBLIC_SEQUENCES,
  ALLOWED_PUBLIC_TRIGGERS,
  APP_SENTINEL_RELATIONS,
  REQUIRED_INVENTORY_KEYS,
  evaluateFreshDisposableDatabase,
  databaseNameFromUrl,
  collectDatabaseInventory,
};
