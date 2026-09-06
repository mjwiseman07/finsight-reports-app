/**
 * Column-level identity helpers for Option D dependency analysis.
 * Identities are `table.column` (public schema, lowercased).
 * Does not execute SQL.
 */

const SQL_KEYWORDS = new Set([
  "constraint",
  "primary",
  "unique",
  "check",
  "foreign",
  "exclude",
  "like",
  "inherits",
  "partition",
]);

function normalizeIdent(name) {
  return String(name || "")
    .replace(/^public\./i, "")
    .replace(/"/g, "")
    .toLowerCase();
}

function columnIdentity(table, column) {
  const t = normalizeIdent(table);
  const c = normalizeIdent(column);
  if (!t || !c) return null;
  return `${t}.${c}`;
}

function pushUnique(arr, value) {
  if (!value) return;
  if (!arr.includes(value)) arr.push(value);
}

/** Extract top-level comma-separated segments inside the first (...) group. */
function splitTopLevelCommaList(body) {
  const parts = [];
  let buf = "";
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inSingle) {
      buf += ch;
      if (ch === "'" && body[i + 1] === "'") {
        buf += body[++i];
        continue;
      }
      if (ch === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      buf += ch;
      if (ch === '"') inDouble = false;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      buf += ch;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      buf += ch;
      continue;
    }
    if (ch === "(") {
      depth++;
      buf += ch;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      buf += ch;
      continue;
    }
    if (ch === "," && depth === 0) {
      parts.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

function extractFirstParenBody(sql, startAt = 0) {
  const open = sql.indexOf("(", startAt);
  if (open < 0) return null;
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  for (let i = open; i < sql.length; i++) {
    const ch = sql[i];
    if (inSingle) {
      if (ch === "'" && sql[i + 1] === "'") {
        i++;
        continue;
      }
      if (ch === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      if (ch === '"') inDouble = false;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return { body: sql.slice(open + 1, i), open, close: i };
    }
  }
  return null;
}

function parseCreateTableColumns(stmt) {
  const m = stmt.match(
    /^create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?("?\w+"?)/i,
  );
  if (!m) return null;
  const table = normalizeIdent(m[1]);
  const paren = extractFirstParenBody(stmt, m.index + m[0].length);
  if (!paren) return { table, columns: [] };
  const columns = [];
  for (const seg of splitTopLevelCommaList(paren.body)) {
    const head = seg.trim().split(/\s+/)[0] || "";
    const ident = normalizeIdent(head);
    if (!ident || SQL_KEYWORDS.has(ident)) continue;
    columns.push(ident);
  }
  return { table, columns };
}

function parseAlterAddColumns(stmt) {
  const m = stmt.match(
    /^alter\s+table\s+(?:if\s+(?:not\s+)?exists\s+)?(?:only\s+)?(?:public\.)?("?\w+"?)/i,
  );
  if (!m) return null;
  const table = normalizeIdent(m[1]);
  const columns = [];
  for (const ref of stmt.matchAll(
    /\badd\s+column\s+(?:if\s+not\s+exists\s+)?(?:"?([A-Za-z_][\w]*)"?)/gi,
  )) {
    columns.push(normalizeIdent(ref[1]));
  }
  return { table, columns, ifExistsTable: /^alter\s+table\s+if\s+exists\b/i.test(stmt) };
}

function parseAlterRenameColumn(stmt) {
  const m = stmt.match(
    /^alter\s+table\s+(?:if\s+(?:not\s+)?exists\s+)?(?:only\s+)?(?:public\.)?("?\w+"?)\s+rename\s+column\s+("?\w+"?)\s+to\s+("?\w+"?)/i,
  );
  if (!m) return null;
  return {
    table: normalizeIdent(m[1]),
    from: normalizeIdent(m[2]),
    to: normalizeIdent(m[3]),
  };
}

function parseIndexColumns(stmt) {
  const m = stmt.match(
    /\bon\s+(?:only\s+)?(?:public\.)?("?\w+"?)\s*\(([^)]*)\)/i,
  );
  if (!m) return null;
  const table = normalizeIdent(m[1]);
  const columns = [];
  for (const seg of splitTopLevelCommaList(m[2])) {
    // skip expression indexes (contain '(') and opclasses with spaces after ident+ops
    if (/\(/.test(seg)) continue;
    const ident = normalizeIdent(seg.trim().split(/\s+/)[0] || "");
    if (ident && !SQL_KEYWORDS.has(ident)) columns.push(ident);
  }
  return { table, columns };
}

/**
 * Simple INSERT…SELECT…FROM single-table column consumes.
 * Attributes bare select-list identifiers to the primary FROM table.
 */
function parseInsertSelectColumnConsumes(stmt) {
  const m = stmt.match(
    /^insert\s+into\s+(?:public\.)?("?\w+"?)\s*(?:\(([^)]*)\))?\s*select\s+([\s\S]+?)\s+from\s+(?:only\s+)?(?:public\.)?("?\w+"?)(?:\s+(?:as\s+)?("?\w+"?))?(?=\s*(?:where|on\s+conflict|group|order|limit|returning|;|$))/i,
  );
  if (!m) return [];
  const fromTable = normalizeIdent(m[4]);
  const maybeAlias = normalizeIdent(m[5] || "");
  // treat trailing token as alias only when it is not a SQL clause keyword
  const CLAUSE = new Set(["where", "on", "group", "order", "limit", "returning", "left", "right", "inner", "cross", "full", "join"]);
  const fromAlias = maybeAlias && !CLAUSE.has(maybeAlias) ? maybeAlias : "";
  const selectList = m[3];
  const hasJoin = /\bjoin\b/i.test(stmt);
  const out = [];
  const LITERALS = new Set(["true", "false", "null"]);
  for (const seg of splitTopLevelCommaList(selectList)) {
    const cleaned = seg.trim().replace(/\s+as\s+"?\w+"?$/i, "").trim();
    if (!cleaned || /\(|\)/.test(cleaned)) continue;
    if (/^'/.test(cleaned) || /^[0-9]/.test(cleaned)) continue;
    const qm = cleaned.match(/^(?:public\.)?("?\w+"?)\.("?\w+"?)$/i);
    if (qm) {
      const qual = normalizeIdent(qm[1]);
      const col = normalizeIdent(qm[2]);
      if (LITERALS.has(col)) continue;
      if (fromAlias && qual === fromAlias) {
        if (!hasJoin) pushUnique(out, columnIdentity(fromTable, col));
        continue;
      }
      if (qual.length <= 3 && qual !== fromTable) continue;
      pushUnique(out, columnIdentity(qual, col));
      continue;
    }
    const bare = cleaned.match(/^("?[A-Za-z_][\w]*"?)$/);
    if (bare) {
      const col = normalizeIdent(bare[1]);
      if (LITERALS.has(col)) continue;
      if (hasJoin) continue;
      pushUnique(out, columnIdentity(fromTable, col));
    }
  }
  return out;
}

function parseUpdateColumnConsumes(stmt) {
  const m = stmt.match(/^update\s+(?:only\s+)?(?:public\.)?("?\w+"?)/i);
  if (!m) return [];
  const table = normalizeIdent(m[1]);
  const out = [];
  for (const ref of stmt.matchAll(/\bset\s+("?\w+"?)\s*=/gi)) {
    pushUnique(out, columnIdentity(table, ref[1]));
  }
  // WHERE table.col / bare col — only qualified to avoid false positives
  for (const ref of stmt.matchAll(
    new RegExp(`\\b(?:public\\.)?${table}\\.("?[A-Za-z_][\\w]*"?)`, "gi"),
  )) {
    pushUnique(out, columnIdentity(table, ref[1]));
  }
  return out;
}

function parseCommentOnColumn(stmt) {
  const m = stmt.match(
    /^comment\s+on\s+column\s+(?:public\.)?("?\w+"?)\.("?\w+"?)/i,
  );
  if (!m) return null;
  return columnIdentity(m[1], m[2]);
}

/**
 * Attach creates/consumes.columnIdentities onto an analyzeStatement result.
 */
function attachColumnIdentities(stmt, result) {
  result.creates.columnIdentities = result.creates.columnIdentities || [];
  result.consumes.columnIdentities = result.consumes.columnIdentities || [];
  result.consumes.conditionalColumnIdentities =
    result.consumes.conditionalColumnIdentities || [];

  if (result.kind === "create_table") {
    const parsed = parseCreateTableColumns(stmt);
    if (parsed) {
      for (const col of parsed.columns) {
        pushUnique(result.creates.columnIdentities, columnIdentity(parsed.table, col));
      }
    }
  }

  if (result.kind === "alter_table") {
    const added = parseAlterAddColumns(stmt);
    if (added) {
      for (const col of added.columns) {
        pushUnique(result.creates.columnIdentities, columnIdentity(added.table, col));
      }
    }
    const renamed = parseAlterRenameColumn(stmt);
    if (renamed) {
      pushUnique(result.consumes.columnIdentities, columnIdentity(renamed.table, renamed.from));
      pushUnique(result.creates.columnIdentities, columnIdentity(renamed.table, renamed.to));
    }
  }

  if (result.kind === "create_index") {
    const idx = parseIndexColumns(stmt);
    if (idx) {
      for (const col of idx.columns) {
        pushUnique(result.consumes.columnIdentities, columnIdentity(idx.table, col));
      }
    }
  }

  if (result.kind === "insert") {
    for (const id of parseInsertSelectColumnConsumes(stmt)) {
      pushUnique(result.consumes.columnIdentities, id);
    }
  }

  if (result.kind === "update") {
    for (const id of parseUpdateColumnConsumes(stmt)) {
      pushUnique(result.consumes.columnIdentities, id);
    }
  }

  const commentCol = parseCommentOnColumn(stmt);
  if (commentCol) {
    result.kind = result.kind === "other" ? "comment_column" : result.kind;
    pushUnique(result.consumes.columnIdentities, commentCol);
  }

  // DO blocks: ADD COLUMN creates; INSERT SELECT / UPDATE consumes
  if (result.kind === "do_block") {
    for (const ref of stmt.matchAll(
      /alter\s+table\s+(?:if\s+(?:not\s+)?exists\s+)?(?:only\s+)?(?:public\.)?("?\w+"?)[\s\S]*?\badd\s+column\s+(?:if\s+not\s+exists\s+)?("?[A-Za-z_][\w]*)/gi,
    )) {
      pushUnique(result.creates.columnIdentities, columnIdentity(ref[1], ref[2]));
    }
    for (const id of parseInsertSelectColumnConsumes(stmt.replace(/^do\s+\$\$/i, "INSERT INTO"))) {
      // DO blocks rarely wrap INSERT as the whole statement; scan nested INSERT…SELECT
    }
    for (const nested of stmt.matchAll(
      /insert\s+into\s+(?:public\.)?("?\w+"?)\s*(?:\(([^)]*)\))?\s*select\s+([\s\S]+?)\s+from\s+(?:only\s+)?(?:public\.)?("?\w+"?)/gi,
    )) {
      const fake = `INSERT INTO ${nested[1]} (${nested[2] || ""}) SELECT ${nested[3]} FROM ${nested[4]}`;
      for (const id of parseInsertSelectColumnConsumes(fake)) {
        pushUnique(result.consumes.columnIdentities, id);
      }
    }
  }
}

function isSafeConditionalColumnRef(stmt, identity) {
  const [table, column] = String(identity).split(".");
  if (!table || !column) return false;
  // information_schema column existence guards
  const colGuard = new RegExp(
    `information_schema\\.columns[\\s\\S]*table_name\\s*=\\s*'${table}'[\\s\\S]*column_name\\s*=\\s*'${column}'`,
    "i",
  );
  if (colGuard.test(stmt) && /\bif\s+not\s+exists\b|\bif\s+exists\b/i.test(stmt)) return true;
  // to_regclass / to_regprocedure gated DO blocks for the owning table
  const reg = new RegExp(
    `to_regclass\\(\\s*'public\\.${table}'\\s*\\)\\s+is\\s+not\\s+null`,
    "i",
  );
  if (reg.test(stmt)) return true;
  return false;
}

module.exports = {
  normalizeIdent,
  columnIdentity,
  parseCreateTableColumns,
  parseAlterAddColumns,
  parseAlterRenameColumn,
  parseIndexColumns,
  parseInsertSelectColumnConsumes,
  parseUpdateColumnConsumes,
  attachColumnIdentities,
  isSafeConditionalColumnRef,
  splitTopLevelCommaList,
};
