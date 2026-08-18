/**
 * AR measurement capture entry.
 *
 * Fresh capture must go through acquireAndPersistAccountingStateWithArSnapshot:
 * one provider acquisition batch → persist accounting_syncs → persist AR snapshot
 * using that same sync id.
 *
 * A pre-existing period-matched accounting_syncs.id is not capture authority.
 */

import {
  MEASUREMENT_SNAPSHOT_ERROR,
  MeasurementSnapshotError,
} from "./types";

export {
  acquireAndPersistAccountingStateWithArSnapshot,
  acquireAndPersistAccountingStateWithArApSnapshots,
  acquireAccountingStateForAr,
  acquireAccountingStateForArAp,
  persistAcquiredAccountingStateWithArSnapshot,
  persistAcquiredAccountingStateWithArApSnapshots,
} from "./acquisition";
export type {
  ArAccountingAcquisitionBundle,
  ArApAccountingAcquisitionBundle,
  AcquireAndPersistArAccountingStateInput,
  AcquireAndPersistArApAccountingStateInput,
} from "./acquisition";

/**
 * Removed: attaching a later AR/TB fetch to an existing accountingSyncId.
 * Period match is not state identity.
 */
export async function captureAndPersistArMeasurementSnapshot(_input: {
  accountingSyncId?: string;
  accessToken?: string;
  asOfDate?: string;
}): Promise<never> {
  throw new MeasurementSnapshotError(
    MEASUREMENT_SNAPSHOT_ERROR.PREEXISTING_SYNC_NOT_AUTHORITY,
    "Fresh AR capture cannot use a pre-existing accountingSyncId plus a later provider fetch. Use acquireAndPersistAccountingStateWithArSnapshot.",
  );
}
