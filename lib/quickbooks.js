import { QuickBooksAdapter, ERP_CONNECTIONS_SQL } from "./erp-adapters/quickbooks-adapter";

export const QUICKBOOKS_CONNECTIONS_SQL = ERP_CONNECTIONS_SQL;

export function getQuickBooksEnvironment() {
  return new QuickBooksAdapter(null).getEnvironment();
}

export function getQuickBooksConfig() {
  return new QuickBooksAdapter(null).getConfig();
}

export function getQuickBooksAuthorizationUrl(state) {
  return new QuickBooksAdapter(null).connect({ state }).url;
}

export async function exchangeQuickBooksAuthorizationCode(code) {
  return new QuickBooksAdapter(null).exchangeAuthorizationCode(code);
}

export async function refreshQuickBooksAccessToken(refreshToken) {
  return new QuickBooksAdapter(null).postTokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  );
}

export async function makeQuickBooksApiCall(accessToken, url) {
  return new QuickBooksAdapter(null).makeApiCall(accessToken, url);
}

export async function upsertQuickBooksConnection({ userId, realmId, token }) {
  return new QuickBooksAdapter(userId).saveConnection({ realmId, token });
}

export async function getQuickBooksConnection(userId) {
  return new QuickBooksAdapter(userId).getConnection();
}

export async function hasQuickBooksConnection(userId) {
  return new QuickBooksAdapter(userId).hasConnection();
}

export async function getAuthenticatedQuickBooksClient(userId) {
  return new QuickBooksAdapter(userId).getAuthenticatedClient();
}
