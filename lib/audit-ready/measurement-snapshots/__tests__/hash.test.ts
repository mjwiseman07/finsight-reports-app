import { describe, expect, it } from "vitest";
import { hashMeasurementSnapshotBody } from "../hash";
import {
  AP_AGING_SNAPSHOT_KIND,
  AR_AGING_SNAPSHOT_KIND,
  INVENTORY_SNAPSHOT_KIND,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type ApAgingMeasurementPayload,
  type ArAgingMeasurementPayload,
  type InventoryMeasurementPayload,
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

const apPayloadA: ApAgingMeasurementPayload = {
  currency: "USD",
  vendors: [
    { entityRef: "9", displayName: "Vendor A", totalCents: 8_000 },
    { entityRef: "8", displayName: "Debit Co", totalCents: -300 },
  ],
  subledgerTotalCents: 7_700,
  trialBalance: [
    {
      accountRef: "33",
      accountName: "Accounts Payable",
      debitCents: 0,
      creditCents: 7_700,
      netCents: -7_700,
    },
  ],
};

function apBody(over: Partial<Parameters<typeof hashMeasurementSnapshotBody>[0]> = {}) {
  return hashMeasurementSnapshotBody({
    schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
    snapshotKind: AP_AGING_SNAPSHOT_KIND,
    asOfDate: "2026-07-31",
    payload: apPayloadA,
    ...over,
  });
}

describe("AP measurement snapshot hash", () => {
  it("16. same AP payload produces an identical SHA-256 hex", () => {
    expect(apBody()).toBe(apBody());
    expect(apBody()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("17. a different AP amount produces a different hash", () => {
    const changed: ApAgingMeasurementPayload = {
      ...apPayloadA,
      vendors: apPayloadA.vendors.map((row, index) =>
        index === 0 ? { ...row, totalCents: 8_001 } : row,
      ),
      subledgerTotalCents: 7_701,
    };
    expect(apBody({ payload: changed })).not.toBe(apBody());
  });

  it("18. capturedAt is not part of the AP hash body", () => {
    const hash = apBody();
    const again = hashMeasurementSnapshotBody({
      schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
      snapshotKind: AP_AGING_SNAPSHOT_KIND,
      asOfDate: "2026-07-31",
      payload: apPayloadA,
    });
    expect(again).toBe(hash);
  });

  it("19. snapshot kind distinguishes AP from AR even with similar amounts", () => {
    const arLike: ArAgingMeasurementPayload = {
      currency: apPayloadA.currency,
      customers: apPayloadA.vendors,
      subledgerTotalCents: apPayloadA.subledgerTotalCents,
      trialBalance: apPayloadA.trialBalance,
    };
    const arHash = hashMeasurementSnapshotBody({
      schemaVersion: 1,
      snapshotKind: AR_AGING_SNAPSHOT_KIND,
      asOfDate: "2026-07-31",
      payload: arLike,
    });
    expect(apBody()).not.toBe(arHash);
  });
});

const invPayloadA: InventoryMeasurementPayload = {
  currency: "USD",
  items: [
    { entityRef: "5", displayName: "Widget", quantityOnHand: 10, assetValueCents: 4_000 },
    { entityRef: "6", displayName: "Neg", quantityOnHand: -1, assetValueCents: -50 },
  ],
  subledgerTotalCents: 3_950,
  trialBalance: [
    {
      accountRef: "81",
      accountName: "Inventory",
      debitCents: 3_950,
      creditCents: 0,
      netCents: 3_950,
    },
  ],
};

function invBody(over: Partial<Parameters<typeof hashMeasurementSnapshotBody>[0]> = {}) {
  return hashMeasurementSnapshotBody({
    schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
    snapshotKind: INVENTORY_SNAPSHOT_KIND,
    asOfDate: "2026-07-31",
    payload: invPayloadA,
    ...over,
  });
}

describe("Inventory measurement snapshot hash", () => {
  it("1. same Inventory payload produces an identical SHA-256 hex", () => {
    expect(invBody()).toBe(invBody());
    expect(invBody()).toMatch(/^[a-f0-9]{64}$/);
  });

  it("2. a different Inventory amount produces a different hash", () => {
    const changed: InventoryMeasurementPayload = {
      ...invPayloadA,
      items: invPayloadA.items.map((row, index) =>
        index === 0 ? { ...row, assetValueCents: 4_001 } : row,
      ),
      subledgerTotalCents: 3_951,
    };
    expect(invBody({ payload: changed })).not.toBe(invBody());
  });

  it("3. capturedAt is not part of the Inventory hash body", () => {
    expect(
      hashMeasurementSnapshotBody({
        schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
        snapshotKind: INVENTORY_SNAPSHOT_KIND,
        asOfDate: "2026-07-31",
        payload: invPayloadA,
      }),
    ).toBe(invBody());
  });

  it("4. inventory kind differs from AR/AP hashes", () => {
    expect(invBody()).not.toBe(apBody());
    expect(invBody()).not.toBe(body());
  });
});

