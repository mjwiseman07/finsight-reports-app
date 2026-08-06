/**
 * MAJOR #2.1 — Schema drift repo scanner (AST-based, ts-morph).
 *
 * Rebuilt on ts-morph after the regex version (shipped in MAJOR #2) produced
 * two documented false positives on the initial ship-day scan:
 *   1. rollup.ts:155 (.eq("run_id", ...) on a variable table binding —
 *      real table has the column, scanner attributed it to a different table
 *      matched earlier in the file).
 *   2. verify-demo-environments.js:46 (countRows helper with passed-in table —
 *      real tables all have company_id, scanner tied it to an unrelated
 *      grep-proximate table name).
 *
 * This version tracks .from() -> .select()/.eq()/.neq()/.gt()/... call chains
 * through the TypeScript AST, resolves variable bindings back to their
 * declarations, and only classifies chains whose starting value is a
 * SupabaseClient. Chains it cannot statically classify are emitted as
 * lifecycle_issues rows with issue_kind='schema_drift_scanner_unable_to_classify'
 * or 'schema_drift_scanner_ambiguous_column' so an auditor sees the coverage gap.
 *
 * Deterministic side-effect-free public API — safe to import from CI scripts
 * and from unit tests. Reads information_schema via sp_list_public_columns
 * (the SECURITY DEFINER function created in MAJOR #2) because PostgREST cannot
 * hit information_schema directly.
 */

import {
  Project,
  SyntaxKind,
  Node,
  CallExpression,
  PropertyAccessExpression,
  StringLiteral,
  ConditionalExpression,
  Identifier,
  VariableDeclaration,
} from "ts-morph";
import { createHash } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { createServiceClient } from "@/lib/supabase/service";

/** A single reference in code to a table+column pair that we could resolve. */
export interface ColumnRef {
  file: string;
  line: number;
  column: number;
  table: string;
  columnName: string;
  raw: string;
  /** How the table binding was resolved — for auditor readability. */
  resolutionKind: "literal" | "variable_literal" | "ternary_branch";
}

/** A query the scanner saw but couldn't classify with confidence. */
export interface UnresolvedRef {
  file: string;
  line: number;
  column: number;
  raw: string;
  reason: "dynamic_table_binding" | "cross_function_passthrough" | "non_string_type";
  hint: string;
}

/** A query where the column exists on some but not all possible tables. */
export interface AmbiguousRef {
  file: string;
  line: number;
  column: number;
  columnName: string;
  tablesWithColumn: string[];
  tablesWithoutColumn: string[];
  raw: string;
}

export interface DriftReport {
  scannedFiles: number;
  chainsInspected: number;
  resolvedRefs: number;
  live: {
    tableCount: number;
    columnCount: number;
  };
  driftedRefs: ColumnRef[];
  unresolvedRefs: UnresolvedRef[];
  ambiguousRefs: AmbiguousRef[];
  /** PostgREST verbs the scanner recognized. Kept for debugging. */
  verbs: readonly string[];
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "coverage",
  "dist",
  "build",
  "block9_shipped",
  "supabase/migrations", // migrations use raw SQL, not the Supabase client
]);

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

/**
 * PostgREST verbs that reference a column as their first string argument.
 * Kept in a single Set so we can add new verbs (e.g. .contains) without
 * changing the walker. Verb names are literal method names on the query
 * builder — no dot prefix.
 */
const COLUMN_VERBS: ReadonlySet<string> = new Set([
  "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "is", "in",
  "contains", "containedBy", "range", "textSearch", "match", "not",
  "order", "filter",
]);

/**
 * Method names on the Supabase query builder that ACCEPT a column list as
 * their first string argument (comma-separated). We only care about .select();
 * others are query modifiers.
 */
const COLUMN_LIST_METHODS: ReadonlySet<string> = new Set(["select"]);

