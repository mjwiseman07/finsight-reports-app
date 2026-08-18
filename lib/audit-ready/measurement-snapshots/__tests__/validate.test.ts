import { describe, expect, it } from "vitest";
import { hashMeasurementSnapshotBody } from "../hash";
import {
  AR_AGING_SNAPSHOT_KIND,
  MEASUREMENT_SNAPSHOT_ERROR,
  MeasurementSnapshotError,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type ArAgingMeasurementPayload,
  type TieOutArMeasurementSnapshot,
} from "../types";
import { validateArMeasurementSnapshot } from "../validate";

const SYNC = "11111111-1111-4111-8111-111111111111";
const COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const payload: ArAgingMeasurementPayload = {
  currency: "USD",
  customers: [{ entityRef: "1", displayName: "Acme", totalCents: 500 }],
  subledgerTotalCents: 500,
  trialBalance: [
    {
      accountRef: "84",
      accountName: "AR",
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
  over: Partial<TieOutArMeasurementSnapshot> = {},
): TieOutArMeasurementSnapshot {
  const basePayload = over.payload ?? payload;
  const asOfDate = over.asOfDate ?? "2026-07-31";
  const payloadHash =
    over.payloadHash ??
    hashMeasurementSnapshotBody({
      schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
      snapshotKind: AR_AGING_SNAPSHOT_KIND,
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
    snapshotKind: over.snapshotKind ?? AR_AGING_SNAPSHOT_KIND,
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

describe("AR measurement snapshot validation", () => {
  it("4. invalid payload/hash is rejected", () => {
    expect(() =>
      validateArMeasurementSnapshot(snapshot({ payloadHash: "0".repeat(64) }), expected),
    ).toThrow(MeasurementSnapshotError);
    try {
      validateArMeasurementSnapshot(snapshot({ payloadHash: "0".repeat(64) }), expected);
    } catch (e) {
      expect((e as MeasurementSnapshotError).code).toBe(
        MEASUREMENT_SNAPSHOT_ERROR.HASH_MISMATCH,
      );
    }
    expect(() =>
      validateArMeasurementSnapshot(
        snapshot({
          payload: { ...payload, customers: "nope" as unknown as never },
        }),
        expected,
      ),
    ).toThrow(MeasurementSnapshotError);
  });

  it("16. asOf mismatch fails closed", () => {
    try {
      validateArMeasurementSnapshot(snapshot(), { ...expected, asOfDate: "2026-06-30" });
      throw new Error("expected throw");
    } catch (e) {
      expect((e as MeasurementSnapshotError).code).toBe(
        MEASUREMENT_SNAPSHOT_ERROR.AS_OF_MISMATCH,
      );
    }
  });

  it("17. provider/company/connection/realm mismatch fails closed", () => {
    expect(() =>
      validateArMeasurementSnapshot(snapshot(), { ...expected, companyId: "other" }),
    ).toThrow(/company\/connection\/provider\/realm/);
    expect(() =>
      validateArMeasurementSnapshot(snapshot(), {
        ...expected,
        accountingConnectionId: "other",
      }),
    ).toThrow(MeasurementSnapshotError);
    expect(() =>
      validateArMeasurementSnapshot(snapshot(), { ...expected, provider: "xero" }),
    ).toThrow(MeasurementSnapshotError);
    expect(() =>
      validateArMeasurementSnapshot(snapshot(), {
        ...expected,
        tenantOrRealmId: "other-realm",
      }),
    ).toThrow(MeasurementSnapshotError);
  });

  it("18. hash mismatch fails closed", () => {
    const tampered = snapshot({
      payload: { ...payload, subledgerTotalCents: 999 },
      payloadHash: hashMeasurementSnapshotBody({
        schemaVersion: 1,
        snapshotKind: AR_AGING_SNAPSHOT_KIND,
        asOfDate: "2026-07-31",
        payload,
      }),
    });
    try {
      validateArMeasurementSnapshot(tampered, expected);
      throw new Error("expected throw");
    } catch (e) {
      expect((e as MeasurementSnapshotError).code).toBe(
        MEASUREMENT_SNAPSHOT_ERROR.HASH_MISMATCH,
      );
    }
  });

  it("19. empty accountingSyncId fails closed", () => {
    try {
      validateArMeasurementSnapshot(snapshot({ accountingSyncId: "" }), {
        ...expected,
        accountingSyncId: "",
      });
      throw new Error("expected throw");
    } catch (e) {
      expect((e as MeasurementSnapshotError).code).toBe(
        MEASUREMENT_SNAPSHOT_ERROR.SYNC_ID_MISSING,
      );
    }
  });

  it("rejects secret-shaped keys in payload or sourceRequestIds", () => {
    expect(() =>
      validateArMeasurementSnapshot(
        snapshot({
          payload: { ...payload, access_token: "secret" } as never,
        }),
        expected,
      ),
    ).toThrow(/Forbidden secret-shaped key/);
  });
});
