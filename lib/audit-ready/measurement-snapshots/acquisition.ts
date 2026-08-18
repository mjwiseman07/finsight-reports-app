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
import {
  fetchQboArAgingDetail,
  fetchQboTrialBalance,
  type QboApAgingResult,
  type QboArAgingResult,
  type QboInventoryValuationResult,
  type QboTrialBalanceResult,
} from "@/lib/audit-ready/tie-out/qbo-reports";
import {
  buildArMeasurementSnapshotFromUrmReports,
  fetchQboUrmArReports,
  type QboArCaptureFetchers,
} from "./qbo-ar-adapter";
import {
  buildApMeasurementSnapshotFromUrmReports,
  fetchQboUrmApAging,
} from "./qbo-ap-adapter";
import {
  buildInventoryMeasurementSnapshotFromUrmReports,
  fetchQboUrmInventoryValuation,
} from "./qbo-inventory-adapter";
import {
  assertAsOfMatchesReportPeriodEnd,
  persistApMeasurementSnapshot,
  persistArMeasurementSnapshot,
  persistInventoryMeasurementSnapshot,
} from "./repository";
import {
  CombinedAcquisitionPartialError,
  MEASUREMENT_SNAPSHOT_ERROR,
  MeasurementSnapshotError,
  type TieOutApMeasurementSnapshot,
  type TieOutArMeasurementSnapshot,
  type TieOutInventoryMeasurementSnapshot,
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

function freezeSharedTrialBalance(trial: QboTrialBalanceResult): QboTrialBalanceResult {
  const lines: QboTrialBalanceResult["lines"] = trial.lines.map((line) => ({ ...line }));
  Object.freeze(lines);
  for (const line of lines) Object.freeze(line);
  const frozen: QboTrialBalanceResult = {
    as_of_date: trial.as_of_date,
    currency: trial.currency,
    lines,
    raw_report_url: trial.raw_report_url,
    intuit_tid: trial.intuit_tid,
  };
  return Object.freeze(frozen) as QboTrialBalanceResult;
}

export type ArApAccountingAcquisitionBundle = {
  acquisitionId: string;
  capturedAt: string;
  asOfDate: string;
  reportPeriod: AccountingDateRange;
  connectionId: string;
  provider: string;
  tenantOrRealmId: string;
  scorecardRawReports: ProviderRawReports;
  urmArAging: QboArAgingResult;
  urmApAging: QboApAgingResult;
  /** One frozen URM TB capture shared by AR and AP snapshot builders. */
  urmTrialBalance: QboTrialBalanceResult;
};

export type AcquireAndPersistArApAccountingStateInput = {
  connection: ArAcquisitionConnection;
  userId: string;
  asOfDate: string;
  reportPeriod: AccountingDateRange;
  fetchers?: QboArCaptureFetchers;
  /** Rejected if present. Pre-existing sync ids are not capture authority. */
  accountingSyncId?: never;
};

export type ArApAcquisitionDeps = {
  ensureConnection: ArAcquisitionDeps["ensureConnection"];
  fetchScorecardRawReports: ArAcquisitionDeps["fetchScorecardRawReports"];
  fetchUrmArAging: (args: {
    realmId: string;
    accessToken: string;
    asOfDate: string;
  }) => Promise<QboArAgingResult>;
  fetchUrmApAging: (args: {
    realmId: string;
    accessToken: string;
    asOfDate: string;
  }) => Promise<QboApAgingResult>;
  fetchUrmTrialBalance: (args: {
    realmId: string;
    accessToken: string;
    asOfDate: string;
  }) => Promise<QboTrialBalanceResult>;
  normalizeScorecard: ArAcquisitionDeps["normalizeScorecard"];
  persistSync: ArAcquisitionDeps["persistSync"];
  persistArSnapshot: typeof persistArMeasurementSnapshot;
  persistApSnapshot: typeof persistApMeasurementSnapshot;
  generateSyncId?: () => string;
};

export async function createDefaultArApAcquisitionDeps(
  fetchers?: QboArCaptureFetchers,
): Promise<ArApAcquisitionDeps> {
  const arDefaults = await createDefaultArAcquisitionDeps(fetchers);
  return {
    ensureConnection: arDefaults.ensureConnection,
    fetchScorecardRawReports: arDefaults.fetchScorecardRawReports,
    async fetchUrmArAging(args) {
      const fetchAging = fetchers?.fetchAging ?? fetchQboArAgingDetail;
      return fetchAging({
        realmId: args.realmId,
        accessToken: args.accessToken,
        asOfDate: args.asOfDate,
      });
    },
    async fetchUrmApAging(args) {
      return fetchQboUrmApAging(args);
    },
    async fetchUrmTrialBalance(args) {
      const fetchTrialBalance = fetchers?.fetchTrialBalance ?? fetchQboTrialBalance;
      return fetchTrialBalance({
        realmId: args.realmId,
        accessToken: args.accessToken,
        asOfDate: args.asOfDate,
      });
    },
    normalizeScorecard: arDefaults.normalizeScorecard,
    persistSync: arDefaults.persistSync,
    persistArSnapshot: persistArMeasurementSnapshot,
    persistApSnapshot: persistApMeasurementSnapshot,
  };
}

/**
 * Combined AR+AP provider reads. One URM Trial Balance. No persist.
 * Does not call fetchQboUrmArReports (that would fetch a second TB).
 */
export async function acquireAccountingStateForArAp(
  input: AcquireAndPersistArApAccountingStateInput,
  deps: ArApAcquisitionDeps,
): Promise<{ bundle: ArApAccountingAcquisitionBundle; connection: ArAcquisitionConnection }> {
  const preexisting = String(
    (input as { accountingSyncId?: unknown }).accountingSyncId || "",
  ).trim();
  if (preexisting) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PREEXISTING_SYNC_NOT_AUTHORITY,
      "Fresh combined AR+AP capture cannot use a pre-existing accountingSyncId.",
    );
  }
  if (String(input.connection.provider) !== "quickbooks") {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PROVIDER_UNSUPPORTED,
      "Combined AR+AP measurement acquisition currently supports QuickBooks only.",
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
      "Combined AR+AP acquisition requires a realm and access token on the connection.",
    );
  }

  const capturedAt = new Date().toISOString();
  const acquisitionId = randomUUID();
  const urmArgs = { realmId, accessToken, asOfDate };
  const [scorecardRawReports, urmArAging, urmApAging, urmTrialBalanceRaw] = await Promise.all([
    deps.fetchScorecardRawReports(connection, reportPeriod),
    deps.fetchUrmArAging(urmArgs),
    deps.fetchUrmApAging(urmArgs),
    deps.fetchUrmTrialBalance(urmArgs),
  ]);
  const urmTrialBalance = freezeSharedTrialBalance(urmTrialBalanceRaw);

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
      urmArAging,
      urmApAging,
      urmTrialBalance,
    },
    connection,
  };
}

