/**
 * CC-2A1 acquisition coupling.
 *
 * One provider acquisition batch owns:
 *   1. Scorecard/core financial reports (real accounting_syncs payload)
 *   2. URM AR aging + URM Trial Balance variants
 * Then, from that frozen in-memory bundle:
 *   persist accounting_syncs
 *   persist AR measurement snapshot with THAT sync id
 *
 * Period equality is validated. It is not authority to attach a later fetch
 * to an older accounting_syncs row.
 *
 * Does not create a fake AR/TB-only accounting_syncs row. Core statements
 * must be present in the normalized Scorecard payload.
 */

import { randomUUID } from "node:crypto";
import { persistNormalizedAccountingSync } from "@/lib/integrations/accounting/service";
import { getAccountingProviderMappingAdapter } from "@/lib/integrations/accounting/provider-adapters";
import { ensureFreshTokens } from "@/lib/integrations/accounting/ensure-fresh-tokens";
import type {
  AccountingConnectionRecord,
  AccountingDateRange,
  ProviderRawReports,
} from "@/lib/integrations/accounting/types";
import type { QboArAgingResult, QboTrialBalanceResult } from "@/lib/audit-ready/tie-out/qbo-reports";
import {
  buildArMeasurementSnapshotFromUrmReports,
  fetchQboUrmArReports,
  type QboArCaptureFetchers,
} from "./qbo-ar-adapter";
import {
  assertAsOfMatchesReportPeriodEnd,
  persistArMeasurementSnapshot,
} from "./repository";
import {
  MEASUREMENT_SNAPSHOT_ERROR,
  MeasurementSnapshotError,
  type TieOutArMeasurementSnapshot,
} from "./types";
import { asIsoDate } from "./validate";

export type ArAccountingAcquisitionBundle = {
  acquisitionId: string;
  capturedAt: string;
  asOfDate: string;
  reportPeriod: AccountingDateRange;
  connectionId: string;
  provider: string;
  tenantOrRealmId: string;
  scorecardRawReports: ProviderRawReports;
  urmAging: QboArAgingResult;
  urmTrialBalance: QboTrialBalanceResult;
};

export type PersistedAccountingSyncIdentity = {
  syncId: string;
  companyId: string;
  connectionId: string;
  tenantId: string;
  reportPeriodEnd: string;
};

export type ArAcquisitionConnection = Pick<
  AccountingConnectionRecord,
  "id" | "user_id" | "provider" | "tenant_or_realm_id" | "external_entity_id" | "external_entity_name"
> & {
  access_token?: string | null;
  metadata_json?: Record<string, unknown> | null;
};

export type AcquireAndPersistArAccountingStateInput = {
  connection: ArAcquisitionConnection;
  userId: string;
  asOfDate: string;
  reportPeriod: AccountingDateRange;
  fetchers?: QboArCaptureFetchers;
  /** Rejected if present. Pre-existing sync ids are not capture authority. */
  accountingSyncId?: never;
};

export type ArAcquisitionDeps = {
  ensureConnection: (connection: ArAcquisitionConnection) => Promise<ArAcquisitionConnection>;
  fetchScorecardRawReports: (
    connection: ArAcquisitionConnection,
    reportPeriod: AccountingDateRange,
  ) => Promise<ProviderRawReports>;
  fetchUrmArReports: (args: {
    realmId: string;
    accessToken: string;
    asOfDate: string;
  }) => Promise<{ aging: QboArAgingResult; trial: QboTrialBalanceResult }>;
  normalizeScorecard: (args: {
    rawReports: ProviderRawReports;
    connection: ArAcquisitionConnection;
    reportPeriod: AccountingDateRange;
    syncId: string;
    tenantId: string | null;
    tenantName: string;
  }) => Promise<{
    normalizedBalanceSheet?: unknown[];
    normalizedIncomeStatement?: unknown[];
    lastSyncedAt?: string;
    rawReportsPulled?: unknown;
    schemaVersion?: number;
    [key: string]: unknown;
  }>;
  persistSync: (args: {
    connection: ArAcquisitionConnection;
    userId: string;
    syncId: string;
    reportPeriod: AccountingDateRange;
    normalizedData: Record<string, unknown>;
    tenantId: string | null;
    tenantName: string;
  }) => Promise<PersistedAccountingSyncIdentity>;
  persistSnapshot: typeof persistArMeasurementSnapshot;
  generateSyncId?: () => string;
};

function monthStartFromAsOf(asOfDate: string): string {
  return `${asIsoDate(asOfDate).slice(0, 7)}-01`;
}

