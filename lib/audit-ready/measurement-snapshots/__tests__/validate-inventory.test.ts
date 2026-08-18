import { describe, expect, it } from "vitest";
import { hashMeasurementSnapshotBody } from "../hash";
import {
  INVENTORY_SNAPSHOT_KIND,
  MEASUREMENT_SNAPSHOT_ERROR,
  MeasurementSnapshotError,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type InventoryMeasurementPayload,
  type TieOutInventoryMeasurementSnapshot,
} from "../types";
import { validateInventoryMeasurementSnapshot } from "../validate";

const SYNC = "11111111-1111-4111-8111-111111111111";
const COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const payload: InventoryMeasurementPayload = {
  currency: "USD",
  items: [{ entityRef: "1", displayName: "Widget", quantityOnHand: 2, assetValueCents: 500 }],
  subledgerTotalCents: 500,
  trialBalance: [
    {
      accountRef: "81",
      accountName: "Inventory",
      debitCents: 500,
      creditCents: 0,
      netCents: 500,
    },
  ],
};

const expected = {
  asOfDate: "2026-07-31",
  companyId: COMPANY,
  accountingConnectionId: CONN,
  provider: "quickbooks",
  tenantOrRealmId: "realm-1",
  accountingSyncId: SYNC,
};

function snapshot(
  over: Partial<TieOutInventoryMeasurementSnapshot> = {},
): TieOutInventoryMeasurementSnapshot {
  const basePayload = over.payload ?? payload;
  const asOfDate = over.asOfDate ?? "2026-07-31";
  const payloadHash =
    over.payloadHash ??
    hashMeasurementSnapshotBody({
      schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
      snapshotKind: INVENTORY_SNAPSHOT_KIND,
      asOfDate,
      payload: basePayload,
    });
  return {
    schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
    accountingSyncId: over.accountingSyncId ?? SYNC,
    accountingConnectionId: over.accountingConnectionId ?? CONN,
    companyId: over.companyId ?? COMPANY,
    provider: over.provider ?? "quickbooks",
    tenantOrRealmId: over.tenantOrRealmId ?? "realm-1",
    snapshotKind: over.snapshotKind ?? INVENTORY_SNAPSHOT_KIND,
    asOfDate,
    capturedAt: over.capturedAt ?? "2026-08-17T16:00:00.000Z",
    payloadHash,
    sourceRequestIds: over.sourceRequestIds ?? {
      agingIntuitTid: "tid-a",
      trialBalanceIntuitTid: "tid-b",
    },
    payload: basePayload,
  };
}

describe("Inventory measurement snapshot validation", () => {
  it("9. hash mismatch rejects", () => {
    try {
      validateInventoryMeasurementSnapshot(snapshot({ payloadHash: "0".repeat(64) }), expected);
      throw new Error("expected throw");
    } catch (e) {
      expect((e as MeasurementSnapshotError).code).toBe(
        MEASUREMENT_SNAPSHOT_ERROR.HASH_MISMATCH,
      );
    }
  });

  it("10. as-of mismatch rejects", () => {
    try {
      validateInventoryMeasurementSnapshot(snapshot(), { ...expected, asOfDate: "2026-06-30" });
      throw new Error("expected throw");
    } catch (e) {
      expect((e as MeasurementSnapshotError).code).toBe(
        MEASUREMENT_SNAPSHOT_ERROR.AS_OF_MISMATCH,
      );
    }
  });

  it("11. rejects wrong snapshot kind", () => {
    expect(() =>
      validateInventoryMeasurementSnapshot(
        snapshot({ snapshotKind: "ar_aging" as never }),
        expected,
      ),
    ).toThrow(MeasurementSnapshotError);
  });
});
