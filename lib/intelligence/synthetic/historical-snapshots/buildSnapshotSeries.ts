import type { SyntheticHistoricalSnapshotReadModel, SyntheticHistoricalSnapshotSeries } from "../types/historical-snapshot";
import type { SyntheticHistoricalSnapshotRecord } from "../types/snapshot-storage";
import { resolveSnapshotWindow } from "./resolveSnapshotWindow";
import type { BuildSnapshotSeriesInput } from "./types";

function eligibleRecords(input: BuildSnapshotSeriesInput) {
  return input.records.filter((record) => {
    if (record.companyId !== input.companyId) return false;
    if (record.sourceSystem !== input.sourceSystem) return false;
    if (record.tenantId !== input.tenantId) return false;
    if (input.exactVersion !== undefined && record.snapshotVersion !== input.exactVersion) return false;
    if (input.includeSuperseded) return record.snapshotStatus !== "invalid";
    return record.snapshotStatus === "finalized";
  });
}

function latestByPeriod(records: SyntheticHistoricalSnapshotRecord[]) {
  const byPeriod = new Map<string, SyntheticHistoricalSnapshotRecord>();
  for (const record of records) {
    const current = byPeriod.get(record.periodKey);
    if (!current || record.snapshotVersion > current.snapshotVersion) byPeriod.set(record.periodKey, record);
  }
  return byPeriod;
}

function readModel(record: SyntheticHistoricalSnapshotRecord): SyntheticHistoricalSnapshotReadModel {
  return {
    ref: {
      snapshotId: record.snapshotId,
      companyId: record.companyId,
      connectionId: record.connectionId,
      syncId: record.syncId,
      sourceSystem: record.sourceSystem,
      tenantId: record.tenantId,
      reportPeriod: record.reportPeriod,
    },
    validationReadyForReporting: record.snapshotLineage.validationReadyForReporting,
    validationWarnings: record.snapshotLineage.validationWarnings,
    rawReportsPulled: record.snapshotLineage.rawReportsPulled,
    normalizedObjectCounts: record.snapshotLineage.normalizedObjectCounts,
  };
}

export function buildSnapshotSeries(input: BuildSnapshotSeriesInput): SyntheticHistoricalSnapshotSeries {
  const periods = resolveSnapshotWindow(input.endPeriod, input.window);
  const byPeriod = latestByPeriod(eligibleRecords(input));
  const snapshots = periods
    .map((period) => byPeriod.get(period))
    .filter((record): record is SyntheticHistoricalSnapshotRecord => Boolean(record))
    .map(readModel);
  const missingPeriods = periods.filter((period) => !byPeriod.has(period));
  return {
    companyId: input.companyId,
    sourceSystem: input.sourceSystem,
    window: input.window,
    coverage: {
      requestedMonths: input.window,
      availableMonths: snapshots.length,
      missingPeriods,
      hasBalanceSheet: snapshots.every((snapshot) => snapshot.normalizedObjectCounts.balanceSheet > 0),
      hasIncomeStatement: snapshots.every((snapshot) => snapshot.normalizedObjectCounts.incomeStatement > 0),
      hasARAging: snapshots.some((snapshot) => snapshot.normalizedObjectCounts.arAging > 0),
      hasAPAging: snapshots.some((snapshot) => snapshot.normalizedObjectCounts.apAging > 0),
      hasCashFlow: false,
    },
    snapshots,
  };
}
