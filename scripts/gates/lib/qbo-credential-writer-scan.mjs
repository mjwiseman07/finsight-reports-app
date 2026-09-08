/**
 * Syntax-aware scanner for accounting_connections credential UPDATEs.
 * Uses the repo's installed `typescript` package (no new dependency).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_ROOT = path.resolve(__dirname, "../../..");

/** Files/functions allowed to issue credential UPDATEs on accounting_connections. */
export const CREDENTIAL_UPDATE_ALLOWLIST = [
  {
    file: "lib/integrations/accounting/canonical-qbo-credential-cas.ts",
    reason: "shared_cas_helper",
  },
  {
    file: "lib/integrations/accounting/ensure-fresh-tokens.ts",
    reason: "xero_token_refresh_not_qbo",
  },
  {
    file: "scripts/verify-xero-live.js",
    reason: "xero_verify_script",
  },
  {
    file: "lib/integrations/accounting/persist-canonical-connection-grant.ts",
    reason: "non_qbo_unconditional_grant_only",
    requireEnclosingFunction: "updateGrantByIdUnconditional",
  },
];

const CREDENTIAL_KEYS = new Set(["access_token", "refresh_token"]);

function walkDir(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (
        ent.name === "node_modules" ||
        ent.name === ".git" ||
        ent.name.startsWith(".tmp") ||
        ent.name === "__fixtures__"
      ) {
        continue;
      }
      walkDir(p, out);
    } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

function scriptKindFor(filePath) {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".ts")) return ts.ScriptKind.TS;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function unwrap(expr) {
  let cur = expr;
  while (cur) {
    if (
      ts.isParenthesizedExpression(cur) ||
      ts.isAsExpression(cur) ||
      ts.isTypeAssertionExpression?.(cur) ||
      ts.isNonNullExpression(cur) ||
      ts.isAwaitExpression(cur)
    ) {
      cur = cur.expression;
      continue;
    }
    break;
  }
  return cur;
}

function isAccountingConnectionsFromCall(node) {
  const call = unwrap(node);
  if (!call || !ts.isCallExpression(call)) return false;
  const callee = unwrap(call.expression);
  if (!callee || !ts.isPropertyAccessExpression(callee)) return false;
  if (callee.name.getText() !== "from") return false;
  if (call.arguments.length < 1) return false;
  const arg0 = unwrap(call.arguments[0]);
  return (
    arg0 &&
    ts.isStringLiteral(arg0) &&
    arg0.text === "accounting_connections"
  );
}

/** Walk receiver chain of `.update(...)` back to a `.from("accounting_connections")`. */
function updateTargetsAccountingConnections(updateCall) {
  let cur = unwrap(updateCall.expression);
  if (!cur || !ts.isPropertyAccessExpression(cur) || cur.name.getText() !== "update") {
    return false;
  }
  cur = unwrap(cur.expression);
  const seen = new Set();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    if (isAccountingConnectionsFromCall(cur)) return true;
    if (ts.isCallExpression(cur)) {
      const callee = unwrap(cur.expression);
      if (callee && ts.isPropertyAccessExpression(callee)) {
        cur = unwrap(callee.expression);
        continue;
      }
      cur = callee;
      continue;
    }
    if (ts.isPropertyAccessExpression(cur)) {
      cur = unwrap(cur.expression);
      continue;
    }
    break;
  }
  return false;
}

function objectLiteralHasCredentialKey(obj) {
  for (const prop of obj.properties) {
    if (ts.isSpreadAssignment(prop)) {
      // Conservative: spread into an update payload is treated as potential credential write
      // unless the update is allowlisted; callers must use CAS helper instead.
      return "spread";
    }
    if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
      const name = prop.name && ts.isIdentifier(prop.name) ? prop.name.text : null;
      if (name && CREDENTIAL_KEYS.has(name)) return "literal";
      if (
        prop.name &&
        ts.isStringLiteral(prop.name) &&
        CREDENTIAL_KEYS.has(prop.name.text)
      ) {
        return "literal";
      }
    }
  }
  return null;
}

function resolveIdentifierObjectLiteral(sf, ident) {
  const name = ident.text;
  let found = null;
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer
    ) {
      const init = unwrap(node.initializer);
      if (init && ts.isObjectLiteralExpression(init)) found = init;
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return found;
}

