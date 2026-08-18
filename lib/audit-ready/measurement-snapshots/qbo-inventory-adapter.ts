import {
  fetchQboInventoryValuationDetail,
  type QboInventoryValuationResult,
  type QboTrialBalanceResult,
} from "@/lib/audit-ready/tie-out/qbo-reports";
import { hashMeasurementSnapshotBody } from "./hash";
import {
  INVENTORY_SNAPSHOT_KIND,
  TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
  type InventoryMeasurementPayload,
  type MeasurementSourceRequestIds,
  type TieOutInventoryMeasurementSnapshot,
} from "./types";
import { asIsoDate, assertNoSecrets } from "./validate";

export type QboInventoryCaptureFetchers = {
  fetchValuation?: typeof fetchQboInventoryValuationDetail;
};

export function mapQboInventoryReportsToPayload(
  valuation: QboInventoryValuationResult,
  trial: QboTrialBalanceResult,
): InventoryMeasurementPayload {
  return {
    currency: valuation.currency || trial.currency || null,
    items: valuation.items.map((item) => ({
      entityRef: item.item_ref ?? "",
      displayName: item.item_display_name ?? null,
      quantityOnHand: item.qty_on_hand,
      assetValueCents: item.asset_value_cents,
    })),
    subledgerTotalCents: valuation.total_cents,
    trialBalance: trial.lines.map((line) => ({
      accountRef: line.account_ref ?? "",
      accountName: line.account_name ?? null,
      debitCents: line.debit_cents,
      creditCents: line.credit_cents,
      netCents: line.net_cents,
    })),
  };
}

export function sourceRequestIdsFromQboInventoryReports(
  valuation: QboInventoryValuationResult,
  trial: QboTrialBalanceResult,
): MeasurementSourceRequestIds {
  return {
    agingIntuitTid: valuation.intuit_tid,
    trialBalanceIntuitTid: trial.intuit_tid,
    agingReportUrl: valuation.raw_report_url,
    trialBalanceReportUrl: trial.raw_report_url,
  };
}

export function inventoryReportsFromSnapshot(
  snapshot: TieOutInventoryMeasurementSnapshot,
): {
  valuation: QboInventoryValuationResult;
  trial: QboTrialBalanceResult;
} {
  const valuation: QboInventoryValuationResult = {
    as_of_date: snapshot.asOfDate,
    currency: snapshot.payload.currency ?? "USD",
    items: snapshot.payload.items.map((item) => ({
      item_ref: item.entityRef || null,
      item_display_name: item.displayName ?? "(unknown item)",
      qty_on_hand: item.quantityOnHand ?? 0,
      asset_value_cents: item.assetValueCents,
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
  return { valuation, trial };
}

/**
 * Map already-fetched URM inventory + shared TB onto a just-persisted accounting_syncs.id.
 * Does not call QBO.
 */
export function buildInventoryMeasurementSnapshotFromUrmReports(args: {
  accountingSyncId: string;
  accountingConnectionId: string;
  companyId: string;
  provider: string;
  tenantOrRealmId: string;
  asOfDate: string;
  capturedAt: string;
  valuation: QboInventoryValuationResult;
  trial: QboTrialBalanceResult;
}): TieOutInventoryMeasurementSnapshot {
  const asOfDate = asIsoDate(args.asOfDate);
  const payload = mapQboInventoryReportsToPayload(args.valuation, args.trial);
  const sourceRequestIds = sourceRequestIdsFromQboInventoryReports(
    args.valuation,
    args.trial,
  );
  assertNoSecrets(payload);
  assertNoSecrets(sourceRequestIds);
  const payloadHash = hashMeasurementSnapshotBody({
    schemaVersion: TIE_OUT_MEASUREMENT_SNAPSHOT_SCHEMA_VERSION,
    snapshotKind: INVENTORY_SNAPSHOT_KIND,
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
    snapshotKind: INVENTORY_SNAPSHOT_KIND,
    asOfDate,
    capturedAt: args.capturedAt,
    payloadHash,
    sourceRequestIds,
    payload,
  };
}

export async function fetchQboUrmInventoryValuation(params: {
  realmId: string;
  accessToken: string;
  asOfDate: string;
  fetchers?: QboInventoryCaptureFetchers;
}): Promise<QboInventoryValuationResult> {
  const asOfDate = asIsoDate(params.asOfDate);
  const fetchValuation = params.fetchers?.fetchValuation ?? fetchQboInventoryValuationDetail;
  return fetchValuation({
    realmId: params.realmId,
    accessToken: params.accessToken,
    asOfDate,
  });
}
