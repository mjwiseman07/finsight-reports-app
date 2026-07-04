/**
 * @rule       rtl.cogs_recognition_check
 * @assertions primary:cutoff | secondary:completeness
 * @accounts   cost_of_goods_sold, inventory
 * @citation   ASC 606, ASC 330
 */
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — untyped qbo-rest
import { reportProfitAndLoss } from "@/lib/qbo-rest";
import {
  fire,
  internalError,
  periodEnd,
  periodStart,
  priorPeriodRange,
  resolveAccounts,
  accountNamePatterns,
  suppress,
  sumReportRowsMatching,
  type QBOReport,
} from "./_helpers";

export const RULE_ID = "rtl.cogs_recognition_check";
export const RULE_VERSION = 1;

const DELTA_PP_THRESHOLD = 5; // percentage points
const DOLLAR_DELTA_THRESHOLD = 1000;
const REVENUE_FALLBACK = [/total income/, /^income$/, /total revenue/];

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const end = periodEnd(ctx);
    const start = periodStart(end);
    const prior = priorPeriodRange(end);

    const cogsAccounts = await resolveAccounts(
      ctx,
      "rtl.cogs_accounts",
      "AccountType = 'Cost of Goods Sold'",
    );
    if (cogsAccounts.length === 0) return suppress("no_cogs_accounts");
    const cogsPatterns = accountNamePatterns(cogsAccounts);

    const revAccounts = await resolveAccounts(ctx, "rtl.revenue_accounts", "AccountType = 'Income'");
    const revPatterns =
      revAccounts.length > 0 ? accountNamePatterns(revAccounts) : REVENUE_FALLBACK;

    const [plCurrent, plPrior] = await Promise.all([
      reportProfitAndLoss(ctx.qbo.accessToken, ctx.qbo.realmId, {
        start_date: start,
        end_date: end,
      }) as Promise<QBOReport>,
      reportProfitAndLoss(ctx.qbo.accessToken, ctx.qbo.realmId, {
        start_date: prior.start,
        end_date: prior.end,
      }) as Promise<QBOReport>,
    ]);

    const currentRevenue = sumReportRowsMatching(plCurrent, revPatterns);
    if (currentRevenue === 0) return suppress("no_revenue_in_period");

    const priorRevenue = sumReportRowsMatching(plPrior, revPatterns);
    if (priorRevenue === 0) return suppress("no_comparison_period");

    const currentCogs = sumReportRowsMatching(plCurrent, cogsPatterns);
    const priorCogs = sumReportRowsMatching(plPrior, cogsPatterns);

    const currentPct = (currentCogs / currentRevenue) * 100;
    const priorPct = (priorCogs / priorRevenue) * 100;
    const deltaPp = Math.abs(currentPct - priorPct);
    const dollarDelta = Math.abs(currentCogs - priorCogs);

    if (deltaPp > DELTA_PP_THRESHOLD && dollarDelta > DOLLAR_DELTA_THRESHOLD) {
      return fire("cogs_recognition_mismatch", {
        current_period_cogs_pct: currentPct,
        prior_period_cogs_pct: priorPct,
        delta_pp: deltaPp,
        dollar_delta: dollarDelta,
        current_revenue: currentRevenue,
        current_cogs: currentCogs,
        period: { start, end },
      });
    }

    return suppress("cogs_ratio_stable", {
      current_period_cogs_pct: currentPct,
      prior_period_cogs_pct: priorPct,
      delta_pp: deltaPp,
    });
  } catch (err) {
    return internalError(err);
  }
}