/** Load the live column universe via sp_list_public_columns (RPC). */
async function loadLiveColumns(): Promise<Map<string, Set<string>>> {
  const db = createServiceClient();
  const { data, error } = await db.rpc("sp_list_public_columns");
  if (error) {
    throw new Error(
      `repo-scanner: sp_list_public_columns failed: ${error.message}. Ensure the function exists (created in MAJOR #2 migration 20260805054000; jsonb return shape in 20260805211000).`,
    );
  }
  // MAJOR #2.1: RPC returns a single jsonb array (not SETOF) so PostgREST's
  // default max-rows limit cannot truncate the universe mid-list.
  const rows = (
    typeof data === "string" ? JSON.parse(data) : (data ?? [])
  ) as Array<{ table_name: string; column_name: string }>;
  if (!Array.isArray(rows)) {
    throw new Error(
      `repo-scanner: sp_list_public_columns returned non-array payload (${typeof data}). Expected jsonb array of {table_name, column_name}.`,
    );
  }
  const out = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!out.has(row.table_name)) out.set(row.table_name, new Set());
    out.get(row.table_name)!.add(row.column_name);
  }
  return out;
}

/**
 * Walk a directory tree yielding source file absolute paths whose extension
 * is in SCAN_EXTENSIONS. Skips SKIP_DIRS at any depth.
 */
function* walkSourceFiles(rootDir: string): Generator<string> {
  const stack = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = join(dir, entry);
      let s;
      try {
        s = statSync(full);
      } catch {
        continue;
      }
      if (s.isDirectory()) {
        // Also honor path-style skips like "supabase/migrations"
        const rel = relative(rootDir, full);
        if (SKIP_DIRS.has(rel)) continue;
        stack.push(full);
        continue;
      }
      // Skip agent/local scratch + editor leftovers so dirty workspaces
      // don't pollute drift signal. CI trees won't contain these.
      if (
        entry.startsWith(".tmp") ||
        entry.startsWith(".part") ||
        entry.endsWith(".bak") ||
        entry.endsWith(".orig")
      ) {
        continue;
      }
      if (SCAN_EXTENSIONS.has(extname(entry))) yield full;
    }
  }
}

/**
 * Given a Node representing the first argument to `.from(...)`, resolve it to
 * one or more concrete table-name string literals.
 */
type FromBinding =
  | { kind: "literal"; tables: string[] }
  | { kind: "ternary_branch"; tables: string[] }
  | { kind: "variable_literal"; tables: string[] }
  | { kind: "unresolved"; reason: UnresolvedRef["reason"]; hint: string };

function resolveFromArgument(arg: Node): FromBinding {
  // Direct string literal: .from("users")
  if (arg.getKind() === SyntaxKind.StringLiteral) {
    return { kind: "literal", tables: [(arg as StringLiteral).getLiteralValue()] };
  }

  // Ternary of literals: .from(kind === "x" ? "table_a" : "table_b")
  if (arg.getKind() === SyntaxKind.ConditionalExpression) {
    const cond = arg as ConditionalExpression;
    const branches = collectTernaryLiterals(cond);
    if (branches !== null) {
      return { kind: "ternary_branch", tables: branches };
    }
    return {
      kind: "unresolved",
      reason: "dynamic_table_binding",
      hint: "Ternary branch is not a plain string literal (nested expression / non-literal branch).",
    };
  }

  // Identifier: walk to its declaration
  if (arg.getKind() === SyntaxKind.Identifier) {
    const identifier = arg as Identifier;
    const symbol = identifier.getSymbol();
    if (!symbol) {
      return {
        kind: "unresolved",
        reason: "non_string_type",
        hint: `Identifier "${identifier.getText()}" has no resolvable symbol.`,
      };
    }
    // Try to find a value declaration that's a VariableDeclaration with an initializer.
    for (const decl of symbol.getDeclarations()) {
      if (decl.getKind() === SyntaxKind.VariableDeclaration) {
        const vd = decl as VariableDeclaration;
        const init = vd.getInitializer();
        if (!init) continue;
        // const table = "foo"
        if (init.getKind() === SyntaxKind.StringLiteral) {
          return { kind: "variable_literal", tables: [(init as StringLiteral).getLiteralValue()] };
        }
        // const table = kind === "x" ? "a" : "b"
        if (init.getKind() === SyntaxKind.ConditionalExpression) {
          const branches = collectTernaryLiterals(init as ConditionalExpression);
          if (branches !== null) {
            return { kind: "ternary_branch", tables: branches };
          }
        }
      }
      // Function parameter (e.g. countRows(supabase, table, id)) — cross-function passthrough.
      if (decl.getKind() === SyntaxKind.Parameter) {
        return {
          kind: "unresolved",
          reason: "cross_function_passthrough",
          hint: `Identifier "${identifier.getText()}" is a function parameter; call-site table narrowing not analyzed. Scanner intentionally skips column check.`,
        };
      }
    }
    return {
      kind: "unresolved",
      reason: "dynamic_table_binding",
      hint: `Identifier "${identifier.getText()}" is not initialized from a string literal or ternary of literals.`,
    };
  }

  return {
    kind: "unresolved",
    reason: "non_string_type",
    hint: `.from() argument is a ${arg.getKindName()}; only string literals, ternary of literals, and variables bound to those are analyzed.`,
  };
}

