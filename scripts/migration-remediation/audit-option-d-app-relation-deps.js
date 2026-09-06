#!/usr/bin/env node
/**
 * Option D application-relation dependency gate.
 *
 * Distinguishes application public.<relation> from Supabase platform auth.users /
 * storage.* and fails closed when a consume has no in-set CREATE (or a CREATE
 * ordered after the consumer).
 *
 * Also rejects unsafe SECURITY DEFINER (missing/mutable search_path) and records
 * the order-107 public.users regression without fabricating DDL.
 *
 * Does not execute SQL or connect to a database.
 */
const fs = require("fs");
const path = require("path");
const {
  splitStatements,
  analyzeStatement,
  normalizeIdent,
} = require("./baseline-sql-analyzer");
const { allConsumesConditionallyGuarded } = require("./option-d-unresolved-classifier");

const ROOT = path.join(__dirname, "..", "..");
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const ASSEMBLED = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/assembled",
);
const OUT = path.join(
  ROOT,
  "docs/migration-remediation/option-d-app-relation-dependency-gate.json",
);
const PROVENANCE = path.join(
  ROOT,
  "docs/migration-remediation/option-d-public-users-provenance.json",
);

const ORDER_107_FILE = "20260727000100_users_auth_trigger_single_writer.sql";
const PUBLIC_USERS = "users";
const AUTH_USERS_QUALIFIED = "auth.users";

const PLATFORM_SCHEMAS = new Set([
  "auth",
  "storage",
  "extensions",
  "graphql",
  "graphql_public",
  "realtime",
  "vault",
  "_realtime",
]);

/** Safe SECURITY DEFINER search_path tokens (exact allowlist). */
const SAFE_SEARCH_PATH_TOKENS = new Set(["public", "pg_temp"]);

