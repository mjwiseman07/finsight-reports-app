#!/usr/bin/env node
/**
 * Option D candidate-set dependency ordering.
 *
 * Explicit deterministic graph (not filename-only sort):
 * - Inferred object edges: CREATE before ALTER mutator chain; CREATE before consumers
 * - Explicit overrides / semanticConstraints from dependency manifest
 * - Stable lexicographic tie-break among ready nodes (no blind reorder)
 * - Unresolved object dependencies flagged for review (not silently ignored)
 *
 * Does not execute SQL or connect to a database.
 */
const fs = require("fs");
const path = require("path");
const {
  analyzeSql,
  analyzeStatement,
  splitStatements,
  simulateReplay,
} = require("./baseline-sql-analyzer");
const {
  ruleSeedDependsOnEdges,
  extractRegistrySeedRuleIds,
  extractCoverageConsumerRuleIds,
  KNOWN_REFERENCE_SEED_FILES,
} = require("./audit-option-d-rule-seed-deps");

const ROOT = path.join(__dirname, "..", "..");
const DEPENDENCY_MANIFEST_PATH = path.join(
  ROOT,
  "docs/migration-remediation/option-d-dependency-manifest.json",
);
const ORDERING_CHANGELOG_PATH = path.join(
  ROOT,
  "docs/migration-remediation/option-d-ordering-changelog.json",
);

/** Objects provided by Supabase platform bootstrap / builtins — not required from candidate SQL. */
const PLATFORM_OR_BUILTIN_TABLES = new Set([
  "auth",
  "users", // auth.users often referenced without schema in policies via auth.uid only; FK to auth.users still needs platform
  // Catalog / false-positive FROM parses (not application tables)
  "pg_class",
  "pg_namespace",
  "pg_proc",
  "pg_constraint",
  "pg_type",
  "pg_attribute",
  "pg_indexes",
  "pg_policies",
  "pg_trigger",
  "pg_roles",
  "information_schema",
  "pg_catalog",
  "storage", // schema name often mis-parsed as table from storage.objects
]);

const PLATFORM_QUALIFIED = new Set([
  "auth.users",
  "auth.uid",
  "storage.objects",
  "storage.buckets",
]);

