import { queryMemory } from "@/lib/memory/client-memory-service";
import { parseAmountOrZero } from "@/lib/parse/amount";
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";

export interface QBOReportRow {
  ColData?: Array<{ value?: string; id?: string }>;
  Summary?: { ColData?: Array<{ value?: string; id?: string }> };
  group?: string;
  type?: string;
  Rows?: { Row?: QBOReportRow[] };
}

export interface QBOReport {
  Rows?: { Row?: QBOReportRow[] };
}

export function periodEnd(ctx: RuleContext): string {
  return (ctx.inputs.periodEndDate as string | undefined) ?? new Date().toISOString().slice(0, 10);
}

export function periodStart(endISO: string): string {
  const end = new Date(endISO);
  return new Date(end.getFullYear(), end.getMonth(), 1).toISOString().slice(0, 10);
}

export function priorMonthEnd(endISO: string): string {
  const end = new Date(endISO);
  return new Date(end.getFullYear(), end.getMonth(), 0).toISOString().slice(0, 10);
}

export async function loadMemoryPayload(
  ctx: RuleContext,
  memoryType: string,
): Promise<Record<string, unknown> | null> {
  const records = await queryMemory({ firmClientId: ctx.firmClientId, memoryType });
  if (records.length === 0) return null;
  return (records[0].payload ?? {}) as Record<string, unknown>;
}

export function suppress(
  reason_code: string,
  reason_detail: Record<string, unknown> = {},
): RuleResult {
  return { fired: false, outcome: "suppressed", reason_code, reason_detail };
}

export function fire(reason_code: string, reason_detail: Record<string, unknown>): RuleResult {
  return { fired: true, outcome: "fired", reason_code, reason_detail };
}

export function internalError(err: unknown): RuleResult {
  const message = err instanceof Error ? err.message : String(err);
  return {
    fired: false,
    outcome: "suppressed",
    reason_code: "internal_error",
    reason_detail: { error: message },
  };
}

// Phase MC-2e.2 (Issue #6, Gap I-3): re-implemented against the shared
// locale-aware parser. Manufacturing rule helpers consume QBO report rows
// (en-US contract); shared parser matches the previous behavior exactly.
// Exported signature preserved — all 8 downstream rule files continue to
// import { parseAmount } from "./_helpers" without change.
export function parseAmount(val: unknown): number {
  return parseAmountOrZero(val);
}

function rowLabel(row: QBOReportRow): string {
  return (row.ColData?.[0]?.value ?? row.group ?? "").toLowerCase();
}

function rowAmount(row: QBOReportRow): number {
  const cols = row.Summary?.ColData ?? row.ColData ?? [];
  const val = cols[cols.length - 1]?.value;
  return parseAmount(val);
}

/** Sum leaf-row amounts whose label matches any of the patterns (case-insensitive). */
export function sumReportRowsMatching(
  report: QBOReport,
  patterns: RegExp[],
  { leafOnly = true }: { leafOnly?: boolean } = {},
): number {
  let total = 0;
  const walk = (rows: QBOReportRow[] | undefined): void => {
    if (!rows) return;
    for (const row of rows) {
      const hasChildren = (row.Rows?.Row?.length ?? 0) > 0;
      const label = rowLabel(row);
      const matches = patterns.some((p) => p.test(label));
      if (matches && (!leafOnly || !hasChildren)) {
        total += rowAmount(row);
      }
      walk(row.Rows?.Row);
    }
  };
  walk(report.Rows?.Row);
  return total;
}

/** Find a single section total by label pattern (prefers Summary row). */
export function findSectionTotal(report: QBOReport, pattern: RegExp): number | null {
  let found: number | null = null;
  const walk = (rows: QBOReportRow[] | undefined): void => {
    if (!rows || found != null) return;
    for (const row of rows) {
      const label = rowLabel(row);
      if (pattern.test(label)) {
        const amt = rowAmount(row);
        if (amt !== 0 || row.Summary) found = amt;
      }
      walk(row.Rows?.Row);
    }
  };
  walk(report.Rows?.Row);
  return found;
}

export function accountIdsFromMemory(payload: Record<string, unknown> | null, key: string): string[] {
  if (!payload) return [];
  const raw = payload[key];
  if (!Array.isArray(raw)) return [];
  return raw.map(String);
}

export function monthsBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}
