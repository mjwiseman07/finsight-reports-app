import type { ChnaCycle, FapPublicizationChannel } from "../types";

export const DEFAULT_CHNA_GRACE_PERIOD_DAYS = 60;

export function createChnaCycle(fiscalYearEnd: Date, overrides?: Partial<ChnaCycle>): ChnaCycle {
  return {
    cycleBasis: overrides?.cycleBasis ?? "FISCAL_YEAR",
    gracePeriodDays: overrides?.gracePeriodDays ?? DEFAULT_CHNA_GRACE_PERIOD_DAYS,
    fapPublicizationChannels: overrides?.fapPublicizationChannels ?? [
      "WEBSITE",
      "PHYSICAL_SIGNAGE",
    ],
    fiscalYearEnd,
    lastChnaCompletedOn: overrides?.lastChnaCompletedOn,
  };
}

export function validateFapPublicization(channels: FapPublicizationChannel[]): void {
  if (!channels.includes("WEBSITE") || !channels.includes("PHYSICAL_SIGNAGE")) {
    throw new Error(
      "FAP widely publicized requires both WEBSITE and PHYSICAL_SIGNAGE channels (Q-D3=B).",
    );
  }
}

export function isChnaDue(
  cycle: ChnaCycle,
  asOf: Date,
): { due: boolean; withinGrace: boolean } {
  if (!cycle.lastChnaCompletedOn) {
    return { due: true, withinGrace: false };
  }
  const threeYearsMs = 3 * 365 * 24 * 60 * 60 * 1000;
  const dueDate = new Date(cycle.lastChnaCompletedOn.getTime() + threeYearsMs);
  const graceEnd = new Date(dueDate.getTime() + cycle.gracePeriodDays * 24 * 60 * 60 * 1000);
  return {
    due: asOf >= dueDate,
    withinGrace: asOf >= dueDate && asOf <= graceEnd,
  };
}
