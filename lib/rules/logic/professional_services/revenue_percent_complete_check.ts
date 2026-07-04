/**
 * @rule       ps.revenue_percent_complete_check
 * @assertions primary:cutoff,accuracy | secondary:existence_occurrence
 * @accounts   revenue, other_current_assets
 * @citation   ASC 606-10-25
 */
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
import { fire, internalError, loadMemoryPayload, suppress } from "./_helpers";

export const RULE_ID = "ps.revenue_percent_complete_check";
export const RULE_VERSION = 1;

interface PctCompleteProject {
  class_id: string;
  contract_value: number;
  cost_to_date: number;
  estimated_total_cost: number;
  revenue_recognized_to_date: number;
}

const VARIANCE_PCT_OF_CONTRACT = 0.05;
const OVERRUN_MULTIPLIER = 1.1;
const MAX_FINDINGS = 10;

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const payload = (await loadMemoryPayload(ctx, "ps.percent_complete_projects")) as
      | { projects?: PctCompleteProject[] }
      | null;
    const projects = payload?.projects;
    if (!projects || projects.length === 0) return suppress("no_percent_complete_data");

    const overruns: Array<Record<string, unknown>> = [];
    const recognitionVariances: Array<Record<string, unknown>> = [];
    for (const p of projects) {
      if (p.estimated_total_cost <= 0 || p.contract_value <= 0) continue;
      if (p.cost_to_date >= p.estimated_total_cost * OVERRUN_MULTIPLIER) {
        overruns.push({
          class_id: p.class_id,
          cost_to_date: p.cost_to_date,
          estimated_total_cost: p.estimated_total_cost,
        });
      }
      const pctComplete = p.cost_to_date / p.estimated_total_cost;
      const expected = pctComplete * p.contract_value;
      const variance = Math.abs(expected - p.revenue_recognized_to_date);
      if (variance / p.contract_value > VARIANCE_PCT_OF_CONTRACT) {
        recognitionVariances.push({
          class_id: p.class_id,
          expected_revenue_to_date: expected,
          revenue_recognized_to_date: p.revenue_recognized_to_date,
          variance,
          pct_complete: pctComplete,
        });
      }
    }

    if (overruns.length > 0) {
      return fire("cost_overrun_needs_reforecast", {
        projects: overruns.slice(0, MAX_FINDINGS),
        count: overruns.length,
      });
    }
    if (recognitionVariances.length > 0) {
      return fire("revenue_recognition_variance", {
        findings: recognitionVariances.slice(0, MAX_FINDINGS),
        count: recognitionVariances.length,
      });
    }
    return suppress("all_projects_within_recognition_band", { evaluated: projects.length });
  } catch (err) {
    return internalError(err);
  }
}
