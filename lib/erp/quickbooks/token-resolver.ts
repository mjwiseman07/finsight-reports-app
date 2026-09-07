/**
 * QBO Token Resolver (Doc D1) — canonical accounting_connections only.
 *
 * Selection is company-scoped:
 *   firm_client → company_id → companies.qbo_realm_id → grant for that realm
 * Never picks "latest connected row for the owner" across unrelated realms.
 * Never reads or writes public.quickbooks_connections or erp_connections.
 *
 * Fail-closed on zero/multiple usable matches, inactive/superseded rows,
 * missing token material, and provider_environment mismatch when persisted.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { getQuotaGuardUndiciDispatcher } from "@/lib/network/quotaguard-proxy";
import {
  isPersistedQboProviderEnvironment,
  resolvePersistedQboProviderEnvironment,
  type PersistedQboProviderEnvironment,
} from "@/lib/erp/quickbooks/persisted-provider-environment";

export type QBOTokenSource = "accounting_connections";

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

function tokenExpiryFromResponse(token: { expires_in?: number | string }): string {
  const seconds = Number(token?.expires_in || 3600);
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function isExpiredOrExpiring(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now() + REFRESH_BUFFER_MS;
}

function hasTokenMaterial(access: unknown, refresh: unknown): boolean {
  return typeof access === "string" && access.trim().length > 0
    && typeof refresh === "string" && refresh.trim().length > 0;
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
  storageTable: "accounting_connections";
  connectionId: string;
  accessToken: string | null;
  refreshToken: string | null;
  realmId: string | null;
  expiresAt: string | null;
  grantedScopes: string[];
  providerEnvironment: string | null;
  status: string;
  supersededBy: string | null;
  credentialsClearedAt: string | null;
  metadataCompanyId: string | null;
}

const ACCOUNTING_SELECT =
  "id, access_token, refresh_token, tenant_or_realm_id, token_expires_at, scopes, external_entity_id, metadata_json, status, provider, provider_environment, superseded_by_connection_id, credentials_cleared_at, updated_at";

function rowToAccountingConnection(data: Record<string, unknown>): RawConnection {
  const realmId =
    (data.tenant_or_realm_id as string) ||
    String(data.external_entity_id || "").replace(/^qbo:/, "") ||
    null;
  const meta = (data.metadata_json || {}) as Record<string, unknown>;
  return {
    tokenSource: "accounting_connections",
    storageTable: "accounting_connections",
    connectionId: data.id as string,
    accessToken: (data.access_token as string) ?? null,
    refreshToken: (data.refresh_token as string) ?? null,
    realmId,
    expiresAt: (data.token_expires_at as string) ?? null,
    grantedScopes: Array.isArray(data.scopes) && data.scopes.length > 0
      ? (data.scopes as string[])
      : [QBO_SCOPE],
    providerEnvironment: (data.provider_environment as string) ?? null,
    status: String(data.status || ""),
    supersededBy: (data.superseded_by_connection_id as string) ?? null,
    credentialsClearedAt: (data.credentials_cleared_at as string) ?? null,
    metadataCompanyId: meta.company_id ? String(meta.company_id) : null,
  };
}

function expectedProviderEnvironment(): PersistedQboProviderEnvironment | null {
  try {
    return resolvePersistedQboProviderEnvironment(process.env.QB_ENVIRONMENT);
  } catch {
    return null;
  }
}

function isUsableCanonical(conn: RawConnection, scope: FirmClientQboScope): boolean {
  if (conn.status !== "connected") return false;
  if (conn.supersededBy) return false;
  if (conn.credentialsClearedAt) return false;
  if (!hasTokenMaterial(conn.accessToken, conn.refreshToken)) return false;
  if (!conn.realmId) return false;

  if (scope.realmId && conn.realmId !== scope.realmId) return false;
  if (scope.companyId && conn.metadataCompanyId && conn.metadataCompanyId !== scope.companyId) {
    return false;
  }

  const expectedEnv = expectedProviderEnvironment();
  if (
    expectedEnv &&
    conn.providerEnvironment &&
    isPersistedQboProviderEnvironment(conn.providerEnvironment) &&
    conn.providerEnvironment !== expectedEnv
  ) {
    return false;
  }

  return true;
}

/**
 * Load exactly one usable connected QBO accounting grant for the firm_client scope.
 * Fail-closed: zero or multiple usable matches → null.
 */
