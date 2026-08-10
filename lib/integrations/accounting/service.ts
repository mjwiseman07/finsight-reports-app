import crypto from "crypto";
import type { NextRequest, NextResponse as NextResponseType } from "next/server";
import { assertReadyForSourceAgnosticOutputs } from "./advisacor-data-model";
import { buildReportDataContext } from "./report-data-context";
import { getAccountingProviderMappingAdapter } from "./provider-adapters";
import { getAccountingProvider, getEnabledProviders } from "./registry";
import { decryptAccountingToken, encryptAccountingToken } from "./token-encryption";
import type { AccountingDateRange, AccountingProvider, AccountingConnectionRecord } from "./types";
import { validateReportPreflight, type PreflightIssue } from "../../reporting/report-preflight-validation";
import { supabaseAdmin } from "../../supabase";

const STATE_COOKIE = "accounting_oauth_state";
const TOKEN_COOKIE = "accounting_oauth_token";
const RETURN_COOKIE = "accounting_oauth_return_to";
const SYNC_STATUS = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;
const LEGACY_SUCCESS_SYNC_STATUSES = ["SUCCESS", "successful", "completed", "synced", "ready"];

function requireSupabase() {
  if (!supabaseAdmin) throw new Error("Supabase admin client is not configured");
  return supabaseAdmin;
}

