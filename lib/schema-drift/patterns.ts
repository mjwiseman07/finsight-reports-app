/**
 * MAJOR #2 — Schema drift signature classifier.
 *
 * Maps raw postgres error lines to structured drift signatures. Each signature
 * has a stable string fingerprint that combines the drift class + normalized
 * subject (table/column/relation name), which is what lifecycle_issues stores
 * so the hour-bucket unique index dedupes repeated occurrences.
 *
 * Deterministic pure functions only — safe to import from cron routes, from
 * CI scripts, and from unit tests. Never do I/O here.
 *
 * Note: regexes use numbered (not named) capturing groups because this repo's
 * TypeScript target rejects named groups (ES2018+).
 */

export type DriftClass =
  | "column_missing"
  | "relation_missing"
  | "function_missing"
  | "type_mismatch"
  | "constraint_violation"
  | "search_path_missing";

export interface DriftSignature {
  driftClass: DriftClass;
  /** For column_missing: the column name. For relation_missing: the relation. */
  subject: string;
  /** For column_missing: the table (if disambiguable from error text). */
  table?: string;
  /** Optional schema qualifier if the error surfaced it. */
  schema?: string;
  /** Deterministic fingerprint string for lifecycle_issues.fingerprint. */
  fingerprint: string;
  /** Original error line, trimmed. */
  rawLine: string;
}

// Postgres error patterns we know how to classify. Ordered by specificity.
// Capture indices: subjectIndex always points at the semantic subject;
// optional tableIndex / schemaIndex when present.
const PATTERNS: Array<{
  driftClass: DriftClass;
  regex: RegExp;
  subjectIndex: number;
  tableIndex?: number;
  schemaIndex?: number;
}> = [
  // ERROR:  42703: column "email" does not exist  → column, no table context
  // ERROR:  42703: column users.email does not exist  → column + table
  {
    driftClass: "column_missing",
    regex: /column\s+(?:"?([a-zA-Z0-9_]+)"?\.)?"([a-zA-Z0-9_]+)"\s+does not exist/i,
    subjectIndex: 2,
    tableIndex: 1,
  },
  // ERROR:  42P01: relation "public.foo" does not exist
  {
    driftClass: "relation_missing",
    regex: /relation\s+"([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)"\s+does not exist/i,
    subjectIndex: 2,
    schemaIndex: 1,
  },
  // ERROR:  42883: function digest(text, unknown) does not exist
  {
    driftClass: "function_missing",
    regex: /function\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s+does not exist/i,
    subjectIndex: 1,
  },
  // ERROR: 3F000: schema "pg_temp" does not exist  (Cursor session search_path)
  {
    driftClass: "search_path_missing",
    regex: /schema\s+"([a-zA-Z0-9_]+)"\s+does not exist/i,
    subjectIndex: 1,
  },
  // ERROR:  42804: column "x" is of type integer but expression is of type text
  {
    driftClass: "type_mismatch",
    regex: /column\s+"([a-zA-Z0-9_]+)"\s+is of type\s+/i,
    subjectIndex: 1,
  },
];

/**
 * Classify a single raw error line. Returns null if no pattern matches
 * (which means it isn't a schema-drift class we know how to reason about —
 * intentional, we don't want to record every random error as drift).
 */
export function classifyErrorLine(rawLine: string): DriftSignature | null {
  const line = rawLine.trim();
  for (const { driftClass, regex, subjectIndex, tableIndex, schemaIndex } of PATTERNS) {
    const match = line.match(regex);
    if (!match) continue;
    const subject = match[subjectIndex];
    if (!subject) continue;
    const table = tableIndex !== undefined ? match[tableIndex] : undefined;
    const schema = schemaIndex !== undefined ? match[schemaIndex] : undefined;
    // Fingerprint must be stable across identical drift events and distinct
    // across different drift subjects. Format: schema-drift:<class>:<schema?>:<table?>:<subject>
    const fingerprintParts = ["schema-drift", driftClass, schema ?? "-", table ?? "-", subject];
    const fingerprint = fingerprintParts.join(":");
    return {
      driftClass,
      subject,
      table,
      schema,
      fingerprint,
      rawLine: line,
    };
  }
  return null;
}

/**
 * Convenience: classify many lines, drop unmatched, dedupe by fingerprint.
 * Order-preserving on first occurrence.
 */
export function classifyBatch(rawLines: readonly string[]): DriftSignature[] {
  const seen = new Set<string>();
  const out: DriftSignature[] = [];
  for (const line of rawLines) {
    const sig = classifyErrorLine(line);
    if (!sig) continue;
    if (seen.has(sig.fingerprint)) continue;
    seen.add(sig.fingerprint);
    out.push(sig);
  }
  return out;
}
