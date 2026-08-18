import {
  fetchQboApAgingDetail,
  type QboApAgingResult,
  type QboTrialBalanceResult,
} from "@/lib/audit-ready/tie-out/qbo-reports";
import { hashMeasurementSnapshotBody } from "./hash";
import {
  AP_AGING_SNAPSHOT_KIND,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type ApAgingMeasurementPayload,
  type MeasurementSourceRequestIds,
  type TieOutApMeasurementSnapshot,
} from "./types";
import { asIsoDate, assertNoSecrets } from "./validate";

export type QboApCaptureFetchers = {
  fetchAging?: typeof fetchQboApAgingDetail;
};

export function mapQboApReportsToPayload(
  aging: QboApAgingResult,
  trial: QboTrialBalanceResult,
): ApAgingMeasurementPayload {
  return {
    currency: aging.currency || trial.currency || null,
    vendors: aging.vendors.map((vendor) => ({
      entityRef: vendor.vendor_ref ?? "",
      displayName: vendor.vendor_display_name ?? null,
      totalCents: vendor.total_cents,
    })),
    subledgerTotalCents: aging.total_cents,
    trialBalance: trial.lines.map((line) => ({
      accountRef: line.account_ref ?? "",
      accountName: line.account_name ?? null,
      debitCents: line.debit_cents,
      creditCents: line.credit_cents,
      netCents: line.net_cents,
    })),
  };
}

export function sourceRequestIdsFromQboApReports(
  aging: QboApAgingResult,
  trial: QboTrialBalanceResult,
): MeasurementSourceRequestIds {
  return {
    agingIntuitTid: aging.intuit_tid,
    trialBalanceIntuitTid: trial.intuit_tid,
    agingReportUrl: aging.raw_report_url,
    trialBalanceReportUrl: trial.raw_report_url,
  };
}

export function apReportsFromSnapshot(snapshot: TieOutApMeasurementSnapshot): {
  aging: QboApAgingResult;
  trial: QboTrialBalanceResult;
} {
  const aging: QboApAgingResult = {
    as_of_date: snapshot.asOfDate,
    currency: snapshot.payload.currency ?? "USD",
    vendors: snapshot.payload.vendors.map((vendor) => ({
      vendor_ref: vendor.entityRef || null,
      vendor_display_name: vendor.displayName ?? "(unknown vendor)",
      total_cents: vendor.totalCents,
    })),
    total_cents: snapshot.payload.subledgerTotalCents,
    raw_report_url: snapshot.sourceRequestIds.agingReportUrl ?? "",
    intuit_tid: snapshot.sourceRequestIds.agingIntuitTid ?? null,
  };
  const trial: QboTrialBalanceResult = {
    as_of_date: snapshot.asOfDate,
    currency: snapshot.payload.currency ?? "USD",
    lines: snapshot.payload.trialBalance.map((line) => ({
      account_ref: line.accountRef || null,
      account_name: line.accountName ?? "(unknown account)",
      debit_cents: line.debitCents ?? 0,
      credit_cents: line.creditCents ?? 0,
      net_cents: line.netCents,
    })),
    raw_report_url: snapshot.sourceRequestIds.trialBalanceReportUrl ?? "",
    intuit_tid: snapshot.sourceRequestIds.trialBalanceIntuitTid ?? null,
  };
  return { aging, trial };
}

/**
 * Map already-fetched URM AP + shared TB onto a just-persisted accounting_syncs.id.
 * Does not call QBO.
 */
export function buildApMeasurementSnapshotFromUrmReports(args: {
  accountingSyncId: string;
  accountingConnectionId: string;
  companyId: string;
  provider: string;
  tenantOrRealmId: string;
  asOfDate: string;
  capturedAt: string;
  aging: QboApAgingResult;
  trial: QboTrialBalanceResult;
}): TieOutApMeasurementSnapshot {
  const asOfDate = asIsoDate(args.asOfDate);
  const payload = mapQboApReportsToPayload(args.aging, args.trial);
  const sourceRequestIds = sourceRequestIdsFromQboApReports(args.aging, args.trial);
  assertNoSecrets(payload);
  assertNoSecrets(sourceRequestIds);
  const payloadHash = hashMeasurementSnapshotBody({
    schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
    snapshotKind: AP_AGING_SNAPSHOT_KIND,
    asOfDate,
    payload,
  });
  return {
    schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
    accountingSyncId: args.accountingSyncId,
    accountingConnectionId: args.accountingConnectionId,
    companyId: args.companyId,
    provider: args.provider,
    tenantOrRealmId: args.tenantOrRealmId,
    snapshotKind: AP_AGING_SNAPSHOT_KIND,
    asOfDate,
    capturedAt: args.capturedAt,
    payloadHash,
    sourceRequestIds,
    payload,
  };
}

export async function fetchQboUrmApAging(params: {
  realmId: string;
  accessToken: string;
  asOfDate: string;
  fetchers?: QboApCaptureFetchers;
}): Promise<QboApAgingResult> {
  const asOfDate = asIsoDate(params.asOfDate);
  const fetchAging = params.fetchers?.fetchAging ?? fetchQboApAgingDetail;
  return fetchAging({
    realmId: params.realmId,
    accessToken: params.accessToken,
    asOfDate,
  });
}
