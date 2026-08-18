/**
 * Dedicated AR measurement capture.
 *
 * Does not call the Scorecard live accounting-sync persist pipeline.
 * Scorecard report_period (prior completed month) is not automatically the
 * URM asOfDate, and Scorecard AR/TB fetch params are not the URM params.
 *
 * Requires an existing SUCCESS accounting_syncs row whose report_period_end
 * equals asOfDate. Does not create a fake or empty accounting_syncs row.
 */

import { captureQboArMeasurementSnapshot, type QboArCaptureFetchers } from "./qbo-ar-adapter";
import {
  persistArMeasurementSnapshot,
  requirePeriodMatchedAccountingSyncForAr,
} from "./repository";
import type { TieOutArMeasurementSnapshot } from "./types";

export type CaptureAndPersistArMeasurementSnapshotInput = {
  accountingSyncId: string;
  asOfDate: string;
  companyId: string;
  accountingConnectionId: string;
  provider: string;
  tenantOrRealmId: string;
  accessToken: string;
  fetchers?: QboArCaptureFetchers;
};

export async function captureAndPersistArMeasurementSnapshot(
  input: CaptureAndPersistArMeasurementSnapshotInput,
): Promise<{ snapshot: TieOutArMeasurementSnapshot; reused: boolean }> {
  const sync = await requirePeriodMatchedAccountingSyncForAr({
    accountingSyncId: input.accountingSyncId,
    asOfDate: input.asOfDate,
    companyId: input.companyId,
    accountingConnectionId: input.accountingConnectionId,
    provider: input.provider,
    tenantOrRealmId: input.tenantOrRealmId,
  });
  const snapshot = await captureQboArMeasurementSnapshot({
    accountingSyncId: sync.id,
    accountingConnectionId: sync.connection_id,
    companyId: sync.company_id,
    provider: sync.source_system,
    tenantOrRealmId: sync.tenant_id,
    asOfDate: input.asOfDate,
    accessToken: input.accessToken,
    fetchers: input.fetchers,
  });
  return persistArMeasurementSnapshot(snapshot);
}
