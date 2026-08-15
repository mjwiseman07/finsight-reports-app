/**
 * QBO Token Resolver (Doc D1).
 *
 * Consolidates the dual token storage (accounting_connections vs
 * erp / quickbooks_connections) behind a single resolver keyed by firm_client_id.
 *
 * Selection is company-scoped:
 *   firm_client → company_id → companies.qbo_realm_id → grant for that realm
 * Never picks "latest connected row for the owner" across unrelated realms.
 *
 * Prefers accounting_connections for the scoped realm, then ERP/legacy for the
 * same realm. Auto-refreshes tokens nearing expiry and persists back to the
 * SAME source table.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { getQuotaGuardUndiciDispatcher } from "@/lib/network/quotaguard-proxy";

export type QBOTokenSource = "erp_connections" | "accounting_connections";

export interface QBOTokenBundle {
  accessToken: string;
  refreshToken: string;
  realmId: string;
  tokenSource: QBOTokenSource;
  grantedScopes: string[];
  connectionId: string;
  ownerUserId: string;
  expiresAt: string;
}

const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QBO_SCOPE = "com.intuit.quickbooks.accounting";
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

type Supabase = ReturnType<typeof getSupabaseAdmin>;

type ErpStorageTable = "erp_connections" | "quickbooks_connections";

function tokenExpiryFromResponse(token: { expires_in?: number | string }): string {
  const seconds = Number(token?.expires_in || 3600);
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function isExpiredOrExpiring(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now() + REFRESH_BUFFER_MS;
}

export interface FirmClientQboScope {
  ownerUserId: string;
  companyId: string | null;
  realmId: string | null;
}

/**
 * Resolve firm_client → owner + company + realm for company-scoped token selection.
 * Exported for unit tests.
 */
export async function loadFirmClientQboScope(
  supabase: Supabase,
  firmClientId: string,
): Promise<FirmClientQboScope | null> {
  const { data, error } = await supabase
    .from("firm_clients")
    .select("id, owner_user_id, company_id")
    .eq("id", firmClientId)
    .maybeSingle();
  if (error) throw new Error(`firm_clients lookup failed: ${error.message}`);
  if (!data?.owner_user_id) return null;

  let realmId: string | null = null;
  const companyId = (data.company_id as string | null) || null;
  if (companyId) {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, qbo_realm_id")
      .eq("id", companyId)
      .maybeSingle();
    if (companyError) throw new Error(`companies lookup failed: ${companyError.message}`);
    realmId = (company?.qbo_realm_id as string | null) || null;
  }

  return {
    ownerUserId: data.owner_user_id as string,
    companyId,
    realmId,
  };
}

interface RawConnection {
  tokenSource: QBOTokenSource;
  storageTable: "accounting_connections" | ErpStorageTable;
  connectionId: string;
  accessToken: string | null;
  refreshToken: string | null;
  realmId: string | null;
  expiresAt: string | null;
  grantedScopes: string[];
}

function rowToAccountingConnection(data: Record<string, unknown>): RawConnection {
  const realmId =
    (data.tenant_or_realm_id as string) ||
    String(data.external_entity_id || "").replace(/^qbo:/, "") ||
    null;
  return {
    tokenSource: "accounting_connections",
    storageTable: "accounting_connections",
    connectionId: data.id as string,
    accessToken: (data.access_token as string) ?? null,
    refreshToken: (data.refresh_token as string) ?? null,
    realmId,
    expiresAt: (data.token_expires_at as string) ?? null,
    grantedScopes: Array.isArray(data.scopes) ? (data.scopes as string[]) : [],
  };
}

/**
 * Load connected QBO accounting grant for the firm_client scope.
 * - realm known: exact tenant match only (sandbox cannot override production)
 * - company known, realm unknown: metadata company_id match only
 * - unscoped (no company): only when exactly one connected QBO grant exists
 */