function hasCoreStatements(normalized: {
  normalizedBalanceSheet?: unknown[];
  normalizedIncomeStatement?: unknown[];
}): boolean {
  return Boolean(
    Array.isArray(normalized.normalizedBalanceSheet) &&
      normalized.normalizedBalanceSheet.length &&
      Array.isArray(normalized.normalizedIncomeStatement) &&
      normalized.normalizedIncomeStatement.length,
  );
}

export async function createDefaultArAcquisitionDeps(
  fetchers?: QboArCaptureFetchers,
): Promise<ArAcquisitionDeps> {
  return {
    async ensureConnection(connection) {
      return ensureFreshTokens(connection as AccountingConnectionRecord);
    },
    async fetchScorecardRawReports(connection, reportPeriod) {
      const adapter = getAccountingProviderMappingAdapter(String(connection.provider));
      return adapter.fetchRawReports(connection as AccountingConnectionRecord, reportPeriod);
    },
    async fetchUrmArReports(args) {
      return fetchQboUrmArReports({ ...args, fetchers });
    },
    async normalizeScorecard(args) {
      const adapter = getAccountingProviderMappingAdapter(String(args.connection.provider));
      return (await adapter.normalize(args.rawReports, {
        connection: args.connection as AccountingConnectionRecord,
        reportPeriod: args.reportPeriod,
        syncId: args.syncId,
        tenantId: args.tenantId,
        tenantName: args.tenantName,
      })) as unknown as {
        normalizedBalanceSheet?: unknown[];
        normalizedIncomeStatement?: unknown[];
        lastSyncedAt?: string;
        rawReportsPulled?: unknown;
        schemaVersion?: number;
        [key: string]: unknown;
      };
    },
    async persistSync(args) {
      const adapter = getAccountingProviderMappingAdapter(String(args.connection.provider));
      const persisted = await persistNormalizedAccountingSync({
        connection: args.connection as AccountingConnectionRecord,
        userId: args.userId,
        syncId: args.syncId,
        reportPeriod: args.reportPeriod,
        normalizedData: args.normalizedData as never,
        sourceSystem: args.connection.provider as "quickbooks" | "xero",
        adapterName: adapter.adapterName,
        tenantId: args.tenantId,
        tenantName: args.tenantName,
        requireDurableAccountingSyncRow: true,
      });
      if (!persisted.persistedToAccountingSyncs) {
        throw new MeasurementSnapshotError(
          MEASUREMENT_SNAPSHOT_ERROR.PERSIST_FAILED,
          "AR acquisition requires a durable accounting_syncs row.",
        );
      }
      return {
        syncId: persisted.syncId,
        companyId: String(persisted.companyId || ""),
        connectionId: persisted.connectionId,
        tenantId: persisted.tenantId,
        reportPeriodEnd: args.reportPeriod.endDate,
      };
    },
    persistSnapshot: persistArMeasurementSnapshot,
  };
}

/**
 * Fetch Scorecard reports and URM AR/TB as one acquisition batch.
 * Returns an in-memory frozen bundle. Does not persist. No accounting_syncs.id yet.
 */
export async function acquireAccountingStateForAr(
  input: AcquireAndPersistArAccountingStateInput,
  deps: ArAcquisitionDeps,
): Promise<{ bundle: ArAccountingAcquisitionBundle; connection: ArAcquisitionConnection }> {
  const preexisting = String(
    (input as { accountingSyncId?: unknown }).accountingSyncId || "",
  ).trim();
  if (preexisting) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PREEXISTING_SYNC_NOT_AUTHORITY,
      "Fresh AR capture cannot use a pre-existing accountingSyncId.",
    );
  }
  if (String(input.connection.provider) !== "quickbooks") {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PROVIDER_UNSUPPORTED,
      "AR measurement acquisition currently supports QuickBooks only.",
    );
  }
  const asOfDate = asIsoDate(input.asOfDate);
  const reportPeriod: AccountingDateRange = {
    startDate: asIsoDate(input.reportPeriod.startDate || monthStartFromAsOf(asOfDate)),
    endDate: asIsoDate(input.reportPeriod.endDate),
  };
  assertAsOfMatchesReportPeriodEnd(asOfDate, reportPeriod.endDate);

  const connection = await deps.ensureConnection(input.connection);
  const realmId = String(connection.tenant_or_realm_id || connection.external_entity_id || "").trim();
  const accessToken = String(connection.access_token || "").trim();
  if (!realmId || !accessToken) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.CUSTODY_MISMATCH,
      "AR acquisition requires a realm and access token on the connection.",
    );
  }

  const capturedAt = new Date().toISOString();
  const acquisitionId = randomUUID();
  const scorecardRawReports = await deps.fetchScorecardRawReports(connection, reportPeriod);
  const urm = await deps.fetchUrmArReports({
    realmId,
    accessToken,
    asOfDate,
  });

  return {
    bundle: {
      acquisitionId,
      capturedAt,
      asOfDate,
      reportPeriod,
      connectionId: connection.id,
      provider: String(connection.provider),
      tenantOrRealmId: realmId,
      scorecardRawReports,
      urmAging: urm.aging,
      urmTrialBalance: urm.trial,
    },
    connection,
  };
}