/**
 * Recursively collect string literal values from a ConditionalExpression's
 * whenTrue / whenFalse branches. Nested ternaries are traversed. Returns null
 * if any branch is not a plain string literal or a nested ternary of literals.
 */
function collectTernaryLiterals(node: ConditionalExpression): string[] | null {
  const out: string[] = [];
  const stack: Node[] = [node.getWhenTrue(), node.getWhenFalse()];
  while (stack.length > 0) {
    const n = stack.pop()!;
    if (n.getKind() === SyntaxKind.StringLiteral) {
      out.push((n as StringLiteral).getLiteralValue());
      continue;
    }
    if (n.getKind() === SyntaxKind.ConditionalExpression) {
      const c = n as ConditionalExpression;
      stack.push(c.getWhenTrue(), c.getWhenFalse());
      continue;
    }
    // Any other kind kills the ternary-of-literals classification.
    return null;
  }
  return out;
}

/**
 * Walk backward from a query-verb call (.eq / .select / ...) to the .from(...)
 * call that started the chain. Returns the .from() call node, or null if the
 * chain doesn't start with a .from() (i.e. this isn't a Supabase query).
 */
function findFromCallForChain(verbCall: CallExpression): CallExpression | null {
  let current: Node = verbCall;
  const seen = new Set<Node>();
  while (true) {
    if (seen.has(current)) return null;
    seen.add(current);
    // current is a CallExpression whose expression is a PropertyAccessExpression
    // like <inner>.<method>. Walk inward.
    const expr = (current as CallExpression).getExpression();
    if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) return null;
    const pae = expr as PropertyAccessExpression;
    const inner = pae.getExpression();
    // If inner is a .from(...) CallExpression, we found the chain root.
    if (inner.getKind() === SyntaxKind.CallExpression) {
      const innerCall = inner as CallExpression;
      const innerExpr = innerCall.getExpression();
      if (innerExpr.getKind() === SyntaxKind.PropertyAccessExpression) {
        const innerPae = innerExpr as PropertyAccessExpression;
        if (innerPae.getName() === "from") {
          return innerCall;
        }
      }
      current = innerCall;
      continue;
    }
    return null;
  }
}

/**
 * Given a chain root .from(...) call, check whether the value on which .from
 * was called is a plausible Supabase client.
 */
function isPlausibleSupabaseChain(fromCall: CallExpression): boolean {
  const expr = fromCall.getExpression();
  if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) return false;
  const receiver = (expr as PropertyAccessExpression).getExpression();
  const text = receiver.getText();
  // Common Advisacor patterns: supabase, supabaseAdmin, db, client, this.supabase, ctx.supabase, getSupabaseAdmin()
  if (/^(supabase|supabaseAdmin|db|client)\b/.test(text)) return true;
  if (/getSupabaseAdmin\(\)/.test(text)) return true;
  if (/createServiceClient\(\)/.test(text)) return true;
  if (/\.supabase(Admin)?\b/.test(text)) return true;
  // Fall back to type check — costly but reliable.
  try {
    const type = receiver.getType().getText();
    return /SupabaseClient/.test(type);
  } catch {
    return false;
  }
}

/** Extract the string literal value from a call argument, or null. */
function stringArgAt(call: CallExpression, index: number): string | null {
  const args = call.getArguments();
  if (index >= args.length) return null;
  const arg = args[index];
  if (arg.getKind() === SyntaxKind.StringLiteral) return (arg as StringLiteral).getLiteralValue();
  return null;
}