export async function persistAcquiredAccountingStateWithArApSnapshots(args: {
  bundle: ArApAccountingAcquisitionBundle;
  connection: ArAcquisitionConnection;
  userId: string;
  deps: ArApAcquisitionDeps;
}): Promise<{
  accountingSync: PersistedAccountingSyncIdentity;
  arMeasurementSnapshot: TieOutArMeasurementSnapshot;
  apMeasurementSnapshot: TieOutApMeasurementSnapshot;
  reusedArSnapshot: boolean;
  reusedApSnapshot: boolean;
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
      "Combined AR+AP acquisition will not persist an accounting_syncs row without core financial statements.",
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
      "AR/AP measurement snapshots require accounting_syncs.company_id.",
    );
  }

  const sharedTrialBalance = bundle.urmTrialBalance;
  const arSnapshot = buildArMeasurementSnapshotFromUrmReports({
    accountingSyncId: accountingSync.syncId,
    accountingConnectionId: accountingSync.connectionId,
    companyId: accountingSync.companyId,
    provider: bundle.provider,
    tenantOrRealmId: bundle.tenantOrRealmId,
    asOfDate: bundle.asOfDate,
    capturedAt: bundle.capturedAt,
    aging: bundle.urmArAging,
    trial: sharedTrialBalance,
  });
  const apSnapshot = buildApMeasurementSnapshotFromUrmReports({
    accountingSyncId: accountingSync.syncId,
    accountingConnectionId: accountingSync.connectionId,
    companyId: accountingSync.companyId,
    provider: bundle.provider,
    tenantOrRealmId: bundle.tenantOrRealmId,
    asOfDate: bundle.asOfDate,
    capturedAt: bundle.capturedAt,
    aging: bundle.urmApAging,
    trial: sharedTrialBalance,
  });

  let persistedAr: { snapshot: TieOutArMeasurementSnapshot; reused: boolean };
  try {
    persistedAr = await deps.persistArSnapshot(arSnapshot);
  } catch (error) {
    throw new CombinedAcquisitionPartialError({
      code: MEASUREMENT_SNAPSHOT_ERROR.COMBINED_AR_SNAPSHOT_PERSIST_FAILED,
      message: `accounting_syncs ${accountingSync.syncId} persisted but AR snapshot did not; combined observation is incomplete and AP was not persisted. ${
        error instanceof Error ? error.message : "unknown"
      }`,
      accountingSyncId: accountingSync.syncId,
      arMeasurementSnapshot: null,
      apMeasurementSnapshot: null,
    });
  }

  try {
    const persistedAp = await deps.persistApSnapshot(apSnapshot);
    return {
      accountingSync,
      arMeasurementSnapshot: persistedAr.snapshot,
      apMeasurementSnapshot: persistedAp.snapshot,
      reusedArSnapshot: persistedAr.reused,
      reusedApSnapshot: persistedAp.reused,
    };
  } catch (error) {
    throw new CombinedAcquisitionPartialError({
      code: MEASUREMENT_SNAPSHOT_ERROR.COMBINED_AP_SNAPSHOT_PERSIST_FAILED,
      message: `accounting_syncs ${accountingSync.syncId} and AR snapshot persisted but AP snapshot did not; AP is not CC-authoritative on this sync. Do not attach a later AP provider fetch to this sync. ${
        error instanceof Error ? error.message : "unknown"
      }`,
      accountingSyncId: accountingSync.syncId,
      arMeasurementSnapshot: persistedAr.snapshot,
      apMeasurementSnapshot: null,
    });
  }
}

