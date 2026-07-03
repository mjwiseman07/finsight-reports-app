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

export const RULE_ID = "mfg.absorption_check";
export const RULE_VERSION = 1;

interface AbsorptionBaseline {
  applied_to_actual_median?: number;
  tolerance_pct?: number;
}

interface AbsorptionAccountMap {
  applied_overhead_account_ids?: string[];
  actual_overhead_account_ids?: string[];
  applied_overhead_labels?: string[];
  actual_overhead_labels?: string[];
}

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const baseline = (await loadMemoryPayload(ctx, "mfg.absorption_ratio_baseline")) as
      | AbsorptionBaseline
      | null;
    if (
      !baseline ||
      baseline.applied_to_actual_median == null ||
      baseline.tolerance_pct == null
    ) {
      return suppress("insufficient_memory_evidence");
    }

    const accountMap = (await loadMemoryPayload(ctx, "mfg.absorption_account_map")) as
      | AbsorptionAccountMap
      | null;
    if (!accountMap) return suppress("no_absorption_account_map");

    const appliedLabels =
      accountMap.applied_overhead_labels?.map((l) => new RegExp(l, "i")) ?? [];
    const actualLabels = accountMap.actual_overhead_labels?.map((l) => new RegExp(l, "i")) ?? [];
    if (appliedLabels.length === 0 || actualLabels.length === 0) {
      return suppress("no_absorption_account_map");
    }

    const end = periodEnd(ctx);
    const start = periodStart(end);
    const pl = (await reportProfitAndLoss(ctx.qbo.accessToken, ctx.qbo.realmId, {
      start_date: start,
      end_date: end,
    })) as QBOReport;

    const appliedTotal = sumReportRowsMatching(pl, appliedLabels);
    const actualTotal = sumReportRowsMatching(pl, actualLabels);
    if (actualTotal === 0) return suppress("no_data_in_period", { appliedTotal, actualTotal });

    const currentRatio = appliedTotal / actualTotal;
    const delta = Math.abs(currentRatio - baseline.applied_to_actual_median);
    if (delta <= baseline.tolerance_pct) {
      return suppress("within_tolerance", {
        currentRatio,
        median: baseline.applied_to_actual_median,
        tolerance_pct: baseline.tolerance_pct,
      });
    }

    return fire("absorption_ratio_out_of_band", {
      currentRatio,
      median: baseline.applied_to_actual_median,
      delta,
      tolerance_pct: baseline.tolerance_pct,
      appliedTotal,
      actualTotal,
      period: { start, end },
    });
  } catch (err) {
    return internalError(err);
  }
}
