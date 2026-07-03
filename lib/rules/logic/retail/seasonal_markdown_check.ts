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
  periodMonth,
  periodStart,
  resolveAccounts,
  suppress,
  sumReportRowsMatching,
  type QBOReport,
} from "./_helpers";

export const RULE_ID = "rtl.seasonal_markdown_check";
export const RULE_VERSION = 1;

interface MarkdownBaseline {
  markdown_pct_by_month?: Record<string, number>;
}

const REVENUE_FALLBACK = [/total income/, /^income$/, /total revenue/];

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const markdownAccounts = await resolveAccounts(
      ctx,
      "rtl.markdown_accounts",
      "Name LIKE '%markdown%' OR Name LIKE '%discount%'",
    );
    if (markdownAccounts.length === 0) return suppress("no_markdown_accounts");
    const patterns = accountNamePatterns(markdownAccounts);

    const baseline = (await loadMemoryPayload(ctx, "rtl.seasonal_markdown_baseline")) as
      | MarkdownBaseline
      | null;
    if (!baseline || !baseline.markdown_pct_by_month) {
      return suppress("insufficient_memory_evidence");
    }

    const end = periodEnd(ctx);
    const start = periodStart(end);
    const month = periodMonth(end);
    const expectedPct = baseline.markdown_pct_by_month[String(month)];
    if (expectedPct == null) {
      return suppress("insufficient_memory_evidence", { month });
    }

    const pl = (await reportProfitAndLoss(ctx.qbo.accessToken, ctx.qbo.realmId, {
      start_date: start,
      end_date: end,
    })) as QBOReport;

    const revenue = sumReportRowsMatching(pl, REVENUE_FALLBACK);
    if (revenue === 0) return suppress("no_revenue_in_period");

    const markdownDollars = sumReportRowsMatching(pl, patterns);
    const markdownPct = (markdownDollars / revenue) * 100;

    if (markdownPct > expectedPct * 1.5 || markdownPct < expectedPct * 0.5) {
      const direction = markdownPct > expectedPct * 1.5 ? "above_seasonal" : "below_seasonal";
      return fire("markdown_outside_seasonal_band", {
        direction,
        month,
        markdown_pct: markdownPct,
        expected_pct: expectedPct,
        markdown_dollars: markdownDollars,
        revenue,
        period: { start, end },
      });
    }

    return suppress("markdown_within_seasonal_band", {
      month,
      markdown_pct: markdownPct,
      expected_pct: expectedPct,
    });
  } catch (err) {
    return internalError(err);
  }
}
