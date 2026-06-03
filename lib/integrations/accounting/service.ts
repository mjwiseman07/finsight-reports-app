import crypto from "crypto";
import { cookies } from "next/headers";
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

function uuidOrNull(value: string | null) {
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
  const companyId = normalizedData.companyId || String(connection.metadata_json?.company_id || connection.user_id || "");
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
    company_id: entry.companyId || metadata.company_id || connection.user_id || "",
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
  const decryptedConnection = decryptConnectionTokens(connection);
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
    companyId: normalizedData.companyId || String(decryptedConnection.metadata_json?.company_id || decryptedConnection.user_id || ""),
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
  return buildMetadataSyncRow({
    metadata: {
      ...(decryptedConnection.metadata_json || {}),
      active_normalized_sync_id: syncId,
      last_sync_id: syncId,
      latest_sync_by_source: {
        ...((decryptedConnection.metadata_json?.latest_sync_by_source as Record<string, unknown>) || {}),
        [sourceSystem]: {
          companyId: normalizedData.companyId || String(decryptedConnection.metadata_json?.company_id || decryptedConnection.user_id || ""),
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

export async function saveOAuthCookies({
  state,
  token,
  returnTo,
}: {
  state: string;
  token: string;
  returnTo?: string;
}) {
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  };
  cookieStore.set(STATE_COOKIE, state, options);
  cookieStore.set(TOKEN_COOKIE, token, options);
  if (returnTo) cookieStore.set(RETURN_COOKIE, returnTo, options);
}

export async function clearOAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(TOKEN_COOKIE);
  cookieStore.delete(RETURN_COOKIE);
}

export async function readOAuthCookies() {
  const cookieStore = await cookies();
  return {
    state: cookieStore.get(STATE_COOKIE)?.value || "",
    token: cookieStore.get(TOKEN_COOKIE)?.value || "",
    returnTo: cookieStore.get(RETURN_COOKIE)?.value || "",
  };
}

export async function handleCallback(providerKey: AccountingProvider, requestUrl: URL) {
  const supabase = requireSupabase();
  const provider = getAccountingProvider(providerKey);
  const code = requestUrl.searchParams.get("code") || "";
  const state = requestUrl.searchParams.get("state") || "";
  const tenantOrRealmId = requestUrl.searchParams.get("realmId") || requestUrl.searchParams.get("tenant") || "";
  const oauth = await readOAuthCookies();

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
        company_id: authData.user.id,
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

  await clearOAuthCookies();
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
  return decryptConnectionTokens(data[0] as AccountingConnectionRecord);
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
        company_id: connection.user_id,
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
  const resolvedCompanyId = String(companyId || metadata.company_id || connection.user_id || "");
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
  if (!sourceSystem) throw new Error("sourceSystem is required when fetching canonical reports.");
  const selectedSourceSystem = sourceSystem === "dynamics" ? "dynamics365" : sourceSystem;
  const connection = await getConnectionForUser(connectionId, userId);
  if (selectedSourceSystem !== connection.provider) {
    throw new Error(`Provider mismatch: active ${sourceSystem} but normalized data is ${connection.provider}`);
  }
  const provider = getAccountingProvider(connection.provider);
  const mappingAdapter = getAccountingProviderMappingAdapter(selectedSourceSystem);
  const syncId = crypto.randomUUID();
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
    companyId: normalizedData.companyId || String(connection.metadata_json?.company_id || connection.user_id || ""),
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
  return { ok: true };
}
