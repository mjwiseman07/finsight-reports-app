import OAuthClient from "intuit-oauth";
import QuickBooks from "node-quickbooks";
import { supabaseAdmin } from "./supabase";

const QUICKBOOKS_SCOPE = "com.intuit.quickbooks.accounting";
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export const QUICKBOOKS_CONNECTIONS_SQL = `
-- Run this in the Supabase SQL editor before using QuickBooks connections.
create table public.quickbooks_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  realm_id text not null,
  access_token text not null,
  refresh_token text not null,
  token_expiry timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
alter table public.quickbooks_connections enable row level security;
create policy "Users can access own QB connection" on public.quickbooks_connections for all using (auth.uid() = user_id);
`;

export function getQuickBooksEnvironment() {
  return process.env.QB_ENVIRONMENT === "production" ? "production" : "sandbox";
}

export function getQuickBooksOAuthClient(token) {
  return new OAuthClient({
    clientId: process.env.QB_CLIENT_ID,
    clientSecret: process.env.QB_CLIENT_SECRET,
    environment: getQuickBooksEnvironment(),
    redirectUri: process.env.QB_REDIRECT_URI,
    token,
  });
}

export function getQuickBooksAuthorizationUrl(state) {
  const oauthClient = getQuickBooksOAuthClient();
  return oauthClient.authorizeUri({
    scope: [QUICKBOOKS_SCOPE],
    state,
  });
}

function getTokenExpiry(token) {
  const expiresInSeconds = Number(token?.expires_in || 3600);
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

function isExpiredOrExpiring(tokenExpiry) {
  if (!tokenExpiry) return true;
  return new Date(tokenExpiry).getTime() <= Date.now() + TOKEN_REFRESH_BUFFER_MS;
}

export async function upsertQuickBooksConnection({ userId, realmId, token }) {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is not configured");
  }

  const accessToken = token?.access_token;
  const refreshToken = token?.refresh_token;

  if (!userId || !realmId || !accessToken || !refreshToken) {
    throw new Error("QuickBooks connection is missing required token fields");
  }

  const payload = {
    user_id: userId,
    realm_id: realmId,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expiry: getTokenExpiry(token),
    updated_at: new Date().toISOString(),
  };

  const { data: existingConnection, error: lookupError } = await supabaseAdmin
    .from("quickbooks_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("realm_id", realmId)
    .maybeSingle();

  if (lookupError) throw lookupError;

  const result = existingConnection?.id
    ? await supabaseAdmin.from("quickbooks_connections").update(payload).eq("id", existingConnection.id)
    : await supabaseAdmin.from("quickbooks_connections").insert(payload);

  if (result.error) throw result.error;
}

export async function getQuickBooksConnection(userId) {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is not configured");
  }

  const { data, error } = await supabaseAdmin
    .from("quickbooks_connections")
    .select("id, user_id, realm_id, access_token, refresh_token, token_expiry")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function hasQuickBooksConnection(userId) {
  return Boolean(await getQuickBooksConnection(userId));
}

async function refreshConnectionToken(connection) {
  const oauthClient = getQuickBooksOAuthClient({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    realmId: connection.realm_id,
  });
  const authResponse = await oauthClient.refreshUsingToken(connection.refresh_token);
  const token = authResponse.getToken();
  const accessToken = token.access_token;
  const refreshToken = token.refresh_token || connection.refresh_token;

  if (!accessToken) {
    throw new Error("QuickBooks refresh did not return an access token");
  }

  const { data, error } = await supabaseAdmin
    .from("quickbooks_connections")
    .update({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expiry: getTokenExpiry(token),
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id)
    .select("id, user_id, realm_id, access_token, refresh_token, token_expiry")
    .single();

  if (error) throw error;
  return data;
}

export async function getAuthenticatedQuickBooksClient(userId) {
  let connection = await getQuickBooksConnection(userId);

  if (!connection) {
    throw new Error("QuickBooks is not connected for this user");
  }

  if (isExpiredOrExpiring(connection.token_expiry)) {
    connection = await refreshConnectionToken(connection);
  }

  const useSandbox = getQuickBooksEnvironment() === "sandbox";
  const qbo = new QuickBooks(
    process.env.QB_CLIENT_ID,
    process.env.QB_CLIENT_SECRET,
    connection.access_token,
    false,
    connection.realm_id,
    useSandbox,
    false,
    null,
    "2.0",
    connection.refresh_token,
  );

  const oauthClient = getQuickBooksOAuthClient({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    realmId: connection.realm_id,
  });

  return {
    qbo,
    oauthClient,
    realmId: connection.realm_id,
  };
}