export async function loadAccountingConnectionForScope(
  supabase: Supabase,
  scope: FirmClientQboScope,
): Promise<RawConnection | null> {
  const ownerUserId = scope.ownerUserId;

  if (scope.realmId) {
    const { data, error } = await supabase
      .from("accounting_connections")
      .select(
        "id, access_token, refresh_token, tenant_or_realm_id, token_expires_at, scopes, external_entity_id, metadata_json",
      )
      .eq("user_id", ownerUserId)
      .eq("provider", "quickbooks")
      .eq("status", "connected")
      .eq("tenant_or_realm_id", scope.realmId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") return null;
      throw new Error(`accounting_connections lookup failed: ${error.message}`);
    }
    return data ? rowToAccountingConnection(data as Record<string, unknown>) : null;
  }

  if (scope.companyId) {
    const { data, error } = await supabase
      .from("accounting_connections")
      .select(
        "id, access_token, refresh_token, tenant_or_realm_id, token_expires_at, scopes, external_entity_id, metadata_json, updated_at",
      )
      .eq("user_id", ownerUserId)
      .eq("provider", "quickbooks")
      .eq("status", "connected")
      .order("updated_at", { ascending: false })
      .limit(25);
    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") return null;
      throw new Error(`accounting_connections lookup failed: ${error.message}`);
    }
    const matches = ((data || []) as Array<Record<string, unknown>>).filter((row) => {
      const meta = (row.metadata_json || {}) as Record<string, unknown>;
      return String(meta.company_id || "") === scope.companyId;
    });
    if (matches.length === 0) return null;
    // Prefer exact company metadata; do not fall through to unrelated realms.
    return rowToAccountingConnection(matches[0]);
  }

  // Legacy firm_clients without company_id: fail closed when ambiguous.
  const { data, error } = await supabase
    .from("accounting_connections")
    .select(
      "id, access_token, refresh_token, tenant_or_realm_id, token_expires_at, scopes, external_entity_id, metadata_json",
    )
    .eq("user_id", ownerUserId)
    .eq("provider", "quickbooks")
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(2);
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return null;
    throw new Error(`accounting_connections lookup failed: ${error.message}`);
  }
  if (!data || data.length === 0) return null;
  if (data.length > 1) {
    console.warn("[qbo-token-resolver] ambiguous unscoped accounting grants; refusing latest-row pick", {
      ownerUserId,
      count: data.length,
    });
    return null;
  }
  return rowToAccountingConnection(data[0] as Record<string, unknown>);
}

async function loadFromErpTable(
  supabase: Supabase,
  table: ErpStorageTable,
  ownerUserId: string,
  realmId: string | null,
): Promise<RawConnection | null> {
  const withPlatform = table === "erp_connections";
  let query = supabase
    .from(table)
    .select(
      withPlatform
        ? "id, access_token, refresh_token, realm_id, token_expiry"
        : "id, access_token, refresh_token, realm_id, token_expiry",
    )
    .eq("user_id", ownerUserId)
    .order("updated_at", { ascending: false })
    .limit(withPlatform || realmId ? 1 : 2);

  if (withPlatform) query = query.eq("platform", "quickbooks");
  if (realmId) query = query.eq("realm_id", realmId);

  const { data, error } = realmId
    ? await query.maybeSingle()
    : await query;

  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return null;
    throw new Error(`${table} lookup failed: ${error.message}`);
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  if (!realmId && rows.length > 1) {
    console.warn("[qbo-token-resolver] ambiguous unscoped ERP grants; refusing latest-row pick", {
      ownerUserId,
      table,
      count: rows.length,
    });
    return null;
  }
  const row = rows[0];
  if (!row) return null;

  return {
    tokenSource: "erp_connections",
    storageTable: table,
    connectionId: row.id as string,
    accessToken: (row.access_token as string) ?? null,
    refreshToken: (row.refresh_token as string) ?? null,
    realmId: (row.realm_id as string) ?? null,
    expiresAt: (row.token_expiry as string) ?? null,
    grantedScopes: [QBO_SCOPE],
  };
}

/**
 * ERP / legacy quickbooks_connections fallback, realm-scoped when possible.
 */
export async function loadErpConnectionForScope(
  supabase: Supabase,
  scope: FirmClientQboScope,
): Promise<RawConnection | null> {
  // When company is known but realm is not, do not guess across ERP realms.
  if (scope.companyId && !scope.realmId) return null;

  const realmId = scope.realmId;
  const primary = await loadFromErpTable(supabase, "erp_connections", scope.ownerUserId, realmId);
  if (primary) return primary;
  return loadFromErpTable(supabase, "quickbooks_connections", scope.ownerUserId, realmId);
}

function basicAuthHeader(): string {
  const clientId = process.env.QB_CLIENT_ID?.trim();
  const clientSecret = process.env.QB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Missing QB_CLIENT_ID / QB_CLIENT_SECRET for QBO token refresh");
  }
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

