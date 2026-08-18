import { describe, expect, it } from "vitest";
import { hashMeasurementSnapshotBody } from "../hash";
import {
  AR_AGING_SNAPSHOT_KIND,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type ArAgingMeasurementPayload,
} from "../types";

const payloadA: ArAgingMeasurementPayload = {
  currency: "USD",
  customers: [
    { entityRef: "1", displayName: "Acme", totalCents: 12_500 },
    { entityRef: "2", displayName: "Beta", totalCents: -200 },
  ],
  subledgerTotalCents: 12_300,
  trialBalance: [
    {
      accountRef: "84",
      accountName: "Accounts Receivable",
      debitCents: 12_300,
      creditCents: 0,
      netCents: 12_300,
    },
  ],
};

function body(over: Partial<Parameters<typeof hashMeasurementSnapshotBody>[0]> = {}) {
  return hashMeasurementSnapshotBody({
    schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
    snapshotKind: AR_AGING_SNAPSHOT_KIND,
    asOfDate: "2026-07-31",
    payload: payloadA,
    ...over,
  });
}

describe("AR measurement snapshot hash", () => {
  it("1. same AR payload produces an identical SHA-256 hex", () => {
    const left = body();
    const right = body();
    expect(left).toBe(right);
    expect(left).toMatch(/^[a-f0-9]{64}$/);
  });

  it("2. a different AR amount produces a different hash", () => {
    const changed: ArAgingMeasurementPayload = {
      ...payloadA,
      customers: payloadA.customers.map((row, index) =>
        index === 0 ? { ...row, totalCents: 12_501 } : row,
      ),
      subledgerTotalCents: 12_301,
    };
    expect(body({ payload: changed })).not.toBe(body());
  });

  it("3. capturedAt is not part of the hash body", () => {
    const hash = body();
    const again = hashMeasurementSnapshotBody({
      schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
      snapshotKind: AR_AGING_SNAPSHOT_KIND,
      asOfDate: "2026-07-31",
      payload: payloadA,
    });
    expect(again).toBe(hash);
    expect(JSON.stringify(payloadA)).not.toContain("capturedAt");
  });

  it("object key order in payload does not change the hash", () => {
    const reordered = {
      trialBalance: payloadA.trialBalance,
      subledgerTotalCents: payloadA.subledgerTotalCents,
      customers: payloadA.customers,
      currency: payloadA.currency,
    };
    expect(body({ payload: reordered })).toBe(body());
  });
});
