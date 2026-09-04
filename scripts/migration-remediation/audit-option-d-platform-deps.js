#!/usr/bin/env node
/**
 * Static audit: Option D candidate migrations → non-public platform dependencies.
 * Writes docs/migration-remediation/option-d-platform-prerequisite-contract.json
 * No Docker / no SQL apply.
 */
const fs = require("fs");
const path = require("path");
const {
  defaultPlatformContract,
  REQUIRED_STORAGE_BUCKET_COLUMNS,
  REQUIRED_STORAGE_OBJECT_COLUMNS,
} = require("./option-d-platform-bootstrap");
const {
  REALTIME_INTERNAL_SCHEMA_POLICY,
} = require("./option-d-realtime-internal-schema");

const ROOT = path.join(__dirname, "..", "..");
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const OUT = path.join(ROOT, "docs/migration-remediation/option-d-platform-prerequisite-contract.json");
const AUDIT_OUT = path.join(
  ROOT,
  "docs/migration-remediation/option-d-platform-dependency-audit.json",
);

const PLATFORM_SCHEMAS = new Set([
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
  "net",
  "cron",
]);

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ");
}

/**
 * Remove SQL string literals so comment/taxonomy text like
 * `qbo.auth.token_expired` cannot be promoted to platform function deps.
 * Handles single quotes with '' escapes and basic dollar-quoting.
 */
function stripSqlStringLiterals(sql) {
  let out = "";
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'") {
      out += " ";
      i += 1;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (ch === "$") {
      const dollar = sql.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (dollar) {
        const tag = dollar[0];
        const close = sql.indexOf(tag, i + tag.length);
        out += " ";
        i = close === -1 ? sql.length : close + tag.length;
        continue;
      }
    }
    out += ch;
    i += 1;
  }
  return out;
}

