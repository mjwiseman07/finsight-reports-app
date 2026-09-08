/**
 * Fail-closed optimistic concurrency for canonical QuickBooks credential writes
 * on public.accounting_connections.
 *
 * Concurrency token = row.updated_at (ISO string equality). Never put tokens,
 * token hashes, realms, or IDs into errors or logs. Never filter PostgREST with
 * secret-valued columns (refresh_token / access_token) — those become URL query
 * parameters via @supabase/postgrest-js `.eq()`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type QboCredentialCasConflictCode =
  | "stale_connection_state"
  | "invariant_multiple_rows"
  | "missing_concurrency_token"
  | "missing_binding"
  | "persist_failed";

export class QboCredentialCasError extends Error {
  readonly code: QboCredentialCasConflictCode;

  constructor(code: QboCredentialCasConflictCode, message: string) {
    super(message);
    this.name = "QboCredentialCasError";
    this.code = code;
  }
}

/** Snapshot retained before provider refresh / OAuth persist. */
export type QboCredentialCasSnapshot = {
  connectionId: string;
  userId: string;
  tenantOrRealmId: string;
  /** Exact ISO updated_at from the row read before the write attempt. */
  concurrencyToken: string;
  /** Status required on the existing row (defaults to "connected"). */
  expectedStatus?: string;
};

export type QboCredentialCasPatch = {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  updatedAt: string;
  /**
   * Only set when the caller has authoritative signed OAuth provenance.
   * Omit to leave provider_environment unchanged (including null).
   */
  providerEnvironment?: "sandbox" | "production";
  status?: string;
  externalEntityId?: string | null;
  externalEntityName?: string | null;
  scopes?: string[];
  metadataJson?: Record<string, unknown>;
  homeCurrency?: string | null;
  qboEdition?: string | null;
  qboSubscriptionStatus?: string | null;
  clearSupersededBy?: boolean;
};

/** Columns permitted in PostgREST URL filters for credential CAS. */
export const QBO_CREDENTIAL_CAS_URL_FILTER_COLUMNS = [
  "id",
  "provider",
  "user_id",
  "tenant_or_realm_id",
  "status",
  "superseded_by_connection_id",
  "credentials_cleared_at",
  "updated_at",
] as const;

/**
 * Conditionally update exactly one QuickBooks accounting_connections row.
 * Zero rows → stale_connection_state. More than one → invariant_multiple_rows.
 *
 * URL filters are limited to non-secret binding + concurrency predicates.
 * Credential material belongs only in the PATCH body.
 */
export async function updateCanonicalQboCredentialsConditional(
  admin: SupabaseClient,
  snapshot: QboCredentialCasSnapshot,
  patch: QboCredentialCasPatch,
): Promise<{ nextConcurrencyToken: string }> {
  const concurrencyToken = String(snapshot.concurrencyToken || "").trim();
  if (!concurrencyToken) {
    throw new QboCredentialCasError(
      "missing_concurrency_token",
      "Connection concurrency token is missing",
    );
  }
  const tenantOrRealmId = String(snapshot.tenantOrRealmId || "").trim();
  const userId = String(snapshot.userId || "").trim();
  const connectionId = String(snapshot.connectionId || "").trim();
  if (!tenantOrRealmId || !userId || !connectionId) {
    throw new QboCredentialCasError(
      "missing_binding",
      "Connection identity binding is incomplete",
    );
  }

  const expectedStatus = snapshot.expectedStatus || "connected";
  const payload: Record<string, unknown> = {
    access_token: patch.accessToken,
    refresh_token: patch.refreshToken,
    token_expires_at: patch.tokenExpiresAt,
    updated_at: patch.updatedAt,
  };
  if (patch.providerEnvironment) {
    payload.provider_environment = patch.providerEnvironment;
  }
  if (patch.status) payload.status = patch.status;
  if (patch.externalEntityId !== undefined) payload.external_entity_id = patch.externalEntityId;
  if (patch.externalEntityName !== undefined) {
    payload.external_entity_name = patch.externalEntityName;
  }
  if (patch.scopes) payload.scopes = patch.scopes;
  if (patch.metadataJson) payload.metadata_json = patch.metadataJson;
  if (patch.homeCurrency !== undefined) payload.home_currency = patch.homeCurrency;
  if (patch.qboEdition !== undefined) payload.qbo_edition = patch.qboEdition;
  if (patch.qboSubscriptionStatus !== undefined) {
    payload.qbo_subscription_status = patch.qboSubscriptionStatus;
  }
  if (patch.clearSupersededBy) payload.superseded_by_connection_id = null;

  const { data, error } = await admin
    .from("accounting_connections")
    .update(payload)
    .eq("id", connectionId)
    .eq("provider", "quickbooks")
    .eq("user_id", userId)
    .eq("tenant_or_realm_id", tenantOrRealmId)
    .eq("status", expectedStatus)
    .is("superseded_by_connection_id", null)
    .is("credentials_cleared_at", null)
    .eq("updated_at", concurrencyToken)
    .select("id, updated_at")
    .limit(2);

  if (error) {
    throw new QboCredentialCasError(
      "persist_failed",
      "Failed to persist QuickBooks credentials",
    );
  }

  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) {
    throw new QboCredentialCasError(
      "stale_connection_state",
      "Connection state changed before credentials could be persisted",
    );
  }
  if (rows.length > 1) {
    throw new QboCredentialCasError(
      "invariant_multiple_rows",
      "Multiple connection rows matched a single-row credential update",
    );
  }

  const next =
    rows[0]?.updated_at != null
      ? String(rows[0].updated_at)
      : patch.updatedAt;
  return { nextConcurrencyToken: next };
}

/**
 * Refresh-only CAS: tokens + expiry + updated_at. Never sets provider_environment.
 */
export async function persistRefreshedQboCredentialsConditional(
  admin: SupabaseClient,
  snapshot: QboCredentialCasSnapshot,
  args: {
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: string;
    updatedAt?: string;
  },
): Promise<{ nextConcurrencyToken: string }> {
  const updatedAt = args.updatedAt || new Date().toISOString();
  return updateCanonicalQboCredentialsConditional(
    admin,
    {
      connectionId: snapshot.connectionId,
      userId: snapshot.userId,
      tenantOrRealmId: snapshot.tenantOrRealmId,
      concurrencyToken: snapshot.concurrencyToken,
      expectedStatus: snapshot.expectedStatus || "connected",
    },
    {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiresAt: args.tokenExpiresAt,
      updatedAt,
    },
  );
}
