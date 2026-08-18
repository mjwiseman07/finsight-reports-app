import { describe, expect, it } from "vitest";
import { hashMeasurementSnapshotBody } from "../hash";
import {
  AP_AGING_SNAPSHOT_KIND,
  MEASUREMENT_SNAPSHOT_ERROR,
  MeasurementSnapshotError,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type ApAgingMeasurementPayload,
  type TieOutApMeasurementSnapshot,
} from "../types";
import { validateApMeasurementSnapshot } from "../validate";

const SYNC = "11111111-1111-4111-8111-111111111111";
const COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const payload: ApAgingMeasurementPayload = {
  currency: "USD",
  vendors: [{ entityRef: "1", displayName: "Vendor A", totalCents: 500 }],
  subledgerTotalCents: 500,
  trialBalance: [
    {
      accountRef: "33",
      accountName: "AP",
      debitCents: 0,
      creditCents: 500,
      netCents: -500,
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
  over: Partial<TieOutApMeasurementSnapshot> = {},
): TieOutApMeasurementSnapshot {
  const basePayload = over.payload ?? payload;
  const asOfDate = over.asOfDate ?? "2026-07-31";
  const payloadHash =
    over.payloadHash ??
    hashMeasurementSnapshotBody({
      schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
      snapshotKind: AP_AGING_SNAPSHOT_KIND,
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
    snapshotKind: over.snapshotKind ?? AP_AGING_SNAPSHOT_KIND,
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

describe("AP measurement snapshot validation", () => {
  it("24. hash mismatch rejects", () => {
    try {
      validateApMeasurementSnapshot(snapshot({ payloadHash: "0".repeat(64) }), expected);
      throw new Error("expected throw");
    } catch (e) {
      expect((e as MeasurementSnapshotError).code).toBe(
        MEASUREMENT_SNAPSHOT_ERROR.HASH_MISMATCH,
      );
    }
  });

  it("25. as-of mismatch rejects", () => {
    try {
      validateApMeasurementSnapshot(snapshot(), { ...expected, asOfDate: "2026-06-30" });
      throw new Error("expected throw");
    } catch (e) {
      expect((e as MeasurementSnapshotError).code).toBe(
        MEASUREMENT_SNAPSHOT_ERROR.AS_OF_MISMATCH,
      );
    }
  });

  it("rejects wrong snapshot kind", () => {
    expect(() =>
      validateApMeasurementSnapshot(
        snapshot({ snapshotKind: "ar_aging" as never }),
        expected,
      ),
    ).toThrow(MeasurementSnapshotError);
  });

  it("rejects secret-shaped keys", () => {
    expect(() =>
      validateApMeasurementSnapshot(
        snapshot({
          payload: { ...payload, refresh_token: "secret" } as never,
        }),
        expected,
      ),
    ).toThrow(/Forbidden secret-shaped key/);
  });
});
