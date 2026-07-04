/**
 * @rule       mfg.standard_cost_capitalization_check
 * @assertions primary:valuation_allocation | secondary:accuracy
 * @accounts   inventory, cost_of_goods_sold
 * @citation   ASC 330-10-30
 */
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { findJournalEntries } from "@/lib/qbo-rest";
import {
  fire,
  internalError,
  loadMemoryPayload,
  monthsBetween,
  periodEnd,
  periodStart,
  suppress,
} from "./_helpers";

export const RULE_ID = "mfg.standard_cost_capitalization_check";
export const RULE_VERSION = 1;

interface StandardCostPolicy {
  revaluation_frequency_months?: number;
  last_revaluation_period?: string;
  tolerance_pct?: number;
}

interface QBOJournalEntry {
  Id: string;
  PrivateNote?: string;
  DocNumber?: string;
}

function isRevaluationJe(je: QBOJournalEntry): boolean {
  const note = (je.PrivateNote ?? "").toLowerCase();
  const doc = (je.DocNumber ?? "").toLowerCase();
  return (
    note.includes("standard cost") ||
    note.includes("revaluation") ||
    doc.includes("standard cost") ||
    doc.includes("revaluation")
  );
}

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    const policy = (await loadMemoryPayload(ctx, "mfg.standard_cost_policy")) as
      | StandardCostPolicy
      | null;
    if (!policy?.revaluation_frequency_months || !policy?.last_revaluation_period) {
      return suppress("no_standard_cost_policy");
    }

    if (!ctx.qbo) return suppress("qbo_unavailable");

    const end = periodEnd(ctx);
    const monthsElapsed = monthsBetween(policy.last_revaluation_period, end);
    if (monthsElapsed < policy.revaluation_frequency_months) {
      return suppress("revaluation_not_due", {
        monthsElapsed,
        frequency: policy.revaluation_frequency_months,
      });
    }

    const start = periodStart(end);
    const jes = (await findJournalEntries(ctx.qbo.accessToken, ctx.qbo.realmId, {
      start_date: start,
      end_date: end,
    })) as QBOJournalEntry[];

    const revaluations = (jes ?? []).filter(isRevaluationJe);
    if (revaluations.length > 0) {
      return suppress("revaluation_detected", {
        count: revaluations.length,
        ids: revaluations.slice(0, 10).map((j) => j.Id),
      });
    }

    return fire("missing_standard_cost_revaluation", {
      monthsElapsed,
      frequency: policy.revaluation_frequency_months,
      last_revaluation_period: policy.last_revaluation_period,
      period: { start, end },
    });
  } catch (err) {
    return internalError(err);
  }
}
