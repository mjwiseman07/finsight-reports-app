import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  arReportsFromSnapshot,
  buildArMeasurementSnapshotFromUrmReports,
  fetchQboUrmArReports,
  mapQboArReportsToPayload,
} from "../qbo-ar-adapter";
import { hashMeasurementSnapshotBody } from "../hash";
import {
  AR_AGING_SNAPSHOT_KIND,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
} from "../types";
import type { QboArAgingResult, QboTrialBalanceResult } from "@/lib/audit-ready/tie-out/qbo-reports";

const agingA: QboArAgingResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  customers: [
    { customer_ref: "1", customer_display_name: "Acme", total_cents: 12_500 },
    { customer_ref: "2", customer_display_name: "Credit Co", total_cents: -200 },
  ],
  total_cents: 12_300,
  raw_report_url: "https://sandbox-quickbooks.api.intuit.com/v3/company/r/reports/AgedReceivableDetail?report_date=2026-07-31&summarize_column_by=Customers&minorversion=75",
  intuit_tid: "tid-aging",
};

const trialA: QboTrialBalanceResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  lines: [
    {
      account_ref: "84",
      account_name: "Accounts Receivable",
      debit_cents: 12_300,
      credit_cents: 0,
      net_cents: 12_300,
    },
  ],
  raw_report_url: "https://sandbox-quickbooks.api.intuit.com/v3/company/r/reports/TrialBalance?end_date=2026-07-31&minorversion=75",
  intuit_tid: "tid-tb",
};

describe("QBO AR capture adapter", () => {
  it("maps parsed URM reports into the neutral payload without raw QBO JSON", () => {
    const payload = mapQboArReportsToPayload(agingA, trialA);
    expect(payload.subledgerTotalCents).toBe(12_300);
    expect(payload.customers[0]).toEqual({
      entityRef: "1",
      displayName: "Acme",
      totalCents: 12_500,
    });
    expect(JSON.stringify(payload)).not.toContain("Rows");
    expect(JSON.stringify(payload)).not.toContain("ColData");
  });

  it("round-trips snapshot values into the same measurement structures", () => {
    const payload = mapQboArReportsToPayload(agingA, trialA);
    const snapshot = {
      schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
      accountingSyncId: "11111111-1111-4111-8111-111111111111",
      accountingConnectionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      companyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      provider: "quickbooks",
      tenantOrRealmId: "realm-1",
      snapshotKind: AR_AGING_SNAPSHOT_KIND,
      asOfDate: "2026-07-31",
      capturedAt: "2026-08-17T16:00:00.000Z",
      payloadHash: hashMeasurementSnapshotBody({
        schemaVersion: 1,
        snapshotKind: AR_AGING_SNAPSHOT_KIND,
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
    const reports = arReportsFromSnapshot(snapshot);
    expect(reports.aging.total_cents).toBe(12_300);
    expect(reports.aging.customers[1]?.total_cents).toBe(-200);
    expect(reports.trial.lines[0]?.net_cents).toBe(12_300);
    expect(reports.aging.intuit_tid).toBe("tid-aging");
  });

  it("URM fetch uses AR resolver params and capturedAt is not in the hash", async () => {
    const fetchAging = vi.fn(async () => agingA);
    const fetchTrialBalance = vi.fn(async () => trialA);
    const { aging, trial } = await fetchQboUrmArReports({
      realmId: "realm-1",
      accessToken: "tok",
      asOfDate: "2026-07-31",
      fetchers: { fetchAging, fetchTrialBalance },
    });
    const first = buildArMeasurementSnapshotFromUrmReports({
      accountingSyncId: "11111111-1111-4111-8111-111111111111",
      accountingConnectionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      companyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      provider: "quickbooks",
      tenantOrRealmId: "realm-1",
      asOfDate: "2026-07-31",
      capturedAt: "2026-08-17T16:00:00.000Z",
      aging,
      trial,
    });
    const second = buildArMeasurementSnapshotFromUrmReports({
      accountingSyncId: "11111111-1111-4111-8111-111111111111",
      accountingConnectionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      companyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      provider: "quickbooks",
      tenantOrRealmId: "realm-1",
      asOfDate: "2026-07-31",
      capturedAt: "2026-08-18T00:00:00.000Z",
      aging,
      trial,
    });
    expect(first.payloadHash).toBe(second.payloadHash);
    expect(fetchAging).toHaveBeenCalledWith({
      realmId: "realm-1",
      accessToken: "tok",
      asOfDate: "2026-07-31",
    });
    expect(fetchTrialBalance).toHaveBeenCalledWith({
      realmId: "realm-1",
      accessToken: "tok",
      asOfDate: "2026-07-31",
    });
  });

  it("buildArMeasurementSnapshotFromUrmReports does not fetch QBO", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/audit-ready/measurement-snapshots/qbo-ar-adapter.ts"),
      "utf8",
    );
    const buildFn = src.slice(src.indexOf("export function buildArMeasurementSnapshotFromUrmReports"));
    expect(buildFn).not.toContain("fetchQboArAgingDetail");
    expect(buildFn).not.toContain("fetchQboTrialBalance");
  });
});
