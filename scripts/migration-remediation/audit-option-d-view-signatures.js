#!/usr/bin/env node
/**
 * Option D ordered view-signature analysis.
 *
 * PostgreSQL CREATE OR REPLACE VIEW may only append columns; it cannot insert,
 * remove, rename, reorder, or change types of existing output columns.
 * DROP VIEW … CASCADE is rejected for clean-replay unless explicitly inventory-approved
 * (this gate always rejects CASCADE). DROP VIEW IF EXISTS without CASCADE + CREATE VIEW
 * is treated as intentional recreation (signature reset).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { splitStatements } = require("./baseline-sql-analyzer");

const ROOT = path.join(__dirname, "..", "..");
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const ASSEMBLED = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/assembled",
);
const OUT = path.join(
  ROOT,
  "docs/migration-remediation/option-d-view-signature-gate.json",
);

function normalizeIdent(name) {
  return String(name || "")
    .replace(/^public\./i, "")
    .replace(/"/g, "")
    .toLowerCase();
}

/**
 * Extract output column names from a SELECT list (top-level commas only).
 * Supports `expr AS alias` and bare `table.column` / `column`.
 */
function parseSelectListColumns(selectList) {
  const cols = [];
  let depth = 0;
  let start = 0;
  const s = selectList;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === "," && depth === 0) {
      cols.push(columnAliasFromExpr(s.slice(start, i)));
      start = i + 1;
    }
  }
  cols.push(columnAliasFromExpr(s.slice(start)));
  return cols.filter(Boolean);
}