/** Public entry point. */
export async function runSchemaDriftScan(rootDir: string): Promise<DriftReport> {
  const liveColumns = await loadLiveColumns();

  const project = new Project({
    tsConfigFilePath: join(rootDir, "tsconfig.json"),
    skipAddingFilesFromTsConfig: true, // We control file inclusion via walkSourceFiles.
    compilerOptions: {
      allowJs: true,
      checkJs: false,
      noEmit: true,
    },
  });

  const filePaths: string[] = [];
  for (const f of walkSourceFiles(rootDir)) {
    filePaths.push(f);
  }
  // Add files in one call — faster than one-at-a-time for large repos.
  project.addSourceFilesAtPaths(filePaths);

  const driftedRefs: ColumnRef[] = [];
  const unresolvedRefs: UnresolvedRef[] = [];
  const ambiguousRefs: AmbiguousRef[] = [];
  let chainsInspected = 0;
  let resolvedRefs = 0;

  for (const sf of project.getSourceFiles()) {
    // Walk every CallExpression, filter to query-verb calls.
    sf.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;
      const call = node as CallExpression;
      const expr = call.getExpression();
      if (expr.getKind() !== SyntaxKind.PropertyAccessExpression) return;
      const methodName = (expr as PropertyAccessExpression).getName();

      const isColumnVerb = COLUMN_VERBS.has(methodName);
      const isColumnListMethod = COLUMN_LIST_METHODS.has(methodName);
      if (!isColumnVerb && !isColumnListMethod) return;

      const fromCall = findFromCallForChain(call);
      if (!fromCall) return; // Not a Supabase chain (or not one we recognize).

      if (!isPlausibleSupabaseChain(fromCall)) return;

      chainsInspected++;

      // Resolve the .from() argument.
      const fromArgs = fromCall.getArguments();
      if (fromArgs.length === 0) return;
      const binding = resolveFromArgument(fromArgs[0]);

      const pos = call.getSourceFile().getLineAndColumnAtPos(call.getStart());
      const raw = call.getText().split("\n")[0].trim();

      if (binding.kind === "unresolved") {
        unresolvedRefs.push({
          file: relative(rootDir, sf.getFilePath()),
          line: pos.line,
          column: pos.column,
          raw,
          reason: binding.reason,
          hint: binding.hint,
        });
        return;
      }

      // Extract the column names this verb references.
      const columnNames: string[] = [];
      if (isColumnListMethod) {
        // .select("col1, col2, foo:table(col3)")
        const arg0 = stringArgAt(call, 0);
        if (arg0 !== null) {
          for (const part of arg0.split(",").map((p) => p.trim())) {
            if (!part || part === "*") continue;
            // Skip PostgREST relation embeds like "customers(id, name)"
            if (part.includes("(")) continue;
            // Skip aliased cols "col:alias" — first token is the source.
            const source = part.split(":")[0].trim();
            if (/^[a-zA-Z0-9_]+$/.test(source)) columnNames.push(source);
          }
        }
      } else {
        // Column verbs: first string argument IS the column name.
        const arg0 = stringArgAt(call, 0);
        if (arg0 && /^[a-zA-Z0-9_]+$/.test(arg0)) columnNames.push(arg0);
      }

      if (columnNames.length === 0) return;

      // Check each column against each possible table.
      for (const columnName of columnNames) {
        resolvedRefs++;
        const tablesWithColumn: string[] = [];
        const tablesWithoutColumn: string[] = [];
        for (const table of binding.tables) {
          const liveCols = liveColumns.get(table);
          if (!liveCols) {
            // Unknown table — could be a view, an unlisted table, or drift on the TABLE itself.
            // We don't flag "unknown table" as drift here; that's the runtime detector's job.
            continue;
          }
          if (liveCols.has(columnName)) {
            tablesWithColumn.push(table);
          } else {
            tablesWithoutColumn.push(table);
          }
        }

        // If all resolved tables have the column, no drift.
        if (tablesWithoutColumn.length === 0) continue;

        // If NONE of the resolved tables have the column → definite drift.
        if (tablesWithColumn.length === 0) {
          driftedRefs.push({
            file: relative(rootDir, sf.getFilePath()),
            line: pos.line,
            column: pos.column,
            table: binding.tables[0], // First candidate — auditor can inspect all via the ambiguous list if needed.
            columnName,
            raw,
            resolutionKind:
              binding.kind === "literal"
                ? "literal"
                : binding.kind === "ternary_branch"
                  ? "ternary_branch"
                  : "variable_literal",
          });
          continue;
        }

        // Split — some tables have it, some don't. This is ambiguous.
        ambiguousRefs.push({
          file: relative(rootDir, sf.getFilePath()),
          line: pos.line,
          column: pos.column,
          columnName,
          tablesWithColumn,
          tablesWithoutColumn,
          raw,
        });
      }
    });
  }

  const tableCount = liveColumns.size;
  let columnCount = 0;
  for (const set of liveColumns.values()) columnCount += set.size;

  return {
    scannedFiles: project.getSourceFiles().length,
    chainsInspected,
    resolvedRefs,
    live: { tableCount, columnCount },
    driftedRefs,
    unresolvedRefs,
    ambiguousRefs,
    verbs: Array.from(COLUMN_VERBS).concat(Array.from(COLUMN_LIST_METHODS)),
  };
}