function getTokenExpiry(token: Record<string, unknown>) {
  const expiresInSeconds = Number(token.expires_in || 3600);
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

function secureTokenForStorage(provider: AccountingProvider, token: unknown) {
  if (provider !== "xero") return typeof token === "string" ? token : null;
  return typeof token === "string" ? encryptAccountingToken(token) : null;
}

function decryptConnectionTokens(connection: AccountingConnectionRecord): AccountingConnectionRecord {
  if (connection.provider !== "xero") return connection;
  return {
    ...connection,
    access_token: decryptAccountingToken(connection.access_token),
    refresh_token: decryptAccountingToken(connection.refresh_token),
  };
}

// Phase W1c.4c.3 — Proactive OAuth refresh.
//
// Root cause of the 2026-08-09 smoke failure: xeroGet + qboGet call the provider
// API using connection.access_token directly. There is no 401 handler, no
// proactive refresh, and the last refresh in service.ts is at OAuth callback
// (~L855). If token_expires_at is in the past when a sync runs, the provider
// returns 401 → normalization errors populate → validator throws
// "Normalized Advisacor financial data is incomplete".
//
// This helper ensures fresh tokens BEFORE the provider is called. It preserves
// the hash-chain memory contract: on refresh failure it still lets the sync
// throw with a taxonomy'd error so the lifecycle-failed emit at the outer
// try/catch fires with the FK-clean company_id resolved by
// resolveOrCreateCompanyForProvider (W1c.4c.2).
async function ensureFreshTokens(connection: AccountingConnectionRecord): Promise<AccountingConnectionRecord> {
  const decrypted = decryptConnectionTokens(connection);
  if (decrypted.provider !== "xero" && decrypted.provider !== "quickbooks") return decrypted;
  if (!decrypted.refresh_token) return decrypted;

  const skewMs = 5 * 60 * 1000;
  const expiresAt = decrypted.token_expires_at ? new Date(decrypted.token_expires_at).getTime() : 0;
  const nowMs = Date.now();
  const needsRefresh = !expiresAt || expiresAt - nowMs < skewMs;
  if (!needsRefresh) return decrypted;

  const provider = getAccountingProvider(decrypted.provider);
  let tokenPayload: Record<string, unknown>;
  try {
    tokenPayload = await provider.refreshAccessToken({ refreshToken: decrypted.refresh_token });
  } catch (refreshError) {
    console.warn("[accounting/token-refresh] refresh_failed", {
      connectionId: decrypted.id,
      provider: decrypted.provider,
      tokenExpiresAt: decrypted.token_expires_at,
      exceptionMessage: refreshError instanceof Error ? refreshError.message : String(refreshError),
    });
    // Mark the connection as needing reconnect so the UI can surface it, but
    // still throw so the outer sync-failed lifecycle event captures the reason.
    try {
      await requireSupabase()
        .from("accounting_connections")
        .update({ status: "needs_reconnect", updated_at: new Date().toISOString() })
        .eq("id", decrypted.id);
    } catch (statusError) {
      console.warn("[accounting/token-refresh] status_update_failed", {
        connectionId: decrypted.id,
        exceptionMessage: statusError instanceof Error ? statusError.message : String(statusError),
      });
    }
    const wrapped = new Error(
      `OAuth refresh failed for ${decrypted.provider} connection ${decrypted.id}. The user must reconnect their accounting system.`
    ) as Error & { code?: string; connectionId?: string };
    wrapped.code = "OAUTH_REFRESH_FAILED";
    wrapped.connectionId = decrypted.id;
    throw wrapped;
  }

  const newAccessToken = typeof tokenPayload.access_token === "string" ? tokenPayload.access_token : null;
  const newRefreshToken = typeof tokenPayload.refresh_token === "string" ? tokenPayload.refresh_token : decrypted.refresh_token;
  if (!newAccessToken) {
    console.warn("[accounting/token-refresh] no_access_token_in_payload", {
      connectionId: decrypted.id,
      provider: decrypted.provider,
      payloadKeys: Object.keys(tokenPayload || {}),
    });
    const wrapped = new Error(
      `OAuth refresh returned no access_token for ${decrypted.provider} connection ${decrypted.id}.`
    ) as Error & { code?: string; connectionId?: string };
    wrapped.code = "OAUTH_REFRESH_NO_TOKEN";
    wrapped.connectionId = decrypted.id;
    throw wrapped;
  }

  const newExpiry = getTokenExpiry(tokenPayload);
  try {
    const { error: updateError } = await requireSupabase()
      .from("accounting_connections")
      .update({
        access_token: secureTokenForStorage(decrypted.provider, newAccessToken),
        refresh_token: secureTokenForStorage(decrypted.provider, newRefreshToken),
        token_expires_at: newExpiry,
        updated_at: new Date().toISOString(),
      })
      .eq("id", decrypted.id);
    if (updateError) {
      console.warn("[accounting/token-refresh] persist_failed", {
        connectionId: decrypted.id,
        provider: decrypted.provider,
        exceptionMessage: updateError.message,
      });
    } else {
      console.info("[accounting/token-refresh] refresh_success", {
        connectionId: decrypted.id,
        provider: decrypted.provider,
        newExpiry,
      });
    }
  } catch (persistError) {
    console.warn("[accounting/token-refresh] persist_threw", {
      connectionId: decrypted.id,
      exceptionMessage: persistError instanceof Error ? persistError.message : String(persistError),
    });
  }

  return {
    ...decrypted,
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    token_expires_at: newExpiry,
  };
}

function assertProviderMatchesSelectedProvider(selectedProvider: string | undefined, normalizedData: { sourceSystem: AccountingProvider }) {
  if (selectedProvider && normalizedData.sourceSystem !== selectedProvider) {
    throw new Error(`Provider mismatch: active ${selectedProvider} but normalized data is ${normalizedData.sourceSystem}`);
  }
}

function buildSyncDiagnostics(connection: AccountingConnectionRecord, normalizedData: {
  sourceSystem: AccountingProvider;
  normalizedAccounts: unknown[];
  normalizedTrialBalance: unknown[];
  normalizedBalanceSheet: unknown[];
  normalizedIncomeStatement: unknown[];
}, xeroDiagnostics: Record<string, unknown> = {}) {
  return {
    sourceSystem: normalizedData.sourceSystem,
    tenantName: connection.external_entity_name || String(connection.metadata_json?.tenant_name || connection.metadata_json?.company_name || ""),
    accountsCount: normalizedData.normalizedAccounts.length,
    trialBalanceCount: normalizedData.normalizedTrialBalance.length,
    balanceSheetCount: normalizedData.normalizedBalanceSheet.length,
    incomeStatementCount: normalizedData.normalizedIncomeStatement.length,
    ...xeroDiagnostics,
  };
}

function latestCompletedAccountingMonth(): AccountingDateRange {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function isEmptyXeroFinancialActivityMessage(normalizedData: {
  sourceSystem: AccountingProvider;
  normalizedTransactions: unknown[];
  validation: { warnings: string[] };
}) {
  return normalizedData.sourceSystem === "xero" && normalizedData.validation.warnings.includes("Connected to Xero. No financial activity found.");
}

function uuidOrNull(value: string | null | undefined) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function isMissingAccountingSyncsTableError(error: unknown) {
  const record = error as { code?: string; message?: string; details?: string } | null | undefined;
  const message = `${record?.message || ""} ${record?.details || ""}`;
  return record?.code === "42P01" || record?.code === "PGRST205" || message.includes("Could not find the table") || message.includes("accounting_syncs") && message.includes("schema cache");
}

function normalizedCounts(normalizedData: {
  sourceSystem?: string;
  connectionId?: string;
  tenantName?: string;
  syncId?: string;
  normalizedAccounts?: unknown[];
  normalizedTrialBalance?: unknown[];
  normalizedBalanceSheet?: unknown[];
  normalizedIncomeStatement?: unknown[];
}) {
  return {
    sourceSystem: normalizedData.sourceSystem,
    connectionId: normalizedData.connectionId,
    tenantName: normalizedData.tenantName,
    syncId: normalizedData.syncId,
    normalizedAccounts: normalizedData.normalizedAccounts?.length || 0,
    normalizedTrialBalance: normalizedData.normalizedTrialBalance?.length || 0,
    normalizedBalanceSheet: normalizedData.normalizedBalanceSheet?.length || 0,
    normalizedIncomeStatement: normalizedData.normalizedIncomeStatement?.length || 0,
  };
}

function normalizedPayloadPassed(normalizedData: {
  normalizedBalanceSheet?: unknown[];
  normalizedIncomeStatement?: unknown[];
  validation?: { readyForReporting?: boolean };
} | null | undefined) {
  return Boolean(
    normalizedData &&
      normalizedData.validation?.readyForReporting !== false &&
      Array.isArray(normalizedData.normalizedBalanceSheet) &&
      normalizedData.normalizedBalanceSheet.length &&
      Array.isArray(normalizedData.normalizedIncomeStatement) &&
      normalizedData.normalizedIncomeStatement.length,
  );
}

function normalizedPayloadHasCoreStatements(normalizedData: {
  normalizedBalanceSheet?: unknown[];
  normalizedIncomeStatement?: unknown[];
} | null | undefined) {
  return Boolean(
    normalizedData &&
      Array.isArray(normalizedData.normalizedBalanceSheet) &&
      normalizedData.normalizedBalanceSheet.length &&
      Array.isArray(normalizedData.normalizedIncomeStatement) &&
      normalizedData.normalizedIncomeStatement.length,
  );
}

async function promoteSuccessfulSyncStatus(row: Record<string, unknown> | null | undefined) {
  if (!row?.id || row.validation_status === SYNC_STATUS.SUCCESS) return row;
  const normalizedData = row.normalized_payload as Record<string, unknown> | undefined;
  if (!normalizedPayloadPassed(normalizedData)) return row;
  const nextPayload = {
    ...normalizedData,
    syncStatus: SYNC_STATUS.SUCCESS,
  };
  const { error } = await requireSupabase()
    .from("accounting_syncs")
    .update({
      validation_status: SYNC_STATUS.SUCCESS,
      normalized_payload: nextPayload,
    })
    .eq("id", row.id);
  if (error && error.code !== "42P01") throw error;
  return {
    ...row,
    validation_status: SYNC_STATUS.SUCCESS,
    normalized_payload: nextPayload,
  };
}

async function saveNormalizedSyncMetadata({
  connection,
  userId,
  syncId,
  reportPeriod,
  normalizedData,
  diagnostics,
  sourceSystem,
  adapterName,
  tenantId,
  tenantName,
  preflight,
  normalizedDataForStorage,
}: {
  connection: AccountingConnectionRecord;
  userId: string;
  syncId: string;
  reportPeriod: AccountingDateRange;
  normalizedData: Awaited<ReturnType<typeof buildReportDataContext>>["normalizedData"];
  diagnostics?: Record<string, unknown> | null;
  sourceSystem: AccountingProvider;
  adapterName: string;
  tenantId: string | null;
  tenantName: string;
  preflight: unknown;
  normalizedDataForStorage: Awaited<ReturnType<typeof buildReportDataContext>>["normalizedData"] & { syncStatus: string };
}) {
  const metaCompanyIdRaw = connection.metadata_json?.company_id;
  const safeMetaCompanyId =
    typeof metaCompanyIdRaw === "string" &&
    metaCompanyIdRaw &&
    metaCompanyIdRaw !== connection.user_id
      ? metaCompanyIdRaw
      : null;

  // Phase W1c.4c.2 — guard against user_id-shaped normalizedData.companyId
  // (legacy connections poisoned by pre-fix handleCallback).
  const safeNormalizedCompanyId =
    typeof normalizedData.companyId === "string" &&
    normalizedData.companyId &&
    normalizedData.companyId !== connection.user_id
      ? normalizedData.companyId
      : null;

  // Phase W1c.4c.2 — provider-aware resolution FIRST. Keyed by tenant identity,
  // so one user connecting multiple Xero orgs resolves to distinct companies.
  let rawCompanyId: string | null = null;
  try {
    const { supabaseAdmin } = await import("../../supabase");
    if (supabaseAdmin) {
      // Best-effort firm_id via company_users → pilot_slots.firm_id.
      let firmId: string | null = null;
      const { data: memberRows } = await supabaseAdmin
        .from("company_users")
        .select("company_id")
        .eq("user_id", connection.user_id)
        .eq("status", "active")
        .limit(5);
      const companyIds = (memberRows || [])
        .map((r) => (typeof r.company_id === "string" ? r.company_id : null))
        .filter((v): v is string => Boolean(v));
      if (companyIds.length) {
        const { data: slotRows } = await supabaseAdmin
          .from("pilot_slots")
          .select("firm_id")
          .in("company_id", companyIds)
          .not("firm_id", "is", null)
          .limit(1);
        if (slotRows?.[0]?.firm_id) firmId = String(slotRows[0].firm_id);
      }

      const { resolveOrCreateCompanyForProvider } = await import("./resolve-or-create-company");
      const providerResolvedCompanyId = await resolveOrCreateCompanyForProvider(supabaseAdmin, {
        provider: sourceSystem as "xero" | "quickbooks",
        tenantId: tenantId || String(connection.tenant_or_realm_id || "") || null,
        userId: connection.user_id,
        firmId,
        tenantName: tenantName || connection.external_entity_name || null,
      });
      if (providerResolvedCompanyId) rawCompanyId = providerResolvedCompanyId;
    }
  } catch (resolveErr) {
    console.warn("[SYNC] resolveOrCreateCompanyForProvider failed", {
      connectionId: connection.id,
      message: resolveErr instanceof Error ? resolveErr.message : String(resolveErr),
    });
  }

  // Fallback chain: legacy sources, in order.
  if (!rawCompanyId) rawCompanyId = safeNormalizedCompanyId || safeMetaCompanyId || null;
  if (!rawCompanyId) {
    try {
      const { supabaseAdmin } = await import("../../supabase");
      const { resolveCompanyIdForUser } = await import("./resolve-company-id");
      if (supabaseAdmin) {
        rawCompanyId = await resolveCompanyIdForUser(supabaseAdmin, connection.user_id);
      }
    } catch (resolveErr) {
      console.warn("[SYNC] resolveCompanyIdForUser failed", {
        connectionId: connection.id,
        message: resolveErr instanceof Error ? resolveErr.message : String(resolveErr),
      });
    }
  }
  if (!rawCompanyId) {
    console.warn("[SYNC] company_id resolution failed — persisting sync with company_id=null (previously would have used user_id, which corrupted scorecard queries)", {
      connectionId: connection.id,
      userId: connection.user_id,
      sourceSystem,
    });
  }
  const companyId = rawCompanyId ? String(rawCompanyId) : null;
  const { error } = await requireSupabase()
    .from("accounting_connections")
    .update({
      metadata_json: {
        ...(connection.metadata_json || {}),
        source_system: sourceSystem,
        active_provider: sourceSystem,
        company_id: companyId,
        tenant_id: tenantId,
        tenant_name: tenantName,
        last_synced_at: normalizedData.lastSyncedAt,
        last_sync_diagnostics: diagnostics || null,
        last_sync_id: syncId,
        last_preflight_result: preflight,
        active_normalized_sync_id: syncId,
        latest_sync_by_source: {
          ...((connection.metadata_json?.latest_sync_by_source as Record<string, unknown>) || {}),
          [sourceSystem]: {
            companyId,
            connectionId: connection.id,
            sourceSystem,
            adapterName,
            syncId,
            tenantId,
            tenantName,
            reportPeriod,
            normalizedPayload: normalizedDataForStorage,
            rawReportsPulled: normalizedData.rawReportsPulled,
            validationStatus: SYNC_STATUS.SUCCESS,
            preflight,
            createdAt: normalizedData.lastSyncedAt,
          },
        },
      },
      updated_at: normalizedData.lastSyncedAt,
    })
    .eq("id", connection.id)
    .eq("user_id", userId);
  if (error) throw error;
  return companyId;
}

function buildMetadataSyncRow({
  metadata,
  sourceSystem,
  connection,
}: {
  metadata: Record<string, unknown>;
  sourceSystem: string;
  connection: AccountingConnectionRecord;
}) {
  const latestBySource = (metadata.latest_sync_by_source as Record<string, unknown> | undefined) || {};
  const entry = latestBySource[sourceSystem] as Record<string, unknown> | undefined;
  if (!entry?.normalizedPayload) return null;
  const normalizedPayload = entry.normalizedPayload as Awaited<ReturnType<typeof buildReportDataContext>>["normalizedData"];
  if (!normalizedPayloadHasCoreStatements(normalizedPayload)) return null;
  if (
    sourceSystem === "xero" &&
    !normalizedPayload.normalizedIncomeStatement?.some((row) => row.label === "Total Cost and Expenses")
  ) {
    return null;
  }
  const reportPeriod = (entry.reportPeriod as Partial<AccountingDateRange> | undefined) || {};
  return {
    id: String(entry.syncId || metadata.active_normalized_sync_id || metadata.last_sync_id || ""),
    company_id: entry.companyId || metadata.company_id || null,
    connection_id: entry.connectionId || connection.id,
    source_system: entry.sourceSystem || sourceSystem,
    adapter_name: entry.adapterName || "",
    tenant_id: entry.tenantId || metadata.tenant_id || connection.tenant_or_realm_id || connection.external_entity_id || "",
    tenant_name: entry.tenantName || metadata.tenant_name || connection.external_entity_name || "",
    report_period_start: reportPeriod.startDate || "",
    report_period_end: reportPeriod.endDate || "",
    normalized_payload: normalizedPayload,
    validation_status: entry.validationStatus || SYNC_STATUS.SUCCESS,
    created_at: entry.createdAt || metadata.last_synced_at || connection.updated_at || "",
  };
}

async function buildAndPersistLiveAccountingSync({
  connection,
  userId,
  sourceSystem,
}: {
  connection: AccountingConnectionRecord;
  userId: string;
  sourceSystem: string;
}) {
  if (!["quickbooks", "xero"].includes(sourceSystem) || connection.provider !== sourceSystem) return null;
  const reportPeriod = latestCompletedAccountingMonth();
  const syncId = crypto.randomUUID();
  const decryptedConnection = await ensureFreshTokens(connection);
  const tenantId = decryptedConnection.tenant_or_realm_id || decryptedConnection.external_entity_id || null;
  const tenantName = decryptedConnection.external_entity_name || String(decryptedConnection.metadata_json?.tenant_name || decryptedConnection.metadata_json?.company_name || (sourceSystem === "xero" ? "Xero Organization" : "QuickBooks Company"));
  const mappingAdapter = getAccountingProviderMappingAdapter(sourceSystem);
  const rawReports = await mappingAdapter.fetchRawReports(decryptedConnection, reportPeriod);
  const rawBundleDiagnostics = ((rawReports.bundle.sourceMetadata.raw as Record<string, unknown> | undefined)?.diagnostics as Record<string, unknown> | undefined) || {};
  const normalizedData = await mappingAdapter.normalize(rawReports, {
    connection: decryptedConnection,
    reportPeriod,
    syncId,
    tenantId,
    tenantName,
  });
  console.info("NORMALIZATION COMPLETE", {
    companyId: normalizedData.companyId || (decryptedConnection.metadata_json?.company_id ? String(decryptedConnection.metadata_json.company_id) : null),
    connectionId: decryptedConnection.id,
    tenantId,
    tenantName,
    sourceSystem: normalizedData.sourceSystem,
    reportPeriod,
  });
  const diagnostics = buildSyncDiagnostics(decryptedConnection, normalizedData, rawBundleDiagnostics);
  if (!normalizedPayloadHasCoreStatements(normalizedData)) {
    const error = new Error(`${sourceSystem === "xero" ? "Xero" : "QuickBooks"} sync did not return the required core financial statements. Please wait a moment and refresh context.`);
    (error as Error & { diagnostics?: Record<string, unknown> }).diagnostics = diagnostics;
    throw error;
  }
  await persistNormalizedAccountingSync({
    connection: decryptedConnection,
    userId,
    syncId,
    reportPeriod,
    normalizedData,
    diagnostics,
    sourceSystem: sourceSystem as AccountingProvider,
    adapterName: mappingAdapter.adapterName,
    tenantId,
    tenantName,
    preflight: { hydratedFromActiveContext: true },
  });

  // Phase DASH_1B.2 — anchor bootstrap + lifecycle event (active-context path).
  // Mirrors the emit block in fetchCanonicalReports (~L1148-1183). Required
  // because the first-connect dashboard hydration flows through this function,
  // not fetchCanonicalReports, and without this block the hash-chained
  // pilot_lifecycle_events log has no accounting-sync-completed row for
  // the very first sync — violating the single-subject anchor invariant.
  //
  // Best-effort only. Never blocks the sync return. Every failure logged.
  try {
    const { ensureLifecycleAnchor } = await import("../../lifecycle/ensure-anchor");
    const { emitSyncLifecycleEvent } = await import("../../lifecycle/emit-sync-event");
    const { supabaseAdmin } = await import("../../supabase");
    if (supabaseAdmin && userId) {
      const { pilotSlotId } = await ensureLifecycleAnchor({
        admin: supabaseAdmin,
        userId,
        sourceSystemCompanyName: diagnostics.tenantName || tenantName || "Unnamed Company",
      });
      await emitSyncLifecycleEvent({
        admin: supabaseAdmin,
        pilotSlotId,
        eventKind: "pilot.lifecycle.accounting-sync-completed",
        payload: {
          connection_id: decryptedConnection.id,
          tenant_id: tenantId,
          tenant_name: diagnostics.tenantName || tenantName || "",
          sync_id: syncId,
          source_system: sourceSystem,
          outcome: "succeeded",
          records_synced:
            (normalizedData.normalizedTrialBalance?.length || 0) +
            (normalizedData.normalizedBalanceSheet?.length || 0) +
            (normalizedData.normalizedIncomeStatement?.length || 0),
          provenance: "live",
        },
      });
      // Phase W1c.4c.2 — cache-refreshed parity emit. QBO emits chain_seq +1
      // here via a separate code path; Xero needs its own explicit emit so
      // the hash-chained lifecycle log records the tile hydration event too.
      await emitSyncLifecycleEvent({
        admin: supabaseAdmin,
        pilotSlotId,
        eventKind: "pilot.lifecycle.cache-refreshed",
        payload: {
          connection_id: decryptedConnection.id,
          tenant_id: tenantId,
          tenant_name: diagnostics.tenantName || tenantName || "",
          source_system: sourceSystem,
          sync_id: syncId,
          outcome: "succeeded",
          added_accounts: normalizedData.normalizedAccounts?.length || 0,
          added_bs_rows: normalizedData.normalizedBalanceSheet?.length || 0,
          added_pl_rows: normalizedData.normalizedIncomeStatement?.length || 0,
          added_tb_rows: normalizedData.normalizedTrialBalance?.length || 0,
          provenance: "live",
        },
      });
      console.info("[buildAndPersistLiveAccountingSync] lifecycle events emitted (sync-completed + cache-refreshed)", {
        connectionId: decryptedConnection.id,
        syncId,
        pilotSlotId,
      });
    } else {
      console.warn("[buildAndPersistLiveAccountingSync] lifecycle emit skipped: supabaseAdmin or userId missing", {
        hasAdmin: Boolean(supabaseAdmin),
        hasUserId: Boolean(userId),
      });
    }
  } catch (anchorErr) {
    console.error("[buildAndPersistLiveAccountingSync] lifecycle anchor/emit failed (non-blocking)", {
      connectionId: decryptedConnection.id,
      syncId,
      error: anchorErr instanceof Error ? anchorErr.message : String(anchorErr),
    });
  }

  return buildMetadataSyncRow({
    metadata: {
      ...(decryptedConnection.metadata_json || {}),
      active_normalized_sync_id: syncId,
      last_sync_id: syncId,
      latest_sync_by_source: {
        ...((decryptedConnection.metadata_json?.latest_sync_by_source as Record<string, unknown>) || {}),
        [sourceSystem]: {
          companyId: normalizedData.companyId || (decryptedConnection.metadata_json?.company_id ? String(decryptedConnection.metadata_json.company_id) : null),
          connectionId: decryptedConnection.id,
          sourceSystem,
          adapterName: mappingAdapter.adapterName,
          syncId,
          tenantId,
          tenantName,
          reportPeriod,
          normalizedPayload: {
            ...normalizedData,
            syncStatus: SYNC_STATUS.SUCCESS,
          },
          rawReportsPulled: normalizedData.rawReportsPulled,
          validationStatus: SYNC_STATUS.SUCCESS,
          preflight: { hydratedFromActiveContext: true },
          createdAt: normalizedData.lastSyncedAt,
        },
      },
    },
    sourceSystem,
    connection: decryptedConnection,
  });
}

export async function persistNormalizedAccountingSync({
  connection,
  userId,
  syncId,
  reportPeriod,
  normalizedData,
  diagnostics,
  sourceSystem,
  adapterName,
  tenantId,
  tenantName,
  preflight = null,
}: {
  connection: AccountingConnectionRecord;
  userId: string;
  syncId: string;
  reportPeriod: AccountingDateRange;
  normalizedData: Awaited<ReturnType<typeof buildReportDataContext>>["normalizedData"];
  diagnostics?: Record<string, unknown> | null;
  sourceSystem: AccountingProvider;
  adapterName: string;
  tenantId: string | null;
  tenantName: string;
  preflight?: unknown;
}) {
  const normalizedDataForStorage = {
    ...normalizedData,
    syncStatus: SYNC_STATUS.SUCCESS,
  };
  const companyId = await saveNormalizedSyncMetadata({
    connection,
    userId,
    syncId,
    reportPeriod,
    normalizedData,
    diagnostics,
    sourceSystem,
    adapterName,
    tenantId,
    tenantName,
    preflight,
    normalizedDataForStorage,
  });
  const syncInsertPayload = {
    id: syncId,
    company_id: uuidOrNull(companyId),
    connection_id: connection.id,
    source_system: sourceSystem,
    adapter_name: adapterName,
    tenant_id: tenantId,
    tenant_name: tenantName,
    report_period_start: reportPeriod.startDate,
    report_period_end: reportPeriod.endDate,
    normalized_payload: normalizedDataForStorage,
    raw_reports_pulled: normalizedData.rawReportsPulled,
    validation_status: SYNC_STATUS.SUCCESS,
    last_synced_at: normalizedData.lastSyncedAt,
  };
  console.info("ATTEMPTING SYNC SAVE", {
    targetTable: "accounting_syncs",
    payloadSummary: {
      syncId,
      companyId,
      connectionId: connection.id,
      sourceSystem,
      tenantId,
      tenantName,
      reportPeriod,
      syncStatus: SYNC_STATUS.SUCCESS,
      normalizedAccounts: normalizedData.normalizedAccounts?.length || 0,
      normalizedTrialBalance: normalizedData.normalizedTrialBalance?.length || 0,
      normalizedBalanceSheet: normalizedData.normalizedBalanceSheet?.length || 0,
      normalizedIncomeStatement: normalizedData.normalizedIncomeStatement?.length || 0,
    },
  });
  console.info("SYNC WRITE:", {
    syncId,
    companyId,
    connectionId: connection.id,
    sourceSystem,
    syncStatus: SYNC_STATUS.SUCCESS,
  });
  const { error: syncInsertError } = await requireSupabase()
    .from("accounting_syncs")
    .insert(syncInsertPayload);
  if (syncInsertError) {
    if (isMissingAccountingSyncsTableError(syncInsertError)) {
      console.warn("SYNC READBACK:", {
        syncId,
        syncStatus: SYNC_STATUS.SUCCESS,
        companyId,
        connectionId: connection.id,
        tenantId,
        storage: "accounting_connections.metadata_json.latest_sync_by_source",
        fallbackReason: syncInsertError.message,
      });
      return {
        syncId,
        syncStatus: SYNC_STATUS.SUCCESS,
        companyId,
        connectionId: connection.id,
        tenantId: String(tenantId || ""),
      };
    }
    const error = new Error(`Accounting sync persistence failed: ${syncInsertError.message}`);
    (error as Error & { status?: number }).status = 500;
    throw error;
  }
  const { data: syncReadback, error: syncReadbackError } = await requireSupabase()
    .from("accounting_syncs")
    .select("id, company_id, connection_id, source_system, tenant_id, validation_status, last_synced_at, created_at")
    .eq("id", syncId)
    .limit(1)
    .maybeSingle();
  if (syncReadbackError || !syncReadback) {
    const error = new Error(`Accounting sync readback failed: ${syncReadbackError?.message || "record was not found after insert"}`);
    (error as Error & { status?: number }).status = 500;
    throw error;
  }
  console.info("SYNC READBACK:", {
    syncId: syncReadback.id,
    syncStatus: syncReadback.validation_status,
    companyId: syncReadback.company_id,
    connectionId: syncReadback.connection_id,
    tenantId: syncReadback.tenant_id,
  });
  return {
    syncId: String(syncReadback.id),
    syncStatus: String(syncReadback.validation_status),
    companyId: String(syncReadback.company_id || companyId || ""),
    connectionId: String(syncReadback.connection_id || connection.id),
    tenantId: String(syncReadback.tenant_id || tenantId || ""),
  };
}

async function createPreflightWarningSupportTickets({
  companyId,
  connectionId,
  sourceSystem,
  syncId,
  reportPeriod,
  tenantName,
  warnings,
}: {
  companyId: string | null;
  connectionId: string;
  sourceSystem: string;
  syncId: string;
  reportPeriod: AccountingDateRange;
  tenantName: string;
  warnings: PreflightIssue[];
}) {
  if (!warnings.length) return;
  await Promise.all(warnings.map(async (issue) => {
    const { error } = await requireSupabase()
      .from("support_tickets")
      .insert({
        user_id: null,
        user_email: "",
        company_id: uuidOrNull(companyId),
        company_name: tenantName || "",
        category: "Report Generation",
        ticket_type: "Support Issue",
        priority: "Normal",
        status: "Open",
        subject: `Report validation warning: ${issue.code}`,
        description: [
          issue.message,
          "",
          `companyId: ${companyId || "missing"}`,
          `connectionId: ${connectionId}`,
          `sourceSystem: ${sourceSystem}`,
          `syncId: ${syncId}`,
          `reportPeriod: ${reportPeriod.startDate} to ${reportPeriod.endDate}`,
          `warningCode: ${issue.code}`,
          `affectedSchedule: ${issue.affected || "Not specified"}`,
          `actualCounts: ${issue.actual ?? "Not specified"}`,
          `recommendedFix: ${issue.recommendedFix || "Review connector mapping and source report availability."}`,
        ].join("\n"),
        attachment_metadata: {
          companyId,
          connectionId,
          sourceSystem,
          syncId,
          reportPeriod,
          warningCode: issue.code,
          warningMessage: issue.message,
          affectedSchedule: issue.affected || null,
          actualCounts: issue.actual ?? null,
          expected: issue.expected ?? null,
          variance: issue.variance ?? null,
          recommendedFix: issue.recommendedFix || null,
        },
        ai_support_context: {
          source: "report_preflight_validation",
          warning: issue,
        },
      });
    if (error && error.code !== "42P01") {
      console.warn("[report-preflight/support-ticket] failed", {
        code: issue.code,
        message: error.message,
      });
    }
  }));
}

export function listAccountingProviders() {
  return getEnabledProviders();
}

export async function startConnection(providerKey: AccountingProvider, user: { id: string }, returnTo = "") {
  const provider = getAccountingProvider(providerKey);
  const state = crypto.randomUUID();
  const url = await provider.getAuthorizationUrl({ state, userId: user.id, returnTo });
  return { url, state, provider: provider.provider };
}

/**
 * Persist OAuth cookies onto a specific outgoing response.
 *
 * IMPORTANT: In App Router Route Handlers, cookies set via `next/headers` do NOT
 * propagate onto a freshly-constructed NextResponse that the handler returns.
 * Attach cookies to the exact response object that will be returned.
 */
export function saveOAuthCookiesOnResponse(
  response: NextResponseType,
  { state, token, returnTo }: { state: string; token: string; returnTo?: string },
): void {
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  };
  response.cookies.set(STATE_COOKIE, state, options);
  response.cookies.set(TOKEN_COOKIE, token, options);
  if (returnTo) response.cookies.set(RETURN_COOKIE, returnTo, options);
}

export function clearOAuthCookiesOnResponse(response: NextResponseType): void {
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(TOKEN_COOKIE);
  response.cookies.delete(RETURN_COOKIE);
}

/**
 * Read OAuth cookies from an incoming request.
 * Uses request.cookies (always populated in Route Handlers) rather than
 * `next/headers` cookies().
 */
export function readOAuthCookiesFromRequest(request: NextRequest): {
  state: string;
  token: string;
  returnTo: string;
} {
  return {
    state: request.cookies.get(STATE_COOKIE)?.value || "",
    token: request.cookies.get(TOKEN_COOKIE)?.value || "",
    returnTo: request.cookies.get(RETURN_COOKIE)?.value || "",
  };
}

export async function handleCallback(
  providerKey: AccountingProvider,
  request: NextRequest,
) {
  const requestUrl = new URL(request.url);
  const supabase = requireSupabase();
  const provider = getAccountingProvider(providerKey);
  const code = requestUrl.searchParams.get("code") || "";
  const state = requestUrl.searchParams.get("state") || "";
  const tenantOrRealmId = requestUrl.searchParams.get("realmId") || requestUrl.searchParams.get("tenant") || "";
  const oauth = readOAuthCookiesFromRequest(request);

  if (!code || !state || state !== oauth.state || !oauth.token) {
    throw new Error("Missing or invalid accounting OAuth state");
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(oauth.token);
  if (authError || !authData?.user?.id) throw new Error("Invalid or expired Supabase token in accounting OAuth cookie");

  if (provider.provider === "xero") console.log("XERO CALLBACK HIT");
  const token = await provider.exchangeCodeForTokens({ code, state, tenantOrRealmId });
  if (provider.provider === "xero") console.log("TOKEN EXCHANGE SUCCESS");
  const tokenPayload = token as Record<string, unknown>;
  let xeroEntities: Array<{ externalId: string; canonicalId: string; name: string; tenantOrRealmId?: string }> = [];
  if (provider.provider === "xero") {
    xeroEntities = await provider.getEntities({
      connection: {
        id: `oauth:${authData.user.id}`,
        user_id: authData.user.id,
        provider: "xero",
        provider_family: "xero",
        provider_product: "xero_accounting",
        external_entity_id: null,
        external_entity_name: null,
        access_token: typeof tokenPayload.access_token === "string" ? tokenPayload.access_token : null,
        refresh_token: typeof tokenPayload.refresh_token === "string" ? tokenPayload.refresh_token : null,
        token_expires_at: null,
        tenant_or_realm_id: null,
        scopes: String(tokenPayload.scope || "").split(" ").filter(Boolean),
        status: "needs_entity_selection",
        metadata_json: {},
      },
    });
    console.log("CONNECTIONS API SUCCESS");
  }
  const selectedXeroEntity = provider.provider === "xero" && xeroEntities.length === 1 ? xeroEntities[0] : null;
  const selectedTenantId = selectedXeroEntity?.tenantOrRealmId || selectedXeroEntity?.externalId || tenantOrRealmId || "";
  const selectedTenantName = selectedXeroEntity?.name || "";
  if (provider.provider === "xero") {
    console.log("TENANT ID", selectedTenantId || null);
    console.log("TENANT NAME", selectedTenantName || null);
  }
  const externalEntityId = selectedTenantId ? `${provider.provider === "quickbooks" ? "qbo" : provider.provider}:${selectedTenantId}` : null;
  const status = provider.getCapabilities().requires_entity_selection && !selectedTenantId ? "needs_entity_selection" : "connected";
  const connectedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("accounting_connections")
    .insert({
      user_id: authData.user.id,
      provider: provider.provider,
      provider_family: provider.providerFamily,
      provider_product: provider.providerProduct,
      external_entity_id: externalEntityId,
      external_entity_name: selectedTenantName || null,
      access_token: secureTokenForStorage(provider.provider, tokenPayload.access_token),
      refresh_token: secureTokenForStorage(provider.provider, tokenPayload.refresh_token),
      token_expires_at: getTokenExpiry(tokenPayload),
      tenant_or_realm_id: selectedTenantId || null,
      scopes: String(tokenPayload.scope || "").split(" ").filter(Boolean),
      status,
      metadata_json: {
        token_type: tokenPayload.token_type || null,
        source_system: provider.provider,
        active_provider: provider.provider,
        // Phase W1c.4c.2 — never poison metadata with user_id. company_id is resolved
        // at first sync via resolveOrCreateCompanyForProvider using tenant_id.
        company_id: null,
        tenant_id: selectedTenantId || null,
        tenant_name: selectedTenantName || null,
        available_organizations: xeroEntities.map((entity) => ({
          tenant_id: entity.externalId,
          tenant_name: entity.name,
        })),
        connected_at: connectedAt,
        last_synced_at: connectedAt,
        tokens_encrypted: provider.provider === "xero",
      },
    })
    .select("id")
    .limit(1);
  if (error) throw error;
  if (provider.provider === "xero") console.log("CONNECTION SAVED SUCCESSFULLY", { connectionId: data?.[0]?.id });

  // Cookie clear is done by the Route Handler on the returned redirect response
  // via clearOAuthCookiesOnResponse — not via next/headers.
  return { connectionId: data?.[0]?.id, returnTo: oauth.returnTo || "/dashboard" };
}

export async function getConnectionForUser(connectionId: string, userId: string): Promise<AccountingConnectionRecord> {
  const { data, error } = await requireSupabase()
    .from("accounting_connections")
    .select("*")
    .eq("id", connectionId)
    .eq("user_id", userId)
    .limit(1);
  if (error) throw error;
  if (!data?.[0]) throw new Error("Accounting connection not found");
  return await ensureFreshTokens(data[0] as AccountingConnectionRecord);
}

export async function listEntities(connectionId: string, userId: string) {
  const connection = await getConnectionForUser(connectionId, userId);
  return getAccountingProvider(connection.provider).getEntities({ connection });
}

export async function selectEntity(connectionId: string, userId: string, entityId: string) {
  const supabase = requireSupabase();
  const connection = await getConnectionForUser(connectionId, userId);
  const provider = getAccountingProvider(connection.provider);
  const entity = await provider.selectEntity({ connection, entityId });
  const selectedAt = new Date().toISOString();
  const { supabaseAdmin } = await import("../../supabase");
  const { resolveCompanyIdForUser } = await import("./resolve-company-id");
  const resolvedCompanyId = supabaseAdmin
    ? await resolveCompanyIdForUser(supabaseAdmin, userId)
    : (connection.metadata_json?.company_id && connection.metadata_json.company_id !== userId
        ? String(connection.metadata_json.company_id)
        : null);
  if (!resolvedCompanyId) {
    console.warn("[selectEntity] company_id resolution failed — storing null (never user_id)", {
      connectionId,
      userId,
    });
  }
  const { error } = await supabase
    .from("accounting_connections")
    .update({
      external_entity_id: entity.canonicalId,
      external_entity_name: entity.name,
      tenant_or_realm_id: entity.tenantOrRealmId || entity.externalId,
      status: "connected",
      metadata_json: {
        ...(connection.metadata_json || {}),
        source_system: connection.provider,
        active_provider: connection.provider,
        company_id: resolvedCompanyId,
        tenant_id: entity.tenantOrRealmId || entity.externalId,
        tenant_name: entity.name,
        selected_at: selectedAt,
        last_synced_at: selectedAt,
      },
      updated_at: selectedAt,
    })
    .eq("id", connectionId)
    .eq("user_id", userId);
  if (error) throw error;
  return entity;
}

export async function getLatestNormalizedAccountingData({
  companyId,
  connectionId,
  sourceSystem,
  reportPeriod,
}: {
  companyId?: string | null;
  connectionId?: string | null;
  sourceSystem: string;
  reportPeriod?: Partial<AccountingDateRange> | null;
}) {
  if (!sourceSystem) throw new Error("sourceSystem is required.");
  const supabase = requireSupabase();
  let query = supabase
    .from("accounting_syncs")
    .select("id, company_id, connection_id, source_system, adapter_name, tenant_id, tenant_name, report_period_start, report_period_end, normalized_payload, validation_status, created_at")
    .eq("source_system", sourceSystem)
    .in("validation_status", LEGACY_SUCCESS_SYNC_STATUSES)
    .order("created_at", { ascending: false });
  if (connectionId) query = query.eq("connection_id", connectionId);
  const normalizedCompanyId = uuidOrNull(companyId || null);
  if (normalizedCompanyId) query = query.eq("company_id", normalizedCompanyId);
  if (reportPeriod?.startDate) query = query.eq("report_period_start", reportPeriod.startDate);
  if (reportPeriod?.endDate) query = query.eq("report_period_end", reportPeriod.endDate);

  const { data, error } = await query.limit(1);
  if (error) throw error;
  const row = await promoteSuccessfulSyncStatus(data?.[0]);
  if (!row?.normalized_payload) return null;

  const resolvedConnectionId = String(row.connection_id || connectionId || "");
  const normalizedData = row.normalized_payload as unknown as Awaited<ReturnType<typeof buildReportDataContext>>["normalizedData"];
  const diagnostics = {
    sourceSystem: normalizedData.sourceSystem,
    tenantName: String(row.tenant_name || normalizedData.tenantName || ""),
    accountsCount: normalizedData.normalizedAccounts?.length || 0,
    trialBalanceCount: normalizedData.normalizedTrialBalance?.length || 0,
    balanceSheetCount: normalizedData.normalizedBalanceSheet?.length || 0,
    incomeStatementCount: normalizedData.normalizedIncomeStatement?.length || 0,
  };
  const reportDataContext = buildReportDataContext({
    companyId: normalizedData.companyId,
    connectionId: resolvedConnectionId,
    sourceSystem: normalizedData.sourceSystem,
    adapterName: normalizedData.adapterName,
    tenantId: String(row.tenant_id || normalizedData.tenantId || ""),
    tenantName: diagnostics.tenantName,
    reportPeriod: {
      startDate: String(row.report_period_start || normalizedData.reportPeriod?.startDate || ""),
      endDate: String(row.report_period_end || normalizedData.reportPeriod?.endDate || ""),
    },
    normalizedData,
    syncId: String(row.id),
    diagnostics,
  });
  console.info("Latest Successful Sync:", {
    syncId: row.id,
    counts: normalizedCounts(normalizedData),
  });
  return {
    syncId: row.id,
    companyId: row.company_id,
    connectionId: resolvedConnectionId,
    sourceSystem: row.source_system,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    reportPeriod: reportDataContext.reportPeriod,
    normalizedData,
    reportDataContext,
    validationStatus: row.validation_status,
    lastSyncedAt: row.created_at,
    diagnostics,
  };
}

export async function getActiveAccountingContext({
  companyId,
  connectionId,
  sourceSystem,
  userId,
  forceRefresh = false,
}: {
  companyId?: string | null;
  connectionId?: string | null;
  sourceSystem?: string | null;
  userId: string;
  forceRefresh?: boolean;
}) {
  const supabase = requireSupabase();
  let connectionQuery = supabase
    .from("accounting_connections")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (connectionId) connectionQuery = connectionQuery.eq("id", connectionId);
  if (sourceSystem) connectionQuery = connectionQuery.eq("provider", sourceSystem);
  const { data: connections, error: connectionError } = await connectionQuery.limit(1);
  if (connectionError) throw connectionError;
  let connection = connections?.[0] as AccountingConnectionRecord | undefined;
  if (!connection && connectionId && sourceSystem) {
    const { data: fallbackConnections, error: fallbackConnectionError } = await supabase
      .from("accounting_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", sourceSystem)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (fallbackConnectionError) throw fallbackConnectionError;
    connection = fallbackConnections?.[0] as AccountingConnectionRecord | undefined;
  }
  if (!connection) return null;

  const metadata = connection.metadata_json || {};
  const resolvedSourceSystem = sourceSystem || connection.provider;
  const metaCompanyId =
    typeof metadata.company_id === "string" && metadata.company_id !== connection.user_id
      ? metadata.company_id
      : null;
  const resolvedCompanyId = companyId || metaCompanyId || null;
  if (!resolvedCompanyId) {
    console.warn("[getLatestNormalizedAccountingData] company_id unresolved — not falling back to user_id", {
      connectionId: connection.id,
      userId: connection.user_id,
      sourceSystem: resolvedSourceSystem,
    });
  }
  const resolvedTenantId = String(connection.tenant_or_realm_id || metadata.tenant_id || connection.external_entity_id || "");
  const resolvedTenantName = String(connection.external_entity_name || metadata.tenant_name || metadata.company_name || "");
  const activeSyncId = String(metadata.active_normalized_sync_id || metadata.last_sync_id || "");
  const metadataSyncRow = buildMetadataSyncRow({ metadata, sourceSystem: resolvedSourceSystem, connection });
  const { data: latestAnyRows, error: latestAnyError } = await supabase
    .from("accounting_syncs")
    .select("id, company_id, connection_id, source_system, tenant_id, validation_status, normalized_payload, created_at")
    .eq("connection_id", connection.id)
    .eq("source_system", resolvedSourceSystem)
    .order("created_at", { ascending: false })
    .limit(1);
  if (latestAnyError && !isMissingAccountingSyncsTableError(latestAnyError)) throw latestAnyError;
  const latestAnyRow = latestAnyError ? metadataSyncRow : await promoteSuccessfulSyncStatus(latestAnyRows?.[0]);

  let syncQuery = supabase
    .from("accounting_syncs")
    .select("id, company_id, connection_id, source_system, adapter_name, tenant_id, tenant_name, report_period_start, report_period_end, normalized_payload, validation_status, created_at")
    .eq("connection_id", connection.id)
    .eq("source_system", resolvedSourceSystem)
    .eq("validation_status", SYNC_STATUS.SUCCESS)
    .order("created_at", { ascending: false });
  if (activeSyncId) syncQuery = syncQuery.eq("id", activeSyncId);
  const { data: activeRows, error: activeError } = await syncQuery.limit(1);
  if (activeError && !isMissingAccountingSyncsTableError(activeError)) throw activeError;
  let row = activeError ? metadataSyncRow : await promoteSuccessfulSyncStatus(activeRows?.[0]);
  if (!row && activeSyncId) {
    const { data: latestRows, error: latestError } = await supabase
      .from("accounting_syncs")
      .select("id, company_id, connection_id, source_system, adapter_name, tenant_id, tenant_name, report_period_start, report_period_end, normalized_payload, validation_status, created_at")
      .eq("connection_id", connection.id)
      .eq("source_system", resolvedSourceSystem)
      .eq("validation_status", SYNC_STATUS.SUCCESS)
      .order("created_at", { ascending: false })
      .limit(1);
    if (latestError && !isMissingAccountingSyncsTableError(latestError)) throw latestError;
    row = latestError ? metadataSyncRow : await promoteSuccessfulSyncStatus(latestRows?.[0]);
  }
  if (!row && metadataSyncRow) row = metadataSyncRow;
  if ((forceRefresh && resolvedSourceSystem === "xero") || (!row && ["quickbooks", "xero"].includes(resolvedSourceSystem))) {
    console.info("Hydrated Context: no persisted sync found; attempting live accounting sync fallback", {
      connectionId: connection.id,
      tenantId: resolvedTenantId || null,
      sourceSystem: resolvedSourceSystem,
      forceRefresh,
    });
    try {
      row = await buildAndPersistLiveAccountingSync({
        connection,
        userId,
        sourceSystem: resolvedSourceSystem,
      });
    } catch (error) {
      if (metadataSyncRow && resolvedSourceSystem === "quickbooks" && /429|rate limit|too many requests/i.test(String((error as Error)?.message || ""))) {
        console.warn("Hydrated Context: QuickBooks live sync rate-limited; using metadata sync fallback", {
          connectionId: connection.id,
          sourceSystem: resolvedSourceSystem,
        });
        row = metadataSyncRow;
      } else {
        throw error;
      }
    }
  }

  const normalizedData = row?.normalized_payload as Awaited<ReturnType<typeof buildReportDataContext>>["normalizedData"] | undefined;
  const context = {
    companyId: String(row?.company_id || normalizedData?.companyId || resolvedCompanyId || ""),
    connectionId: String(row?.connection_id || connection.id),
    sourceSystem: String(row?.source_system || resolvedSourceSystem),
    tenantId: String(row?.tenant_id || normalizedData?.tenantId || resolvedTenantId || ""),
    tenantName: String(row?.tenant_name || normalizedData?.tenantName || resolvedTenantName || ""),
    latestSuccessfulSyncId: String(row?.id || ""),
    latestSyncId: String(latestAnyRow?.id || row?.id || ""),
    latestSyncStatus: String(latestAnyRow?.validation_status || row?.validation_status || ""),
    packageGeneratorExpectedStatus: SYNC_STATUS.SUCCESS,
    packageGeneratorFoundStatus: String(row?.validation_status || latestAnyRow?.validation_status || ""),
    persistedSyncRecord: {
      syncId: String((row || latestAnyRow)?.id || ""),
      syncStatus: String((row || latestAnyRow)?.validation_status || ""),
      companyId: String((row || latestAnyRow)?.company_id || normalizedData?.companyId || resolvedCompanyId || ""),
      connectionId: String((row || latestAnyRow)?.connection_id || connection.id),
      tenantId: String((row || latestAnyRow)?.tenant_id || resolvedTenantId || ""),
    },
  };
  const reportPeriod = {
    startDate: String(row?.report_period_start || normalizedData?.reportPeriod?.startDate || ""),
    endDate: String(row?.report_period_end || normalizedData?.reportPeriod?.endDate || ""),
  };
  const diagnostics = normalizedData
    ? {
        sourceSystem: normalizedData.sourceSystem,
        tenantName: context.tenantName,
        accountsCount: normalizedData.normalizedAccounts?.length || 0,
        trialBalanceCount: normalizedData.normalizedTrialBalance?.length || 0,
        balanceSheetCount: normalizedData.normalizedBalanceSheet?.length || 0,
        incomeStatementCount: normalizedData.normalizedIncomeStatement?.length || 0,
      }
    : null;
  const reportDataContext = normalizedData
    ? buildReportDataContext({
        companyId: context.companyId,
        connectionId: context.connectionId,
        sourceSystem: normalizedData.sourceSystem,
        adapterName: normalizedData.adapterName,
        tenantId: context.tenantId,
        tenantName: context.tenantName,
        reportPeriod,
        normalizedData,
        syncId: context.latestSuccessfulSyncId,
        diagnostics: diagnostics || undefined,
      })
    : null;
  console.info("Hydrated Context:", {
    companyId: context.companyId || null,
    connectionId: context.connectionId || null,
    tenantId: context.tenantId || null,
    syncId: context.latestSuccessfulSyncId || null,
    latestSyncStatus: context.latestSyncStatus || null,
  });
  return {
    ...context,
    reportPeriod,
    normalizedData: normalizedData || null,
    reportDataContext,
    validationStatus: row?.validation_status || null,
    lastSyncedAt: row?.created_at || String(metadata.last_synced_at || connection.updated_at || ""),
    diagnostics,
  };
}

export async function fetchCanonicalReports({
  connectionId,
  userId,
  dateRange,
  sourceSystem,
}: {
  connectionId: string;
  userId: string;
  dateRange: AccountingDateRange;
  sourceSystem: string;
}) {
  // Phase DASH_1B.2 — failure-path emitter context (Option B + Option 2).
  let anchorCtx: { userId: string; connectionId: string; syncId: string | null } = {
    userId,
    connectionId,
    syncId: null,
  };
  let selectedSourceSystem = sourceSystem === "dynamics" ? "dynamics365" : sourceSystem;

  try {
    if (!sourceSystem) throw new Error("sourceSystem is required when fetching canonical reports.");
    selectedSourceSystem = sourceSystem === "dynamics" ? "dynamics365" : sourceSystem;
    const connection = await getConnectionForUser(connectionId, userId);
    if (selectedSourceSystem !== connection.provider) {
      throw new Error(`Provider mismatch: active ${sourceSystem} but normalized data is ${connection.provider}`);
    }
    const provider = getAccountingProvider(connection.provider);
    const mappingAdapter = getAccountingProviderMappingAdapter(selectedSourceSystem);
    const syncId = crypto.randomUUID();
    anchorCtx.syncId = syncId;
    const tenantId = connection.tenant_or_realm_id || connection.external_entity_id || null;
    const tenantName = connection.external_entity_name || String(connection.metadata_json?.tenant_name || connection.metadata_json?.company_name || "");
    const rawReports = await mappingAdapter.fetchRawReports(connection, dateRange);
    const rawBundleDiagnostics = ((rawReports.bundle.sourceMetadata.raw as Record<string, unknown> | undefined)?.diagnostics as Record<string, unknown> | undefined) || {};
    const normalizedData = await mappingAdapter.normalize(rawReports, {
      connection,
      reportPeriod: dateRange,
      syncId,
      tenantId,
      tenantName,
    }).catch((error) => {
      (error as Error & { diagnostics?: Record<string, unknown> }).diagnostics = {
        sourceSystem: connection.provider,
        tenantName,
        ...rawBundleDiagnostics,
      };
      throw error;
    });
    console.info("NORMALIZATION COMPLETE", {
      companyId: normalizedData.companyId || (connection.metadata_json?.company_id ? String(connection.metadata_json.company_id) : null),
      connectionId,
      tenantId,
      tenantName,
      sourceSystem: normalizedData.sourceSystem,
      reportPeriod: dateRange,
    });
    mappingAdapter.validate(normalizedData);
    if (normalizedData.sourceSystem !== selectedSourceSystem) throw new Error("Provider adapter mismatch");
    if (normalizedData.adapterName !== mappingAdapter.adapterName) throw new Error("Mapping adapter mismatch");
    assertProviderMatchesSelectedProvider(selectedSourceSystem, normalizedData);
    assertReadyForSourceAgnosticOutputs(normalizedData);
    const diagnostics = buildSyncDiagnostics(connection, normalizedData, rawBundleDiagnostics);
    const message = isEmptyXeroFinancialActivityMessage(normalizedData) ? "Connected to Xero. No financial activity found." : undefined;
    const reportDataContext = buildReportDataContext({
      companyId: normalizedData.companyId,
      connectionId,
      sourceSystem: connection.provider,
      adapterName: mappingAdapter.adapterName,
      tenantId,
      tenantName: diagnostics.tenantName,
      reportPeriod: dateRange,
      normalizedData,
      syncId,
      diagnostics,
    });
    const preflight = validateReportPreflight(reportDataContext, {
      requiresLiveData: true,
      providerConfirmedNoActivity: Boolean(message),
    });
    console.info("Active Report Context:", {
      sourceSystem: connection.provider,
      connectionId,
      syncId,
      reportPeriod: dateRange,
      normalizedAccounts: normalizedData.normalizedAccounts?.length || 0,
      normalizedTrialBalance: normalizedData.normalizedTrialBalance?.length || 0,
      normalizedBalanceSheet: normalizedData.normalizedBalanceSheet?.length || 0,
      normalizedIncomeStatement: normalizedData.normalizedIncomeStatement?.length || 0,
    });
    await persistNormalizedAccountingSync({
      connection,
      userId,
      syncId,
      reportPeriod: dateRange,
      normalizedData,
      diagnostics,
      sourceSystem: connection.provider,
      adapterName: mappingAdapter.adapterName,
      tenantId,
      tenantName: diagnostics.tenantName,
      preflight,
    });
    console.info("Saved Sync:", {
      companyId: normalizedData.companyId || null,
      connectionId,
      tenantId: connection.tenant_or_realm_id || connection.external_entity_id || null,
      syncId,
    });

    if (preflight.passed && preflight.warnings.length) {
      await createPreflightWarningSupportTickets({
        companyId: normalizedData.companyId,
        connectionId,
        sourceSystem: connection.provider,
        syncId,
        reportPeriod: dateRange,
        tenantName: diagnostics.tenantName,
        warnings: preflight.warnings,
      });
    }
    if (!preflight.passed) {
      const error = new Error("We could not generate this report because the accounting data failed validation. Please review the issues below and sync again.");
      (error as Error & { preflight?: typeof preflight; status?: number }).preflight = preflight;
      (error as Error & { preflight?: typeof preflight; status?: number }).status = 422;
      (error as Error & { diagnostics?: typeof diagnostics }).diagnostics = diagnostics;
      throw error;
    }

    // Phase DASH_1B.2 — anchor bootstrap + lifecycle event (success path).
    // Emits only after preflight passes so a 422 validation failure does not
    // also write accounting-sync-completed (failure path handles that).
    // Never blocks the sync return; every failure here is best-effort logged.
    try {
      const { ensureLifecycleAnchor } = await import("../../lifecycle/ensure-anchor");
      const { emitSyncLifecycleEvent } = await import("../../lifecycle/emit-sync-event");
      const { supabaseAdmin } = await import("../../supabase");
      if (supabaseAdmin && userId) {
        const { pilotSlotId } = await ensureLifecycleAnchor({
          admin: supabaseAdmin,
          userId,
          sourceSystemCompanyName: diagnostics.tenantName || tenantName || "Unnamed Company",
        });
        await emitSyncLifecycleEvent({
          admin: supabaseAdmin,
          pilotSlotId,
          eventKind: "pilot.lifecycle.accounting-sync-completed",
          payload: {
            connection_id: connectionId,
            tenant_id: tenantId,
            tenant_name: diagnostics.tenantName || tenantName || "",
            sync_id: syncId,
            source_system: connection.provider,
            outcome: "succeeded",
            records_synced:
              (normalizedData.normalizedTrialBalance?.length || 0) +
              (normalizedData.normalizedBalanceSheet?.length || 0) +
              (normalizedData.normalizedIncomeStatement?.length || 0),
            provenance: "live",
          },
        });
      }
    } catch (anchorErr) {
      console.error("[fetchCanonicalReports] lifecycle anchor/emit failed (non-blocking)", {
        connectionId,
        syncId,
        error: anchorErr instanceof Error ? anchorErr.message : String(anchorErr),
      });
    }

    return {
      ok: true,
      provider: connection.provider,
      connectionId,
      bundle: rawReports.bundle,
      normalizedData,
      reportDataContext,
      preflight,
      syncId,
      diagnostics,
      message,
      missingReports: rawReports.bundle.missingReports,
      warnings: [...(provider.getCapabilities().fallback_notes || []), ...normalizedData.validation.warnings],
    };
  } catch (fatalErr) {
    // Phase DASH_1B.2 — emit failure event, non-blocking.
    try {
      const { ensureLifecycleAnchor } = await import("../../lifecycle/ensure-anchor");
      const { emitSyncLifecycleEvent } = await import("../../lifecycle/emit-sync-event");
      const { supabaseAdmin } = await import("../../supabase");
      if (supabaseAdmin && anchorCtx.userId) {
        // Best-effort: only if we already know the company name from a prior connection.
        // If ensureLifecycleAnchor fails on first-ever connect (before connection lookup succeeded),
        // we just log and skip — we cannot invent a company name.
        const { data: conn } = await supabaseAdmin
          .from("accounting_connections")
          .select("external_entity_name")
          .eq("id", anchorCtx.connectionId)
          .maybeSingle();
        const companyName = conn?.external_entity_name || "";
        if (companyName) {
          const { pilotSlotId } = await ensureLifecycleAnchor({
            admin: supabaseAdmin,
            userId: anchorCtx.userId,
            sourceSystemCompanyName: companyName,
          });
          await emitSyncLifecycleEvent({
            admin: supabaseAdmin,
            pilotSlotId,
            eventKind: "pilot.lifecycle.accounting-sync-failed",
            payload: {
              connection_id: anchorCtx.connectionId,
              tenant_id: null,
              tenant_name: companyName,
              sync_id: anchorCtx.syncId || "unknown",
              source_system: selectedSourceSystem,
              outcome: "failed",
              error_code: (fatalErr as { code?: string })?.code || "UNKNOWN",
              error_message: fatalErr instanceof Error ? fatalErr.message.slice(0, 500) : String(fatalErr).slice(0, 500),
              provenance: "live",
            },
          });
        }
      }
    } catch (emitErr) {
      console.error("[fetchCanonicalReports] failure-event emission itself failed (swallowed)", {
        error: emitErr instanceof Error ? emitErr.message : String(emitErr),
      });
    }
    throw fatalErr;
  }
}

export async function disconnectConnection(connectionId: string, userId: string) {
  const supabase = requireSupabase();
  const connection = await getConnectionForUser(connectionId, userId);
  await getAccountingProvider(connection.provider).disconnect({ connection });
  const { error } = await supabase
    .from("accounting_connections")
    .update({ status: "disconnected", updated_at: new Date().toISOString() })
    .eq("id", connectionId)
    .eq("user_id", userId);
  if (error) throw error;

  // DASH_1B.3 — tamper-evident lifecycle event so disconnect is memory-covered.
  // Mirrors the emit block in buildAndPersistLiveAccountingSync (adapted to
  // ensureLifecycleAnchor / emitSyncLifecycleEvent signatures).
  try {
    const { ensureLifecycleAnchor } = await import("../../lifecycle/ensure-anchor");
    const { emitSyncLifecycleEvent } = await import("../../lifecycle/emit-sync-event");
    const { supabaseAdmin } = await import("../../supabase");
    const companyName =
      connection.external_entity_name ||
      (typeof connection.metadata_json?.tenant_name === "string"
        ? connection.metadata_json.tenant_name
        : null) ||
      (typeof connection.metadata_json?.company_name === "string"
        ? connection.metadata_json.company_name
        : null) ||
      "Unnamed Company";
    if (supabaseAdmin) {
      const { pilotSlotId } = await ensureLifecycleAnchor({
        admin: supabaseAdmin,
        userId,
        sourceSystemCompanyName: companyName,
      });
      await emitSyncLifecycleEvent({
        admin: supabaseAdmin,
        pilotSlotId,
        eventKind: "pilot.lifecycle.accounting-connection-disconnected",
        payload: {
          connection_id: connectionId,
          source_system: connection.provider,
          tenant_id:
            connection.tenant_or_realm_id ||
            (typeof connection.metadata_json?.tenant_id === "string" ? connection.metadata_json.tenant_id : null),
          tenant_name: companyName,
          outcome: "succeeded",
          provenance: "live",
          triggered_by: "user-initiated",
        },
      });
      console.info("[disconnectConnection] lifecycle event emitted", {
        pilotSlotId,
        connectionId,
        provider: connection.provider,
      });
    } else {
      console.warn("[disconnectConnection] lifecycle emit skipped: supabaseAdmin missing", {
        connectionId,
        userId,
      });
    }
  } catch (emitError) {
    console.error("[disconnectConnection] lifecycle emit failed (non-blocking)", {
      message: emitError instanceof Error ? emitError.message : String(emitError),
      connectionId,
      userId,
    });
  }

  return { ok: true };
}