export async function acquireAndPersistAccountingStateWithArApSnapshots(
  input: AcquireAndPersistArApAccountingStateInput,
  deps?: Partial<ArApAcquisitionDeps>,
): Promise<{
  accountingSync: PersistedAccountingSyncIdentity;
  arMeasurementSnapshot: TieOutArMeasurementSnapshot;
  apMeasurementSnapshot: TieOutApMeasurementSnapshot;
  reusedArSnapshot: boolean;
  reusedApSnapshot: boolean;
  acquisitionId: string;
}> {
  const resolved = { ...(await createDefaultArApAcquisitionDeps(input.fetchers)), ...deps };
  const acquired = await acquireAccountingStateForArAp(input, resolved);
  const persisted = await persistAcquiredAccountingStateWithArApSnapshots({
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

export type ArApInventoryAccountingAcquisitionBundle = ArApAccountingAcquisitionBundle & {
  urmInventoryValuation: QboInventoryValuationResult;
};

export type AcquireAndPersistArApInventoryAccountingStateInput =
  AcquireAndPersistArApAccountingStateInput;

export type ArApInventoryAcquisitionDeps = ArApAcquisitionDeps & {
  fetchUrmInventoryValuation: (args: {
    realmId: string;
    accessToken: string;
    asOfDate: string;
  }) => Promise<QboInventoryValuationResult>;
  persistInventorySnapshot: typeof persistInventoryMeasurementSnapshot;
};

export async function createDefaultArApInventoryAcquisitionDeps(
  fetchers?: QboArCaptureFetchers,
): Promise<ArApInventoryAcquisitionDeps> {
  const arAp = await createDefaultArApAcquisitionDeps(fetchers);
  return {
    ...arAp,
    async fetchUrmInventoryValuation(args) {
      return fetchQboUrmInventoryValuation(args);
    },
    persistInventorySnapshot: persistInventoryMeasurementSnapshot,
  };
}

/**
 * Combined AR+AP+Inventory provider reads. One URM Trial Balance. No persist.
 * Does not call fetchQboUrmArReports (that would fetch a second TB).
 */
export async function acquireAccountingStateForArApInventory(
  input: AcquireAndPersistArApInventoryAccountingStateInput,
  deps: ArApInventoryAcquisitionDeps,
): Promise<{
  bundle: ArApInventoryAccountingAcquisitionBundle;
  connection: ArAcquisitionConnection;
}> {
  const preexisting = String(
    (input as { accountingSyncId?: unknown }).accountingSyncId || "",
  ).trim();
  if (preexisting) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PREEXISTING_SYNC_NOT_AUTHORITY,
      "Fresh combined AR+AP+Inventory capture cannot use a pre-existing accountingSyncId.",
    );
  }
  if (String(input.connection.provider) !== "quickbooks") {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.PROVIDER_UNSUPPORTED,
      "Combined AR+AP+Inventory measurement acquisition currently supports QuickBooks only.",
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
      "Combined AR+AP+Inventory acquisition requires a realm and access token on the connection.",
    );
  }

  const capturedAt = new Date().toISOString();
  const acquisitionId = randomUUID();
  const urmArgs = { realmId, accessToken, asOfDate };
  const [
    scorecardRawReports,
    urmArAging,
    urmApAging,
    urmInventoryValuation,
    urmTrialBalanceRaw,
  ] = await Promise.all([
    deps.fetchScorecardRawReports(connection, reportPeriod),
    deps.fetchUrmArAging(urmArgs),
    deps.fetchUrmApAging(urmArgs),
    deps.fetchUrmInventoryValuation(urmArgs),
    deps.fetchUrmTrialBalance(urmArgs),
  ]);
  const urmTrialBalance = freezeSharedTrialBalance(urmTrialBalanceRaw);

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
      urmArAging,
      urmApAging,
      urmInventoryValuation,
      urmTrialBalance,
    },
    connection,
  };
}

