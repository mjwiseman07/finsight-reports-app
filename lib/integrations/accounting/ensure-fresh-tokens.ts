/**
 * Phase: Xero OAuth token refresh lifecycle
 *
 * Proactively refreshes Xero access tokens before provider API reads.
 * Reference: ef7983ac (ensureFreshTokens) — ported with fatal persist failure
 * and minimal concurrency hardening (same-instance single-flight + DB re-read).
 *
 * Concurrency strategy (documented):
 * - Module-level Map keyed by connectionId dedupes concurrent refresh within
 *   one Node/Vercel isolate.
 * - Before refreshing, re-read the connection row and re-check expiry so a
 *   refresh completed by another instance is reused.
 * - Residual cross-instance simultaneous refresh is bounded by Xero's documented
 *   ~30-minute grace window for the previous refresh token after rotation.
 *   This does not claim to eliminate every distributed race.
 */
import { supabaseAdmin } from "../../supabase";
import { getAccountingProvider } from "./registry";
import { decryptAccountingToken, encryptAccountingToken } from "./token-encryption";
import type { AccountingConnectionRecord, AccountingProvider } from "./types";

const REFRESH_SKEW_MS = 5 * 60 * 1000;

const xeroRefreshFlights = new Map<string, Promise<AccountingConnectionRecord>>();

export type OAuthRefreshErrorCode =
  | "OAUTH_REFRESH_FAILED"
  | "OAUTH_REFRESH_NO_TOKEN"
  | "OAUTH_REFRESH_PERSIST_FAILED";

export class OAuthRefreshError extends Error {
  code: OAuthRefreshErrorCode;
  connectionId: string;

  constructor(code: OAuthRefreshErrorCode, message: string, connectionId: string) {
    super(message);
    this.name = "OAuthRefreshError";
    this.code = code;
    this.connectionId = connectionId;
  }
}

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

function decryptXeroTokens(connection: AccountingConnectionRecord): AccountingConnectionRecord {
  if (connection.provider !== "xero") return connection;
  return {
    ...connection,
    access_token: decryptAccountingToken(connection.access_token),
    refresh_token: decryptAccountingToken(connection.refresh_token),
  };
}

export function tokenNeedsRefresh(tokenExpiresAt: string | null | undefined, nowMs = Date.now(), skewMs = REFRESH_SKEW_MS) {
  const expiresAt = tokenExpiresAt ? new Date(tokenExpiresAt).getTime() : 0;
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return true;
  return expiresAt - nowMs < skewMs;
}

async function loadConnectionRowById(connectionId: string): Promise<AccountingConnectionRecord | null> {
  const { data, error } = await requireSupabase()
    .from("accounting_connections")
    .select("*")
    .eq("id", connectionId)
    .limit(1);
  if (error) throw error;
  return (data?.[0] as AccountingConnectionRecord | undefined) || null;
}

async function refreshXeroConnection(connection: AccountingConnectionRecord): Promise<AccountingConnectionRecord> {
  const latestRow = (await loadConnectionRowById(connection.id)) || connection;
  const decrypted = decryptXeroTokens(latestRow);

  if (!decrypted.refresh_token) {
    return decrypted;
  }

  if (!tokenNeedsRefresh(decrypted.token_expires_at)) {
    return decrypted;
  }

  const provider = getAccountingProvider("xero");
  let tokenPayload: Record<string, unknown>;
  try {
    tokenPayload = await provider.refreshAccessToken({ refreshToken: decrypted.refresh_token });
  } catch (refreshError) {
    console.warn("[accounting/token-refresh] refresh_failed", {
      connectionId: decrypted.id,
      provider: "xero",
      tokenExpiresAt: decrypted.token_expires_at,
      exceptionMessage: refreshError instanceof Error ? refreshError.message : String(refreshError),
    });
    // Schema has no CHECK on status; TS union includes "expired" (not needs_reconnect).
    try {
      await requireSupabase()
        .from("accounting_connections")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", decrypted.id);
    } catch (statusError) {
      console.warn("[accounting/token-refresh] status_update_failed", {
        connectionId: decrypted.id,
        provider: "xero",
        exceptionMessage: statusError instanceof Error ? statusError.message : String(statusError),
      });
    }
    throw new OAuthRefreshError(
      "OAUTH_REFRESH_FAILED",
      `OAuth refresh failed for xero connection ${decrypted.id}. The user must reconnect their accounting system.`,
      decrypted.id,
    );
  }

  const newAccessToken = typeof tokenPayload.access_token === "string" ? tokenPayload.access_token : null;
  const newRefreshToken =
    typeof tokenPayload.refresh_token === "string" ? tokenPayload.refresh_token : decrypted.refresh_token;
  if (!newAccessToken) {
    console.warn("[accounting/token-refresh] no_access_token_in_payload", {
      connectionId: decrypted.id,
      provider: "xero",
      payloadKeys: Object.keys(tokenPayload || {}),
    });
    throw new OAuthRefreshError(
      "OAUTH_REFRESH_NO_TOKEN",
      `OAuth refresh returned no access_token for xero connection ${decrypted.id}.`,
      decrypted.id,
    );
  }

  const newExpiry = getTokenExpiry(tokenPayload);
  const { error: updateError } = await requireSupabase()
    .from("accounting_connections")
    .update({
      access_token: secureTokenForStorage("xero", newAccessToken),
      refresh_token: secureTokenForStorage("xero", newRefreshToken),
      token_expires_at: newExpiry,
      status: "connected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", decrypted.id);

  if (updateError) {
    console.warn("[accounting/token-refresh] persist_failed", {
      connectionId: decrypted.id,
      provider: "xero",
      exceptionMessage: updateError.message,
    });
    throw new OAuthRefreshError(
      "OAUTH_REFRESH_PERSIST_FAILED",
      `OAuth refresh succeeded but rotated token persistence failed for xero connection ${decrypted.id}.`,
      decrypted.id,
    );
  }

  console.info("[accounting/token-refresh] refresh_success", {
    connectionId: decrypted.id,
    provider: "xero",
    newExpiry,
  });

  return {
    ...decrypted,
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    token_expires_at: newExpiry,
    status: "connected",
  };
}

/**
 * Ensure a connection has a usable access token for provider API reads.
 * Xero-only in this PR — other providers return decrypt-passthrough / unchanged.
 */
export async function ensureFreshTokens(connection: AccountingConnectionRecord): Promise<AccountingConnectionRecord> {
  if (connection.provider !== "xero") {
    return decryptXeroTokens(connection);
  }

  const existingFlight = xeroRefreshFlights.get(connection.id);
  if (existingFlight) return existingFlight;

  const flight = refreshXeroConnection(connection).finally(() => {
    xeroRefreshFlights.delete(connection.id);
  });
  xeroRefreshFlights.set(connection.id, flight);
  return flight;
}

/** Test-only: clear in-flight refresh map between cases. */
export function __resetXeroRefreshFlightsForTests() {
  xeroRefreshFlights.clear();
}
