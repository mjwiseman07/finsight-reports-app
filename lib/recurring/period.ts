// D5.1 — period engine. Pure function that resolves the dollar amount for a
// given 1-based period_index of a recurring template. No DB, no side effects.
//
// template_type behavior:
//   fixed        -> amount lives in je_payload_template.Line[].Amount; NOT
//                   computed per period. Returns NaN with reason
//                   'amount_from_payload'.
//   straight_line-> starting_balance split evenly across total_periods, with
//                   residual pennies landing in the FINAL period so the sum of
//                   all periods equals starting_balance exactly (to the cent).
//   schedule     -> per-period amount looked up from schedule_lines.

import type {
  PeriodAmountResult,
  RecurringScheduleLine,
  RecurringTemplate,
  TemplateType,
} from "./types";

export function computePeriodAmount(
  template: RecurringTemplate,
  periodIndex: number,
  scheduleLines?: RecurringScheduleLine[],
): PeriodAmountResult {
  if (!Number.isInteger(periodIndex) || periodIndex < 1) {
    return { amount: NaN, is_terminal: true, reason: "invalid_period_index" };
  }

  const templateType: TemplateType = template.template_type;
  switch (templateType) {
    case "fixed":
      // The amount is carried by the JE payload, not computed here.
      return { amount: NaN, is_terminal: false, reason: "amount_from_payload" };

    case "straight_line":
      return straightLineAmount(template, periodIndex);

    case "schedule":
      return scheduleAmount(periodIndex, scheduleLines);

    default: {
      const _exhaustive: never = templateType;
      throw new Error(`computePeriodAmount: unhandled template_type '${String(_exhaustive)}'`);
    }
  }
}

function straightLineAmount(template: RecurringTemplate, periodIndex: number): PeriodAmountResult {
  const { starting_balance, total_periods } = template;
  if (starting_balance === null || total_periods === null || total_periods <= 0) {
    return { amount: NaN, is_terminal: true, reason: "missing_straight_line_config" };
  }
  if (periodIndex > total_periods) {
    return { amount: 0, is_terminal: true, reason: "past_total_periods" };
  }

  // Work entirely in integer cents to avoid float drift.
  const totalCents = Math.round(starting_balance * 100);
  const baseCents = Math.trunc(totalCents / total_periods);
  const residualCents = totalCents - baseCents * total_periods;

  // Residual pennies land in the final period.
  const cents = periodIndex === total_periods ? baseCents + residualCents : baseCents;
  return { amount: cents / 100, is_terminal: false };
}

function scheduleAmount(
  periodIndex: number,
  scheduleLines?: RecurringScheduleLine[],
): PeriodAmountResult {
  if (!scheduleLines || scheduleLines.length === 0) {
    return { amount: NaN, is_terminal: true, reason: "no_schedule_lines_provided" };
  }
  const line = scheduleLines.find((l) => l.period_index === periodIndex);
  if (!line) {
    return { amount: NaN, is_terminal: true, reason: "no_schedule_line_for_period" };
  }
  return { amount: line.amount, is_terminal: false };
}
