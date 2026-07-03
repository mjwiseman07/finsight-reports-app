import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — untyped qbo-rest
import { findJournalEntries } from "@/lib/qbo-rest";
import {
  accountIdSet,
  accountNamePatterns,
  collectAccountActivity,
  daysBetween,
  fifoRemaining,
  fire,
  internalError,
  periodEnd,
  resolveAccounts,
  suppress,
  type JournalEntry,
} from "./_helpers";

export const RULE_ID = "ps.contract_asset_reclass_check";
export const RULE_VERSION = 1;

const AGE_THRESHOLD_DAYS = 90;

function isoDaysBefore(endISO: string, days: number): string {
  const d = new Date(endISO);
  return new Date(d.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const accounts = await resolveAccounts(ctx, "ps.contract_asset_accounts", null);
    if (accounts.length === 0) return suppress("no_contract_asset_account");

    const end = periodEnd(ctx);
    const windowStart = isoDaysBefore(end, 365);
    const jes = (await findJournalEntries(ctx.qbo.accessToken, ctx.qbo.realmId, {
      start_date: windowStart,
      end_date: end,
    })) as JournalEntry[];

    const idSet = accountIdSet(accounts);
    const patterns = accountNamePatterns(accounts);
    const { debits, totalCredit } = collectAccountActivity(jes, idSet, patterns);
    if (debits.length === 0) return suppress("contract_asset_normal_activity");

    const { oldestDate, remaining } = fifoRemaining(debits, totalCredit);
    if (!oldestDate || remaining <= 0.005) return suppress("no_aged_lines");

    const age = daysBetween(oldestDate, end);
    if (age > AGE_THRESHOLD_DAYS) {
      return fire("contract_asset_aged", {
        accounts: accounts.map((a) => a.account_name),
        aged_balance: remaining,
        oldest_je_date: oldestDate,
        age_days: age,
        age_threshold_days: AGE_THRESHOLD_DAYS,
      });
    }
    return suppress("no_aged_lines", { oldest_je_date: oldestDate, age_days: age });
  } catch (err) {
    return internalError(err);
  }
}
