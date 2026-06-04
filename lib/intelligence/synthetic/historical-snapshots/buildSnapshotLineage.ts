import type { SyntheticSnapshotLineage, SyntheticSnapshotPayload } from "../types/snapshot-storage";
import type { SyntheticSnapshotNormalizedDataInput } from "./types";
import { stableSnapshotHash } from "./stableSnapshotHash";

export function buildSnapshotLineage({
  snapshotId,
  normalizedData,
  payload,
}: {
  snapshotId: string;
  normalizedData: SyntheticSnapshotNormalizedDataInput;
  payload: SyntheticSnapshotPayload;
}): SyntheticSnapshotLineage {
  const normalizedObjectCounts = {
    balanceSheet: payload.balanceSheet.length,
    incomeStatement: payload.incomeStatement.length,
    trialBalance: payload.trialBalance.length,
    arAging: payload.arAging.length,
    apAging: payload.apAging.length,
    fixedAssets: payload.fixedAssets.length,
    inventory: payload.inventory.length,
    payroll: payload.payroll.length,
    debt: payload.debt.length,
    budgets: payload.budgets.length,
  };
  return {
    snapshotId,
    sourceSystem: normalizedData.sourceSystem,
    adapterName: normalizedData.adapterName,
    connectionId: normalizedData.connectionId,
    tenantId: normalizedData.tenantId,
    tenantName: normalizedData.tenantName,
    syncId: normalizedData.syncId,
    reportPeriod: normalizedData.reportPeriod,
    sourceReportNames: Object.entries(normalizedData.rawReportsPulled)
      .filter(([, pulled]) => pulled)
      .map(([reportName]) => reportName),
    rawReportsPulled: normalizedData.rawReportsPulled,
    normalizedObjectCounts,
    validationReadyForReporting: normalizedData.validation.readyForReporting,
    validationWarnings: normalizedData.validation.warnings,
    createdFromNormalizedDataHash: stableSnapshotHash(normalizedData),
  };
}
