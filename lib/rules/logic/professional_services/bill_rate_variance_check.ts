/**
 * @rule       ps.bill_rate_variance_check
 * @assertions primary:accuracy | secondary:completeness
 * @accounts   revenue, accounts_receivable
 * @citation   ASC 606-10-32
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

export const RULE_ID = "ps.bill_rate_variance_check";
export const RULE_VERSION = 1;

interface StandardRate {
  role_or_class_id: string;
  role_name?: string;
  standard_rate_per_hour: number;
}
interface ClassActual {
  class_id: string;
  revenue: number;
  hours: number;
}

const DEFAULT_TOLERANCE_PCT = 15;

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  try {
    if (!ctx.qbo) return suppress("qbo_unavailable");

    const ratePayload = (await loadMemoryPayload(ctx, "ps.standard_bill_rates")) as
      | { rates?: StandardRate[] }
      | null;
    const rates = ratePayload?.rates;
    if (!rates || rates.length === 0) return suppress("no_standard_rate_policy");

    const end = periodEnd(ctx);
    const start = periodStart(end);
    if (!(await classTrackingEnabled(ctx, start, end))) {
      return suppress("no_class_tracking_enabled");
    }

    const actuals = (ctx.inputs.classActuals as ClassActual[] | undefined) ?? [];
    const withHours = actuals.filter((a) => a && a.hours > 0);
    if (withHours.length === 0) return suppress("no_hours_data");

    const tolPayload = (await loadMemoryPayload(ctx, "ps.bill_rate_variance_tolerance")) as
      | { tolerance_pct?: number }
      | null;
    const tolerancePct = tolPayload?.tolerance_pct ?? DEFAULT_TOLERANCE_PCT;

    const byClass = new Map(withHours.map((a) => [a.class_id, a]));
    const findings: Array<Record<string, unknown>> = [];
    for (const rate of rates) {
      const actual = byClass.get(rate.role_or_class_id);
      if (!actual) continue;
      const actualRate = actual.revenue / actual.hours;
      const variancePct = (Math.abs(actualRate - rate.standard_rate_per_hour) /
        rate.standard_rate_per_hour) *
        100;
      if (variancePct > tolerancePct) {
        findings.push({
          role_name: rate.role_name ?? rate.role_or_class_id,
          actual_rate: actualRate,
          standard_rate: rate.standard_rate_per_hour,
          variance_pct: variancePct,
        });
      }
    }

    if (findings.length === 0) {
      return suppress("bill_rate_within_tolerance", { tolerancePct });
    }
    return fire("bill_rate_variance", { findings: findings.slice(0, 10), tolerancePct });
  } catch (err) {
    return internalError(err);
  }
}