/**
 * Persist accounting_syncs then the AR snapshot from a frozen acquisition bundle.
 * No provider reads. Snapshot accountingSyncId is the just-persisted sync id.
 */
export async function persistAcquiredAccountingStateWithArSnapshot(args: {
  bundle: ArAccountingAcquisitionBundle;
  connection: ArAcquisitionConnection;
  userId: string;
  deps: ArAcquisitionDeps;
}): Promise<{
  accountingSync: PersistedAccountingSyncIdentity;
  arMeasurementSnapshot: TieOutArMeasurementSnapshot;
  reusedSnapshot: boolean;
}> {
  const { bundle, connection, userId, deps } = args;
  assertAsOfMatchesReportPeriodEnd(bundle.asOfDate, bundle.reportPeriod.endDate);
  const tenantId = bundle.tenantOrRealmId;
  const tenantName = String(
    connection.external_entity_name || connection.metadata_json?.tenant_name || "QuickBooks Company",
  );
  const syncId = deps.generateSyncId ? deps.generateSyncId() : randomUUID();
  const normalizedData = await deps.normalizeScorecard({
    rawReports: bundle.scorecardRawReports,
    connection,
    reportPeriod: bundle.reportPeriod,
    syncId,
    tenantId,
    tenantName,
  });
  if (!hasCoreStatements(normalizedData)) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.CORE_STATEMENTS_MISSING,
      "AR acquisition will not persist an accounting_syncs row without core financial statements.",
    );
  }

  const accountingSync = await deps.persistSync({
    connection,
    userId,
    syncId,
    reportPeriod: bundle.reportPeriod,
    normalizedData,
    tenantId,
    tenantName,
  });
  assertAsOfMatchesReportPeriodEnd(bundle.asOfDate, accountingSync.reportPeriodEnd);
  if (accountingSync.syncId !== syncId) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.CUSTODY_MISMATCH,
      "Persisted accounting_syncs.id must be the id assigned in this acquisition.",
    );
  }
  if (!accountingSync.companyId) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.SYNC_COMPANY_MISSING,
      "AR measurement snapshots require accounting_syncs.company_id.",
    );
  }

  const snapshot = buildArMeasurementSnapshotFromUrmReports({
    accountingSyncId: accountingSync.syncId,
    accountingConnectionId: accountingSync.connectionId,
    companyId: accountingSync.companyId,
    provider: bundle.provider,
    tenantOrRealmId: bundle.tenantOrRealmId,
    asOfDate: bundle.asOfDate,
    capturedAt: bundle.capturedAt,
    aging: bundle.urmAging,
    trial: bundle.urmTrialBalance,
  });

  try {
    const persisted = await deps.persistSnapshot(snapshot);
    return {
      accountingSync,
      arMeasurementSnapshot: persisted.snapshot,
      reusedSnapshot: persisted.reused,
    };
  } catch (error) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PERSIST_FAILED,
      `accounting_syncs ${accountingSync.syncId} persisted but AR snapshot did not; this sync is not CC-authoritative for AR. ${
        error instanceof Error ? error.message : "unknown"
      }`,
    );
  }
}

export async function acquireAndPersistAccountingStateWithArSnapshot(
  input: AcquireAndPersistArAccountingStateInput,
  deps?: Partial<ArAcquisitionDeps>,
): Promise<{
  accountingSync: PersistedAccountingSyncIdentity;
  arMeasurementSnapshot: TieOutArMeasurementSnapshot;
  reusedSnapshot: boolean;
  acquisitionId: string;
}> {
  const resolved = { ...(await createDefaultArAcquisitionDeps(input.fetchers)), ...deps };
  const acquired = await acquireAccountingStateForAr(input, resolved);
  const persisted = await persistAcquiredAccountingStateWithArSnapshot({
    bundle: acquired.bundle,
    connection: acquired.connection,
    userId: input.userId,
    deps: resolved,
  });
  return {
    ...persisted,
    acquisitionId: acquired.bundle.acquisitionId,
  };
}