async function postRefresh(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const dispatcher = getQuotaGuardUndiciDispatcher();
  const response = await fetch(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
    ...(dispatcher ? { dispatcher } : {}),
  } as RequestInit);
  const text = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(
      (payload.error_description as string) ||
        (payload.error as string) ||
        `QuickBooks token refresh failed (${response.status})`,
    );
  }
  if (!payload.access_token) {
    throw new Error("QuickBooks refresh did not return an access token");
  }
  return payload as { access_token: string; refresh_token?: string; expires_in?: number };
}

async function persistRefreshedToken(
  supabase: Supabase,
  conn: RawConnection,
  accessToken: string,
  refreshToken: string,
  expiresAt: string,
): Promise<void> {
  if (conn.storageTable === "accounting_connections") {
    const { error } = await supabase
      .from("accounting_connections")
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conn.connectionId);
    if (error) throw new Error(`failed to persist accounting_connections token: ${error.message}`);
    return;
  }

  const expiryColumn = "token_expiry";
  const { error } = await supabase
    .from(conn.storageTable)
    .update({
      access_token: accessToken,
      refresh_token: refreshToken,
      [expiryColumn]: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conn.connectionId);
  if (error) throw new Error(`failed to persist ${conn.storageTable} token: ${error.message}`);
}

function toBundle(conn: RawConnection, ownerUserId: string): QBOTokenBundle {
  return {
    accessToken: conn.accessToken ?? "",
    refreshToken: conn.refreshToken ?? "",
    realmId: conn.realmId ?? "",
    tokenSource: conn.tokenSource,
    grantedScopes: conn.grantedScopes,
    connectionId: conn.connectionId,
    ownerUserId,
    expiresAt: conn.expiresAt ?? "",
  };
}

async function refreshConnectionInPlace(
  supabase: Supabase,
  conn: RawConnection,
  ownerUserId: string,
): Promise<QBOTokenBundle> {
  if (!conn.refreshToken) {
    throw new Error(`connection ${conn.connectionId} has no refresh_token`);
  }
  const token = await postRefresh(conn.refreshToken);
  const accessToken = token.access_token;
  const refreshToken = token.refresh_token || conn.refreshToken;
  const expiresAt = tokenExpiryFromResponse(token);
  await persistRefreshedToken(supabase, conn, accessToken, refreshToken, expiresAt);
  return toBundle(
    { ...conn, accessToken, refreshToken, expiresAt },
    ownerUserId,
  );
}

export interface ResolveTokenOptions {
  /** When true, force a token refresh regardless of current expiry. */
  forceRefresh?: boolean;
}

/**
 * Returns a valid QBO token bundle for a firm_client, refreshing if the token
 * is expired or expiring within 5 minutes. Company-scoped; prefers
 * accounting_connections for the firm's company realm.
 * Returns null if the firm_client has no QBO connection for that company.
 */
export async function resolveQBOTokenForFirmClient(
  firmClientId: string,
  options?: ResolveTokenOptions,
): Promise<QBOTokenBundle | null> {
  if (!firmClientId) throw new Error("firmClientId is required");
  const supabase = getSupabaseAdmin();

  const scope = await loadFirmClientQboScope(supabase, firmClientId);
  if (!scope) return null;

  const conn =
    (await loadAccountingConnectionForScope(supabase, scope)) ??
    (await loadErpConnectionForScope(supabase, scope));
  if (!conn) return null;

  if (options?.forceRefresh || isExpiredOrExpiring(conn.expiresAt)) {
    return refreshConnectionInPlace(supabase, conn, scope.ownerUserId);
  }
  return toBundle(conn, scope.ownerUserId);
}

/**
 * Force-refreshes the token for a firm_client from a specific source table,
 * regardless of current expiry, and persists the result.
 */
export async function refreshQBOToken(
  firmClientId: string,
  tokenSource: QBOTokenSource,
): Promise<QBOTokenBundle | null> {
  if (!firmClientId) throw new Error("firmClientId is required");
  const supabase = getSupabaseAdmin();

  const scope = await loadFirmClientQboScope(supabase, firmClientId);
  if (!scope) return null;

  const conn =
    tokenSource === "accounting_connections"
      ? await loadAccountingConnectionForScope(supabase, scope)
      : await loadErpConnectionForScope(supabase, scope);
  if (!conn) return null;

  return refreshConnectionInPlace(supabase, conn, scope.ownerUserId);
}
