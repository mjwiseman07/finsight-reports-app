import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  apReportsFromSnapshot,
  buildApMeasurementSnapshotFromUrmReports,
  mapQboApReportsToPayload,
} from "../qbo-ap-adapter";
import { hashMeasurementSnapshotBody } from "../hash";
import {
  AP_AGING_SNAPSHOT_KIND,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
} from "../types";
import type { QboApAgingResult, QboTrialBalanceResult } from "@/lib/audit-ready/tie-out/qbo-reports";

const agingA: QboApAgingResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  vendors: [
    { vendor_ref: "1", vendor_display_name: "Vendor A", total_cents: 8_000 },
    { vendor_ref: "2", vendor_display_name: "Debit Co", total_cents: -300 },
  ],
  total_cents: 7_700,
  raw_report_url:
    "https://sandbox-quickbooks.api.intuit.com/v3/company/r/reports/AgedPayableDetail?report_date=2026-07-31&summarize_column_by=Vendors&minorversion=75",
  intuit_tid: "tid-ap",
};

const trialA: QboTrialBalanceResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  lines: [
    {
      account_ref: "33",
      account_name: "Accounts Payable",
      debit_cents: 0,
      credit_cents: 7_700,
      net_cents: -7_700,
    },
  ],
  raw_report_url:
    "https://sandbox-quickbooks.api.intuit.com/v3/company/r/reports/TrialBalance?end_date=2026-07-31&minorversion=75",
  intuit_tid: "tid-tb",
};

describe("QBO AP capture adapter", () => {
  it("maps parsed URM reports into the neutral payload without raw QBO JSON", () => {
    const payload = mapQboApReportsToPayload(agingA, trialA);
    expect(payload.subledgerTotalCents).toBe(7_700);
    expect(payload.vendors[0]).toEqual({
      entityRef: "1",
      displayName: "Vendor A",
      totalCents: 8_000,
    });
    expect(JSON.stringify(payload)).not.toContain("Rows");
    expect(JSON.stringify(payload)).not.toContain("ColData");
  });

  it("round-trips snapshot values into the same measurement structures", () => {
    const payload = mapQboApReportsToPayload(agingA, trialA);
    const snapshot = {
      schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
      accountingSyncId: "11111111-1111-4111-8111-111111111111",
      accountingConnectionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      companyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      provider: "quickbooks",
      tenantOrRealmId: "realm-1",
      snapshotKind: AP_AGING_SNAPSHOT_KIND,
      asOfDate: "2026-07-31",
      capturedAt: "2026-08-17T16:00:00.000Z",
      payloadHash: hashMeasurementSnapshotBody({
        schemaVersion: 1,
        snapshotKind: AP_AGING_SNAPSHOT_KIND,
        asOfDate: "2026-07-31",
        payload,
      }),
      sourceRequestIds: {
        agingIntuitTid: agingA.intuit_tid,
        trialBalanceIntuitTid: trialA.intuit_tid,
        agingReportUrl: agingA.raw_report_url,
        trialBalanceReportUrl: trialA.raw_report_url,
      },
      payload,
    };
    const reports = apReportsFromSnapshot(snapshot);
    expect(reports.aging.total_cents).toBe(7_700);
    expect(reports.aging.vendors[1]?.total_cents).toBe(-300);
    expect(reports.trial.lines[0]?.net_cents).toBe(-7_700);
    expect(reports.aging.intuit_tid).toBe("tid-ap");
  });

  it("buildApMeasurementSnapshotFromUrmReports does not fetch QBO", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/audit-ready/measurement-snapshots/qbo-ap-adapter.ts"),
      "utf8",
    );
    const buildFn = src.slice(
      src.indexOf("export function buildApMeasurementSnapshotFromUrmReports"),
    );
    expect(buildFn).not.toContain("fetchQboApAgingDetail(");
    expect(buildFn).not.toContain("fetchQboTrialBalance(");
  });
});
