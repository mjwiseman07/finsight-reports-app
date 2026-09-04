#!/usr/bin/env node
/**
 * Classify Option D "missing CREATE" findings without suppressing them.
 *
 * Each consume with no CREATE in-set is one of:
 *   - prefix_or_baseline      (created by foundations/phase1 prefix)
 *   - rename_created          (ALTER TABLE … RENAME TO supplies the name)
 *   - safe_conditional        (all executable refs gated by to_regclass / IF EXISTS)
 *   - required_missing_create (unconditional DDL/DML — gate must fail)
 *
 * Does not invent tables or drop unresolved rows.
 */
const fs = require("fs");
const path = require("path");
const { splitStatements, analyzeStatement } = require("./baseline-sql-analyzer");
const {
  functionRefsDeep,
  isSafeConditionalFunctionRef,
} = require("./option-d-function-identity");

function normalizeIdent(name) {
  return String(name || "")
    .replace(/^public\./i, "")
    .replace(/"/g, "")
    .toLowerCase();
}

function snippet(stmt, max = 220) {
  return String(stmt || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function regclassGuardRe(table) {
  const t = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `to_regclass\\(\\s*'public\\.${t}'\\s*\\)\\s+is\\s+not\\s+null`,
    "i",
  );
}

/**
 * True when every consume of `table` in this SQL is inside a DO block
 * that only runs ALTER/INDEX/VIEW work after to_regclass(public.table) IS NOT NULL,
 * or is ALTER TABLE IF EXISTS / DROP POLICY IF EXISTS / CREATE INDEX IF NOT EXISTS
 * solely inside that same guarded DO.
 */
function allConsumesConditionallyGuarded(sql, table) {
  const stmts = splitStatements(sql);
  const t = normalizeIdent(table);
  let sawConsume = false;
  for (const stmt of stmts) {
    const a = analyzeStatement(stmt);
    const consumes = (a.consumes.tables || []).map(normalizeIdent).includes(t);
    if (!consumes) continue;
    sawConsume = true;

    if (a.kind === "do_block") {
      if (regclassGuardRe(t).test(stmt)) continue;
      return false;
    }

    // ALTER TABLE IF EXISTS at top level is a no-op when missing
    if (a.kind === "alter_table" && /^alter\s+table\s+if\s+exists\b/i.test(stmt)) {
      continue;
    }

    return false;
  }
  return sawConsume;
}

function firstConsumingStatements(sql, table, limit = 4) {
  const t = normalizeIdent(table);
  const out = [];
  for (const stmt of splitStatements(sql)) {
    const a = analyzeStatement(stmt);
    if (!(a.consumes.tables || []).map(normalizeIdent).includes(t)) continue;
    out.push({
      kind: a.kind,
      executesWhen:
        a.kind === "do_block" && regclassGuardRe(t).test(stmt)
          ? "only_if_to_regclass_not_null"
          : a.kind === "alter_table" && /^alter\s+table\s+if\s+exists\b/i.test(stmt)
            ? "alter_if_exists_noop_when_missing"
            : "unconditional_on_apply",
      snippet: snippet(stmt),
    });
    if (out.length >= limit) break;
  }
  return out;
}

function firstConsumingFunctionStatements(sql, identity, limit = 4) {
  const out = [];
  for (const stmt of splitStatements(sql)) {
    const refs = functionRefsDeep(stmt).filter(
      (r) => r.kind !== "create_function" && r.identity === identity,
    );
    if (!refs.length) continue;
    const conditional = refs.every((r) => r.ifExists || isSafeConditionalFunctionRef(stmt, r));
    out.push({
      kind: refs[0].kind,
      executesWhen: conditional
        ? "only_if_function_exists_or_to_regprocedure"
        : "unconditional_on_apply",
      snippet: snippet(stmt),
    });
    if (out.length >= limit) break;
  }
  return out;
}

function allFunctionConsumesConditionallyGuarded(sql, identity) {
  const stmts = splitStatements(sql);
  let sawConsume = false;
  for (const stmt of stmts) {
    const refs = functionRefsDeep(stmt).filter(
      (r) => r.kind !== "create_function" && r.identity === identity,
    );
    if (!refs.length) continue;
    sawConsume = true;
    if (!refs.every((r) => r.ifExists || isSafeConditionalFunctionRef(stmt, r))) return false;
  }
  return sawConsume;
}

/**
 * @param {object} args
 * @param {Array<{file: string, missing: string}>} args.unresolved
 * @param {Array<{filename: string, absPath: string}>} args.candidates
 * @param {object} args.graph  { creators: Map, byFile: Map }
 * @param {Set<string>|string[]} args.knownProvidedTables
 * @param {Set<string>|string[]} [args.knownProvidedFunctions]
 * @param {object} [args.lineageHints] productionName → { localFilename, classification }
 */
function classifyUnresolvedOccurrences({
  unresolved,
  candidates,
  graph,
  knownProvidedTables = new Set(),
  knownProvidedFunctions = new Set(),
  knownProvidedColumns = new Set(),
  lineageHints = {},
}) {
  const provided = new Set([...knownProvidedTables].map(normalizeIdent));
  const providedFns = new Set([...knownProvidedFunctions]);
  const providedCols = new Set([...knownProvidedColumns]);
  const byName = new Map(candidates.map((c) => [c.filename, c]));
  const classifications = [];

  for (const u of unresolved) {
    const isFunction =
      u.kind === "function" || /^function\s+/i.test(String(u.missing || ""));
    const isColumn =
      u.kind === "column" || /^column\s+/i.test(String(u.missing || ""));
    const isConstraint =
      u.kind === "constraint" || /^constraint\s+/i.test(String(u.missing || ""));
    if (isConstraint) {
      const identity =
        u.identity || String(u.missing || "").replace(/^constraint\s+/i, "").trim();
      const creators = [...(graph.constraintCreators?.get(identity) || [])];
      let classification = "required_missing_create";
      let prerequisiteSource = "none_in_git_candidate_set";
      let justifiedExclusion = false;
      let dependencyEdge = null;
      let rationale =
        "Procedural RAISE requires this constraint (pg_constraint check); no ADD CONSTRAINT creator in the Option D candidate set.";
      if (creators.length) {
        classification = "rename_or_create_in_set";
        prerequisiteSource = creators.join(", ");
        dependencyEdge = {
          from: u.file,
          to: creators[0],
          reason: `procedural_requires_constraint:${identity}`,
        };
        rationale =
          "ADD CONSTRAINT in the candidate set supplies this name; procedural consumer must be ordered after that creator.";
      }
      classifications.push({
        file: u.file,
        missing: u.missing,
        kind: "constraint",
        identity,
        table: null,
        classification,
        prerequisiteSource,
        justifiedExclusion,
        absentObjectGenuinelySafe: false,
        dependencyEdge,
        executesWhen: ["unconditional_on_apply"],
        statements: [],
        renameCreatorsInSet: [],
        rationale,
      });
      continue;
    }
    if (isColumn) {
      const identity = u.identity || String(u.missing || "").replace(/^column\s+/i, "").trim();
      const cand = byName.get(u.file);
      const sql = cand ? fs.readFileSync(cand.absPath, "utf8") : "";
      const creators = [...(graph.columnCreators?.get(identity) || [])];
      const statements = [];
      if (sql) {
        for (const stmt of splitStatements(sql)) {
          const a = analyzeStatement(stmt);
          if (!(a.consumes.columnIdentities || []).includes(identity)) continue;
          statements.push({
            kind: a.kind,
            executesWhen: (a.consumes.conditionalColumnIdentities || []).includes(identity)
              ? "only_if_column_exists_guard"
              : "unconditional_on_apply",
            snippet: snippet(stmt),
          });
          if (statements.length >= 4) break;
        }
      }

      let classification = "required_missing_create";
      let prerequisiteSource = null;
      let justifiedExclusion = false;
      let dependencyEdge = null;
      let absentObjectGenuinelySafe = false;
      let rationale = "";

      if (providedCols.has(identity)) {
        classification = "prefix_or_baseline";
        prerequisiteSource = "foundations_baseline_or_phase1_prefix";
        justifiedExclusion = true;
        absentObjectGenuinelySafe = true;
        rationale = "Column identity is created in the fixed Option D prefix (baseline/phase1).";
      } else if (creators.length) {
        classification = "rename_or_create_in_set";
        prerequisiteSource = creators.join(", ");
        dependencyEdge = {
          from: u.file,
          to: creators[0],
          reason: `consume_column:${identity}`,
        };
        rationale =
          "A CREATE TABLE column list or ALTER ADD COLUMN in the candidate set supplies this identity; consumer must be ordered after that creator.";
      } else if (
        statements.length &&
        statements.every((s) => s.executesWhen === "only_if_column_exists_guard")
      ) {
        classification = "safe_conditional";
        prerequisiteSource = "none_in_candidate_set";
        justifiedExclusion = true;
        absentObjectGenuinelySafe = true;
        rationale =
          "Every analyzed column consume is guarded by information_schema column existence checks.";
      } else {
        classification = "required_missing_create";
        prerequisiteSource = "none_in_git_candidate_set";
        justifiedExclusion = false;
        absentObjectGenuinelySafe = false;
        rationale =
          "Unconditional index/DML/comment against a column identity with no CREATE/ADD COLUMN in the Option D candidate set. Clean replay will fail with undefined_column.";
      }

      classifications.push({
        file: u.file,
        missing: u.missing,
        kind: "column",
        identity,
        table: identity.split(".")[0] || null,
        classification,
        prerequisiteSource,
        justifiedExclusion,
        absentObjectGenuinelySafe,
        dependencyEdge,
        executesWhen: statements.map((s) => s.executesWhen),
        statements,
        renameCreatorsInSet: [],
        rationale,
      });
      continue;
    }
    if (isFunction) {
      const identity = u.identity || String(u.missing || "").replace(/^function\s+/i, "").trim();
      const cand = byName.get(u.file);
      const sql = cand ? fs.readFileSync(cand.absPath, "utf8") : "";
      const statements = sql ? firstConsumingFunctionStatements(sql, identity) : [];
      const creators = [...(graph.functionCreators?.get(identity) || [])];

      let classification = "required_missing_create";
      let prerequisiteSource = null;
      let justifiedExclusion = false;
      let dependencyEdge = null;
      let absentObjectGenuinelySafe = false;
      let rationale = "";

      if (providedFns.has(identity)) {
        classification = "prefix_or_baseline";
        prerequisiteSource = "foundations_baseline_or_phase1_prefix";
        justifiedExclusion = true;
        absentObjectGenuinelySafe = true;
        rationale = "Function identity is created in the fixed Option D prefix (baseline/phase1).";
      } else if (creators.length) {
        classification = "rename_or_create_in_set";
        prerequisiteSource = creators.join(", ");
        dependencyEdge = { from: u.file, to: creators[0], reason: `consume_function:${identity}` };
        rationale = "A CREATE FUNCTION in the candidate set supplies this exact identity.";
      } else if (sql && allFunctionConsumesConditionallyGuarded(sql, identity)) {
        classification = "safe_conditional";
        prerequisiteSource = "none_in_candidate_set";
        justifiedExclusion = true;
        absentObjectGenuinelySafe = true;
        rationale =
          "Every analyzed consume is DROP/ALTER IF EXISTS or inside DO $$ guarded by to_regprocedure. Absent function is a no-op, not 42883.";
      } else {
        classification = "required_missing_create";
        prerequisiteSource = "none_in_git_candidate_set";
        justifiedExclusion = false;
        absentObjectGenuinelySafe = false;
        rationale =
          "Unconditional ALTER/GRANT/REVOKE/trigger binding against a function identity with no CREATE FUNCTION in the Option D candidate set (and not prefix-provided). Clean replay will fail.";
      }

      classifications.push({
        file: u.file,
        missing: u.missing,
        kind: "function",
        identity,
        table: null,
        classification,
        prerequisiteSource,
        justifiedExclusion,
        absentObjectGenuinelySafe,
        dependencyEdge,
        executesWhen: statements.map((s) => s.executesWhen),
        statements,
        renameCreatorsInSet: [],
        rationale,
      });
      continue;
    }

    const table = String(u.missing || "")
      .replace(/^table\s+/i, "")
      .trim();
    const t = normalizeIdent(table);
    const cand = byName.get(u.file);
    const sql = cand ? fs.readFileSync(cand.absPath, "utf8") : "";
    const statements = sql ? firstConsumingStatements(sql, t) : [];
    const creators = [...(graph.creators?.get(t) || [])];
    const renameCreators = [];
    if (graph.byFile) {
      for (const [fname, rec] of graph.byFile) {
        const kinds = rec.analysis?.byKind || {};
        if ((rec.analysis?.creates?.tables || []).includes(t) && kinds.rename_table) {
          renameCreators.push(fname);
        }
      }
    }

    let classification = "required_missing_create";
    let prerequisiteSource = null;
    let justifiedExclusion = false;
    let dependencyEdge = null;
    let absentObjectGenuinelySafe = false;
    let rationale = "";

    if (provided.has(t)) {
      classification = "prefix_or_baseline";
      prerequisiteSource = "foundations_baseline_or_phase1_prefix";
      justifiedExclusion = true;
      absentObjectGenuinelySafe = true;
      rationale = "Object is created in the fixed Option D prefix (baseline/phase1).";
    } else if (creators.length) {
      classification = "rename_or_create_in_set";
      prerequisiteSource = creators.join(", ");
      dependencyEdge = { from: u.file, to: creators[0], reason: `consume_table:${t}` };
      rationale = "A CREATE or RENAME in the candidate set supplies this name.";
    } else if (sql && allConsumesConditionallyGuarded(sql, t)) {
      classification = "safe_conditional";
      prerequisiteSource = "none_in_candidate_set";
      justifiedExclusion = true;
      absentObjectGenuinelySafe = true;
      rationale =
        "Every analyzed consume executes only inside IF to_regclass(public.<table>) IS NOT NULL (or ALTER IF EXISTS). Absent table is a no-op, not 42P01.";
    } else {
      classification = "required_missing_create";
      const hint = lineageHints[t];
      prerequisiteSource = hint
        ? `production_only:${hint.productionName || t}@${hint.productionVersion || "unknown"} localFilename=${hint.localFilename}`
        : "none_in_git_candidate_set";
      justifiedExclusion = false;
      absentObjectGenuinelySafe = false;
      rationale =
        "Unconditional ALTER/POLICY/INDEX/DML against a relation with no CREATE/RENAME in the Option D candidate set (and not prefix-provided). Clean replay will fail.";
    }

    classifications.push({
      file: u.file,
      missing: u.missing,
      kind: "table",
      identity: null,
      table: t,
      classification,
      prerequisiteSource,
      justifiedExclusion,
      absentObjectGenuinelySafe,
      dependencyEdge,
      executesWhen: statements.map((s) => s.executesWhen),
      statements,
      renameCreatorsInSet: renameCreators,
      rationale,
    });
  }

  const required = classifications.filter((c) => c.classification === "required_missing_create");
  return {
    generatedAt: new Date().toISOString(),
    occurrenceCount: classifications.length,
    requiredCount: required.length,
    requiredDependenciesResolved: required.length === 0,
    classifications,
  };
}

function loadLineageHints(root) {
  const p = path.join(root, "docs/migration-remediation/migration-lineage-classification.json");
  if (!fs.existsSync(p)) return {};
  const doc = JSON.parse(fs.readFileSync(p, "utf8"));
  const hints = {};
  for (const row of doc.production || []) {
    const name = row.productionName;
    if (!name) continue;
    hints[normalizeIdent(name)] = row;
  }
  return hints;
}

module.exports = {
  classifyUnresolvedOccurrences,
  allConsumesConditionallyGuarded,
  allFunctionConsumesConditionallyGuarded,
  firstConsumingStatements,
  firstConsumingFunctionStatements,
  loadLineageHints,
  normalizeIdent,
};
