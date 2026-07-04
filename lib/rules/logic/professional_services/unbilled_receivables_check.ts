/**
 * @rule       ps.unbilled_receivables_check
 * @assertions primary:completeness | secondary:valuation_allocation
 * @accounts   other_current_assets, revenue
 * @citation   ASC 606-10-45
 */
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
  loadMemoryPayload,
  periodEnd,
  resolveAccounts,
  suppress,
  type JournalEntry,
} from "./_helpers";

export const RULE_ID = "ps.unbilled_receivables_check";
export const RULE_VERSION = 1;

const WIP_FALLBACK_WHERE =
  "Name LIKE '%wip%' OR Name LIKE '%work in process%' OR (Name LIKE '%unbilled%' AND Name LIKE '%revenue%')";
const DEFAULT_WARNING_DAYS = 60;
const DEFAULT_CRITICAL_DAYS = 90;

function isoDaysBefore(endISO: string, days: number): string {
  const d = new Date(endISO);
  return new Date(d.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const accounts = await resolveAccounts(ctx, "ps.wip_accounts", WIP_FALLBACK_WHERE);
    if (accounts.length === 0) return suppress("no_wip_accounts");

    const bands = (await loadMemoryPayload(ctx, "ps.unbilled_receivables_aging_bands")) as
      | { warning_days?: number; critical_days?: number }
      | null;
    const warningDays = bands?.warning_days ?? DEFAULT_WARNING_DAYS;
    const criticalDays = bands?.critical_days ?? DEFAULT_CRITICAL_DAYS;

    const end = periodEnd(ctx);
    const jes = (await findJournalEntries(ctx.qbo.accessToken, ctx.qbo.realmId, {
      start_date: isoDaysBefore(end, 180),
      end_date: end,
    })) as JournalEntry[];

    const idSet = accountIdSet(accounts);
    const patterns = accountNamePatterns(accounts);
    const { debits, totalCredit } = collectAccountActivity(jes, idSet, patterns);
    if (debits.length === 0) return suppress("no_wip_activity");

    const { oldestDate, remaining } = fifoRemaining(debits, totalCredit);
    if (!oldestDate || remaining <= 0.005) {
      return suppress("wip_aging_healthy", { remaining });
    }

    const age = daysBetween(oldestDate, end);
    const evidence = {
      oldest_wip_date: oldestDate,
      age_days: age,
      remaining_wip: remaining,
      warning_days: warningDays,
      critical_days: criticalDays,
      approximation_method: "fifo_ge_jes",
    };

    if (age > criticalDays) {
      return {
        fired: true,
        outcome: "fired",
        reason_code: "unbilled_wip_over_critical",
        reason_detail: evidence,
        severity_override: "error",
      };
    }
    if (age > warningDays) {
      return fire("unbilled_wip_over_warning", evidence);
    }
    return suppress("wip_aging_healthy", evidence);
  } catch (err) {
    return internalError(err);
  }
}