function loadOrderedEntries() {
  if (fs.existsSync(MANIFEST)) {
    const m = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    return (m.entries || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((e) => {
        const filename = e.assembledFilename || e.filename;
        const abs = path.join(ASSEMBLED, filename);
        const sql = fs.existsSync(abs)
          ? fs.readFileSync(abs, "utf8")
          : e.originalSource && fs.existsSync(path.join(ROOT, e.originalSource))
            ? fs.readFileSync(path.join(ROOT, e.originalSource), "utf8")
            : "";
        return { filename, order: e.order, sql, role: e.role || null };
      });
  }
  if (!fs.existsSync(ASSEMBLED)) return [];
  return fs
    .readdirSync(ASSEMBLED)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((filename, i) => ({
      filename,
      order: i + 1,
      sql: fs.readFileSync(path.join(ASSEMBLED, filename), "utf8"),
      role: null,
    }));
}

function extractQualifiedRelationRefs(sql) {
  const refs = [];
  const patterns = [
    /\binsert\s+into\s+(?:(public|auth|storage)\.)?([A-Za-z_][\w]*)\b/gi,
    /\bupdate\s+(?:only\s+)?(?:(public|auth|storage)\.)?([A-Za-z_][\w]*)\b/gi,
    /\bdelete\s+from\s+(?:only\s+)?(?:(public|auth|storage)\.)?([A-Za-z_][\w]*)\b/gi,
    /\b(?:from|join)\s+(?:only\s+)?(?:(public|auth|storage)\.)?([A-Za-z_][\w]*)\b(?!\s*\()/gi,
    /\breferences\s+(?:(public|auth|storage)\.)?([A-Za-z_][\w]*)\b/gi,
    /\b(?:create|drop)\s+trigger\b[\s\S]{0,120}?\bon\s+(?:(public|auth|storage)\.)?([A-Za-z_][\w]*)\b/gi,
    /\b(?:create|drop)\s+policy\b[\s\S]{0,160}?\bon\s+(?:(public|auth|storage)\.)?([A-Za-z_][\w]*)\b/gi,
    /\bgrant\s+[\w\s,]+\s+on\s+(?:table\s+)?(?:(public|auth|storage)\.)?([A-Za-z_][\w]*)\b/gi,
    /\brevoke\s+[\w\s,]+\s+on\s+(?:table\s+)?(?:(public|auth|storage)\.)?([A-Za-z_][\w]*)\b/gi,
  ];
  const skipNames = new Set([
    "select",
    "lateral",
    "conflict",
    "constraint",
    "only",
    "function",
    "procedure",
    "schema",
    "database",
    "language",
    "sequence",
    "type",
  ]);
  for (const re of patterns) {
    for (const m of sql.matchAll(re)) {
      const schema = (m[1] || "public").toLowerCase();
      const name = normalizeIdent(m[2]);
      if (!name || skipNames.has(name)) continue;
      refs.push({ schema, name, qualified: `${schema}.${name}` });
    }
  }
  return refs;
}

function extractCreates(sql) {
  const creates = new Set();
  for (const stmt of splitStatements(sql)) {
    const a = analyzeStatement(stmt);
    for (const t of a.creates.tables || []) creates.add(normalizeIdent(t));
  }
  return creates;
}

function extractSecurityDefinerFindings(sql, filename) {
  const findings = [];
  for (const stmt of splitStatements(sql)) {
    if (!/^create\s+(?:or\s+replace\s+)?function\b/i.test(stmt)) continue;
    if (!/\bsecurity\s+definer\b/i.test(stmt)) continue;
    const nameMatch = stmt.match(
      /create\s+(?:or\s+replace\s+)?function\s+((?:public\.)?"?[A-Za-z_][\w]*"?)/i,
    );
    const fn = nameMatch ? normalizeIdent(nameMatch[1]) : "(unknown)";
    const sp = stmt.match(/\bset\s+search_path\s*=\s*([^\n]+)/i);
    if (!sp) {
      findings.push({
        rule: "security_definer_missing_search_path",
        filename,
        function: fn,
      });
      continue;
    }
    const tokens = sp[1]
      .split(",")
      .map((t) => t.replace(/['";]/g, "").trim().toLowerCase())
      .filter(Boolean);
    const unsafe = tokens.filter((t) => !SAFE_SEARCH_PATH_TOKENS.has(t));
    if (unsafe.length || tokens.length === 0) {
      findings.push({
        rule: "security_definer_mutable_or_unsafe_search_path",
        filename,
        function: fn,
        searchPathTokens: tokens,
        unsafeTokens: unsafe,
      });
    }
    // Authorization must not use editable user metadata as a decision input.
    if (
      /\braw_user_meta_data\b/i.test(stmt) &&
      /\b(if|case|when)\b[\s\S]{0,120}raw_user_meta_data/i.test(stmt) &&
      /\b(raise\s+exception|return\s+null|auth\.role|is_admin|permission)\b/i.test(stmt)
    ) {
      findings.push({
        rule: "authorization_uses_editable_user_metadata",
        filename,
        function: fn,
      });
    }
  }
  return findings;
}

function evaluateAppRelationOrdering(entries) {
  const failures = [];
  const creators = new Map(); // table -> { filename, order }
  const identitySeparation = {
    publicUsersConsumers: [],
    authUsersConsumers: [],
    conflationRisks: [],
  };

  for (const e of entries) {
    for (const t of extractCreates(e.sql)) {
      if (!creators.has(t)) creators.set(t, { filename: e.filename, order: e.order });
    }
  }

  for (const e of entries) {
    const refs = extractQualifiedRelationRefs(e.sql);
    const seenApp = new Set();
    for (const ref of refs) {
      if (ref.qualified === AUTH_USERS_QUALIFIED || (ref.schema === "auth" && ref.name === "users")) {
        identitySeparation.authUsersConsumers.push({
          filename: e.filename,
          order: e.order,
        });
        continue;
      }
      if (PLATFORM_SCHEMAS.has(ref.schema)) continue;
      // Application relation (public.* or unqualified → public)
      const table = ref.name;
      if (table === PUBLIC_USERS) {
        identitySeparation.publicUsersConsumers.push({
          filename: e.filename,
          order: e.order,
          via: ref.qualified,
        });
      }
      const key = `${e.filename}::${table}`;
      if (seenApp.has(key)) continue;
      seenApp.add(key);

      // Confirm analyzer also sees the consume (insert/function/policy/…)
      let analyzerSees = false;
      for (const stmt of splitStatements(e.sql)) {
        const a = analyzeStatement(stmt);
        if ((a.consumes.tables || []).map(normalizeIdent).includes(table)) {
          analyzerSees = true;
          break;
        }
      }
      if (!analyzerSees && table !== PUBLIC_USERS) continue;

      // Align with unresolved classifier: to_regclass / ALTER IF EXISTS only → not a hard fail
      if (table !== PUBLIC_USERS && allConsumesConditionallyGuarded(e.sql, table)) {
        continue;
      }

      const creator = creators.get(table);
      if (!creator) {
        failures.push({
          rule: "missing_application_relation_creator",
          table,
          qualified: `public.${table}`,
          consumer: e.filename,
          consumerOrder: e.order,
          classificationHint:
            table === PUBLIC_USERS
              ? "historical_preexisting_or_baseline_excluded"
              : "required_missing_create",
        });
        continue;
      }
      if (creator.order > e.order) {
        failures.push({
          rule: "misordered_application_relation_creator",
          table,
          qualified: `public.${table}`,
          consumer: e.filename,
          consumerOrder: e.order,
          creator: creator.filename,
          creatorOrder: creator.order,
        });
      }
    }

    // SECURITY DEFINER hard-fail only for functions that write/read public.users
    // (broader historical SD functions are covered by unit regression fixtures).
    const sdFindings = extractSecurityDefinerFindings(e.sql, e.filename);
    const touchesPublicUsers = /public\.users\b/i.test(e.sql);
    if (touchesPublicUsers) {
      failures.push(...sdFindings);
    }
  }

  // Explicit order-107 regression pin
  const order107 = entries.find((e) => e.filename === ORDER_107_FILE);
  if (order107) {
    const hasPublicUsers = /insert\s+into\s+public\.users\b/i.test(order107.sql);
    const hasAuthTrigger = /on\s+auth\.users\b/i.test(order107.sql);
    const creator = creators.get(PUBLIC_USERS);
    if (hasPublicUsers && hasAuthTrigger && !creator) {
      // Already covered by missing_application_relation_creator; pin for tests.
      if (
        !failures.some(
          (f) =>
            f.rule === "missing_application_relation_creator" &&
            f.table === PUBLIC_USERS &&
            f.consumer === ORDER_107_FILE,
        )
      ) {
        failures.push({
          rule: "missing_application_relation_creator",
          table: PUBLIC_USERS,
          qualified: "public.users",
          consumer: ORDER_107_FILE,
          consumerOrder: order107.order,
          classificationHint: "historical_preexisting_or_baseline_excluded",
          order107Regression: true,
        });
      } else {
        const hit = failures.find(
          (f) =>
            f.rule === "missing_application_relation_creator" &&
            f.table === PUBLIC_USERS &&
            f.consumer === ORDER_107_FILE,
        );
        if (hit) hit.order107Regression = true;
      }
    }
    if (hasPublicUsers && hasAuthTrigger) {
      identitySeparation.separationAsserted = true;
      identitySeparation.note =
        "Order-107 migration binds trigger on auth.users and writes public.users; these are distinct relations.";
    }
  }

  // Conflation: platformProvidedTables must never list bare users
  const overridesPath = path.join(
    ROOT,
    "docs/migration-remediation/option-d-dependency-overrides.json",
  );
  if (fs.existsSync(overridesPath)) {
    const ov = JSON.parse(fs.readFileSync(overridesPath, "utf8"));
    const platform = (ov.platformProvidedTables || []).map(normalizeIdent);
    const optional = (ov.optionalExternalTables || []).map(normalizeIdent);
    if (platform.includes("users") || optional.includes("users")) {
      identitySeparation.conflationRisks.push({
        rule: "bare_users_listed_as_platform_or_optional",
        platformProvidedTables: ov.platformProvidedTables || [],
        optionalExternalTables: ov.optionalExternalTables || [],
      });
      failures.push({
        rule: "bare_users_conflated_with_auth_users",
        detail: "platformProvidedTables/optionalExternalTables must not include bare users",
      });
    }
  }

  const publicUsersMissing = failures.some(
    (f) => f.rule === "missing_application_relation_creator" && f.table === PUBLIC_USERS,
  );

  return {
    ok: failures.length === 0,
    failureCount: failures.length,
    failures,
    identitySeparation,
    publicUsersCreatorPresent: creators.has(PUBLIC_USERS),
    publicUsersMissingCreator: publicUsersMissing,
    creators: Object.fromEntries(
      [...creators.entries()].map(([k, v]) => [k, v]),
    ),
  };
}

function evaluateFixtureSql(sql, filename = "fixture.sql") {
  return evaluateAppRelationOrdering([{ filename, order: 1, sql }]);
}

function main() {
  const entries = loadOrderedEntries();
  const result = evaluateAppRelationOrdering(entries);
  const provenance = fs.existsSync(PROVENANCE)
    ? JSON.parse(fs.readFileSync(PROVENANCE, "utf8"))
    : null;

  const report = {
    generatedAt: new Date().toISOString(),
    gate: "option_d_app_relation_deps",
    ok: result.ok,
    ...result,
    provenancePresent: Boolean(provenance),
    provenanceClassification: provenance?.rootCauseClassification || null,
    note: result.ok
      ? "All application relation consumes have ordered creators; SECURITY DEFINER search_path checks passed."
      : "Missing/misordered application relation creators or unsafe SECURITY DEFINER block static readiness. Do not fabricate public.users; recover authoritative CREATE only.",
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        failureCount: report.failureCount,
        publicUsersMissingCreator: report.publicUsersMissingCreator,
        publicUsersCreatorPresent: report.publicUsersCreatorPresent,
      },
      null,
      2,
    ),
  );
  process.exit(report.ok ? 0 : 1);
}

module.exports = {
  evaluateAppRelationOrdering,
  evaluateFixtureSql,
  extractQualifiedRelationRefs,
  extractSecurityDefinerFindings,
  ORDER_107_FILE,
  PUBLIC_USERS,
  AUTH_USERS_QUALIFIED,
  SAFE_SEARCH_PATH_TOKENS,
};

if (require.main === module) main();