function scanSql(sql, filename, order) {
  const body = stripSqlStringLiterals(stripSqlComments(sql));
  const refs = [];

  // Only treat as platform functions when an executable call site is present.
  // Names alone (or string taxonomy text) must not become startup prerequisites.
  const knownCallableFunctions = new Set([
    "uid",
    "role",
    "jwt",
    "email",
    "foldername",
    "extension",
    "filename",
  ]);
  // token_expired is intentionally absent: Option D only mentions it inside a
  // COMMENT string (`qbo.auth.token_expired` taxonomy). It is not an auth schema
  // function call and is not present on CLI 2.116.0 platform startup.
  const knownRelations = new Set([
    "storage.buckets",
    "storage.objects",
    "auth.users",
    "supabase_migrations.schema_migrations",
  ]);

  const qualRel =
    /\b((?:auth|storage|realtime|extensions|graphql|graphql_public|supabase_functions|supabase_migrations|vault|pgsodium|pgbouncer|net|cron)\.[a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  let m;
  while ((m = qualRel.exec(body))) {
    const [schema, name] = m[1].split(".");
    const key = `${schema}.${name}`.toLowerCase();
    const after = body.slice(m.index + m[0].length, m.index + m[0].length + 8);
    const before = body.slice(Math.max(0, m.index - 24), m.index).toLowerCase();
    const relationContext =
      /\b(into|from|join|update|table|references|on)\s+$/.test(before) ||
      knownRelations.has(key);
    const callSite = /^\s*\(/.test(after);
    const isFn =
      !relationContext &&
      callSite &&
      (knownCallableFunctions.has(name.toLowerCase()) || callSite);
    // Only record function refs for known callables with call sites; bare
    // qualified names without call/relation context are ignored (fail-closed
    // against over-promotion, not against missing real deps — real deps use ()).
    if (isFn && knownCallableFunctions.has(name.toLowerCase())) {
      refs.push({
        kind: "function",
        schema: schema.toLowerCase(),
        name: name.toLowerCase(),
        match: m[1],
        filename,
        order,
        classification: "executable_call_site",
      });
      continue;
    }
    if (relationContext || knownRelations.has(key)) {
      refs.push({
        kind: "qualified_relation",
        schema: schema.toLowerCase(),
        name: name.toLowerCase(),
        match: m[1],
        filename,
        order,
      });
    }
  }

  if (/\bauth\.uid\s*\(/i.test(body)) {
    refs.push({
      kind: "function",
      schema: "auth",
      name: "uid",
      match: "auth.uid()",
      filename,
      order,
      classification: "executable_call_site",
    });
  }

  // Record non-executing taxonomy/string mentions for audit only (not prerequisites).
  const rawBody = stripSqlComments(sql);
  if (/qbo\.auth\.token_expired/i.test(rawBody) && !/\bauth\.token_expired\s*\(/i.test(body)) {
    refs.push({
      kind: "non_executing_reference",
      schema: "auth",
      name: "token_expired",
      match: "qbo.auth.token_expired",
      filename,
      order,
      classification: "string_taxonomy_not_startup_prerequisite",
      detail:
        "Appears only inside COMMENT/taxonomy text; not an auth.token_expired() call; not present on CLI 2.116.0 platform start",
    });
  }

  for (const role of ["anon", "authenticated", "service_role", "supabase_admin"]) {
    const re = new RegExp(`\\bTO\\s+${role}\\b|\\bGRANT\\b[\\s\\S]{0,80}\\b${role}\\b`, "i");
    if (re.test(body)) {
      refs.push({
        kind: "role",
        schema: null,
        name: role,
        match: role,
        filename,
        order,
      });
    }
  }

  if (/\bCREATE\s+EXTENSION\b/i.test(body) && /\bpgcrypto\b/i.test(body)) {
    refs.push({
      kind: "extension",
      schema: "extensions",
      name: "pgcrypto",
      match: "pgcrypto",
      filename,
      order,
    });
  }

  return refs;
}

function resolveSourcePath(entry) {
  const candidates = [
    entry.replacementSource,
    entry.originalSource,
    path.join(
      "supabase/migrations-draft/option-d-isolated-replay/assembled",
      entry.assembledFilename,
    ),
  ].filter(Boolean);
  for (const rel of candidates) {
    const abs = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

function buildContract(refs) {
  const base = defaultPlatformContract();
  const relations = new Map();
  const functions = new Map();
  const roles = new Set(base.requiredRoles);
  const extensions = [...base.requiredExtensions];

  for (const r of refs) {
    if (r.kind === "role") roles.add(r.name);
    if (r.kind === "extension") {
      if (!extensions.some((e) => e.name === r.name)) {
        extensions.push({ name: r.name, schema: r.schema || "extensions" });
      }
    }
    if (r.kind === "function") {
      functions.set(`${r.schema}.${r.name}`, { schema: r.schema, name: r.name, argTypes: [] });
    }
    if (r.kind === "qualified_relation" && PLATFORM_SCHEMAS.has(r.schema)) {
      const key = `${r.schema}.${r.name}`;
      if (!relations.has(key)) {
        let requiredColumns = [];
        if (key === "storage.buckets") requiredColumns = [...REQUIRED_STORAGE_BUCKET_COLUMNS];
        if (key === "storage.objects") requiredColumns = [...REQUIRED_STORAGE_OBJECT_COLUMNS];
        if (key === "supabase_migrations.schema_migrations") requiredColumns = ["version"];
        relations.set(key, {
          schema: r.schema,
          name: r.name,
          kind: "table",
          requiredColumns,
          referencedByOrders: [],
        });
      }
      relations.get(key).referencedByOrders.push(r.order);
    }
  }

  // Always require storage catalog when any storage.* reference exists, or unconditionally
  // for Option D (migrations insert into storage.buckets).
  if (!relations.has("storage.buckets")) {
    relations.set("storage.buckets", {
      schema: "storage",
      name: "buckets",
      kind: "table",
      requiredColumns: [...REQUIRED_STORAGE_BUCKET_COLUMNS],
      referencedByOrders: [],
    });
  }
  if (!relations.has("storage.objects")) {
    relations.set("storage.objects", {
      schema: "storage",
      name: "objects",
      kind: "table",
      requiredColumns: [...REQUIRED_STORAGE_OBJECT_COLUMNS],
      referencedByOrders: [],
    });
  }
  if (!relations.has("supabase_migrations.schema_migrations")) {
    // Do not fabricate / hard-require schema_migrations — CLI 2.116.0 empty-workdir
    // platform startup may omit it. Policy lives on contract.schemaMigrationsPolicy.
  } else {
    const mig = relations.get("supabase_migrations.schema_migrations");
    mig.requiredColumns = [{ name: "version", dataType: "text" }];
    mig.allowEmpty = true;
  }

  functions.set("auth.uid", {
    schema: "auth",
    name: "uid",
    argTypes: [],
    requireSignature: true,
    enforceArgTypes: true,
  });

  for (const [key, rel] of relations) {
    if (key === "storage.buckets" || key === "storage.objects") {
      rel.requireOwner = true;
      rel.requireGrants = true;
      rel.requireRlsProbe = true;
      if (key === "storage.buckets") {
        rel.requiredColumns = [...REQUIRED_STORAGE_BUCKET_COLUMNS];
      }
      if (key === "storage.objects") {
        rel.requiredColumns = [...REQUIRED_STORAGE_OBJECT_COLUMNS];
        rel.requiredConstraints = [{ type: "FOREIGN KEY", columns: ["bucket_id"] }];
      }
    }
    if (key === "auth.users") {
      rel.requireOwner = true;
      rel.requireGrants = true;
      if (!rel.requiredColumns?.length) {
        rel.requiredColumns = [{ name: "id", dataType: "uuid" }];
      }
    }
  }

  for (const [key, fn] of functions) {
    fn.requireSignature = true;
    if (!Array.isArray(fn.argTypes)) fn.argTypes = [];
    if (key === "auth.uid") fn.enforceArgTypes = true;
  }

  return {
    ...base,
    version: "option_d_platform_prerequisites_v3",
    dumpRestoreRejected: true,
    initializationMode: "supabase_cli_platform_only_temp_workdir",
    schemaMigrationsPolicy: base.schemaMigrationsPolicy,
    realtimeInternalSchemaPolicy: base.realtimeInternalSchemaPolicy || REALTIME_INTERNAL_SCHEMA_POLICY,
    generatedFromManifest: path.relative(ROOT, MANIFEST).replace(/\\/g, "/"),
    generatedAt: new Date().toISOString(),
    requiredRoles: [...roles].sort(),
    requiredExtensions: extensions,
    requiredRelations: [...relations.values()]
      .filter((r) => !(r.schema === "supabase_migrations" && r.name === "schema_migrations"))
      .sort((a, b) => `${a.schema}.${a.name}`.localeCompare(`${b.schema}.${b.name}`)),
    requiredFunctions: [...functions.values()].sort((a, b) =>
      `${a.schema}.${a.name}`.localeCompare(`${b.schema}.${b.name}`),
    ),
  };
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const entries = [...manifest.entries].sort((a, b) => a.order - b.order);
  const allRefs = [];
  const missingSources = [];

  for (const entry of entries) {
    const abs = resolveSourcePath(entry);
    if (!abs) {
      missingSources.push(entry.assembledFilename);
      continue;
    }
    const sql = fs.readFileSync(abs, "utf8");
    allRefs.push(...scanSql(sql, entry.assembledFilename, entry.order));
  }

  const contract = buildContract(allRefs);
  const byObject = {};
  for (const r of allRefs) {
    const key = r.schema ? `${r.schema}.${r.name}` : `role:${r.name}`;
    if (!byObject[key]) byObject[key] = { key, kind: r.kind, references: [] };
    byObject[key].references.push({ order: r.order, filename: r.filename, match: r.match });
  }

  const audit = {
    generatedAt: new Date().toISOString(),
    mechanism: "option_d_platform_dependency_audit",
    entryCount: entries.length,
    missingSources,
    referenceCount: allRefs.length,
    distinctObjects: Object.keys(byObject).sort(),
    byObject,
    contractPath: path.relative(ROOT, OUT).replace(/\\/g, "/"),
  };

  fs.writeFileSync(OUT, JSON.stringify(contract, null, 2) + "\n");
  fs.writeFileSync(AUDIT_OUT, JSON.stringify(audit, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        ok: missingSources.length === 0,
        entryCount: entries.length,
        referenceCount: allRefs.length,
        distinctObjects: audit.distinctObjects.length,
        contract: path.relative(ROOT, OUT).replace(/\\/g, "/"),
        audit: path.relative(ROOT, AUDIT_OUT).replace(/\\/g, "/"),
      },
      null,
      2,
    ),
  );
  if (missingSources.length) process.exit(2);
}

if (require.main === module) main();

module.exports = {
  scanSql,
  buildContract,
  stripSqlComments,
  stripSqlStringLiterals,
  resolveSourcePath,
};
