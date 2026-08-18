import {
  fetchQboArAgingDetail,
  fetchQboTrialBalance,
  type QboArAgingResult,
  type QboTrialBalanceResult,
} from "@/lib/audit-ready/tie-out/qbo-reports";
import { hashMeasurementSnapshotBody } from "./hash";
import {
  AR_AGING_SNAPSHOT_KIND,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type ArAgingMeasurementPayload,
  type MeasurementSourceRequestIds,
  type TieOutArMeasurementSnapshot,
} from "./types";
import { asIsoDate, assertNoSecrets } from "./validate";

export type QboArCaptureFetchers = {
  fetchAging?: typeof fetchQboArAgingDetail;
  fetchTrialBalance?: typeof fetchQboTrialBalance;
};

export function mapQboArReportsToPayload(
  aging: QboArAgingResult,
  trial: QboTrialBalanceResult,
): ArAgingMeasurementPayload {
  return {
    currency: aging.currency || trial.currency || null,
    customers: aging.customers.map((customer) => ({
      entityRef: customer.customer_ref ?? "",
      displayName: customer.customer_display_name ?? null,
      totalCents: customer.total_cents,
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

export function sourceRequestIdsFromQboReports(
  aging: QboArAgingResult,
  trial: QboTrialBalanceResult,
): MeasurementSourceRequestIds {
  return {
    agingIntuitTid: aging.intuit_tid,
    trialBalanceIntuitTid: trial.intuit_tid,
    agingReportUrl: aging.raw_report_url,
    trialBalanceReportUrl: trial.raw_report_url,
  };
}

export function arReportsFromSnapshot(snapshot: TieOutArMeasurementSnapshot): {
  aging: QboArAgingResult;
  trial: QboTrialBalanceResult;
} {
  const aging: QboArAgingResult = {
    as_of_date: snapshot.asOfDate,
    currency: snapshot.payload.currency ?? "USD",
    customers: snapshot.payload.customers.map((customer) => ({
      customer_ref: customer.entityRef || null,
      customer_display_name: customer.displayName ?? "(unknown customer)",
      total_cents: customer.totalCents,
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

/** URM AR + TB reads. No accounting_syncs.id — that id is assigned only after this acquisition batch. */
export async function fetchQboUrmArReports(params: {
  realmId: string;
  accessToken: string;
  asOfDate: string;
  fetchers?: QboArCaptureFetchers;
}): Promise<{ aging: QboArAgingResult; trial: QboTrialBalanceResult }> {
  const asOfDate = asIsoDate(params.asOfDate);
  const fetchAging = params.fetchers?.fetchAging ?? fetchQboArAgingDetail;
  const fetchTrialBalance = params.fetchers?.fetchTrialBalance ?? fetchQboTrialBalance;
  const [aging, trial] = await Promise.all([
    fetchAging({
      realmId: params.realmId,
      accessToken: params.accessToken,
      asOfDate,
    }),
    fetchTrialBalance({
      realmId: params.realmId,
      accessToken: params.accessToken,
      asOfDate,
    }),
  ]);
  return { aging, trial };
}

/**
 * Map already-fetched URM reports onto a just-persisted accounting_syncs.id.
 * Does not call QBO.
 */
export function buildArMeasurementSnapshotFromUrmReports(args: {
  accountingSyncId: string;
  accountingConnectionId: string;
  companyId: string;
  provider: string;
  tenantOrRealmId: string;
  asOfDate: string;
  capturedAt: string;
  aging: QboArAgingResult;
  trial: QboTrialBalanceResult;
}): TieOutArMeasurementSnapshot {
  const asOfDate = asIsoDate(args.asOfDate);
  const payload = mapQboArReportsToPayload(args.aging, args.trial);
  const sourceRequestIds = sourceRequestIdsFromQboReports(args.aging, args.trial);
  assertNoSecrets(payload);
  assertNoSecrets(sourceRequestIds);
  const payloadHash = hashMeasurementSnapshotBody({
    schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
    snapshotKind: AR_AGING_SNAPSHOT_KIND,
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
    snapshotKind: AR_AGING_SNAPSHOT_KIND,
    asOfDate,
    capturedAt: args.capturedAt,
    payloadHash,
    sourceRequestIds,
    payload,
  };
}
