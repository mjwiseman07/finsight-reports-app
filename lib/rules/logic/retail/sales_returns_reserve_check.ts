/**
 * @rule       rtl.sales_returns_reserve_check
 * @assertions primary:valuation_allocation | secondary:completeness
 * @accounts   accounts_receivable, revenue, other_current_liabilities
 * @citation   ASC 606-10-32
 */
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — untyped qbo-rest
import { reportBalanceSheet, reportProfitAndLoss } from "@/lib/qbo-rest";
import {
  accountNamePatterns,
  fire,
  internalError,
  loadMemoryPayload,
  periodEnd,
  resolveAccounts,
  suppress,
  sumReportRowsMatching,
  type QBOReport,
} from "./_helpers";

export const RULE_ID = "rtl.sales_returns_reserve_check";
export const RULE_VERSION = 1;

interface ReturnsBaseline {
  returns_pct_of_revenue_median?: number;
}

const REVENUE_FALLBACK = [/total income/, /^income$/, /total revenue/];

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const refundAccounts = await resolveAccounts(
      ctx,
      "rtl.returns_reserve_accounts",
      "AccountType = 'Other Current Liability' AND Name LIKE '%refund%'",
    );
    if (refundAccounts.length === 0) return suppress("no_refund_liability_account");
    const patterns = accountNamePatterns(refundAccounts);

    const baseline = (await loadMemoryPayload(ctx, "rtl.returns_rate_baseline")) as
      | ReturnsBaseline
      | null;
    if (!baseline || baseline.returns_pct_of_revenue_median == null) {
      return suppress("insufficient_memory_evidence");
    }

    const end = periodEnd(ctx);
    const trailingStart = (() => {
      const d = new Date(end);
      return new Date(d.getFullYear(), d.getMonth() - 2, 1).toISOString().slice(0, 10);
    })();

    const [bs, plTrailing] = await Promise.all([
      reportBalanceSheet(ctx.qbo.accessToken, ctx.qbo.realmId, { end_date: end }) as Promise<QBOReport>,
      reportProfitAndLoss(ctx.qbo.accessToken, ctx.qbo.realmId, {
        start_date: trailingStart,
        end_date: end,
      }) as Promise<QBOReport>,
    ]);

    const trailingRevenue = sumReportRowsMatching(plTrailing, REVENUE_FALLBACK);
    if (trailingRevenue === 0) return suppress("no_revenue_in_period");

    const currentReserve = sumReportRowsMatching(bs, patterns);
    const expectedReserve = trailingRevenue * baseline.returns_pct_of_revenue_median;

    if (currentReserve < expectedReserve * 0.5) {
      return fire("returns_reserve_under_reserved", {
        currentReserve,
        expectedReserve,
        trailingRevenue,
        returns_pct_of_revenue_median: baseline.returns_pct_of_revenue_median,
        period_end: end,
      });
    }

    if (currentReserve > expectedReserve * 3.0) {
      return {
        fired: true,
        outcome: "fired",
        reason_code: "returns_reserve_over_reserved",
        reason_detail: {
          currentReserve,
          expectedReserve,
          trailingRevenue,
          period_end: end,
        },
        severity_override: "info",
      };
    }

    return suppress("returns_reserve_adequate", { currentReserve, expectedReserve });
  } catch (err) {
    return internalError(err);
  }
}
