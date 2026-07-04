/**
 * @rule       mfg.warranty_accrual_check
 * @assertions primary:completeness,valuation_allocation | secondary:presentation_disclosure
 * @accounts   accrued_liabilities, operating_expenses
 * @citation   ASC 460-10-25
 */
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { reportProfitAndLoss } from "@/lib/qbo-rest";
import {
  fire,
  internalError,
  loadMemoryPayload,
  periodEnd,
  periodStart,
  suppress,
  sumReportRowsMatching,
  type QBOReport,
} from "./_helpers";

export const RULE_ID = "mfg.warranty_accrual_check";
export const RULE_VERSION = 1;

interface WarrantyRatio {
  median_pct_of_revenue?: number;
  p90_pct?: number;
}

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const baseline = (await loadMemoryPayload(ctx, "mfg.warranty_accrual_ratio")) as
      | WarrantyRatio
      | null;
    if (
      !baseline ||
      baseline.median_pct_of_revenue == null ||
      baseline.p90_pct == null
    ) {
      return suppress("insufficient_memory_evidence");
    }

    const end = periodEnd(ctx);
    const start = periodStart(end);
    const pl = (await reportProfitAndLoss(ctx.qbo.accessToken, ctx.qbo.realmId, {
      start_date: start,
      end_date: end,
    })) as QBOReport;

    const warranty = sumReportRowsMatching(pl, [/warranty/]);
    if (warranty === 0) return suppress("no_warranty_accounts");

    const revenue = sumReportRowsMatching(pl, [/total income/, /^income$/, /total revenue/]);
    if (revenue === 0) return suppress("no_data_in_period");

    const accrualPct = (warranty / revenue) * 100;
    const underThreshold = baseline.median_pct_of_revenue * 0.5;
    const overThreshold = baseline.p90_pct * 2;

    if (accrualPct >= underThreshold && accrualPct <= overThreshold) {
      return suppress("within_band", {
        accrualPct,
        median_pct_of_revenue: baseline.median_pct_of_revenue,
        p90_pct: baseline.p90_pct,
      });
    }

    const direction = accrualPct < underThreshold ? "under_accruing" : "over_accruing";
    return fire("warranty_accrual_out_of_band", {
      direction,
      accrualPct,
      median_pct_of_revenue: baseline.median_pct_of_revenue,
      p90_pct: baseline.p90_pct,
      warranty,
      revenue,
      period: { start, end },
    });
  } catch (err) {
    return internalError(err);
  }
}
