/**
 * Parse Postgres function identity arguments for Option D dependency tracking.
 * Identities are schema.name(normalized_types) — overloads are distinct.
 * Read-only; does not execute SQL.
 */

const TYPE_ALIASES = {
  "timestamp with time zone": "timestamptz",
  "timestamp without time zone": "timestamp",
  "time with time zone": "timetz",
  "time without time zone": "time",
  "character varying": "varchar",
  "character": "bpchar",
  "double precision": "float8",
  "boolean": "bool",
  "integer": "int4",
  "smallint": "int2",
  "bigint": "int8",
  "real": "float4",
};

const TYPE_START = new Set([
  "uuid",
  "text",
  "jsonb",
  "json",
  "bool",
  "boolean",
  "int",
  "int2",
  "int4",
  "int8",
  "integer",
  "smallint",
  "bigint",
  "numeric",
  "decimal",
  "float4",
  "float8",
  "real",
  "double",
  "varchar",
  "char",
  "bpchar",
  "character",
  "bytea",
  "date",
  "time",
  "timetz",
  "timestamp",
  "timestamptz",
  "interval",
  "name",
  "oid",
  "regclass",
  "regtype",
  "regprocedure",
  "regproc",
  "anyelement",
  "anyarray",
  "record",
  "void",
  "trigger",
  "event_trigger",
  "cstring",
  "unknown",
]);

const MODES = new Set(["in", "out", "inout", "variadic"]);

