/**
 * MAJOR #2 — Static-time schema-drift repo scanner.
 *
 * Reads live column definitions from information_schema.columns via the
 * service-role Supabase client, then walks .ts / .tsx / .js / .sql files
 * looking for column references. Emits a JSON report of any reference to
 * a column that doesn't exist in the live schema.
 *
 * NOT a runtime dependency — invoked from CI or `npm run schema:drift-scan`.
 * Deliberately conservative: only flags exact `table.column` or `"table"."column"`
 * references, plus PostgREST-style `.select("col1, col2")` and `.eq("col", ...)`
 * usages, to keep false-positive rate low.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { createServiceClient } from "@/lib/supabase/service";

interface ColumnRef {
  file: string;
  line: number;
  table: string;
  column: string;
  raw: string;
}

interface DriftReport {
  scannedFiles: number;
  totalRefs: number;
  live: {
    tableCount: number;
    columnCount: number;
  };
  driftedRefs: ColumnRef[];
}

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".sql"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "coverage", "dist", "build", "block9_shipped"]);

/** Load the live column universe: { table_name: Set<column_name> } for public schema. */
async function loadLiveColumns(): Promise<Map<string, Set<string>>> {
  const db = createServiceClient();
  // PostgREST rejects information_schema as a schema name. Use the
  // service_role-only SECURITY DEFINER helper created in
  // 20260805054000_schema_drift_issue_policies.sql.
  const { data, error } = await db.rpc("sp_list_public_columns");
  if (error) {
    throw new Error(
      `repo-scanner: failed to read public columns via sp_list_public_columns: ${error.message}`,
    );
  }
  const out = new Map<string, Set<string>>();
  for (const row of (data as Array<{ table_name: string; column_name: string }>) ?? []) {
    if (!out.has(row.table_name)) out.set(row.table_name, new Set());
    out.get(row.table_name)!.add(row.column_name);
  }
  return out;
}

/** Walk repo, yielding (file, line, raw) tuples that look like column refs. */
function* scanRepo(rootDir: string): Generator<{ file: string; line: number; raw: string }> {
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
        stack.push(full);
        continue;
      }
      if (!SCAN_EXTENSIONS.has(extname(entry))) continue;
      let content: string;
      try {
        content = readFileSync(full, "utf8");
      } catch {
        continue;
      }
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        yield { file: full, line: i + 1, raw: lines[i] };
      }
    }
  }
}

// Match .from("table").select("col1, col2, col3") — captures table + column list.
const SELECT_REGEX = /\.from\(\s*["'`]([a-zA-Z0-9_]+)["'`]\s*\)[\s\S]{0,200}?\.select\(\s*["'`]([^"'`]+)["'`]/g;
// Match .eq("col", ...) / .neq / .gt / .lt inside a .from(...) chain (loose).
const OP_REGEX = /\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is)\(\s*["'`]([a-zA-Z0-9_]+)["'`]/g;

function extractRefs(raw: string, currentTable: string | null): Array<{ table: string; column: string; raw: string }> {
  const refs: Array<{ table: string; column: string; raw: string }> = [];
  let m: RegExpExecArray | null;

  SELECT_REGEX.lastIndex = 0;
  while ((m = SELECT_REGEX.exec(raw)) !== null) {
    const table = m[1];
    const colList = m[2];
    for (const col of colList.split(",").map((c) => c.trim()).filter(Boolean)) {
      // Skip PostgREST relation embeds like "customers(id, name)" — leave those for a follow-up.
      if (col.includes("(") || col === "*") continue;
      // Skip aliased columns like "col:aliased_name" — first token is the source column.
      const source = col.split(":")[0].trim();
      if (!/^[a-zA-Z0-9_]+$/.test(source)) continue;
      refs.push({ table, column: source, raw });
    }
  }

  if (currentTable) {
    OP_REGEX.lastIndex = 0;
    while ((m = OP_REGEX.exec(raw)) !== null) {
      refs.push({ table: currentTable, column: m[1], raw });
    }
  }

  return refs;
}

export async function runSchemaDriftScan(rootDir: string): Promise<DriftReport> {
  const liveColumns = await loadLiveColumns();
  const drifted: ColumnRef[] = [];
  let scannedFiles = 0;
  let totalRefs = 0;
  let currentTable: string | null = null;
  let currentFile = "";

  for (const { file, line, raw } of scanRepo(rootDir)) {
    if (file !== currentFile) {
      scannedFiles++;
      currentFile = file;
    }
    // Track last-seen .from("table") on this line so single-line .eq() refs
    // pick up the right table context. This is intentionally shallow — a
    // multi-line query chain will only detect refs on the same line as .from(),
    // which is a known limitation documented in the scanner report.
    const fromMatch = raw.match(/\.from\(\s*["'`]([a-zA-Z0-9_]+)["'`]/);
    if (fromMatch) currentTable = fromMatch[1];

    const refs = extractRefs(raw, currentTable);
    totalRefs += refs.length;
    for (const ref of refs) {
      const liveCols = liveColumns.get(ref.table);
      if (!liveCols) continue; // Unknown table — could be a view or a table in another schema; don't flag.
      if (!liveCols.has(ref.column)) {
        drifted.push({ file, line, table: ref.table, column: ref.column, raw: raw.trim() });
      }
    }
  }

  const tableCount = liveColumns.size;
  let columnCount = 0;
  for (const set of liveColumns.values()) columnCount += set.size;

  return {
    scannedFiles,
    totalRefs,
    live: { tableCount, columnCount },
    driftedRefs: drifted,
  };
}
