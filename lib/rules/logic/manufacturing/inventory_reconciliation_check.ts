/**
 * @rule       mfg.inventory_reconciliation_check
 * @assertions primary:existence_occurrence,completeness | secondary:accuracy
 * @accounts   inventory
 * @citation   ISA 501; AICPA Audit Guide
 */
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { reportBalanceSheet, findJournalEntries, qboQuery, extractQueryEntities } from "@/lib/qbo-rest";
import {
  accountIdsFromMemory,
  fire,
  internalError,
  loadMemoryPayload,
  periodEnd,
  periodStart,
  priorMonthEnd,
  suppress,
  sumReportRowsMatching,
  type QBOReport,
} from "./_helpers";

export const RULE_ID = "mfg.inventory_reconciliation_check";
export const RULE_VERSION = 1;

interface QBOAccount {
  Id: string;
  Name?: string;
  AccountType?: string;
}

interface QBOJournalLine {
  Amount?: number;
  JournalEntryLineDetail?: { AccountRef?: { value?: string; name?: string } };
}

interface QBOJournalEntry {
  Id: string;
  Line?: QBOJournalLine[];
}

function inventoryBalanceFromBs(report: QBOReport, patterns: RegExp[]): number {
  return sumReportRowsMatching(report, patterns);
}

async function resolveInventoryPatterns(
  ctx: RuleContext,
): Promise<RegExp[] | null> {
  const mem = await loadMemoryPayload(ctx, "mfg.inventory_accounts");
  const ids = accountIdsFromMemory(mem, "account_ids");
  if (ids.length > 0) {
    return ids.map((id) => new RegExp(id, "i"));
  }
  if (!ctx.qbo) return null;
  const payload = await qboQuery(
    ctx.qbo.accessToken,
    ctx.qbo.realmId,
    "select Id, Name, AccountType from Account where AccountType = 'Inventory' maxresults 100",
  );
  const accounts = extractQueryEntities(payload, "Account") as QBOAccount[];
  if (accounts.length === 0) return null;
  return accounts.map((a) => new RegExp((a.Name ?? a.Id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
}

function sumInventoryJeActivity(
  jes: QBOJournalEntry[],
  accountIdPatterns: RegExp[],
): number {
  let sum = 0;
  for (const je of jes) {
    for (const line of je.Line ?? []) {
      const acctId = line.JournalEntryLineDetail?.AccountRef?.value ?? "";
      const acctName = line.JournalEntryLineDetail?.AccountRef?.name ?? "";
      const matches = accountIdPatterns.some(
        (p) => p.test(acctId) || p.test(acctName),
      );
      if (matches) sum += line.Amount ?? 0;
    }
  }
  return sum;
}

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const patterns = await resolveInventoryPatterns(ctx);
    if (!patterns || patterns.length === 0) return suppress("no_inventory_accounts");

    const end = periodEnd(ctx);
    const priorEnd = priorMonthEnd(end);
    const start = periodStart(end);

    const [bsCurrent, bsPrior] = await Promise.all([
      reportBalanceSheet(ctx.qbo.accessToken, ctx.qbo.realmId, { end_date: end }) as Promise<QBOReport>,
      reportBalanceSheet(ctx.qbo.accessToken, ctx.qbo.realmId, {
        end_date: priorEnd,
      }) as Promise<QBOReport>,
    ]);

    const currentBal = inventoryBalanceFromBs(bsCurrent, [/inventory/]);
    const priorBal = inventoryBalanceFromBs(bsPrior, [/inventory/]);
    if (priorBal === 0 && currentBal === 0) {
      return suppress("no_comparison_period", { currentBal, priorBal });
    }

    const change = currentBal - priorBal;
    const jes = (await findJournalEntries(ctx.qbo.accessToken, ctx.qbo.realmId, {
      start_date: start,
      end_date: end,
    })) as QBOJournalEntry[];
    const jeSum = sumInventoryJeActivity(jes, patterns);

    const tolerance = Math.max(10, Math.abs(currentBal) * 0.005);
    const delta = Math.abs(change - jeSum);
    if (delta <= tolerance) {
      return suppress("within_tolerance", { change, jeSum, tolerance, currentBal, priorBal });
    }

    return fire("inventory_reconciliation_variance", {
      change,
      jeSum,
      delta,
      tolerance,
      currentBal,
      priorBal,
      period: { start, end },
    });
  } catch (err) {
    return internalError(err);
  }
}
