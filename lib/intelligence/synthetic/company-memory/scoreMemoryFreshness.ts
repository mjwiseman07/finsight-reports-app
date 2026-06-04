import type { SyntheticCompanyMemoryFreshness } from "./types";

function parsePeriodKey(periodKey: string): number {
  const [year, month = "12"] = periodKey.split("-");
  return Number(year) * 12 + Number(month);
}

export function scoreMemoryFreshness(input: {
  observedPeriodKeys: string[];
  memoryLastConfirmedAt?: string;
  asOfPeriodKey: string;
  staleAfterMonths?: number;
}): SyntheticCompanyMemoryFreshness {
  const observedPeriodKeys = [...new Set(input.observedPeriodKeys.filter(Boolean))].sort();
  const memoryLastConfirmedAt = input.memoryLastConfirmedAt || observedPeriodKeys[observedPeriodKeys.length - 1] || input.asOfPeriodKey;
  const monthsSinceConfirmation = Math.max(0, parsePeriodKey(input.asOfPeriodKey) - parsePeriodKey(memoryLastConfirmedAt));
  const staleAfterMonths = input.staleAfterMonths || 36;
  const recencyScore = Math.max(observedPeriodKeys.length ? 0.12 : 0, 1 - monthsSinceConfirmation / staleAfterMonths);
  const recurrenceBonus = Math.min(0.14, observedPeriodKeys.length * 0.03);
  const memoryFreshnessScore = Number(Math.min(1, recencyScore * 0.8 + recurrenceBonus).toFixed(2));
  const freshnessExplanationCodes = [
    monthsSinceConfirmation <= 3 ? "confirmed_current_quarter" : undefined,
    monthsSinceConfirmation <= 12 ? "confirmed_within_12_months" : undefined,
    monthsSinceConfirmation > 24 ? "stale_more_than_24_months" : undefined,
    observedPeriodKeys.length <= 1 ? "single_old_observation" : undefined,
    observedPeriodKeys.length >= 12 ? "recurring_observation_history" : undefined,
  ].filter((code): code is string => Boolean(code));

  return {
    memoryFreshnessScore,
    memoryLastConfirmedAt,
    observedPeriodKeys,
    freshnessExplanationCodes,
    staleAfterMonths,
  };
}
