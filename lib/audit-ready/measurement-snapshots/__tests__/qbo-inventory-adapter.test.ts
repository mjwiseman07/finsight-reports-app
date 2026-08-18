import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildInventoryMeasurementSnapshotFromUrmReports,
  inventoryReportsFromSnapshot,
  mapQboInventoryReportsToPayload,
} from "../qbo-inventory-adapter";
import { hashMeasurementSnapshotBody } from "../hash";
import {
  INVENTORY_SNAPSHOT_KIND,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
} from "../types";
import type {
  QboInventoryValuationResult,
  QboTrialBalanceResult,
} from "@/lib/audit-ready/tie-out/qbo-reports";

const valuationA: QboInventoryValuationResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  items: [
    { item_ref: "1", item_display_name: "Widget", qty_on_hand: 10, asset_value_cents: 4_000 },
    { item_ref: "2", item_display_name: "Neg", qty_on_hand: -1, asset_value_cents: -50 },
  ],
  total_cents: 3_950,
  raw_report_url:
    "https://sandbox-quickbooks.api.intuit.com/v3/company/r/reports/InventoryValuationDetail?end_date=2026-07-31&minorversion=75",
  intuit_tid: "tid-inv",
};

const trialA: QboTrialBalanceResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  lines: [
    {
      account_ref: "81",
      account_name: "Inventory",
      debit_cents: 3_950,
      credit_cents: 0,
      net_cents: 3_950,
    },
  ],
  raw_report_url:
    "https://sandbox-quickbooks.api.intuit.com/v3/company/r/reports/TrialBalance?end_date=2026-07-31&minorversion=75",
  intuit_tid: "tid-tb",
};

describe("QBO Inventory capture adapter", () => {
  it("maps parsed URM reports into the neutral payload without raw QBO JSON", () => {
    const payload = mapQboInventoryReportsToPayload(valuationA, trialA);
    expect(payload.subledgerTotalCents).toBe(3_950);
    expect(payload.items[0]).toEqual({
      entityRef: "1",
      displayName: "Widget",
      quantityOnHand: 10,
      assetValueCents: 4_000,
    });
    expect(JSON.stringify(payload)).not.toContain("Rows");
    expect(JSON.stringify(payload)).not.toContain("ColData");
  });

  it("round-trips snapshot values into the same measurement structures", () => {
    const payload = mapQboInventoryReportsToPayload(valuationA, trialA);
    const snapshot = {
      schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
      accountingSyncId: "11111111-1111-4111-8111-111111111111",
      accountingConnectionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      companyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      provider: "quickbooks",
      tenantOrRealmId: "realm-1",
      snapshotKind: INVENTORY_SNAPSHOT_KIND,
      asOfDate: "2026-07-31",
      capturedAt: "2026-08-17T16:00:00.000Z",
      payloadHash: hashMeasurementSnapshotBody({
        schemaVersion: 1,
        snapshotKind: INVENTORY_SNAPSHOT_KIND,
        asOfDate: "2026-07-31",
        payload,
      }),
      sourceRequestIds: {
        agingIntuitTid: valuationA.intuit_tid,
        trialBalanceIntuitTid: trialA.intuit_tid,
        agingReportUrl: valuationA.raw_report_url,
        trialBalanceReportUrl: trialA.raw_report_url,
      },
      payload,
    };
    const reports = inventoryReportsFromSnapshot(snapshot);
    expect(reports.valuation.total_cents).toBe(3_950);
    expect(reports.valuation.items[1]?.qty_on_hand).toBe(-1);
    expect(reports.trial.lines[0]?.net_cents).toBe(3_950);
    expect(reports.valuation.intuit_tid).toBe("tid-inv");
  });

  it("buildInventoryMeasurementSnapshotFromUrmReports does not fetch QBO", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/audit-ready/measurement-snapshots/qbo-inventory-adapter.ts"),
      "utf8",
    );
    const buildFn = src.slice(
      src.indexOf("export function buildInventoryMeasurementSnapshotFromUrmReports"),
    );
    expect(buildFn).not.toContain("fetchQboInventoryValuationDetail(");
    expect(buildFn).not.toContain("fetchQboTrialBalance(");
  });
});
