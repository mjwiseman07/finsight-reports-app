/**
 * @rule       ps.project_margin_flag_check
 * @assertions primary:valuation_allocation | secondary:completeness
 * @accounts   revenue, other_current_assets, accrued_liabilities
 * @citation   ASC 606-10-25, ASC 605-35
 */
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
import {
  classTrackingEnabled,
  fire,
  internalError,
  loadMemoryPayload,
  periodEnd,
  periodStart,
  suppress,
} from "./_helpers";

export const RULE_ID = "ps.project_margin_flag_check";
export const RULE_VERSION = 1;

interface MarginBaseline {
  margin_pct_p10?: number;
}
interface ClassMargin {
  class_id: string;
  class_name?: string;
  revenue: number;
  direct_cost: number;
}

const MIN_REVENUE = 1000;
const MAX_FINDINGS = 10;

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const end = periodEnd(ctx);
    const start = periodStart(end);
    if (!(await classTrackingEnabled(ctx, start, end))) {
      return suppress("no_class_tracking_enabled");
    }

    const baseline = (await loadMemoryPayload(ctx, "ps.project_margin_baseline")) as
      | MarginBaseline
      | null;
    if (!baseline || baseline.margin_pct_p10 == null) {
      return suppress("insufficient_memory_evidence");
    }

    const classes = (ctx.inputs.classMargins as ClassMargin[] | undefined) ?? [];
    const qualifying = classes.filter((c) => c && c.revenue >= MIN_REVENUE);
    if (qualifying.length === 0) return suppress("no_projects_with_revenue");

    const missingCost: Array<Record<string, unknown>> = [];
    const belowBand: Array<Record<string, unknown>> = [];
    for (const c of qualifying) {
      if (c.direct_cost === 0) {
        missingCost.push({ class_name: c.class_name ?? c.class_id, revenue: c.revenue });
        continue;
      }
      const marginPct = ((c.revenue - c.direct_cost) / c.revenue) * 100;
      if (marginPct < baseline.margin_pct_p10) {
        belowBand.push({
          class_name: c.class_name ?? c.class_id,
          revenue: c.revenue,
          direct_cost: c.direct_cost,
          margin_pct: marginPct,
          baseline_p10: baseline.margin_pct_p10,
        });
      }
    }

    if (missingCost.length > 0) {
      return fire("missing_direct_cost_allocation", {
        classes: missingCost.slice(0, MAX_FINDINGS),
        count: missingCost.length,
      });
    }
    if (belowBand.length > 0) {
      return fire("project_margin_below_band", {
        findings: belowBand.slice(0, MAX_FINDINGS),
        count: belowBand.length,
      });
    }
    return suppress("all_projects_within_margin_band", { evaluated: qualifying.length });
  } catch (err) {
    return internalError(err);
  }
}
