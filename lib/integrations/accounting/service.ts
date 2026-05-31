import crypto from "crypto";
import { cookies } from "next/headers";
import { getAccountingProvider, getEnabledProviders } from "./registry";
import type { AccountingDateRange, AccountingProvider, AccountingConnectionRecord } from "./types";
import { supabaseAdmin } from "../../supabase";

const STATE_COOKIE = "accounting_oauth_state";
const TOKEN_COOKIE = "accounting_oauth_token";
const RETURN_COOKIE = "accounting_oauth_return_to";

function requireSupabase() {
  if (!supabaseAdmin) throw new Error("Supabase admin client is not configured");
  return supabaseAdmin;
}

function getTokenExpiry(token: Record<string, unknown>) {
  const expiresInSeconds = Number(token.expires_in || 3600);
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
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

  const token = await provider.exchangeCodeForTokens({ code, state, tenantOrRealmId });
  const tokenPayload = token as Record<string, unknown>;
  const externalEntityId = tenantOrRealmId ? `${provider.provider === "quickbooks" ? "qbo" : provider.provider}:${tenantOrRealmId}` : null;
  const status = provider.getCapabilities().requires_entity_selection ? "needs_entity_selection" : "connected";

  const { data, error } = await supabase
    .from("accounting_connections")
    .insert({
      user_id: authData.user.id,
      provider: provider.provider,
      provider_family: provider.providerFamily,
      provider_product: provider.providerProduct,
      external_entity_id: externalEntityId,
      access_token: typeof tokenPayload.access_token === "string" ? tokenPayload.access_token : null,
      refresh_token: typeof tokenPayload.refresh_token === "string" ? tokenPayload.refresh_token : null,
      token_expires_at: getTokenExpiry(tokenPayload),
      tenant_or_realm_id: tenantOrRealmId || null,
      scopes: String(tokenPayload.scope || "").split(" ").filter(Boolean),
      status,
      metadata_json: { token_type: tokenPayload.token_type || null },
    })
    .select("id")
    .limit(1);
  if (error) throw error;

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
  return data[0] as AccountingConnectionRecord;
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
  const { error } = await supabase
    .from("accounting_connections")
    .update({
      external_entity_id: entity.canonicalId,
      external_entity_name: entity.name,
      tenant_or_realm_id: entity.tenantOrRealmId || entity.externalId,
      status: "connected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectionId)
    .eq("user_id", userId);
  if (error) throw error;
  return entity;
}

export async function fetchCanonicalReports(connectionId: string, userId: string, dateRange: AccountingDateRange) {
  const connection = await getConnectionForUser(connectionId, userId);
  const provider = getAccountingProvider(connection.provider);
  const bundle = await provider.getPrimaryFinancialReports({ connection, dateRange });
  return {
    ok: true,
    provider: connection.provider,
    connectionId,
    bundle,
    missingReports: bundle.missingReports,
    warnings: provider.getCapabilities().fallback_notes || [],
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
