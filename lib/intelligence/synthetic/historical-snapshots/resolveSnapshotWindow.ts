import type { SyntheticHistoryWindow } from "../types/historical-snapshot";

function addMonths(date: Date, months: number) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function resolveSnapshotWindow(endPeriod: string, window: SyntheticHistoryWindow): string[] {
  const [year, month] = endPeriod.split("-").map(Number);
  const endDate = new Date(Date.UTC(year, month - 1, 1));
  return Array.from({ length: window }, (_, index) => addMonths(endDate, index - window + 1));
}