export async function persistAcquiredAccountingStateWithArApInventorySnapshots(args: {
  bundle: ArApInventoryAccountingAcquisitionBundle;
  connection: ArAcquisitionConnection;
  userId: string;
  deps: ArApInventoryAcquisitionDeps;
}): Promise<{
  accountingSync: PersistedAccountingSyncIdentity;
  arMeasurementSnapshot: TieOutArMeasurementSnapshot;
  apMeasurementSnapshot: TieOutApMeasurementSnapshot;
  inventoryMeasurementSnapshot: TieOutInventoryMeasurementSnapshot;
  reusedArSnapshot: boolean;
  reusedApSnapshot: boolean;
  reusedInventorySnapshot: boolean;
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
      "Combined AR+AP+Inventory acquisition will not persist an accounting_syncs row without core financial statements.",
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
      "AR/AP/Inventory measurement snapshots require accounting_syncs.company_id.",
    );
  }

  const sharedTrialBalance = bundle.urmTrialBalance;
  const arSnapshot = buildArMeasurementSnapshotFromUrmReports({
    accountingSyncId: accountingSync.syncId,
    accountingConnectionId: accountingSync.connectionId,
    companyId: accountingSync.companyId,
    provider: bundle.provider,
    tenantOrRealmId: bundle.tenantOrRealmId,
    asOfDate: bundle.asOfDate,
    capturedAt: bundle.capturedAt,
    aging: bundle.urmArAging,
    trial: sharedTrialBalance,
  });
  const apSnapshot = buildApMeasurementSnapshotFromUrmReports({
    accountingSyncId: accountingSync.syncId,
    accountingConnectionId: accountingSync.connectionId,
    companyId: accountingSync.companyId,
    provider: bundle.provider,
    tenantOrRealmId: bundle.tenantOrRealmId,
    asOfDate: bundle.asOfDate,
    capturedAt: bundle.capturedAt,
    aging: bundle.urmApAging,
    trial: sharedTrialBalance,
  });
  const inventorySnapshot = buildInventoryMeasurementSnapshotFromUrmReports({
    accountingSyncId: accountingSync.syncId,
    accountingConnectionId: accountingSync.connectionId,
    companyId: accountingSync.companyId,
    provider: bundle.provider,
    tenantOrRealmId: bundle.tenantOrRealmId,
    asOfDate: bundle.asOfDate,
    capturedAt: bundle.capturedAt,
    valuation: bundle.urmInventoryValuation,
    trial: sharedTrialBalance,
  });

  let persistedAr: { snapshot: TieOutArMeasurementSnapshot; reused: boolean };
  try {
    persistedAr = await deps.persistArSnapshot(arSnapshot);
  } catch (error) {
    throw new CombinedAcquisitionPartialError({
      code: MEASUREMENT_SNAPSHOT_ERROR.COMBINED_AR_SNAPSHOT_PERSIST_FAILED,
      message: `accounting_syncs ${accountingSync.syncId} persisted but AR snapshot did not; AP and Inventory were not persisted. ${
        error instanceof Error ? error.message : "unknown"
      }`,
      accountingSyncId: accountingSync.syncId,
      arMeasurementSnapshot: null,
      apMeasurementSnapshot: null,
      inventoryMeasurementSnapshot: null,
    });
  }

  let persistedAp: { snapshot: TieOutApMeasurementSnapshot; reused: boolean };
  try {
    persistedAp = await deps.persistApSnapshot(apSnapshot);
  } catch (error) {
    throw new CombinedAcquisitionPartialError({
      code: MEASUREMENT_SNAPSHOT_ERROR.COMBINED_AP_SNAPSHOT_PERSIST_FAILED,
      message: `accounting_syncs ${accountingSync.syncId} and AR snapshot persisted but AP snapshot did not; Inventory was not persisted. AP is not CC-authoritative on this sync. ${
        error instanceof Error ? error.message : "unknown"
      }`,
      accountingSyncId: accountingSync.syncId,
      arMeasurementSnapshot: persistedAr.snapshot,
      apMeasurementSnapshot: null,
      inventoryMeasurementSnapshot: null,
    });
  }

  try {
    const persistedInventory = await deps.persistInventorySnapshot(inventorySnapshot);
    return {
      accountingSync,
      arMeasurementSnapshot: persistedAr.snapshot,
      apMeasurementSnapshot: persistedAp.snapshot,
      inventoryMeasurementSnapshot: persistedInventory.snapshot,
      reusedArSnapshot: persistedAr.reused,
      reusedApSnapshot: persistedAp.reused,
      reusedInventorySnapshot: persistedInventory.reused,
    };
  } catch (error) {
    throw new CombinedAcquisitionPartialError({
      code: MEASUREMENT_SNAPSHOT_ERROR.COMBINED_INVENTORY_SNAPSHOT_PERSIST_FAILED,
      message: `accounting_syncs ${accountingSync.syncId} and AR+AP snapshots persisted but Inventory snapshot did not; Inventory is not CC-authoritative on this sync. Do not attach a later Inventory provider fetch to this sync. ${
        error instanceof Error ? error.message : "unknown"
      }`,
      accountingSyncId: accountingSync.syncId,
      arMeasurementSnapshot: persistedAr.snapshot,
      apMeasurementSnapshot: persistedAp.snapshot,
      inventoryMeasurementSnapshot: null,
    });
  }
}

export async function acquireAndPersistAccountingStateWithArApInventorySnapshots(
  input: AcquireAndPersistArApInventoryAccountingStateInput,
  deps?: Partial<ArApInventoryAcquisitionDeps>,
): Promise<{
  accountingSync: PersistedAccountingSyncIdentity;
  arMeasurementSnapshot: TieOutArMeasurementSnapshot;
  apMeasurementSnapshot: TieOutApMeasurementSnapshot;
  inventoryMeasurementSnapshot: TieOutInventoryMeasurementSnapshot;
  reusedArSnapshot: boolean;
  reusedApSnapshot: boolean;
  reusedInventorySnapshot: boolean;
  acquisitionId: string;
}> {
  const resolved = {
    ...(await createDefaultArApInventoryAcquisitionDeps(input.fetchers)),
    ...deps,
  };
  const acquired = await acquireAccountingStateForArApInventory(input, resolved);
  const persisted = await persistAcquiredAccountingStateWithArApInventorySnapshots({
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

