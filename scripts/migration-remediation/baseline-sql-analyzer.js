/**
 * SQL object analyzer for baseline dependency validation.
 * Read-only — does not execute SQL or connect to a database.
 */
const fs = require("fs");
const path = require("path");
const {
  functionRefsDeep,
  isSafeConditionalFunctionRef,
} = require("./option-d-function-identity");

const MANIFEST_PATH = path.join(
  __dirname,
  "..",
  "..",
  "docs",
  "migration-remediation",
  "baseline-source-dependency-manifest.json",
);

const SYSTEM_SCHEMAS = new Set([
  "pg_catalog",
  "pg_constraint",
  "pg_class",
  "pg_namespace",
  "information_schema",
]);

const BUILTIN_OBJECTS = new Set([
  "auth",
  "now",
  "gen_random_uuid",
  "uuid_generate_v4",
  "current_timestamp",
  "true",
  "false",
  "null",
]);

/** SQL keywords / schema names that must never be treated as application tables. */
const NOT_A_TABLE = new Set([
  ...SYSTEM_SCHEMAS,
  ...BUILTIN_OBJECTS,
  "public",
  "on",
  "to",
  "from",
  "join",
  "function",
  "procedure",
  "table",
  "schema",
  "database",
  "sequence",
  "type",
  "view",
  "index",
  "policy",
  "trigger",
  "column",
  "constraint",
  "select",
  "lateral",
  "only",
  "if",
  "exists",
  "into",
  "as",
  "and",
  "or",
  "not",
  "all",
  "grant",
  "revoke",
  "pg_extension",
]);

/**
 * Consume schema-qualified public.<ident> relation refs that are not function calls.
 * Word-boundary + not-followed-by-( avoids matching a prefix of foo_bar_baz(.
 */