function columnAliasFromExpr(expr) {
  const t = String(expr || "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  const asMatch = t.match(/\bas\s+("?[a-z_][a-z0-9_]*"?)\s*$/i);
  if (asMatch) return normalizeIdent(asMatch[1]);
  // Bare trailing identifier (possibly qualified)
  const bare = t.match(/(?:^|[\s.])("?[a-z_][a-z0-9_]*"?)\s*$/i);
  if (bare) return normalizeIdent(bare[1]);
  return null;
}

/**
 * Extract CREATE VIEW / CREATE OR REPLACE VIEW / DROP VIEW events from SQL.
 */
function extractViewEvents(sql, filename) {
  const events = [];
  for (const stmt of splitStatements(sql)) {
    const drop = stmt.match(
      /^drop\s+view\s+(if\s+exists\s+)?((?:public\.)?"?[a-z_][a-z0-9_]*"?)(\s+cascade)?/i,
    );
    if (drop) {
      events.push({
        kind: "drop_view",
        filename,
        view: normalizeIdent(drop[2]),
        ifExists: Boolean(drop[1]),
        cascade: Boolean(drop[3]),
        snippet: stmt.replace(/\s+/g, " ").trim().slice(0, 180),
      });
      continue;
    }

    const create = stmt.match(
      /^create\s+(or\s+replace\s+)?(?:temp(?:orary)?\s+)?view\s+(?:if\s+not\s+exists\s+)?((?:public\.)?"?[a-z_][a-z0-9_]*"?)\s+as\s+([\s\S]+)$/i,
    );
    if (!create) continue;
    const view = normalizeIdent(create[2]);
    const orReplace = Boolean(create[1]);
    const body = create[3];
    // Prefer SELECT … FROM …; fall back to SELECT … (no FROM) for compact fixtures.
    let selectList = null;
    const withFrom = body.match(/^\s*select\s+([\s\S]+?)\s+from\s+/i);
    if (withFrom) {
      selectList = withFrom[1];
    } else {
      const bare = body.match(/^\s*select\s+([\s\S]+?)\s*;?\s*$/i);
      if (bare) selectList = bare[1].replace(/;\s*$/, "");
    }
    const columns = selectList ? parseSelectListColumns(selectList) : [];
    const securityInvoker = /security_invoker\s*=\s*true/i.test(sql);
    events.push({
      kind: orReplace ? "create_or_replace_view" : "create_view",
      filename,
      view,
      orReplace,
      columns,
      securityInvokerAssertedNearby: securityInvoker,
      snippet: stmt.replace(/\s+/g, " ").trim().slice(0, 180),
    });
  }

  // Also capture ALTER VIEW … SET (security_invoker = …)
  for (const stmt of splitStatements(sql)) {
    const alter = stmt.match(
      /^alter\s+view\s+((?:public\.)?"?[a-z_][a-z0-9_]*"?)\s+set\s*\(\s*security_invoker\s*=\s*(true|false)\s*\)/i,
    );
    if (!alter) continue;
    events.push({
      kind: "alter_view_security_invoker",
      filename,
      view: normalizeIdent(alter[1]),
      securityInvoker: /^true$/i.test(alter[2]),
      snippet: stmt.replace(/\s+/g, " ").trim().slice(0, 180),
    });
  }
  return events;
}

function compareSignatures(prevCols, nextCols) {
  const failures = [];
  const prev = prevCols || [];
  const next = nextCols || [];
  const n = Math.min(prev.length, next.length);
  for (let i = 0; i < n; i++) {
    if (prev[i] !== next[i]) {
      failures.push({
        rule: "view_column_rename_or_reorder",
        index: i,
        previous: prev[i],
        next: next[i],
      });
    }
  }
  if (next.length < prev.length) {
    failures.push({
      rule: "view_column_removed",
      previousCount: prev.length,
      nextCount: next.length,
      removed: prev.slice(next.length),
    });
  }
  // Append-only is OK when prefix matches (no failures above for shared positions)
  const insertedIntoMiddle =
    failures.some((f) => f.rule === "view_column_rename_or_reorder") &&
    next.length > prev.length;
  if (insertedIntoMiddle) {
    failures.push({
      rule: "view_column_inserted_before_existing",
      detail: "New columns appear before an existing column name under CREATE OR REPLACE VIEW",
    });
  }
  return {
    ok: failures.length === 0,
    failures,
    appendOnly:
      failures.length === 0 && next.length >= prev.length && prev.every((c, i) => next[i] === c),
  };
}

/**
 * Evaluate ordered migration entries for view-signature compatibility.
 * @param {{ filename: string, order: number, sql: string }[]} orderedEntries
 */
function evaluateViewSignatureOrdering(orderedEntries) {
  /** @type {Map<string, { columns: string[], filename: string, order: number, securityInvoker: boolean|null }>} */
  const state = new Map();
  const failures = [];
  const transitions = [];

  for (const entry of orderedEntries) {
    const events = extractViewEvents(entry.sql, entry.filename);
    for (const ev of events) {
      if (ev.kind === "drop_view") {
        if (ev.cascade) {
          failures.push({
            rule: "unsafe_drop_view_cascade",
            view: ev.view,
            filename: entry.filename,
            order: entry.order,
            detail: "DROP VIEW … CASCADE is rejected for Option D clean replay",
          });
        }
        state.delete(ev.view);
        transitions.push({
          order: entry.order,
          filename: entry.filename,
          view: ev.view,
          action: ev.cascade ? "drop_cascade" : "drop_if_exists_or_drop",
        });
        continue;
      }

      if (ev.kind === "alter_view_security_invoker") {
        const cur = state.get(ev.view);
        if (cur && cur.securityInvoker === true && ev.securityInvoker === false) {
          failures.push({
            rule: "security_invoker_weakened",
            view: ev.view,
            filename: entry.filename,
            order: entry.order,
          });
        }
        if (cur) cur.securityInvoker = ev.securityInvoker;
        else {
          state.set(ev.view, {
            columns: [],
            filename: entry.filename,
            order: entry.order,
            securityInvoker: ev.securityInvoker,
          });
        }
        continue;
      }

      if (ev.kind === "create_or_replace_view" || ev.kind === "create_view") {
        const prev = state.get(ev.view);
        if (ev.kind === "create_or_replace_view" && prev && prev.columns.length) {
          const cmp = compareSignatures(prev.columns, ev.columns);
          transitions.push({
            order: entry.order,
            filename: entry.filename,
            view: ev.view,
            action: "create_or_replace_view",
            previousColumns: prev.columns,
            nextColumns: ev.columns,
            previousFile: prev.filename,
            compatible: cmp.ok,
            appendOnly: cmp.appendOnly,
          });
          if (!cmp.ok) {
            for (const f of cmp.failures) {
              failures.push({
                ...f,
                view: ev.view,
                filename: entry.filename,
                order: entry.order,
                previousFile: prev.filename,
                previousOrder: prev.order,
              });
            }
          }
        } else {
          transitions.push({
            order: entry.order,
            filename: entry.filename,
            view: ev.view,
            action: ev.kind,
            nextColumns: ev.columns,
          });
        }

        const invoker =
          ev.securityInvokerAssertedNearby ||
          (prev && prev.securityInvoker) ||
          null;
        state.set(ev.view, {
          columns: ev.columns,
          filename: entry.filename,
          order: entry.order,
          securityInvoker: invoker,
        });
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    transitions,
    finalSignatures: Object.fromEntries(
      [...state.entries()].map(([k, v]) => [
        k,
        {
          columns: v.columns,
          filename: v.filename,
          order: v.order,
          securityInvoker: v.securityInvoker,
        },
      ]),
    ),
  };
}

function loadOrderedEntriesFromReplayManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  return [...manifest.entries]
    .sort((a, b) => a.order - b.order)
    .map((e) => {
      const abs = path.join(ASSEMBLED, e.assembledFilename);
      const sql = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
      return { filename: e.assembledFilename, order: e.order, sql };
    });
}

function main() {
  const ordered = loadOrderedEntriesFromReplayManifest();
  const evaluation = evaluateViewSignatureOrdering(ordered);
  const out = {
    generatedAt: new Date().toISOString(),
    mechanism: "option_d_view_signature_gate",
    ok: evaluation.ok,
    failureCount: evaluation.failures.length,
    failures: evaluation.failures,
    transitions: evaluation.transitions.filter(
      (t) =>
        t.view === "audit_ready_tie_out_summary" ||
        (t.action === "create_or_replace_view" && t.compatible === false),
    ),
    finalSignatures: evaluation.finalSignatures,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        ok: out.ok,
        failureCount: out.failureCount,
        sampleFailures: out.failures.slice(0, 5),
        inventoryPath: path.relative(ROOT, OUT).replace(/\\/g, "/"),
      },
      null,
      2,
    ),
  );
  if (!out.ok) process.exit(2);
}

if (require.main === module) main();

module.exports = {
  parseSelectListColumns,
  extractViewEvents,
  compareSignatures,
  evaluateViewSignatureOrdering,
  loadOrderedEntriesFromReplayManifest,
};
