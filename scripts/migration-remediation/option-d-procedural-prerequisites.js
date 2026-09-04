/**
 * Procedural prerequisite extraction for Option D dependency analysis.
 *
 * Detects apply-time checks inside DO blocks (and similar) that FAIL the
 * migration when an object is missing — distinct from safe conditionals
 * (to_regclass IS NOT NULL then DDL) and from trigger/function body
 * postconditions that only fire later at DML time.
 *
 * Classifications:
 *   - required_prerequisite          → must create graph edge; fail static readiness if missing/misordered
 *   - intentionally_verifies_absence → RAISE when object EXISTS (no create-before edge)
 *   - safe_conditional               → work only if object present (no hard fail when absent)
 *   - postcondition_assertion        → RAISE inside CREATE FUNCTION/TRIGGER bodies (not apply-order)
 *
 * Comments / filenames alone are never treated as proof.
 */
function normalizeIdent(name) {
  return String(name || "")
    .replace(/^public\./i, "")
    .replace(/"/g, "")
    .toLowerCase();
}

function snippet(stmt, max = 180) {
  return String(stmt || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * Extract procedural findings from a single SQL statement.
 * @returns {Array<{
 *   classification: string,
 *   objectKind: 'table'|'function'|'constraint',
 *   identity: string,
 *   evidence: string,
 *   snippet: string,
 * }>}
 */
function extractProceduralFindings(stmt) {
  const s = String(stmt || "");
  const findings = [];
  const push = (classification, objectKind, identity, evidence) => {
    const id = normalizeIdent(identity);
    if (!id) return;
    findings.push({
      classification,
      objectKind,
      identity: id,
      evidence,
      snippet: snippet(s),
    });
  };

  // --- required_prerequisite: IF NOT EXISTS (information_schema.tables …) THEN RAISE ---
  for (const m of s.matchAll(
    /if\s+not\s+exists\s*\(\s*select\s+1\s+from\s+information_schema\.tables\b[\s\S]*?table_name\s*=\s*'([^']+)'\s*\)\s*then\s+raise\s+exception/gi,
  )) {
    push("required_prerequisite", "table", m[1], "information_schema.tables_not_exists_then_raise");
  }

  // --- required_prerequisite: IF to_regclass('public.t') IS NULL THEN RAISE ---
  for (const m of s.matchAll(
    /if\s+to_regclass\(\s*'public\.([^']+)'\s*\)\s+is\s+null\s+then\s+raise\s+exception/gi,
  )) {
    push("required_prerequisite", "table", m[1], "to_regclass_is_null_then_raise");
  }

  // --- required_prerequisite: IF to_regprocedure(...) IS NULL THEN RAISE ---
  for (const m of s.matchAll(
    /if\s+to_regprocedure\(\s*'([^']+)'\s*\)\s+is\s+null\s+then\s+raise\s+exception/gi,
  )) {
    const raw = m[1].replace(/^public\./i, "");
    const name = raw.split("(")[0];
    push("required_prerequisite", "function", name, "to_regprocedure_is_null_then_raise");
  }

  // --- intentionally_verifies_absence: IF EXISTS (information_schema.tables …) THEN RAISE ---
  // (not IF NOT EXISTS)
  for (const m of s.matchAll(
    /if\s+exists\s*\(\s*select\s+1\s+from\s+information_schema\.tables\b[\s\S]*?table_name\s*=\s*'([^']+)'\s*\)\s*then\s+raise\s+exception/gi,
  )) {
    // Skip if this match is actually part of IF NOT EXISTS (already handled)
    const start = m.index || 0;
    const prefix = s.slice(Math.max(0, start - 10), start).toLowerCase();
    if (/\bnot\s+$/.test(prefix)) continue;
    push(
      "intentionally_verifies_absence",
      "table",
      m[1],
      "information_schema.tables_exists_then_raise",
    );
  }

  // --- required_prerequisite: pg_constraint conname check then RAISE (missing/incomplete) ---
  for (const m of s.matchAll(
    /from\s+pg_constraint\b[\s\S]{0,500}?conname\s*=\s*'([^']+)'[\s\S]{0,500}?raise\s+exception/gi,
  )) {
    push("required_prerequisite", "constraint", m[1], "pg_constraint_check_then_raise");
  }

  // --- safe_conditional: to_regclass IS NOT NULL then work (no RAISE on absence) ---
  // Record for classification audit; does not create required edges.
  if (
    /to_regclass\(\s*'public\.[^']+'\s*\)\s+is\s+not\s+null/i.test(s) &&
    !/to_regclass\(\s*'public\.[^']+'\s*\)\s+is\s+null\s+then\s+raise/i.test(s)
  ) {
    for (const m of s.matchAll(/to_regclass\(\s*'public\.([^']+)'\s*\)\s+is\s+not\s+null/gi)) {
      push("safe_conditional", "table", m[1], "to_regclass_is_not_null_guard");
    }
  }

  return findings;
}