function normalizeIdent(name) {
  return String(name || "")
    .replace(/^public\./i, "")
    .replace(/"/g, "")
    .toLowerCase();
}

function matchingParen(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitTopLevel(argList) {
  const out = [];
  let depth = 0;
  let buf = "";
  for (const ch of argList) {
    if (ch === "(") {
      depth += 1;
      buf += ch;
    } else if (ch === ")") {
      depth -= 1;
      buf += ch;
    } else if (ch === "," && depth === 0) {
      out.push(buf.trim());
      buf = "";
    } else buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function stripDefault(arg) {
  return arg.replace(/\s+default\s+[\s\S]+$/i, "").trim();
}

function normalizeType(raw) {
  let t = raw.replace(/\s+/g, " ").trim().toLowerCase();
  t = t.replace(/\bwithout time zone\b/g, "without time zone");
  const keys = Object.keys(TYPE_ALIASES).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (t === k || t.startsWith(`${k} `) || t.startsWith(`${k}[`)) {
      t = TYPE_ALIASES[k] + t.slice(k.length);
      break;
    }
  }
  t = t.replace(/\s+setof\s+/g, " ");
  t = t.replace(/^setof\s+/, "");
  t = t.replace(/\s+/g, "");
  return t;
}

function argToType(arg) {
  let s = stripDefault(arg).replace(/\s+/g, " ").trim();
  if (!s) return null;
  const tokens = s.split(" ");
  let i = 0;
  if (tokens[i] && MODES.has(tokens[i].toLowerCase())) i += 1;
  const rest = tokens.slice(i).join(" ");
  const first = tokens[i] ? tokens[i].toLowerCase().replace(/\[.*$/, "") : "";
  if (first && !TYPE_START.has(first) && !/^[a-z_][\w]*\./.test(tokens[i] || "")) {
    // argument name then type
    const typePart = tokens.slice(i + 1).join(" ");
    return typePart ? normalizeType(typePart) : null;
  }
  return normalizeType(rest);
}

function identityFromNameAndArgs(schemaName, argListRaw) {
  const raw = String(schemaName || "").trim();
  const m = raw.match(/^(?:([A-Za-z_][\w]*)\.)?("?[A-Za-z_][\w]*"?)$/);
  if (!m) return null;
  const schema = normalizeIdent(m[1] || "public") || "public";
  const name = normalizeIdent(m[2]);
  if (!name) return null;
  const types = splitTopLevel(argListRaw)
    .map(argToType)
    .filter(Boolean);
  return `${schema}.${name}(${types.join(",")})`;
}

/**
 * Parse a CREATE/ALTER/DROP/GRANT/REVOKE/EXECUTE FUNCTION reference.
 * Returns { identity, schema, name, args, ifExists } or null.
 */
function parseRoutineHead(sqlFromKeyword) {
  const s = String(sqlFromKeyword || "").replace(/\s+/g, " ");
  const m = s.match(
    /^(?:create\s+(?:or\s+replace\s+)?function|alter\s+function|drop\s+function|(?:revoke|grant)\s+(?:all(?:\s+privileges)?|execute)\s+on\s+function|execute\s+(?:procedure|function))\s+(if\s+(?:not\s+)?exists\s+)?(?:only\s+)?((?:[A-Za-z_][\w]*\.)?"?[A-Za-z_][\w]*"?)\s*\(/i,
  );
  if (!m) return null;
  const ifExists = Boolean(m[1] && /exists/i.test(m[1]));
  const nameTok = m[2];
  const open = s.indexOf("(", m.index + m[0].length - 1);
  if (open < 0) return null;
  const close = matchingParen(s, open);
  if (close < 0) return null;
  const argList = s.slice(open + 1, close);
  const identity = identityFromNameAndArgs(nameTok, argList);
  if (!identity) return null;
  const [schema, rest] = identity.split(".");
  const name = rest.slice(0, rest.indexOf("("));
  return { identity, schema, name, args: argList, ifExists };
}

function parseCreateFunction(stmt) {
  if (!/^create\s+(?:or\s+replace\s+)?function\b/i.test(stmt)) return null;
  return parseRoutineHead(stmt);
}

function parseAlterFunction(stmt) {
  if (!/^alter\s+function\b/i.test(stmt)) return null;
  return parseRoutineHead(stmt);
}

function parseDropFunction(stmt) {
  if (!/^drop\s+function\b/i.test(stmt)) return null;
  return parseRoutineHead(stmt);
}

function parseGrantRevokeFunction(stmt) {
  if (!/^(?:grant|revoke)\s+(?:all(?:\s+privileges)?|execute)\s+on\s+function\b/i.test(stmt)) {
    return null;
  }
  return parseRoutineHead(stmt);
}

function parseTriggerExecuteFunction(stmt) {
  if (!/^create\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\b/i.test(stmt)) return null;
  const m = stmt.match(/execute\s+(?:function|procedure)\s+/i);
  if (!m) return null;
  return parseRoutineHead(stmt.slice(m.index));
}

function functionRefsInStatement(stmt) {
  const out = [];
  const created = parseCreateFunction(stmt);
  if (created) out.push({ kind: "create_function", ...created });
  const altered = parseAlterFunction(stmt);
  if (altered) out.push({ kind: "alter_function", ...altered });
  const dropped = parseDropFunction(stmt);
  if (dropped) out.push({ kind: "drop_function", ...dropped });
  const grantRevoke = parseGrantRevokeFunction(stmt);
  if (grantRevoke) {
    out.push({
      kind: /^\s*grant\b/i.test(stmt) ? "grant_function" : "revoke_function",
      ...grantRevoke,
    });
  }
  const trig = parseTriggerExecuteFunction(stmt);
  if (trig) out.push({ kind: "trigger_execute_function", ...trig });
  return out;
}

function isSafeConditionalFunctionRef(stmt, ref) {
  if (ref.ifExists) return true;
  if (ref.kind === "drop_function" && /^drop\s+function\s+if\s+exists\b/i.test(stmt)) return true;
  if (/^do\s+\$/i.test(stmt) && /to_regprocedure\s*\(/i.test(stmt)) return true;
  if (/^do\s+\$/i.test(stmt) && /pg_proc/i.test(stmt) && /if\s+not\s+found/i.test(stmt)) return true;
  return false;
}

/**
 * CREATE/ALTER/DROP/GRANT/REVOKE/trigger bindings in a statement, including
 * nested DDL inside DO $…$ blocks. Does not parse PL/pgSQL body call sites.
 */
function functionRefsDeep(stmt) {
  const out = functionRefsInStatement(stmt);
  if (!/^do\s+\$/i.test(stmt)) return out;
  const re =
    /(?:alter\s+function|(?:revoke|grant)\s+(?:all(?:\s+privileges)?|execute)\s+on\s+function|create\s+(?:or\s+replace\s+)?function|drop\s+function|execute\s+(?:function|procedure))\s+/gi;
  let m;
  while ((m = re.exec(stmt))) {
    const inner = functionRefsInStatement(stmt.slice(m.index));
    for (const r of inner) {
      const dup = out.some((x) => x.kind === r.kind && x.identity === r.identity);
      if (!dup) out.push({ ...r, nestedInDo: true });
    }
  }
  return out;
}

module.exports = {
  normalizeIdent,
  identityFromNameAndArgs,
  parseRoutineHead,
  parseCreateFunction,
  parseAlterFunction,
  parseDropFunction,
  parseGrantRevokeFunction,
  parseTriggerExecuteFunction,
  functionRefsInStatement,
  functionRefsDeep,
  isSafeConditionalFunctionRef,
  TYPE_ALIASES,
};