function normalizeIdent(name) {
  return String(name || "")
    .replace(/^public\./i, "")
    .replace(/"/g, "")
    .toLowerCase();
}

function loadDependencyManifest() {
  if (!fs.existsSync(DEPENDENCY_MANIFEST_PATH)) {
    return {
      version: 1,
      explicitDependsOn: {},
      semanticConstraints: [],
      optionalExternalTables: ["users"],
      platformProvidedTables: ["users"],
      notes: [],
    };
  }
  return JSON.parse(fs.readFileSync(DEPENDENCY_MANIFEST_PATH, "utf8"));
}

/**
 * Analyze a single migration file for creates / alters / consumes.
 */
function analyzeMigrationFile(filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  const base = analyzeSql(sql);
  const alters = new Set();
  const stmts = splitStatements(sql);
  for (const stmt of stmts) {
    const a = analyzeStatement(stmt);
    if (a.kind === "alter_table") {
      for (const t of a.consumes.tables) alters.add(t);
    }
    // CREATE VIEW / MATERIALIZED VIEW — treat as creating a relation and consuming referenced tables
    if (/^create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\b/i.test(stmt)) {
      const m = stmt.match(
        /create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+(?:if\s+not\s+exists\s+)?(?:public\.)?("?\w+"?)/i,
      );
      if (m) base.creates.tables = [...new Set([...(base.creates.tables || []), normalizeIdent(m[1])])];
      for (const ref of stmt.matchAll(/(?:from|join)\s+(?:public\.)?("?\w+"?)/gi)) {
        const t = normalizeIdent(ref[1]);
        if (t && t !== "select" && t !== "lateral") {
          base.consumes.tables = [...new Set([...(base.consumes.tables || []), t])];
        }
      }
    }
  }
  return {
    ...base,
    alters: [...alters].sort(),
  };
}

function isExternalTable(name, depManifest, knownProvidedTables = new Set()) {
  const n = normalizeIdent(name);
  const optional = new Set(
    (depManifest.optionalExternalTables || [])
      .concat(depManifest.platformProvidedTables || [])
      .map(normalizeIdent),
  );
  return (
    optional.has(n) ||
    PLATFORM_OR_BUILTIN_TABLES.has(n) ||
    PLATFORM_QUALIFIED.has(n) ||
    knownProvidedTables.has(n)
  );
}

/**
 * Build inferred + explicit dependency edges for the candidate file set.
 * @param {Array<{filename: string, absPath: string}>} candidates
 * @param {object} depManifest
 * @param {{ knownProvidedTables?: Set<string>|string[] }} [options]
 */
function buildDependencyGraph(candidates, depManifest, options = {}) {
  const knownProvidedTables = new Set(
    [...(options.knownProvidedTables || [])].map(normalizeIdent),
  );
  const knownProvidedFunctions = new Set([...(options.knownProvidedFunctions || [])]);
  const knownProvidedColumns = new Set([...(options.knownProvidedColumns || [])]);
  const byFile = new Map();
  const creators = new Map(); // table -> [files]
  const mutators = new Map(); // table -> [files] create+alter
  const functionCreators = new Map(); // identity -> [files]
  const columnCreators = new Map(); // table.column -> [files]
  const constraintCreators = new Map(); // constraint name -> [files]

  for (const c of candidates) {
    const analysis = analyzeMigrationFile(c.absPath);
    byFile.set(c.filename, { ...c, analysis });
    for (const t of analysis.creates.tables || []) {
      if (!creators.has(t)) creators.set(t, []);
      creators.get(t).push(c.filename);
      if (!mutators.has(t)) mutators.set(t, []);
      mutators.get(t).push(c.filename);
    }
    for (const t of analysis.alters || []) {
      if (!mutators.has(t)) mutators.set(t, []);
      if (!mutators.get(t).includes(c.filename)) mutators.get(t).push(c.filename);
    }
    for (const id of analysis.creates.functionIdentities || []) {
      if (!functionCreators.has(id)) functionCreators.set(id, []);
      functionCreators.get(id).push(c.filename);
    }
    for (const id of analysis.creates.columnIdentities || []) {
      if (!columnCreators.has(id)) columnCreators.set(id, []);
      columnCreators.get(id).push(c.filename);
    }
    for (const id of analysis.creates.constraints || []) {
      if (!constraintCreators.has(id)) constraintCreators.set(id, []);
      constraintCreators.get(id).push(c.filename);
    }
  }

  /** @type {Map<string, Set<string>>} file -> dependsOn set */
  const dependsOn = new Map(candidates.map((c) => [c.filename, new Set()]));
  const edgeReasons = [];

  function addEdge(from, to, reason) {
    if (from === to) return;
    if (!dependsOn.has(from) || !dependsOn.has(to)) return;
    dependsOn.get(from).add(to);
    edgeReasons.push({ from, to, reason });
  }

  // RENAME TABLE moves columns: register new-name identities on the rename file
  // (including columns that only exist on the fixed prefix / knownProvidedColumns).
  // Do NOT transfer columns whose only creators are files that sort after the rename
  // (those belong to a later re-CREATE of the original table name).
  for (const c of candidates) {
    const sql = fs.readFileSync(c.absPath, "utf8");
    for (const stmt of splitStatements(sql)) {
      const a = analyzeStatement(stmt);
      if (a.kind !== "rename_table") continue;
      const from = (a.consumes.tables || [])[0];
      const to = (a.creates.tables || [])[0];
      if (!from || !to) continue;
      const sourceIds = new Set([
        ...[...columnCreators.keys()].filter((id) => id.startsWith(`${from}.`)),
        ...[...knownProvidedColumns].filter((id) => id.startsWith(`${from}.`)),
      ]);
      for (const id of sourceIds) {
        const priorCreators = (columnCreators.get(id) || []).filter((f) => f < c.filename);
        const fromPrefix = knownProvidedColumns.has(id);
        if (!fromPrefix && priorCreators.length === 0) continue;
        const newId = `${to}${id.slice(from.length)}`;
        if (!columnCreators.has(newId)) columnCreators.set(newId, []);
        if (!columnCreators.get(newId).includes(c.filename)) {
          columnCreators.get(newId).push(c.filename);
        }
        for (const prior of priorCreators) {
          addEdge(c.filename, prior, `rename_column_requires:${id}`);
        }
      }
    }
  }

  // CREATE → ALTER: each alter depends on creators that exist before this file
  // (do NOT attach to later re-CREATE of the same table name — that cycles rename/recreate lines).
  for (const [table, files] of mutators) {
    const createSet = new Set(creators.get(table) || []);
    const createFiles = [...createSet];
    for (const f of files) {
      if (createSet.has(f)) continue; // creator itself
      for (const creator of createFiles) {
        if (creator > f) continue;
        addEdge(f, creator, `alter_requires_create:${table}`);
      }
    }
  }

  // Consumers depend on creators (not every alter — avoid blind reorder)
  for (const c of candidates) {
    const analysis = byFile.get(c.filename).analysis;
    for (const t of analysis.consumes.tables || []) {
      if (isExternalTable(t, depManifest, knownProvidedTables)) continue;
      const creates = creators.get(t) || [];
      if (creates.length === 0) continue; // unresolved handled later
      for (const creator of creates) {
        if (creator === c.filename) continue;
        addEdge(c.filename, creator, `consume_table:${t}`);
      }
    }
    for (const id of analysis.consumes.functionIdentities || []) {
      if (knownProvidedFunctions.has(id)) continue;
      const creates = functionCreators.get(id) || [];
      if (creates.length === 0) continue;
      const earliest = [...creates].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[0];
      if (earliest === c.filename) continue;
      addEdge(c.filename, earliest, `consume_function:${id}`);
    }
    for (const id of analysis.consumes.columnIdentities || []) {
      if (knownProvidedColumns.has(id)) continue;
      const creates = columnCreators.get(id) || [];
      if (creates.length === 0) continue;
      const earliest = [...creates].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[0];
      if (earliest === c.filename) continue;
      addEdge(c.filename, earliest, `consume_column:${id}`);
    }
    for (const id of analysis.consumes.requiredPrerequisiteConstraints || []) {
      const creates = constraintCreators.get(id) || [];
      if (creates.length === 0) continue;
      const earliest = [...creates].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[0];
      if (earliest === c.filename) continue;
      addEdge(c.filename, earliest, `procedural_requires_constraint:${id}`);
    }
    for (const id of analysis.consumes.requiredPrerequisiteTables || []) {
      if (isExternalTable(id, depManifest, knownProvidedTables)) continue;
      const creates = creators.get(id) || [];
      if (creates.length === 0) continue;
      for (const creator of creates) {
        if (creator === c.filename) continue;
        addEdge(c.filename, creator, `procedural_requires_table:${id}`);
      }
    }
  }

  // 3) Explicit dependsOn overrides
  for (const [from, tos] of Object.entries(depManifest.explicitDependsOn || {})) {
    for (const to of tos) {
      addEdge(from, to, "explicitDependsOn");
    }
  }

  // 4) Semantic constraints (before must precede after)
  for (const sc of depManifest.semanticConstraints || []) {
    if (!sc.before || !sc.after) continue;
    addEdge(sc.after, sc.before, `semanticConstraint:${sc.reason || "reviewed"}`);
  }

  // 5) Curated rule-seed FK edges: coverage INSERT rule_ids require reference seed creators
  const seedEntries = candidates.map((c) => ({
    filename: c.filename,
    order: 0,
    sql: fs.readFileSync(c.absPath, "utf8"),
  }));
  for (const edge of ruleSeedDependsOnEdges(seedEntries)) {
    if (!dependsOn.has(edge.from) || !dependsOn.has(edge.to)) continue;
    addEdge(edge.from, edge.to, edge.reason);
  }

  // Unresolved: consumed tables/functions with no creator in set and not external
  const unresolved = [];
  // Also surface missing rule-seed creators as unresolved required deps
  const creatorMap = new Map();
  for (const c of candidates) {
    const sql = fs.readFileSync(c.absPath, "utf8");
    for (const id of extractRegistrySeedRuleIds(sql)) {
      if (!creatorMap.has(id) && KNOWN_REFERENCE_SEED_FILES.includes(c.filename)) {
        creatorMap.set(id, c.filename);
      }
    }
  }
  for (const c of candidates) {
    const sql = fs.readFileSync(c.absPath, "utf8");
    for (const id of extractCoverageConsumerRuleIds(sql)) {
      if (!creatorMap.has(id)) {
        unresolved.push({
          file: c.filename,
          kind: "rule_seed",
          identity: id,
          reason: "missing_required_rule_seed_creator",
        });
      }
    }
  }
  for (const c of candidates) {
    const analysis = byFile.get(c.filename).analysis;
    for (const t of analysis.consumes.tables || []) {
      if (isExternalTable(t, depManifest, knownProvidedTables)) continue;
      const creates = creators.get(t) || [];
      if (creates.length === 0) {
        unresolved.push({
          file: c.filename,
          missing: `table ${t}`,
          kind: "table",
          status: "unresolved_requires_review",
          note: "No CREATE TABLE for this object in the Option D candidate set; analyzer cannot prove prerequisite.",
        });
      }
    }
    for (const id of analysis.consumes.functionIdentities || []) {
      if (knownProvidedFunctions.has(id)) continue;
      const creates = functionCreators.get(id) || [];
      if (creates.length === 0) {
        unresolved.push({
          file: c.filename,
          missing: `function ${id}`,
          kind: "function",
          identity: id,
          status: "unresolved_requires_review",
          note: "No CREATE FUNCTION for this exact identity in the Option D candidate set; analyzer cannot prove prerequisite.",
        });
      }
    }
    for (const id of analysis.consumes.columnIdentities || []) {
      if (knownProvidedColumns.has(id)) continue;
      const creates = columnCreators.get(id) || [];
      if (creates.length === 0) {
        unresolved.push({
          file: c.filename,
          missing: `column ${id}`,
          kind: "column",
          identity: id,
          status: "unresolved_requires_review",
          note: "No CREATE TABLE column / ALTER ADD COLUMN for this identity in the Option D candidate set; analyzer cannot prove prerequisite.",
        });
      }
    }
    for (const id of analysis.consumes.requiredPrerequisiteConstraints || []) {
      const creates = constraintCreators.get(id) || [];
      if (creates.length === 0) {
        unresolved.push({
          file: c.filename,
          missing: `constraint ${id}`,
          kind: "constraint",
          identity: id,
          status: "unresolved_requires_review",
          note: "Procedural RAISE requires this constraint; no ADD CONSTRAINT creator in the Option D candidate set.",
        });
      }
    }
  }

  // Dedupe unresolved
  const seenU = new Set();
  const unresolvedUnique = [];
  for (const u of unresolved) {
    const k = `${u.file}|${u.missing}`;
    if (seenU.has(k)) continue;
    seenU.add(k);
    unresolvedUnique.push(u);
  }

  return {
    byFile,
    creators,
    mutators,
    functionCreators,
    columnCreators,
    constraintCreators,
    dependsOn,
    edgeReasons,
    unresolved: unresolvedUnique,
  };
}

/**
 * Kahn topological sort with stable lexicographic priority among ready nodes.
 * @returns {{order: string[], cycles: string[][]}}
 */
function stableTopoSort(filenames, dependsOn) {
  const lex = [...filenames].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const indegree = new Map(filenames.map((f) => [f, 0]));
  const dependents = new Map(filenames.map((f) => [f, []])); // to -> [from...]

  for (const from of filenames) {
    for (const to of dependsOn.get(from) || []) {
      if (!indegree.has(to)) continue;
      // from depends on to ⇒ edge to → from in Kahn terms (to must be processed first)
      indegree.set(from, (indegree.get(from) || 0) + 1);
      dependents.get(to).push(from);
    }
  }

  const ready = lex.filter((f) => indegree.get(f) === 0);
  const order = [];

  while (ready.length) {
    // stable: always pick lexicographically smallest ready
    ready.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const n = ready.shift();
    order.push(n);
    for (const d of dependents.get(n) || []) {
      indegree.set(d, indegree.get(d) - 1);
      if (indegree.get(d) === 0) ready.push(d);
    }
  }

  const cycles = [];
  if (order.length !== filenames.length) {
    const remaining = filenames.filter((f) => !order.includes(f));
    cycles.push(remaining);
  }

  return { order, cycles };
}

function validateNoDuplicatesOrOmissions(candidateNames, orderedNames) {
  const errors = [];
  const cSet = new Set(candidateNames);
  const oSet = new Set(orderedNames);
  if (candidateNames.length !== new Set(candidateNames).size) {
    errors.push("duplicate filenames in candidate set");
  }
  if (orderedNames.length !== new Set(orderedNames).size) {
    errors.push("duplicate filenames in ordered set");
  }
  for (const f of candidateNames) {
    if (!oSet.has(f)) errors.push(`omitted from order: ${f}`);
  }
  for (const f of orderedNames) {
    if (!cSet.has(f)) errors.push(`extra in order: ${f}`);
  }
  return errors;
}

/**
 * Compare lexicographic post-phase1 order vs dependency order; document moves.
 */
function buildOrderingChangelog(lexOrder, depOrder, edgeReasons, graph) {
  const lexPos = new Map(lexOrder.map((f, i) => [f, i + 1]));
  const depPos = new Map(depOrder.map((f, i) => [f, i + 1]));
  const moves = [];
  for (const f of depOrder) {
    const from = lexPos.get(f);
    const to = depPos.get(f);
    if (from !== to) {
      moves.push({
        filename: f,
        lexicographicOrder: from,
        dependencyOrder: to,
        delta: to - from,
      });
    }
  }
  moves.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const recurring = {
    createdBy: "20260714_00_d5_recurring_templates.sql",
    requiredBy: "20260703_1200_d6_0_vertical_rule_foundation.sql",
    lexWouldFailAtOrder: 10,
    regression:
      "Filename order places d6_0 before d5; ALTER/FK on recurring_fires fails with 42P01.",
    dependencyOrderSatisfied:
      (depPos.get("20260714_00_d5_recurring_templates.sql") || 0) <
      (depPos.get("20260703_1200_d6_0_vertical_rule_foundation.sql") || 0),
  };

  return {
    generatedAt: new Date().toISOString(),
    policy:
      "explicit_dependsOn_plus_inferred_mutator_chains_and_creator_edges_stable_lex_tiebreak",
    candidateCount: depOrder.length,
    lexicographicOrder: lexOrder,
    dependencyOrder: depOrder,
    movedCount: moves.length,
    moves,
    recurringFiresRegression: recurring,
    edgeCount: edgeReasons.length,
    sampleEdges: edgeReasons
      .filter(
        (e) =>
          e.from.includes("d6_0") ||
          e.to.includes("d5_recurring") ||
          e.reason.includes("recurring_fires"),
      )
      .slice(0, 40),
    unresolvedCount: graph.unresolved.length,
  };
}

/**
 * Compute full Option D dependency order for a candidate list.
 */
function computeOptionDDependencyOrder(
  candidates,
  depManifest = loadDependencyManifest(),
  options = {},
) {
  const names = candidates.map((c) => c.filename);
  const lexOrder = [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const graph = buildDependencyGraph(candidates, depManifest, options);
  const { order, cycles } = stableTopoSort(names, graph.dependsOn);
  const integrity = validateNoDuplicatesOrOmissions(names, order);
  const changelog = buildOrderingChangelog(lexOrder, order, graph.edgeReasons, graph);

  const sources = {};
  for (const c of candidates) {
    const analysis = graph.byFile.get(c.filename).analysis;
    sources[c.filename] = {
      dependsOn: [...(graph.dependsOn.get(c.filename) || [])].sort(),
      createsTables: analysis.creates.tables || [],
      altersTables: analysis.alters || [],
      consumesTables: analysis.consumes.tables || [],
      createsFunctionIdentities: analysis.creates.functionIdentities || [],
      consumesFunctionIdentities: analysis.consumes.functionIdentities || [],
    };
  }

  return {
    ok: cycles.length === 0 && integrity.length === 0,
    order,
    lexOrder,
    cycles,
    integrityErrors: integrity,
    unresolved: graph.unresolved,
    edgeReasons: graph.edgeReasons,
    sources,
    changelog,
    depManifest,
    graph,
  };
}

/**
 * Simulate object-availability replay for ordered candidates.
 */
function simulateCandidateOrder(orderedCandidates, depManifest) {
  const sections = orderedCandidates.map((c) => ({
    filename: c.filename,
    file: c.filename,
    sql: fs.readFileSync(c.absPath, "utf8"),
  }));
  return simulateReplay(sections, {
    optionalTables: (depManifest.optionalExternalTables || []).concat(
      depManifest.platformProvidedTables || [],
    ),
    optionalFunctions: depManifest.optionalFunctions || [],
  });
}

function writeDependencyArtifacts(result, { writeChangelog = true, classification = null } = {}) {
  const required = (classification?.classifications || []).filter(
    (c) => c.classification === "required_missing_create",
  );
  const depManifest = {
    version: 1,
    description:
      "Explicit deterministic dependency graph for the complete Option D candidate replay set. Assembler MUST apply dependencyOrder (not lexicographic filename sort).",
    generatedAt: new Date().toISOString(),
    orderingPolicy: result.changelog.policy,
    testedFailureRegression: {
      pr313EvidenceHead: "de535f63335e4e73066903bb5d77489c9f8aad99",
      failedAt: "20260707120000_d_assertions_part_1_schema_and_backfill.sql",
      failedOrder: 36,
      sqlState: "23503",
      error:
        'insert or update on table "rule_assertion_coverage" violates foreign key constraint "rule_assertion_coverage_rule_id_fkey"',
      missingKey: "gen.accrual_reversal_check",
      prerequisite: "20260703_1200_d6_0_vertical_rule_foundation.sql",
      priorRecurringRegression: {
        pr313EvidenceHead: "8ad27be6d8260669d9e800aee11397e4bb545988",
        failedAt: "20260703_1200_d6_0_vertical_rule_foundation.sql",
        prerequisite: "20260714_00_d5_recurring_templates.sql",
      },
    },
    optionalExternalTables: result.depManifest.optionalExternalTables || ["users"],
    platformProvidedTables: result.depManifest.platformProvidedTables || ["users"],
    explicitDependsOn: result.depManifest.explicitDependsOn || {},
    semanticConstraints: result.depManifest.semanticConstraints || [],
    dependencyOrder: result.order,
    lexicographicOrder: result.lexOrder,
    sources: result.sources,
    unresolvedDependencies: result.unresolved,
    unresolvedClassification: classification,
    requiredUnresolvedCount: required.length,
    requiredDependenciesResolved: required.length === 0,
    cycles: result.cycles,
    integrityErrors: result.integrityErrors,
    ok: result.ok && required.length === 0,
  };

  fs.mkdirSync(path.dirname(DEPENDENCY_MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(DEPENDENCY_MANIFEST_PATH, JSON.stringify(depManifest, null, 2) + "\n");

  if (writeChangelog) {
    fs.writeFileSync(ORDERING_CHANGELOG_PATH, JSON.stringify(result.changelog, null, 2) + "\n");
  }

  return { depManifest, changelogPath: ORDERING_CHANGELOG_PATH, manifestPath: DEPENDENCY_MANIFEST_PATH };
}

module.exports = {
  DEPENDENCY_MANIFEST_PATH,
  ORDERING_CHANGELOG_PATH,
  loadDependencyManifest,
  analyzeMigrationFile,
  buildDependencyGraph,
  stableTopoSort,
  computeOptionDDependencyOrder,
  simulateCandidateOrder,
  writeDependencyArtifacts,
  validateNoDuplicatesOrOmissions,
};
