// Retail rule helpers. Re-exports the shared D6.2b helpers (manufacturing/
// _helpers.ts is the canonical shared module — importing from it is read-only
// and does not modify the frozen file) plus retail-specific account resolution
// that falls back to a QBO account query when memory has no account list.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — untyped qbo-rest
import { qboQuery, extractQueryEntities } from "@/lib/qbo-rest";
import { queryMemory } from "@/lib/memory/client-memory-service";
import type { RuleContext } from "@/lib/rules/vertical-types";

export {
  suppress,
  fire,
  internalError,
  parseAmount,
  periodEnd,
  periodStart,
  priorMonthEnd,
  monthsBetween,
  loadMemoryPayload,
  sumReportRowsMatching,
  findSectionTotal,
  accountIdsFromMemory,
} from "../manufacturing/_helpers";
export type { QBOReport, QBOReportRow } from "../manufacturing/_helpers";

export interface ResolvedAccount {
  account_id: string;
  account_name: string;
}

interface QBOAccount {
  Id: string;
  Name?: string;
  AccountType?: string;
}

/**
 * Resolve accounts for a retail rule: prefer a memory list
 * ({ accounts: [{account_id, account_name}] }); otherwise fall back to a live
 * QBO Account query. Returns [] when neither yields anything (rule then
 * suppresses with its specific no_*_accounts reason).
 */
export async function resolveAccounts(
  ctx: RuleContext,
  memoryType: string,
  fallbackWhere: string | null,
): Promise<ResolvedAccount[]> {
  const records = await queryMemory({ firmClientId: ctx.firmClientId, memoryType });
  if (records.length > 0) {
    const payload = (records[0].payload ?? {}) as { accounts?: ResolvedAccount[] };
    if (Array.isArray(payload.accounts) && payload.accounts.length > 0) {
      return payload.accounts.filter((a) => a && a.account_id);
    }
  }
  if (!fallbackWhere || !ctx.qbo) return [];
  const payload = await qboQuery(
    ctx.qbo.accessToken,
    ctx.qbo.realmId,
    `select Id, Name, AccountType from Account where ${fallbackWhere} maxresults 100`,
  );
  const accounts = extractQueryEntities(payload, "Account") as QBOAccount[];
  return accounts.map((a) => ({ account_id: a.Id, account_name: a.Name ?? a.Id }));
}

/** Build case-insensitive label regexes from resolved account names. */
export function accountNamePatterns(accounts: ResolvedAccount[]): RegExp[] {
  return accounts.map(
    (a) => new RegExp(a.account_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );
}

/** Ending calendar month (1-12) for the period. */
export function periodMonth(endISO: string): number {
  return new Date(endISO).getMonth() + 1;
}

/** Prior period of the same length (immediately preceding month). */
export function priorPeriodRange(endISO: string): { start: string; end: string } {
  const end = new Date(endISO);
  const priorEnd = new Date(end.getFullYear(), end.getMonth(), 0);
  const priorStart = new Date(priorEnd.getFullYear(), priorEnd.getMonth(), 1);
  return {
    start: priorStart.toISOString().slice(0, 10),
    end: priorEnd.toISOString().slice(0, 10),
  };
}

/** Month-end N months before the given ISO date. */
export function monthEndBefore(endISO: string, monthsBack: number): string {
  const end = new Date(endISO);
  return new Date(end.getFullYear(), end.getMonth() - monthsBack + 1, 0)
    .toISOString()
    .slice(0, 10);
}