function classifyUpdateArg(sf, arg) {
  const expr = unwrap(arg);
  if (!expr) return { kind: "unknown" };
  if (ts.isObjectLiteralExpression(expr)) {
    const hit = objectLiteralHasCredentialKey(expr);
    if (hit === "literal") return { kind: "credential_literal" };
    if (hit === "spread") return { kind: "credential_spread" };
    return { kind: "metadata_or_other_literal" };
  }
  if (ts.isIdentifier(expr)) {
    const obj = resolveIdentifierObjectLiteral(sf, expr);
    if (obj) {
      const hit = objectLiteralHasCredentialKey(obj);
      if (hit === "literal") return { kind: "credential_identifier", name: expr.text };
      if (hit === "spread") return { kind: "credential_spread", name: expr.text };
      return { kind: "metadata_identifier", name: expr.text };
    }
    // Unresolved identifier: if name looks like a write payload and file mentions token keys
    // near updates, treat as credential-suspect when the file also assigns access_token.
    return { kind: "unresolved_identifier", name: expr.text };
  }
  if (ts.isObjectLiteralExpression(expr) === false && ts.isCallExpression(expr)) {
    return { kind: "unknown_call" };
  }
  return { kind: "unknown" };
}

function enclosingFunctionName(node) {
  let cur = node.parent;
  while (cur) {
    if (ts.isFunctionDeclaration(cur) && cur.name) return cur.name.text;
    if (ts.isFunctionExpression(cur) && cur.name) return cur.name.text;
    if (ts.isVariableDeclaration(cur) && ts.isIdentifier(cur.name)) {
      if (
        cur.initializer &&
        (ts.isArrowFunction(cur.initializer) || ts.isFunctionExpression(cur.initializer))
      ) {
        return cur.name.text;
      }
    }
    if (ts.isMethodDeclaration(cur) && cur.name && ts.isIdentifier(cur.name)) {
      return cur.name.text;
    }
    cur = cur.parent;
  }
  return null;
}

function isCredentialClassification(kind) {
  return (
    kind === "credential_literal" ||
    kind === "credential_identifier" ||
    kind === "credential_spread" ||
    kind === "unresolved_identifier"
  );
}

/**
 * @param {string} sourceText
 * @param {string} fileRel posix-relative path
 * @param {string} [filePath]
 */
export function analyzeSource(sourceText, fileRel, filePath = fileRel) {
  const sf = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(filePath),
  );

  const updates = [];
  function visit(node) {
    if (ts.isCallExpression(node) && updateTargetsAccountingConnections(node)) {
      const arg = node.arguments[0];
      const classification = classifyUpdateArg(sf, arg);
      const line =
        sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      updates.push({
        file: fileRel,
        line,
        classification: classification.kind,
        name: classification.name || null,
        enclosingFunction: enclosingFunctionName(node),
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return updates;
}

function allowlistEntryFor(fileRel) {
  return CREDENTIAL_UPDATE_ALLOWLIST.find((e) => e.file === fileRel) || null;
}

/**
 * @param {{ root?: string, scanDirs?: string[], sourceFiles?: Array<{rel:string,text:string}> }} opts
 */
export function scanCredentialWriters(opts = {}) {
  const root = opts.root || DEFAULT_ROOT;
  const offenders = [];
  const findings = [];

  const sources =
    opts.sourceFiles ||
    (opts.scanDirs || ["lib", "app", "scripts"]).flatMap((d) =>
      walkDir(path.join(root, d)).map((abs) => ({
        rel: path.relative(root, abs).replace(/\\/g, "/"),
        text: fs.readFileSync(abs, "utf8"),
        abs,
      })),
    );

  for (const src of sources) {
    const fileRel = src.rel.replace(/\\/g, "/");
    if (fileRel.includes("canonical-qbo-credential-cas.test")) continue;
    if (fileRel.includes("canonical-qbo-credential-cas-transport")) continue;
    if (fileRel.includes("qbo-credential-writer-inventory-gate")) continue;

    const updates = analyzeSource(src.text, fileRel, src.abs || fileRel);
    for (const u of updates) {
      findings.push(u);
      if (!isCredentialClassification(u.classification)) continue;

      // Unresolved payload identifiers: only flag when file also contains token key assignment
      // patterns typical of credential writers (avoids metadata-only false positives).
      if (u.classification === "unresolved_identifier") {
        const mentionsTokens =
          /\baccess_token\s*:/.test(src.text) || /\brefresh_token\s*:/.test(src.text);
        if (!mentionsTokens) continue;
      }

      const allow = allowlistEntryFor(fileRel);
      if (!allow) {
        offenders.push({ ...u, reason: "unclassified_credential_update" });
        continue;
      }
      if (
        allow.requireEnclosingFunction &&
        u.enclosingFunction !== allow.requireEnclosingFunction
      ) {
        offenders.push({
          ...u,
          reason: `credential_update_outside_${allow.requireEnclosingFunction}`,
        });
      }
    }
  }

  return { findings, offenders, scannedFiles: sources.length };
}
