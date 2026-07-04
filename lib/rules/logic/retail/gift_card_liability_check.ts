/**
 * @rule       rtl.gift_card_liability_check
 * @assertions primary:completeness,valuation_allocation | secondary:presentation_disclosure
 * @accounts   other_current_liabilities, revenue
 * @citation   ASC 606-10-25
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
  monthEndBefore,
  periodEnd,
  resolveAccounts,
  suppress,
  sumReportRowsMatching,
  type QBOReport,
} from "./_helpers";

export const RULE_ID = "rtl.gift_card_liability_check";
export const RULE_VERSION = 1;

interface BreakageRate {
  annual_breakage_pct?: number;
}

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const accounts = await resolveAccounts(
      ctx,
      "rtl.gift_card_liability_accounts",
      "AccountType = 'Other Current Liability' AND Name LIKE '%gift card%'",
    );
    if (accounts.length === 0) return suppress("no_gift_card_liability_accounts");
    const patterns = accountNamePatterns(accounts);

    const breakage = (await loadMemoryPayload(ctx, "rtl.gift_card_breakage_rate")) as
      | BreakageRate
      | null;
    if (!breakage || breakage.annual_breakage_pct == null) {
      return suppress("insufficient_memory_evidence");
    }

    const end = periodEnd(ctx);
    const priorEnd = monthEndBefore(end, 12);

    const [bsCurrent, bsPrior] = await Promise.all([
      reportBalanceSheet(ctx.qbo.accessToken, ctx.qbo.realmId, { end_date: end }) as Promise<QBOReport>,
      reportBalanceSheet(ctx.qbo.accessToken, ctx.qbo.realmId, {
        end_date: priorEnd,
      }) as Promise<QBOReport>,
    ]);

    const currentBalance = sumReportRowsMatching(bsCurrent, patterns);
    const priorBalance = sumReportRowsMatching(bsPrior, patterns);
    if (priorBalance === 0) return suppress("no_comparison_period_12mo", { currentBalance });

    const expectedBreakage = priorBalance * breakage.annual_breakage_pct;
    const actualReduction = priorBalance - currentBalance;

    if (
      actualReduction < expectedBreakage * 0.5 ||
      actualReduction > expectedBreakage * 2.0
    ) {
      const direction =
        actualReduction < expectedBreakage * 0.5 ? "under_recognizing" : "over_recognizing";
      return fire("gift_card_breakage_out_of_band", {
        direction,
        expectedBreakage,
        actualReduction,
        priorBalance,
        currentBalance,
        annual_breakage_pct: breakage.annual_breakage_pct,
      });
    }

    return suppress("breakage_within_band", { expectedBreakage, actualReduction });
  } catch (err) {
    return internalError(err);
  }
}
