import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — untyped qbo-rest
import { findJournalEntries, reportBalanceSheet, reportProfitAndLoss } from "@/lib/qbo-rest";
import {
  accountIdSet,
  accountNamePatterns,
  collectAccountActivity,
  fire,
  internalError,
  periodEnd,
  periodStart,
  priorMonthEnd,
  resolveAccounts,
  suppress,
  sumReportRowsMatching,
  type JournalEntry,
  type QBOReport,
} from "./_helpers";

export const RULE_ID = "ps.wip_billable_hours_check";
export const RULE_VERSION = 1;

const WIP_FALLBACK_WHERE =
  "Name LIKE '%wip%' OR Name LIKE '%work in process%' OR (Name LIKE '%unbilled%' AND Name LIKE '%revenue%')";
const REVENUE_FALLBACK = [/total income/, /^income$/, /total revenue/];
const WIP_GROWTH_THRESHOLD = 0.2;

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const accounts = await resolveAccounts(ctx, "ps.wip_accounts", WIP_FALLBACK_WHERE);
    if (accounts.length === 0) return suppress("no_wip_accounts");

    const end = periodEnd(ctx);
    const start = periodStart(end);
    const priorEnd = priorMonthEnd(end);
    const idSet = accountIdSet(accounts);
    const patterns = accountNamePatterns(accounts);

    const [bsEnd, bsPrior, plCurrent, plPrior, jes] = await Promise.all([
      reportBalanceSheet(ctx.qbo.accessToken, ctx.qbo.realmId, { end_date: end }) as Promise<QBOReport>,
      reportBalanceSheet(ctx.qbo.accessToken, ctx.qbo.realmId, {
        end_date: priorEnd,
      }) as Promise<QBOReport>,
      reportProfitAndLoss(ctx.qbo.accessToken, ctx.qbo.realmId, {
        start_date: start,
        end_date: end,
      }) as Promise<QBOReport>,
      reportProfitAndLoss(ctx.qbo.accessToken, ctx.qbo.realmId, {
        start_date: new Date(new Date(start).getFullYear(), new Date(start).getMonth() - 1, 1)
          .toISOString()
          .slice(0, 10),
        end_date: priorEnd,
      }) as Promise<QBOReport>,
      findJournalEntries(ctx.qbo.accessToken, ctx.qbo.realmId, {
        start_date: start,
        end_date: end,
      }) as Promise<JournalEntry[]>,
    ]);

    const endBalance = sumReportRowsMatching(bsEnd, patterns);
    const startBalance = sumReportRowsMatching(bsPrior, patterns);
    const { totalDebit, totalCredit } = collectAccountActivity(jes, idSet, patterns);

    const balanceChange = endBalance - startBalance;
    const expectedChange = totalDebit - totalCredit;
    const drift = Math.abs(balanceChange - expectedChange);
    const driftThreshold = Math.max(1, Math.abs(endBalance) * 0.001);

    if (drift > driftThreshold) {
      return fire("wip_reconciliation_drift", {
        start_balance: startBalance,
        end_balance: endBalance,
        balance_change: balanceChange,
        je_debits: totalDebit,
        je_credits: totalCredit,
        drift,
        drift_threshold: driftThreshold,
      });
    }

    if (startBalance <= 0) return suppress("no_comparison_period", { endBalance });

    const wipGrowth = (endBalance - startBalance) / startBalance;
    const revCurrent = sumReportRowsMatching(plCurrent, REVENUE_FALLBACK);
    const revPrior = sumReportRowsMatching(plPrior, REVENUE_FALLBACK);
    const revGrowth = revPrior > 0 ? (revCurrent - revPrior) / revPrior : 0;

    if (wipGrowth > WIP_GROWTH_THRESHOLD && revGrowth < wipGrowth) {
      return fire("wip_growing_faster_than_billing", {
        wip_growth_pct: wipGrowth * 100,
        revenue_growth_pct: revGrowth * 100,
        start_balance: startBalance,
        end_balance: endBalance,
      });
    }

    return suppress("wip_billable_hours_healthy", {
      wip_growth_pct: wipGrowth * 100,
      revenue_growth_pct: revGrowth * 100,
    });
  } catch (err) {
    return internalError(err);
  }
}
