/**
 * QBO Token Resolver (Doc D1).
 *
 * Consolidates the dual token storage (accounting_connections vs
 * erp_connections) behind a single resolver keyed by firm_client_id.
 * Prefers accounting_connections. Auto-refreshes tokens nearing expiry and
 * persists the refreshed token back to the SAME source table.
 *
 * Additive only — does not modify existing OAuth or read paths.
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

function tokenExpiryFromResponse(token: { expires_in?: number | string }): string {
  const seconds = Number(token?.expires_in || 3600);
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function isExpiredOrExpiring(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now() + REFRESH_BUFFER_MS;
}

async function loadOwnerUserId(supabase: Supabase, firmClientId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("firm_clients")
    .select("id, owner_user_id")
    .eq("id", firmClientId)
    .maybeSingle();
  if (error) throw new Error(`firm_clients lookup failed: ${error.message}`);
  if (!data?.owner_user_id) return null;
  return data.owner_user_id as string;
}

interface RawConnection {
  tokenSource: QBOTokenSource;
  connectionId: string;
  accessToken: string | null;
  refreshToken: string | null;
  realmId: string | null;
  expiresAt: string | null;
  grantedScopes: string[];
}

async function loadAccountingConnection(
  supabase: Supabase,
  ownerUserId: string,
): Promise<RawConnection | null> {
  const { data, error } = await supabase
    .from("accounting_connections")
    .select("id, access_token, refresh_token, tenant_or_realm_id, token_expires_at, scopes, external_entity_id")
    .eq("user_id", ownerUserId)
    .eq("provider", "quickbooks")
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    // Table may not exist in some environments.
    if (error.code === "PGRST205" || error.code === "42P01") return null;
    throw new Error(`accounting_connections lookup failed: ${error.message}`);
  }
  if (!data) return null;
  const realmId =
    (data.tenant_or_realm_id as string) ||
    String(data.external_entity_id || "").replace(/^qbo:/, "") ||
    null;
  return {
    tokenSource: "accounting_connections",
    connectionId: data.id as string,
    accessToken: (data.access_token as string) ?? null,
    refreshToken: (data.refresh_token as string) ?? null,
    realmId,
    expiresAt: (data.token_expires_at as string) ?? null,
    grantedScopes: Array.isArray(data.scopes) ? (data.scopes as string[]) : [],
  };
}

async function loadErpConnection(
  supabase: Supabase,
  ownerUserId: string,
): Promise<RawConnection | null> {
  const { data, error } = await supabase
    .from("erp_connections")
    .select("id, access_token, refresh_token, realm_id, token_expiry")
    .eq("user_id", ownerUserId)
    .eq("platform", "quickbooks")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return null;
    throw new Error(`erp_connections lookup failed: ${error.message}`);
  }
  if (!data) return null;
  return {
    tokenSource: "erp_connections",
    connectionId: data.id as string,
    accessToken: (data.access_token as string) ?? null,
    refreshToken: (data.refresh_token as string) ?? null,
    realmId: (data.realm_id as string) ?? null,
    expiresAt: (data.token_expiry as string) ?? null,
    // erp_connections stores no scopes; the app only ever requests this one.
    grantedScopes: [QBO_SCOPE],
  };
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
  if (conn.tokenSource === "accounting_connections") {
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
  } else {
    const { error } = await supabase
      .from("erp_connections")
      .update({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conn.connectionId);
    if (error) throw new Error(`failed to persist erp_connections token: ${error.message}`);
  }
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
 * is expired or expiring within 5 minutes. Prefers accounting_connections.
 * Returns null if the firm_client has no QBO connection at all.
 *
 * Pass { forceRefresh: true } to skip the expiry short-circuit and refresh the
 * connection unconditionally (used by the D2 poster after a 401). Existing
 * callers that pass no options are unaffected.
 */
export async function resolveQBOTokenForFirmClient(
  firmClientId: string,
  options?: ResolveTokenOptions,
): Promise<QBOTokenBundle | null> {
  if (!firmClientId) throw new Error("firmClientId is required");
  const supabase = getSupabaseAdmin();

  const ownerUserId = await loadOwnerUserId(supabase, firmClientId);
  if (!ownerUserId) return null;

  const conn =
    (await loadAccountingConnection(supabase, ownerUserId)) ??
    (await loadErpConnection(supabase, ownerUserId));
  if (!conn) return null;

  if (options?.forceRefresh || isExpiredOrExpiring(conn.expiresAt)) {
    return refreshConnectionInPlace(supabase, conn, ownerUserId);
  }
  return toBundle(conn, ownerUserId);
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

  const ownerUserId = await loadOwnerUserId(supabase, firmClientId);
  if (!ownerUserId) return null;

  const conn =
    tokenSource === "accounting_connections"
      ? await loadAccountingConnection(supabase, ownerUserId)
      : await loadErpConnection(supabase, ownerUserId);
  if (!conn) return null;

  return refreshConnectionInPlace(supabase, conn, ownerUserId);
}
