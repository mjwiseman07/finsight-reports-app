// Professional-services rule helpers. Re-exports the shared D6.2b helpers
// (manufacturing/_helpers.ts imported read-only — frozen file untouched) plus
// PS-specific primitives: account resolution with QBO fallback, a class-tracking
// probe, and FIFO WIP aging used by the unbilled/WIP rules.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — untyped qbo-rest
import { qboQuery, extractQueryEntities, findJournalEntries } from "@/lib/qbo-rest";
import { queryMemory } from "@/lib/memory/client-memory-service";
import { parseAmount } from "../manufacturing/_helpers";
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

export interface JELineDetail {
  PostingType?: "Debit" | "Credit";
  AccountRef?: { value?: string; name?: string };
  ClassRef?: { value?: string; name?: string };
}
export interface JELine {
  Amount?: number;
  JournalEntryLineDetail?: JELineDetail;
}
export interface JournalEntry {
  Id?: string;
  TxnDate?: string;
  Line?: JELine[];
}

/**
 * Resolve accounts: prefer a memory list ({ accounts: [{account_id, account_name}] });
 * otherwise fall back to a live QBO Account query. Returns [] when neither yields
 * anything (rule then suppresses with its specific no_*_accounts reason).
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

export function accountNamePatterns(accounts: ResolvedAccount[]): RegExp[] {
  return accounts.map(
    (a) => new RegExp(a.account_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  );
}

export function accountIdSet(accounts: ResolvedAccount[]): Set<string> {
  return new Set(accounts.map((a) => a.account_id));
}

/**
 * True when class/project tracking is in use: prefer memory
 * (ps.class_tracking_enabled { enabled }); otherwise probe QBO JEs in the
 * period for any line carrying a ClassRef.
 */
export async function classTrackingEnabled(
  ctx: RuleContext,
  start: string,
  end: string,
): Promise<boolean> {
  const records = await queryMemory({
    firmClientId: ctx.firmClientId,
    memoryType: "ps.class_tracking_enabled",
  });
  if (records.length > 0) {
    const payload = (records[0].payload ?? {}) as { enabled?: boolean };
    if (typeof payload.enabled === "boolean") return payload.enabled;
  }
  if (!ctx.qbo) return false;
  const jes = (await findJournalEntries(ctx.qbo.accessToken, ctx.qbo.realmId, {
    start_date: start,
    end_date: end,
  })) as JournalEntry[];
  return jes.some((je) =>
    (je.Line ?? []).some((l) => Boolean(l.JournalEntryLineDetail?.ClassRef?.value)),
  );
}

function lineMatchesAccounts(line: JELine, idSet: Set<string>, patterns: RegExp[]): boolean {
  const ref = line.JournalEntryLineDetail?.AccountRef;
  if (!ref) return false;
  if (ref.value && idSet.has(ref.value)) return true;
  const name = (ref.name ?? "").toLowerCase();
  return patterns.some((p) => p.test(name));
}

export interface DebitLayer {
  date: string;
  amount: number;
}

/** Split JE lines touching the given accounts into dated debit layers + credit total. */
export function collectAccountActivity(
  jes: JournalEntry[],
  idSet: Set<string>,
  patterns: RegExp[],
): { debits: DebitLayer[]; totalDebit: number; totalCredit: number } {
  const debits: DebitLayer[] = [];
  let totalDebit = 0;
  let totalCredit = 0;
  for (const je of jes) {
    for (const line of je.Line ?? []) {
      if (!lineMatchesAccounts(line, idSet, patterns)) continue;
      const amt = parseAmount(line.Amount);
      if (line.JournalEntryLineDetail?.PostingType === "Credit") {
        totalCredit += amt;
      } else {
        debits.push({ date: je.TxnDate ?? "", amount: amt });
        totalDebit += amt;
      }
    }
  }
  return { debits, totalDebit, totalCredit };
}

/** Apply FIFO credits against oldest debit layers; return remaining balance + oldest surviving date. */
export function fifoRemaining(
  debits: DebitLayer[],
  totalCredits: number,
): { oldestDate: string | null; remaining: number } {
  const layers = debits
    .map((d) => ({ ...d }))
    .sort((a, b) => a.date.localeCompare(b.date));
  let credit = totalCredits;
  for (const layer of layers) {
    if (credit <= 0) break;
    const applied = Math.min(layer.amount, credit);
    layer.amount -= applied;
    credit -= applied;
  }
  const surviving = layers.filter((l) => l.amount > 0.005);
  const remaining = surviving.reduce((s, l) => s + l.amount, 0);
  return { oldestDate: surviving[0]?.date ?? null, remaining };
}

export function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  return Math.round((to - from) / 86_400_000);
}
