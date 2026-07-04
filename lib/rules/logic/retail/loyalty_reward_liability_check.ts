/**
 * @rule       rtl.loyalty_reward_liability_check
 * @assertions primary:completeness,valuation_allocation | secondary:presentation_disclosure
 * @accounts   other_current_liabilities, revenue
 * @citation   ASC 606-10-55
 */
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — untyped qbo-rest
import { reportBalanceSheet } from "@/lib/qbo-rest";
import {
  accountNamePatterns,
  fire,
  internalError,
  loadMemoryPayload,
  periodEnd,
  priorMonthEnd,
  resolveAccounts,
  suppress,
  sumReportRowsMatching,
  type QBOReport,
} from "./_helpers";

export const RULE_ID = "rtl.loyalty_reward_liability_check";
export const RULE_VERSION = 1;

interface RedemptionRate {
  redemption_pct_median?: number;
}

const OFF_TOLERANCE = 0.3; // 30% off expected

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const accounts = await resolveAccounts(
      ctx,
      "rtl.loyalty_liability_accounts",
      "AccountType = 'Other Current Liability' AND Name LIKE '%loyalty%'",
    );
    if (accounts.length === 0) return suppress("no_loyalty_liability_accounts");
    const patterns = accountNamePatterns(accounts);

    const rate = (await loadMemoryPayload(ctx, "rtl.loyalty_redemption_rate")) as
      | RedemptionRate
      | null;
    if (!rate || rate.redemption_pct_median == null) {
      return suppress("insufficient_memory_evidence");
    }

    const end = periodEnd(ctx);
    const priorEnd = priorMonthEnd(end);

    const [bsCurrent, bsPrior] = await Promise.all([
      reportBalanceSheet(ctx.qbo.accessToken, ctx.qbo.realmId, { end_date: end }) as Promise<QBOReport>,
      reportBalanceSheet(ctx.qbo.accessToken, ctx.qbo.realmId, {
        end_date: priorEnd,
      }) as Promise<QBOReport>,
    ]);

    const currentBalance = sumReportRowsMatching(bsCurrent, patterns);
    const priorBalance = sumReportRowsMatching(bsPrior, patterns);
    if (priorBalance === 0) return suppress("no_comparison_period", { currentBalance });

    const expectedRedemption = priorBalance * rate.redemption_pct_median;
    const actualDrawdown = priorBalance - currentBalance;
    const offBy =
      expectedRedemption === 0
        ? 0
        : Math.abs(actualDrawdown - expectedRedemption) / Math.abs(expectedRedemption);

    if (offBy > OFF_TOLERANCE) {
      return fire("loyalty_drawdown_off_expected", {
        expectedRedemption,
        actualDrawdown,
        offBy,
        priorBalance,
        currentBalance,
        redemption_pct_median: rate.redemption_pct_median,
      });
    }

    return suppress("loyalty_drawdown_within_band", { expectedRedemption, actualDrawdown, offBy });
  } catch (err) {
    return internalError(err);
  }
}