export async function loadAccountingConnectionForScope(
  supabase: Supabase,
  scope: FirmClientQboScope,
): Promise<RawConnection | null> {
  const ownerUserId = scope.ownerUserId;

  if (scope.realmId) {
    const { data, error } = await supabase
      .from("accounting_connections")
      .select(ACCOUNTING_SELECT)
      .eq("user_id", ownerUserId)
      .eq("provider", "quickbooks")
      .eq("tenant_or_realm_id", scope.realmId)
      .order("updated_at", { ascending: false })
      .limit(10);
    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") return null;
      throw new Error(`accounting_connections lookup failed: ${error.message}`);
    }
    const usable = ((data || []) as Array<Record<string, unknown>>)
      .map((row) => rowToAccountingConnection(row))
      .filter((conn) => isUsableCanonical(conn, scope));
    if (usable.length !== 1) {
      if (usable.length > 1) {
        console.warn("[qbo-token-resolver] ambiguous realm-scoped accounting grants; refusing", {
          ownerUserId,
          count: usable.length,
        });
      }
      return null;
    }
    return usable[0];
  }

  if (scope.companyId) {
    const { data, error } = await supabase
      .from("accounting_connections")
      .select(ACCOUNTING_SELECT)
      .eq("user_id", ownerUserId)
      .eq("provider", "quickbooks")
      .order("updated_at", { ascending: false })
      .limit(25);
    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") return null;
      throw new Error(`accounting_connections lookup failed: ${error.message}`);
    }
    const usable = ((data || []) as Array<Record<string, unknown>>)
      .map((row) => rowToAccountingConnection(row))
      .filter((conn) => isUsableCanonical(conn, scope))
      .filter((conn) => conn.metadataCompanyId === scope.companyId);
    if (usable.length !== 1) {
      if (usable.length > 1) {
        console.warn("[qbo-token-resolver] ambiguous company-scoped accounting grants; refusing", {
          ownerUserId,
          count: usable.length,
        });
      }
      return null;
    }
    return usable[0];
  }

  // Legacy firm_clients without company_id: fail closed unless exactly one usable grant.
  const { data, error } = await supabase
    .from("accounting_connections")
    .select(ACCOUNTING_SELECT)
    .eq("user_id", ownerUserId)
    .eq("provider", "quickbooks")
    .order("updated_at", { ascending: false })
    .limit(10);
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return null;
    throw new Error(`accounting_connections lookup failed: ${error.message}`);
  }
  const usable = ((data || []) as Array<Record<string, unknown>>)
    .map((row) => rowToAccountingConnection(row))
    .filter((conn) => isUsableCanonical(conn, scope));
  if (usable.length !== 1) {
    if (usable.length > 1) {
      console.warn("[qbo-token-resolver] ambiguous unscoped accounting grants; refusing", {
        ownerUserId,
        count: usable.length,
      });
    }
    return null;
  }
  return usable[0];
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
}

function toBundle(conn: RawConnection, ownerUserId: string): QBOTokenBundle {
  return {
    accessToken: conn.accessToken ?? "",
    refreshToken: conn.refreshToken ?? "",
    realmId: conn.realmId ?? "",
    tokenSource: "accounting_connections",
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
 * JE-3B1 — Resolve token from an exact accounting_connections.id.
 */
export async function resolveQBOTokenForAccountingConnection(
  accountingConnectionId: string,
  options?: ResolveTokenOptions,
): Promise<QBOTokenBundle | null> {
  if (!accountingConnectionId) {
    throw new Error("accountingConnectionId is required");
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounting_connections")
    .select(`${ACCOUNTING_SELECT}, user_id, provider`)
    .eq("id", accountingConnectionId)
    .maybeSingle();
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return null;
    throw new Error(`accounting_connections lookup failed: ${error.message}`);
  }
  if (!data) return null;
  if (String(data.provider || "") !== "quickbooks") return null;

  const ownerUserId = String(data.user_id || "");
  if (!ownerUserId) return null;

  const conn = rowToAccountingConnection(data as Record<string, unknown>);
  const scope: FirmClientQboScope = {
    ownerUserId,
    companyId: conn.metadataCompanyId,
    realmId: conn.realmId,
  };
  if (!isUsableCanonical(conn, scope)) return null;

  if (options?.forceRefresh || isExpiredOrExpiring(conn.expiresAt)) {
    return refreshConnectionInPlace(supabase, conn, ownerUserId);
  }
  return toBundle(conn, ownerUserId);
}

/**
 * Returns a valid QBO token bundle for a firm_client from accounting_connections only.
 */
export async function resolveQBOTokenForFirmClient(
  firmClientId: string,
  options?: ResolveTokenOptions,
): Promise<QBOTokenBundle | null> {
  if (!firmClientId) throw new Error("firmClientId is required");
  const supabase = getSupabaseAdmin();

  const scope = await loadFirmClientQboScope(supabase, firmClientId);
  if (!scope) return null;

  const conn = await loadAccountingConnectionForScope(supabase, scope);
  if (!conn) return null;

  if (options?.forceRefresh || isExpiredOrExpiring(conn.expiresAt)) {
    return refreshConnectionInPlace(supabase, conn, scope.ownerUserId);
  }
  return toBundle(conn, scope.ownerUserId);
}

/**
 * Force-refreshes the token for a firm_client on accounting_connections only.
 */
export async function refreshQBOToken(
  firmClientId: string,
  tokenSource: QBOTokenSource = "accounting_connections",
): Promise<QBOTokenBundle | null> {
  if (!firmClientId) throw new Error("firmClientId is required");
  if (tokenSource !== "accounting_connections") {
    throw new Error("Only accounting_connections token source is supported");
  }
  const supabase = getSupabaseAdmin();

  const scope = await loadFirmClientQboScope(supabase, firmClientId);
  if (!scope) return null;

  const conn = await loadAccountingConnectionForScope(supabase, scope);
  if (!conn) return null;

  return refreshConnectionInPlace(supabase, conn, scope.ownerUserId);
}
