import { agingBuckets } from "@/lib/accounting/supporting-schedules/scheduleDiagnostics";
import { getLatestNormalizedAccountingData } from "@/lib/integrations/accounting";
import { hasAvailableScheduleRows } from "@/lib/accounting/supporting-schedules/fetchSupportingSchedules";

export type ArAgingForCompany = {
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_over_90: number;
  lastRefreshedAt: string | null;
};

/**
 * Company AR aging from the latest successful normalized sync.
 * Uses scheduleDiagnostics.agingBuckets — no fabricated bucket splits.
 */
export async function getArAgingForCompany(
  companyId: string,
  options?: { sourceSystem?: string | null; connectionId?: string | null },
): Promise<ArAgingForCompany | null> {
  const sourceSystem = String(options?.sourceSystem || "").trim();
  if (!companyId || !sourceSystem) return null;

  const latest = await getLatestNormalizedAccountingData({
    companyId,
    connectionId: options?.connectionId || null,
    sourceSystem,
  });
  if (!latest?.normalizedData) return null;

  const rows = latest.normalizedData.normalizedARAging || [];
  if (!hasAvailableScheduleRows(rows)) return null;

  const buckets = agingBuckets(rows);
  return {
    current: buckets.current,
    days_1_30: buckets.oneToThirty,
    days_31_60: buckets.thirtyOneToSixty,
    days_61_90: buckets.sixtyOneToNinety,
    days_over_90: buckets.ninetyPlus,
    lastRefreshedAt: latest.lastSyncedAt ? String(latest.lastSyncedAt) : null,
  };
}
