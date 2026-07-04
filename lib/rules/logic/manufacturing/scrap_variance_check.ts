/**
 * @rule       mfg.scrap_variance_check
 * @assertions primary:valuation_allocation | secondary:completeness
 * @accounts   inventory, cost_of_goods_sold
 * @citation   ASC 330-10-30
 */
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { reportProfitAndLoss } from "@/lib/qbo-rest";
import {
  accountIdsFromMemory,
  fire,
  internalError,
  loadMemoryPayload,
  periodEnd,
  periodStart,
  suppress,
  sumReportRowsMatching,
  type QBOReport,
} from "./_helpers";

export const RULE_ID = "mfg.scrap_variance_check";
export const RULE_VERSION = 1;

interface ScrapBaseline {
  median_pct?: number;
  p90_pct?: number;
}

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const baseline = (await loadMemoryPayload(ctx, "mfg.scrap_pct_baseline")) as ScrapBaseline | null;
    if (!baseline || baseline.p90_pct == null) {
      return suppress("insufficient_memory_evidence");
    }

    const scrapMem = await loadMemoryPayload(ctx, "mfg.scrap_accounts");
    const scrapLabels = accountIdsFromMemory(scrapMem, "account_labels").map(
      (l) => new RegExp(l, "i"),
    );
    const patterns =
      scrapLabels.length > 0 ? scrapLabels : [/scrap/];

    const end = periodEnd(ctx);
    const start = periodStart(end);
    const pl = (await reportProfitAndLoss(ctx.qbo.accessToken, ctx.qbo.realmId, {
      start_date: start,
      end_date: end,
    })) as QBOReport;

    const scrap = sumReportRowsMatching(pl, patterns);
    if (scrap === 0 && scrapLabels.length === 0) {
      return suppress("no_scrap_accounts");
    }

    const revenue = sumReportRowsMatching(pl, [/total income/, /^income$/, /total revenue/]);
    if (revenue === 0) return suppress("no_data_in_period");

    const scrapPct = (scrap / revenue) * 100;
    if (scrapPct <= baseline.p90_pct) {
      return suppress("within_band", { scrapPct, p90_pct: baseline.p90_pct });
    }

    return fire("scrap_pct_above_p90", {
      scrapPct,
      p90_pct: baseline.p90_pct,
      scrap,
      revenue,
      period: { start, end },
    });
  } catch (err) {
    return internalError(err);
  }
}
