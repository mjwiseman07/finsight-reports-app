/**
 * @rule       mfg.cogs_variance_check
 * @assertions primary:accuracy,valuation_allocation
 * @accounts   cost_of_goods_sold, inventory
 * @citation   ASC 330
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

export const RULE_ID = "mfg.cogs_variance_check";
export const RULE_VERSION = 1;

interface CogsBaseline {
  median_pct?: number;
  p10_pct?: number;
  p90_pct?: number;
}

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const baseline = (await loadMemoryPayload(ctx, "mfg.cogs_ratio_baseline")) as CogsBaseline | null;
    if (!baseline || baseline.p10_pct == null || baseline.p90_pct == null) {
      return suppress("insufficient_memory_evidence");
    }

    const end = periodEnd(ctx);
    const start = periodStart(end);
    const pl = (await reportProfitAndLoss(ctx.qbo.accessToken, ctx.qbo.realmId, {
      start_date: start,
      end_date: end,
    })) as QBOReport;

    const revenue = sumReportRowsMatching(pl, [/total income/, /^income$/, /total revenue/]);
    if (revenue === 0) return suppress("no_data_in_period");

    const cogs = sumReportRowsMatching(pl, [/cost of goods sold/, /^cogs$/, /total cogs/]);
    const currentPct = (cogs / revenue) * 100;

    if (currentPct >= baseline.p10_pct && currentPct <= baseline.p90_pct) {
      return suppress("within_band", {
        currentPct,
        p10_pct: baseline.p10_pct,
        p90_pct: baseline.p90_pct,
      });
    }

    return fire("cogs_ratio_out_of_band", {
      currentPct,
      p10_pct: baseline.p10_pct,
      p90_pct: baseline.p90_pct,
      cogs,
      revenue,
      period: { start, end },
    });
  } catch (err) {
    return internalError(err);
  }
}
