/**
 * @rule       rtl.inventory_shrink_check
 * @assertions primary:existence_occurrence | secondary:valuation_allocation
 * @accounts   inventory, cost_of_goods_sold
 * @citation   ISA 501; ASC 330
 */
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — untyped qbo-rest
import { reportProfitAndLoss } from "@/lib/qbo-rest";
import {
  accountNamePatterns,
  fire,
  internalError,
  loadMemoryPayload,
  periodEnd,
  periodStart,
  resolveAccounts,
  suppress,
  sumReportRowsMatching,
  type QBOReport,
} from "./_helpers";

export const RULE_ID = "rtl.inventory_shrink_check";
export const RULE_VERSION = 1;

interface ShrinkBaseline {
  shrink_pct_of_sales_p90?: number;
  shrink_pct_of_sales_median?: number;
}

const REVENUE_FALLBACK = [/total income/, /^income$/, /total revenue/];

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const shrinkAccounts = await resolveAccounts(
      ctx,
      "rtl.shrink_accounts",
      "(Name LIKE '%shrink%') OR (Name LIKE '%inventory%' AND Name LIKE '%adjustment%')",
    );
    if (shrinkAccounts.length === 0) return suppress("no_shrink_accounts");
    const shrinkPatterns = accountNamePatterns(shrinkAccounts);

    const baseline = (await loadMemoryPayload(ctx, "rtl.shrink_baseline")) as ShrinkBaseline | null;
    if (!baseline || baseline.shrink_pct_of_sales_p90 == null) {
      return suppress("insufficient_memory_evidence");
    }

    const end = periodEnd(ctx);
    const start = periodStart(end);
    const pl = (await reportProfitAndLoss(ctx.qbo.accessToken, ctx.qbo.realmId, {
      start_date: start,
      end_date: end,
    })) as QBOReport;

    const revenue = sumReportRowsMatching(pl, REVENUE_FALLBACK);
    if (revenue === 0) return suppress("no_revenue_in_period");

    const shrinkDollars = sumReportRowsMatching(pl, shrinkPatterns);
    const shrinkPct = (shrinkDollars / revenue) * 100;

    if (shrinkPct > baseline.shrink_pct_of_sales_p90) {
      return fire("shrink_above_p90", {
        shrink_pct: shrinkPct,
        baseline_p90: baseline.shrink_pct_of_sales_p90,
        shrink_dollars: shrinkDollars,
        revenue,
        period: { start, end },
      });
    }

    return suppress("shrink_within_band", {
      shrink_pct: shrinkPct,
      baseline_p90: baseline.shrink_pct_of_sales_p90,
    });
  } catch (err) {
    return internalError(err);
  }
}