/**
 * Emit unresolved + ambiguous + baselined-debt scanner events into
 * lifecycle_issues so the memory system has an audit trail of where the
 * scanner had incomplete confidence (or accepted baseline debt) on this commit.
 *
 * Uses fingerprint dedup so repeated runs on the same commit don't spam rows.
 */
export async function recordScannerLimitations(
  report: DriftReport,
  gitSha: string,
  opts: { baselinedRefs?: ColumnRef[] } = {},
): Promise<{ inserted: number }> {
  const db = createServiceClient();
  let inserted = 0;
  const nowIso = new Date().toISOString();

  for (const u of report.unresolvedRefs) {
    const fingerprint = `schema-drift-scanner:unable:${u.reason}:${u.file}:${u.line}:${gitSha}`;
    const { error } = await db.from("lifecycle_issues").insert({
      detected_at: nowIso,
      fingerprint,
      level: "info",
      issue_kind: "schema_drift_scanner_unable_to_classify",
      pilot_slot_id: null,
      company_id: null,
      firm_id: null,
      tags: { reason: u.reason, file: u.file, line: u.line, git_sha: gitSha },
      extra: { hint: u.hint, raw: u.raw, scanner_version: "2.1.0" },
    });
    if (!error) inserted++;
    else if ((error as { code?: string }).code !== "23505") {
      // Non-duplicate error — swallow but do not throw; scanner audit trail
      // must not block CI. Real failures show as detector_degraded issues
      // through the runtime cron.
    }
  }

  for (const a of report.ambiguousRefs) {
    const fingerprint = `schema-drift-scanner:ambiguous:${a.file}:${a.line}:${a.columnName}:${gitSha}`;
    const { error } = await db.from("lifecycle_issues").insert({
      detected_at: nowIso,
      fingerprint,
      level: "warning",
      issue_kind: "schema_drift_scanner_ambiguous_column",
      pilot_slot_id: null,
      company_id: null,
      firm_id: null,
      tags: {
        column_name: a.columnName,
        tables_with_column: a.tablesWithColumn,
        tables_without_column: a.tablesWithoutColumn,
        file: a.file,
        line: a.line,
        git_sha: gitSha,
      },
      extra: {
        raw: a.raw,
        scanner_version: "2.1.0",
        remediation_hint: `Column "${a.columnName}" exists on ${a.tablesWithColumn.join(", ")} but NOT on ${a.tablesWithoutColumn.join(", ")}. Verify runtime branch coverage or split the query.`,
      },
    });
    if (!error) inserted++;
    else if ((error as { code?: string }).code !== "23505") {
      // Swallow non-duplicate errors.
    }
  }

  // Deduped by table+column so multi-site baselines write one audit row.
  const seenBaseline = new Set<string>();
  for (const b of opts.baselinedRefs ?? []) {
    const pair = `${b.table}:${b.columnName}`;
    if (seenBaseline.has(pair)) continue;
    seenBaseline.add(pair);
    const fingerprint = createHash("md5")
      .update(`${b.table}:${b.columnName}:baseline`)
      .digest("hex");
    const { error } = await db.from("lifecycle_issues").insert({
      detected_at: nowIso,
      fingerprint: `schema-drift-scanner:baseline:${fingerprint}`,
      level: "info",
      issue_kind: "schema_drift_accepted_baseline",
      pilot_slot_id: null,
      company_id: null,
      firm_id: null,
      tags: {
        table: b.table,
        column_name: b.columnName,
        debt_ticket: "MAJOR-2.2",
        git_sha: gitSha,
      },
      extra: {
        file: b.file,
        line: b.line,
        raw: b.raw,
        scanner_version: "2.1.0",
        remediation_hint:
          "Accepted baseline debt — resolve in MAJOR #2.2 and remove from .schema-drift-baseline.json.",
      },
    });
    if (!error) inserted++;
    else if ((error as { code?: string }).code !== "23505") {
      // Swallow non-duplicate errors.
    }
  }

  return { inserted };
}