function consumePublicRelations(stmt, result) {
  for (const ref of stmt.matchAll(
    /\b(?:from|join)\s+public\.([A-Za-z_][\w]*)\b(?!\s*\()/gi,
  )) {
    pushTableConsume(result, ref[1]);
  }
}

function pushTableConsume(result, name) {
  const t = normalizeIdent(name);
  if (!t || NOT_A_TABLE.has(t)) return;
  result.consumes.tables.push(t);
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function normalizeIdent(name) {
  return String(name || "")
    .replace(/^public\./i, "")
    .replace(/"/g, "")
    .toLowerCase();
}

function splitStatements(sql) {
  const stmts = [];
  let buf = "";
  let inSingle = false;
  let inDouble = false;
  let dollarTag = null;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next2 = sql.slice(i, i + 2);

    if (!inSingle && !inDouble && !dollarTag && next2 === "--") {
      const nl = sql.indexOf("\n", i);
      if (nl === -1) break;
      i = nl;
      continue;
    }

    if (!inSingle && !inDouble && ch === "$") {
      const m = sql.slice(i).match(/^\$([A-Za-z0-9_]*)\$/);
      if (m) {
        if (dollarTag === null) {
          dollarTag = m[0];
        } else if (dollarTag === m[0]) {
          dollarTag = null;
        }
        // Always emit the tag into the buffer and advance past it.
        buf += m[0];
        i += m[0].length - 1;
        continue;
      }
    }

    if (!dollarTag) {
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      if (ch === '"' && !inSingle) inDouble = !inDouble;
    }

    if (ch === ";" && !inSingle && !inDouble && !dollarTag) {
      const trimmed = buf.trim();
      if (trimmed && !/^--/.test(trimmed)) stmts.push(trimmed);
      buf = "";
      continue;
    }
    buf += ch;
  }
  const tail = buf.trim();
  if (tail && !/^--/.test(tail)) stmts.push(tail);
  return stmts;
}

function analyzeStatementCore(stmt) {
  const lower = stmt.toLowerCase();
  const result = {
    creates: { extensions: [], tables: [], functions: [], types: [] },
    consumes: { extensions: [], tables: [], functions: [], types: [], columns: [] },
    kind: "other",
  };

  if (/^create\s+extension\b/i.test(stmt)) {
    result.kind = "create_extension";
    const m = stmt.match(/create\s+extension\s+(?:if\s+not\s+exists\s+)?(\w+)/i);
    if (m) result.creates.extensions.push(normalizeIdent(m[1]));
    return result;
  }

  if (/^create\s+table\b/i.test(stmt)) {
    result.kind = "create_table";
    const m = stmt.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?("?\w+"?)/i);
    if (m) result.creates.tables.push(normalizeIdent(m[1]));
    for (const ref of stmt.matchAll(/references\s+(?:public\.)?("?\w+"?)/gi)) {
      result.consumes.tables.push(normalizeIdent(ref[1]));
    }
    return result;
  }

  if (/^create\s+(?:or\s+replace\s+)?function\b/i.test(stmt)) {
    result.kind = "create_function";
    const m = stmt.match(
      /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?("?\w+"?)/i,
    );
    if (m) result.creates.functions.push(normalizeIdent(m[1]));
    return result;
  }

  if (/^create\s+type\b/i.test(stmt)) {
    result.kind = "create_type";
    const m = stmt.match(/create\s+type\s+(?:public\.)?("?\w+"?)/i);
    if (m) result.creates.types.push(normalizeIdent(m[1]));
    return result;
  }

  if (/^alter\s+table\b/i.test(stmt) && /\brename\s+to\b/i.test(stmt)) {
    result.kind = "rename_table";
    const from = stmt.match(
      /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?("?\w+"?)/i,
    );
    const to = stmt.match(/\brename\s+to\s+(?:public\.)?("?\w+"?)/i);
    if (from) result.consumes.tables.push(normalizeIdent(from[1]));
    if (to) result.creates.tables.push(normalizeIdent(to[1]));
    return result;
  }

  if (/^alter\s+table\b/i.test(stmt)) {
    result.kind = "alter_table";
    const m = stmt.match(
      /alter\s+table\s+(?:if\s+(?:not\s+)?exists\s+)?(?:only\s+)?(?:public\.)?("?\w+"?)/i,
    );
    if (m) result.consumes.tables.push(normalizeIdent(m[1]));
    for (const ref of stmt.matchAll(/references\s+(?:public\.)?("?\w+"?)/gi)) {
      result.consumes.tables.push(normalizeIdent(ref[1]));
    }
    return result;
  }

  if (/^create\s+(?:unique\s+)?index\b/i.test(stmt)) {
    result.kind = "create_index";
    const m = stmt.match(/\bon\s+(?:public\.)?("?\w+"?)/i);
    if (m) result.consumes.tables.push(normalizeIdent(m[1]));
    return result;
  }

  if (/^create\s+policy\b/i.test(stmt)) {
    result.kind = "create_policy";
    const m = stmt.match(/\bon\s+(?:public\.)?("?\w+"?)/i);
    if (m) result.consumes.tables.push(normalizeIdent(m[1]));
    for (const ref of stmt.matchAll(/\b(?:from|join)\s+public\.([A-Za-z_][\w]*)\b(?!\s*\()/gi)) {
      pushTableConsume(result, ref[1]);
    }
    return result;
  }

  if (/^create\s+trigger\b/i.test(stmt)) {
    result.kind = "create_trigger";
    const m = stmt.match(/\bon\s+(?:public\.)?("?\w+"?)/i);
    if (m) result.consumes.tables.push(normalizeIdent(m[1]));
    const fn = stmt.match(/execute\s+(?:procedure|function)\s+(?:public\.)?("?\w+"?)/i);
    if (fn) result.consumes.functions.push(normalizeIdent(fn[1]));
    return result;
  }

  if (/^drop\s+trigger\b/i.test(stmt)) {
    result.kind = "drop_trigger";
    const m = stmt.match(/\bon\s+(?:public\.)?("?\w+"?)/i);
    if (m) result.consumes.tables.push(normalizeIdent(m[1]));
    return result;
  }

  if (/^drop\s+policy\b/i.test(stmt)) {
    result.kind = "drop_policy";
    const m = stmt.match(/\bon\s+(?:public\.)?("?\w+"?)/i);
    if (m) result.consumes.tables.push(normalizeIdent(m[1]));
    return result;
  }

  if (/^insert\s+into\b/i.test(stmt)) {
    result.kind = "insert";
    const m = stmt.match(/insert\s+into\s+(?:public\.)?("?\w+"?)/i);
    if (m) pushTableConsume(result, m[1]);
    consumePublicRelations(stmt, result);
    return result;
  }

  if (/^update\s+/i.test(stmt)) {
    result.kind = "update";
    const m = stmt.match(/update\s+(?:only\s+)?(?:public\.)?("?\w+"?)/i);
    if (m) pushTableConsume(result, m[1]);
    consumePublicRelations(stmt, result);
    return result;
  }

  if (/^comment\s+on\s+table\b/i.test(stmt)) {
    result.kind = "comment_table";
    const m = stmt.match(
      /^comment\s+on\s+table\s+(?:if\s+exists\s+)?(?:public\.)?("?\w+"?)/i,
    );
    if (m) pushTableConsume(result, m[1]);
    return result;
  }

  if (/^revoke\b/i.test(stmt)) {
    result.kind = "revoke";
    if (/\bon\s+(?:function|procedure|schema|database|language|sequence|type)\b/i.test(stmt)) {
      return result;
    }
    const m = stmt.match(/\bon\s+(?:table\s+)?(?:public\.)?("?\w+"?)/i);
    if (m) pushTableConsume(result, m[1]);
    return result;
  }

  if (/^do\s+\$\$/i.test(stmt) || /^do\s+\$/i.test(stmt)) {
    result.kind = "do_block";
    for (const ref of stmt.matchAll(
      /alter\s+table\s+(?:if\s+(?:not\s+)?exists\s+)?(?:only\s+)?(?:public\.)?("?\w+"?)/gi,
    )) {
      pushTableConsume(result, ref[1]);
    }
    for (const ref of stmt.matchAll(/references\s+(?:public\.)?("?\w+"?)/gi)) {
      pushTableConsume(result, ref[1]);
    }
    for (const ref of stmt.matchAll(
      /update\s+(?:only\s+)?public\.([A-Za-z_][\w]*)/gi,
    )) {
      pushTableConsume(result, ref[1]);
    }
    for (const ref of stmt.matchAll(
      /\bcreate\s+(?:unique\s+)?index(?:\s+if\s+not\s+exists)?\s+(?:public\.)?[A-Za-z_][\w]*\s+on\s+(?:only\s+)?(?:public\.)?([A-Za-z_][\w]*)/gi,
    )) {
      pushTableConsume(result, ref[1]);
    }
    consumePublicRelations(stmt, result);
    return result;
  }

  return result;
}

function attachFunctionIdentities(stmt, result) {
  result.creates.functionIdentities = result.creates.functionIdentities || [];
  result.consumes.functionIdentities = result.consumes.functionIdentities || [];
  result.consumes.conditionalFunctionIdentities =
    result.consumes.conditionalFunctionIdentities || [];
  for (const ref of functionRefsDeep(stmt)) {
    if (ref.kind === "create_function") {
      if (!result.creates.functions.includes(ref.name)) result.creates.functions.push(ref.name);
      if (!result.creates.functionIdentities.includes(ref.identity)) {
        result.creates.functionIdentities.push(ref.identity);
      }
      continue;
    }
    if (!result.consumes.functions.includes(ref.name)) result.consumes.functions.push(ref.name);
    if (!result.consumes.functionIdentities.includes(ref.identity)) {
      result.consumes.functionIdentities.push(ref.identity);
    }
    if (ref.ifExists || isSafeConditionalFunctionRef(stmt, ref)) {
      if (!result.consumes.conditionalFunctionIdentities.includes(ref.identity)) {
        result.consumes.conditionalFunctionIdentities.push(ref.identity);
      }
    }
    if (result.kind === "other" || result.kind === "revoke") {
      if (ref.kind === "alter_function") result.kind = "alter_function";
      else if (ref.kind === "grant_function" || ref.kind === "revoke_function") result.kind = ref.kind;
      else if (ref.kind === "drop_function") result.kind = "drop_function";
    }
  }
}

function analyzeStatement(stmt) {
  const result = analyzeStatementCore(stmt);
  attachFunctionIdentities(stmt, result);
  return result;
}

function analyzeSql(sql) {
  const stmts = splitStatements(sql);
  const agg = {
    statements: stmts.length,
    creates: {
      extensions: new Set(),
      tables: new Set(),
      functions: new Set(),
      types: new Set(),
      functionIdentities: new Set(),
    },
    consumes: {
      extensions: new Set(),
      tables: new Set(),
      functions: new Set(),
      types: new Set(),
      functionIdentities: new Set(),
      conditionalFunctionIdentities: new Set(),
    },
    byKind: {},
  };

  for (const stmt of stmts) {
    const a = analyzeStatement(stmt);
    agg.byKind[a.kind] = (agg.byKind[a.kind] || 0) + 1;
    for (const k of ["extensions", "tables", "functions", "types"]) {
      for (const v of a.creates[k] || []) agg.creates[k].add(v);
      for (const v of a.consumes[k] || []) {
        if (!BUILTIN_OBJECTS.has(v) && !NOT_A_TABLE.has(v)) agg.consumes[k].add(v);
      }
    }
    for (const id of a.creates.functionIdentities || []) agg.creates.functionIdentities.add(id);
    for (const id of a.consumes.functionIdentities || []) agg.consumes.functionIdentities.add(id);
    for (const id of a.consumes.conditionalFunctionIdentities || []) {
      agg.consumes.conditionalFunctionIdentities.add(id);
    }
  }

  return {
    statements: agg.statements,
    creates: Object.fromEntries(
      Object.entries(agg.creates).map(([k, s]) => [k, [...s].sort()]),
    ),
    consumes: Object.fromEntries(
      Object.entries(agg.consumes).map(([k, s]) => [k, [...s].sort()]),
    ),
    byKind: agg.byKind,
  };
}

function parseBaselineSections(sql) {
  const sections = [];
  const re = /^-- >>> SOURCE: (.+\.sql)\s*$/gm;
  const matches = [...sql.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const file = matches[i][1];
    const start = matches[i].index + matches[i][0].length + 1;
    const end = i + 1 < matches.length ? matches[i + 1].index : sql.lastIndexOf("COMMIT;");
    sections.push({ file, sql: sql.slice(start, end).trim() });
  }
  return sections;
}

function topologicalOrder(manifest) {
  const files = Object.keys(manifest.sources);
  const deps = new Map(files.map((f) => [f, manifest.sources[f].dependsOn || []]));
  const order = [];
  const visiting = new Set();
  const visited = new Set();

  function visit(file) {
    if (visited.has(file)) return;
    if (visiting.has(file)) {
      throw new Error(`Dependency cycle detected involving ${file}`);
    }
    visiting.add(file);
    for (const d of deps.get(file) || []) visit(d);
    visiting.delete(file);
    visited.add(file);
    order.push(file);
  }

  for (const f of files) visit(f);
  return order;
}

function orderedFilesFromPhases(manifest) {
  const out = [];
  for (const phase of manifest.orderingPhases) {
    for (const f of phase.files) out.push(f);
  }
  const all = Object.keys(manifest.sources);
  if (out.length !== all.length) {
    throw new Error(`Phase manifest covers ${out.length} files but sources has ${all.length}`);
  }
  const missing = all.filter((f) => !out.includes(f));
  const extra = out.filter((f) => !all.includes(f));
  if (missing.length || extra.length) {
    throw new Error(`Phase manifest mismatch missing=${missing.join(",")} extra=${extra.join(",")}`);
  }
  return out;
}

function validateManifestGraph(manifest) {
  const errors = [];
  const order = topologicalOrder(manifest);
  const phaseOrder = orderedFilesFromPhases(manifest);
  const pos = new Map(order.map((f, i) => [f, i]));

  for (const [file, meta] of Object.entries(manifest.sources)) {
    for (const dep of meta.dependsOn || []) {
      if (!(pos.get(dep) < pos.get(file))) {
        errors.push(`${file} must come after ${dep} (manifest graph)`);
      }
    }
  }

  for (let i = 0; i < phaseOrder.length; i++) {
    if (phaseOrder[i] !== order[i]) {
      // Phase order must be ONE valid topological order; allow same-tier swaps only if deps satisfied
      const phasePos = new Map(phaseOrder.map((f, j) => [f, j]));
      for (const [file, meta] of Object.entries(manifest.sources)) {
        for (const dep of meta.dependsOn || []) {
          if (!(phasePos.get(dep) < phasePos.get(file))) {
            errors.push(`Phase order: ${file} before dependency ${dep}`);
          }
        }
      }
      break;
    }
  }

  return { ok: errors.length === 0, errors, topologicalOrder: order, phaseOrder };
}

function simulateReplay(
  sections,
  { failOnMissing = true, optionalTables = [], optionalFunctions = [] } = {},
) {
  const optional = new Set(optionalTables.map(normalizeIdent));
  const optionalFn = new Set(optionalFunctions);
  const available = {
    extensions: new Set(),
    tables: new Set(),
    functions: new Set(),
    types: new Set(),
    functionIdentities: new Set(),
  };
  const violations = [];

  for (const section of sections) {
    const stmts = splitStatements(section.sql);
    for (let i = 0; i < stmts.length; i++) {
      const stmt = stmts[i];
      const a = analyzeStatement(stmt);

      for (const ext of a.consumes.extensions) {
        if (!available.extensions.has(ext)) {
          violations.push({
            file: section.file,
            statementIndex: i + 1,
            kind: a.kind,
            missing: `extension ${ext}`,
            snippet: stmt.slice(0, 120),
          });
        }
      }
      for (const tbl of a.consumes.tables) {
        if (optional.has(tbl)) continue;
        if (!available.tables.has(tbl)) {
          violations.push({
            file: section.file,
            statementIndex: i + 1,
            kind: a.kind,
            missing: `table ${tbl}`,
            snippet: stmt.slice(0, 120),
          });
        }
      }
      const identities = a.consumes.functionIdentities || [];
      const conditionalIds = new Set(a.consumes.conditionalFunctionIdentities || []);
      if (identities.length) {
        for (const id of identities) {
          if (conditionalIds.has(id) || optionalFn.has(id)) continue;
          if (!available.functionIdentities.has(id)) {
            violations.push({
              file: section.file,
              statementIndex: i + 1,
              kind: a.kind,
              missing: `function ${id}`,
              snippet: stmt.slice(0, 120),
            });
          }
        }
      } else {
        for (const fn of a.consumes.functions) {
          if (!available.functions.has(fn)) {
            violations.push({
              file: section.file,
              statementIndex: i + 1,
              kind: a.kind,
              missing: `function ${fn}`,
              snippet: stmt.slice(0, 120),
            });
          }
        }
      }

      if (failOnMissing && violations.length) return { ok: false, violations, available };

      for (const ext of a.creates.extensions) available.extensions.add(ext);
      for (const tbl of a.creates.tables) available.tables.add(tbl);
      for (const fn of a.creates.functions) available.functions.add(fn);
      for (const id of a.creates.functionIdentities || []) available.functionIdentities.add(id);
      for (const ty of a.creates.types) available.types.add(ty);
      if (a.kind === "rename_table") {
        for (const oldName of a.consumes.tables) available.tables.delete(oldName);
      }
    }
  }

  return { ok: violations.length === 0, violations, available };
}

function validateFileOrder(fileOrder, manifest, srcDir) {
  const sections = fileOrder.map((file) => ({
    file,
    sql: fs.readFileSync(path.join(srcDir, file), "utf8"),
  }));
  return simulateReplay(sections, {
    optionalTables: manifest.optionalExternalTables || [],
  });
}

function validateBaselineSql(sql, manifest) {
  const sections = parseBaselineSections(sql);
  return simulateReplay(sections, {
    optionalTables: manifest?.optionalExternalTables || [],
  });
}

function lexicographicSourceOrder(manifest, srcDir) {
  const cutoff = manifest.phase1Cutoff;
  return fs
    .readdirSync(srcDir)
    .filter((f) => f.endsWith(".sql") && f < `${cutoff}_` && !manifest.excludeFiles.includes(f))
    .sort();
}

module.exports = {
  loadManifest,
  splitStatements,
  analyzeStatement,
  analyzeSql,
  parseBaselineSections,
  topologicalOrder,
  orderedFilesFromPhases,
  validateManifestGraph,
  simulateReplay,
  validateFileOrder,
  validateBaselineSql,
  lexicographicSourceOrder,
  MANIFEST_PATH,
};
