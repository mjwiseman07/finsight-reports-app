import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { reportBalanceSheet } from "@/lib/qbo-rest";
import {
  accountIdsFromMemory,
  fire,
  internalError,
  loadMemoryPayload,
  periodEnd,
  suppress,
  sumReportRowsMatching,
  type QBOReport,
} from "./_helpers";

export const RULE_ID = "mfg.wip_cutoff_check";
export const RULE_VERSION = 1;

interface WipBand {
  low?: number;
  high?: number;
}

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const band = (await loadMemoryPayload(ctx, "mfg.wip_expected_band")) as WipBand | null;
    if (!band || band.low == null || band.high == null) {
      return suppress("insufficient_memory_evidence");
    }

    const wipMem = await loadMemoryPayload(ctx, "mfg.wip_accounts");
    const wipLabels = accountIdsFromMemory(wipMem, "account_labels").map(
      (l) => new RegExp(l, "i"),
    );
    const patterns =
      wipLabels.length > 0
        ? wipLabels
        : [/wip/, /work in process/, /work-in-process/];

    const end = periodEnd(ctx);
    const bs = (await reportBalanceSheet(ctx.qbo.accessToken, ctx.qbo.realmId, {
      end_date: end,
    })) as QBOReport;

    const wipBalance = sumReportRowsMatching(bs, patterns);
    if (wipBalance === 0 && wipLabels.length === 0) {
      return suppress("no_wip_accounts");
    }

    if (wipBalance >= band.low && wipBalance <= band.high) {
      return suppress("within_band", { wipBalance, low: band.low, high: band.high });
    }

    return fire("wip_outside_expected_band", {
      wipBalance,
      low: band.low,
      high: band.high,
      endDate: end,
    });
  } catch (err) {
    return internalError(err);
  }
}