/**
 * Attach procedural findings onto an analyzeStatement result.
 * Required table prerequisites are also pushed onto consumes.tables so existing
 * consume_table edges / unresolved detection apply.
 */
function attachProceduralPrerequisites(stmt, result) {
  result.proceduralFindings = result.proceduralFindings || [];
  result.consumes.requiredPrerequisiteTables =
    result.consumes.requiredPrerequisiteTables || [];
  result.consumes.requiredPrerequisiteConstraints =
    result.consumes.requiredPrerequisiteConstraints || [];
  result.creates.constraints = result.creates.constraints || [];

  // CREATE / ALTER ADD CONSTRAINT creators (for constraint prerequisite edges)
  if (result.kind === "alter_table" || result.kind === "create_table" || result.kind === "do_block") {
    for (const m of String(stmt).matchAll(/\badd\s+constraint\s+("?[A-Za-z_][\w]*"?)/gi)) {
      const name = normalizeIdent(m[1]);
      if (name && !result.creates.constraints.includes(name)) {
        result.creates.constraints.push(name);
      }
    }
  }

  // Postcondition: RAISE inside CREATE FUNCTION / CREATE TRIGGER — not apply-order deps
  if (
    /^create\s+(?:or\s+replace\s+)?function\b/i.test(stmt) ||
    /^create\s+(?:constraint\s+)?trigger\b/i.test(stmt)
  ) {
    if (/\braise\s+exception\b/i.test(stmt)) {
      result.proceduralFindings.push({
        classification: "postcondition_assertion",
        objectKind: "function_or_trigger_body",
        identity: null,
        evidence: "raise_inside_create_function_or_trigger",
        snippet: snippet(stmt),
      });
    }
    return;
  }

  const findings = extractProceduralFindings(stmt);
  for (const f of findings) {
    result.proceduralFindings.push(f);
    if (f.classification !== "required_prerequisite") continue;
    if (f.objectKind === "table") {
      if (!result.consumes.requiredPrerequisiteTables.includes(f.identity)) {
        result.consumes.requiredPrerequisiteTables.push(f.identity);
      }
      // Also count as unconditional table consume for graph/unresolved
      const tables = result.consumes.tables || [];
      if (!tables.map(normalizeIdent).includes(f.identity)) {
        result.consumes.tables.push(f.identity);
      }
    }
    if (f.objectKind === "constraint") {
      if (!result.consumes.requiredPrerequisiteConstraints.includes(f.identity)) {
        result.consumes.requiredPrerequisiteConstraints.push(f.identity);
      }
    }
  }
}

/**
 * Scan SQL text for required procedural table prerequisites.
 * Caller should split statements if needed; this scans the whole text.
 */
function requiredPrerequisiteTablesInSql(sql) {
  const out = new Set();
  for (const f of extractProceduralFindings(sql)) {
    if (f.classification === "required_prerequisite" && f.objectKind === "table") {
      out.add(f.identity);
    }
  }
  return [...out].sort();
}

module.exports = {
  normalizeIdent,
  extractProceduralFindings,
  attachProceduralPrerequisites,
  requiredPrerequisiteTablesInSql,
};
