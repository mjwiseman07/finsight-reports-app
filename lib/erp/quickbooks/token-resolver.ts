/**
 * QBO Token Resolver (Doc D1) — canonical accounting_connections only.
 *
 * Selection is company-scoped via hard relational authority:
 *   firm_client → company_id → companies.qbo_realm_id → tenant_or_realm_id
 *
 * Schema note: public.accounting_connections has no company_id or firm_client_id
 * column. Company / firm-client authority is therefore enforced only through
 * companies.qbo_realm_id → accounting_connections.tenant_or_realm_id. Missing
 * realm when companyId is present fails closed (schema prerequisite documented
 * in cutover readiness). metadata_json is never used for authority.
 *
 * Never reads or writes public.quickbooks_connections or erp_connections.
 *
 * Fail-closed on zero/multiple usable matches, inactive/superseded rows,
 * missing token material, missing/invalid server QB_ENVIRONMENT, and
 * null/mismatched provider_environment.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { getQuotaGuardUndiciDispatcher } from "@/lib/network/quotaguard-proxy";
import {
  isPersistedQboProviderEnvironment,
  resolvePersistedQboProviderEnvironment,
  type PersistedQboProviderEnvironment,
} from "@/lib/erp/quickbooks/persisted-provider-environment";

export type QBOTokenSource = "accounting_connections";

export type QboTokenAuthorityErrorCode =
  | "missing_server_environment"
  | "invalid_server_environment"
  | "null_provider_environment"
  | "provider_environment_mismatch"
  | "missing_realm_authority"
  | "realm_mismatch"
  | "company_requires_realm"
  | "wrong_provider"
  | "inactive_connection"
  | "superseded_connection"
  | "credentials_cleared"
  | "missing_token_material"
  | "ambiguous_connection"
  | "no_usable_connection"
  | "stale_connection_state"
  | "refresh_persist_failed";

/**
 * Typed authority / concurrency failure. Messages must never include tokens,
 * realm IDs, company IDs, emails, or connection IDs.
 */
export class QboTokenAuthorityError extends Error {
  readonly code: QboTokenAuthorityErrorCode;

  constructor(code: QboTokenAuthorityErrorCode, message: string) {
    super(message);
    this.name = "QboTokenAuthorityError";
    this.code = code;
  }
}

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
  /** ISO concurrency token from updated_at — never a token value. */
  concurrencyToken: string;
  provider: string;
}

const ACCOUNTING_SELECT =
  "id, access_token, refresh_token, tenant_or_realm_id, token_expires_at, scopes, external_entity_id, status, provider, provider_environment, superseded_by_connection_id, credentials_cleared_at, updated_at";

/**
 * Authoritative expected QBO environment from server config.
 * Fail closed when absent or invalid — never infer from client input.
 */
export function requireExpectedProviderEnvironment(
  envValue: string | undefined = process.env.QB_ENVIRONMENT,
): PersistedQboProviderEnvironment {
  const raw = String(envValue ?? "").trim();
  if (!raw) {
    throw new QboTokenAuthorityError(
      "missing_server_environment",
      "QuickBooks server environment is not configured",
    );
  }
  try {
    return resolvePersistedQboProviderEnvironment(raw);
  } catch {
    throw new QboTokenAuthorityError(
      "invalid_server_environment",
      "QuickBooks server environment is invalid",
    );
  }
}

function rowToAccountingConnection(data: Record<string, unknown>): RawConnection {
  const realmId =
    typeof data.tenant_or_realm_id === "string" && data.tenant_or_realm_id.trim()
      ? data.tenant_or_realm_id
      : null;
  const envRaw = data.provider_environment;
  const providerEnvironment =
    typeof envRaw === "string" && envRaw.trim() ? envRaw.trim() : null;

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
    providerEnvironment,
    status: String(data.status || ""),
    supersededBy: (data.superseded_by_connection_id as string) ?? null,
    credentialsClearedAt: (data.credentials_cleared_at as string) ?? null,
    concurrencyToken: String(data.updated_at || ""),
    provider: String(data.provider || ""),
  };
}

/**
 * Usability + authority gate. Throws typed errors for hard failures when
 * throwOnReject is true (refresh path); otherwise returns false for filtering.
 */
export function evaluateCanonicalAuthority(
  conn: RawConnection,
  scope: FirmClientQboScope,
  expectedEnv: PersistedQboProviderEnvironment,
  options?: { throwOnReject?: boolean },
): boolean {
  const fail = (code: QboTokenAuthorityErrorCode, message: string): false => {
    if (options?.throwOnReject) throw new QboTokenAuthorityError(code, message);
    return false;
  };

  if (conn.provider !== "quickbooks") {
    return fail("wrong_provider", "Connection provider is not QuickBooks");
  }
  if (conn.status !== "connected") {
    return fail("inactive_connection", "Connection is not in connected status");
  }
  if (conn.supersededBy) {
    return fail("superseded_connection", "Connection has been superseded");
  }
  if (conn.credentialsClearedAt) {
    return fail("credentials_cleared", "Connection credentials have been cleared");
  }
  if (!hasTokenMaterial(conn.accessToken, conn.refreshToken)) {
    return fail("missing_token_material", "Connection is missing required token material");
  }
  if (!conn.concurrencyToken) {
    return fail("stale_connection_state", "Connection concurrency token is missing");
  }

  if (!conn.providerEnvironment || !isPersistedQboProviderEnvironment(conn.providerEnvironment)) {
    return fail(
      "null_provider_environment",
      "Connection provider environment is missing or invalid",
    );
  }
  if (conn.providerEnvironment !== expectedEnv) {
    return fail(
      "provider_environment_mismatch",
      "Connection provider environment does not match server configuration",
    );
  }

  // accounting_connections has no company_id column. Company scope requires
  // companies.qbo_realm_id → tenant_or_realm_id hard equality.
  if (scope.companyId && !scope.realmId) {
    return fail(
      "company_requires_realm",
      "Company scope requires an authoritative realm binding",
    );
  }
  if (!scope.realmId) {
    return fail(
      "missing_realm_authority",
      "Realm authority is required to select a QuickBooks connection",
    );
  }
  if (!conn.realmId) {
    return fail("missing_realm_authority", "Connection realm binding is missing");
  }
  if (conn.realmId !== scope.realmId) {
    return fail("realm_mismatch", "Connection realm does not match authorized scope");
  }

  return true;
}

/**
 * Load exactly one usable connected QBO accounting grant for the firm_client scope.
 * Fail-closed: zero or multiple usable matches → null (or throw when requested).
 */
export async function loadAccountingConnectionForScope(
  supabase: Supabase,
  scope: FirmClientQboScope,
  options?: { throwOnReject?: boolean },
): Promise<RawConnection | null> {
  const expectedEnv = requireExpectedProviderEnvironment();

  if (scope.companyId && !scope.realmId) {
    if (options?.throwOnReject) {
      throw new QboTokenAuthorityError(
        "company_requires_realm",
        "Company scope requires an authoritative realm binding",
      );
    }
    return null;
  }
  if (!scope.realmId) {
    if (options?.throwOnReject) {
      throw new QboTokenAuthorityError(
        "missing_realm_authority",
        "Realm authority is required to select a QuickBooks connection",
      );
    }
    return null;
  }

  const { data, error } = await supabase
    .from("accounting_connections")
    .select(ACCOUNTING_SELECT)
    .eq("user_id", scope.ownerUserId)
    .eq("provider", "quickbooks")
    .eq("tenant_or_realm_id", scope.realmId)
    .eq("provider_environment", expectedEnv)
    .order("updated_at", { ascending: false })
    .limit(10);
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return null;
    throw new Error(`accounting_connections lookup failed: ${error.message}`);
  }

  const usable = ((data || []) as Array<Record<string, unknown>>)
    .map((row) => rowToAccountingConnection(row))
    .filter((conn) => evaluateCanonicalAuthority(conn, scope, expectedEnv));

  if (usable.length === 0) {
    if (options?.throwOnReject) {
      throw new QboTokenAuthorityError(
        "no_usable_connection",
        "No usable QuickBooks accounting connection matched authority",
      );
    }
    return null;
  }
  if (usable.length > 1) {
    console.warn("[qbo-token-resolver] ambiguous realm-scoped accounting grants; refusing", {
      count: usable.length,
    });
    if (options?.throwOnReject) {
      throw new QboTokenAuthorityError(
        "ambiguous_connection",
        "Multiple QuickBooks accounting connections matched authority",
      );
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

/**
 * Atomic conditional persist. Constrains by id + provider + environment + realm +
 * status + not superseded + credentials not cleared + original updated_at.
 * Requires exactly one updated row.
 */
export async function persistRefreshedTokenConditional(
  supabase: Supabase,
  conn: RawConnection,
  accessToken: string,
  refreshToken: string,
  expiresAt: string,
  expectedEnv: PersistedQboProviderEnvironment,
): Promise<string> {
  if (!conn.realmId) {
    throw new QboTokenAuthorityError(
      "missing_realm_authority",
      "Connection realm binding is missing",
    );
  }

  const nextUpdatedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("accounting_connections")
    .update({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: expiresAt,
      updated_at: nextUpdatedAt,
    })
    .eq("id", conn.connectionId)
    .eq("provider", "quickbooks")
    .eq("provider_environment", expectedEnv)
    .eq("tenant_or_realm_id", conn.realmId)
    .eq("status", "connected")
    .is("superseded_by_connection_id", null)
    .is("credentials_cleared_at", null)
    .eq("updated_at", conn.concurrencyToken)
    .select("id");

  if (error) {
    throw new QboTokenAuthorityError(
      "refresh_persist_failed",
      "Failed to persist refreshed QuickBooks credentials",
    );
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  if (rows.length !== 1) {
    throw new QboTokenAuthorityError(
      "stale_connection_state",
      "Connection state changed before credentials could be persisted",
    );
  }
  return nextUpdatedAt;
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
  expectedEnv: PersistedQboProviderEnvironment,
): Promise<QBOTokenBundle> {
  if (!conn.refreshToken) {
    throw new QboTokenAuthorityError(
      "missing_token_material",
      "Connection is missing required token material",
    );
  }
  const token = await postRefresh(conn.refreshToken);
  const accessToken = token.access_token;
  const refreshToken = token.refresh_token || conn.refreshToken;
  const expiresAt = tokenExpiryFromResponse(token);
  const nextConcurrency = await persistRefreshedTokenConditional(
    supabase,
    conn,
    accessToken,
    refreshToken,
    expiresAt,
    expectedEnv,
  );
  return toBundle(
    {
      ...conn,
      accessToken,
      refreshToken,
      expiresAt,
      concurrencyToken: nextConcurrency,
    },
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
  const expectedEnv = requireExpectedProviderEnvironment();
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
    companyId: null,
    realmId: conn.realmId,
  };
  if (!evaluateCanonicalAuthority(conn, scope, expectedEnv)) return null;

  if (options?.forceRefresh || isExpiredOrExpiring(conn.expiresAt)) {
    return refreshConnectionInPlace(supabase, conn, ownerUserId, expectedEnv);
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
  const expectedEnv = requireExpectedProviderEnvironment();
  const supabase = getSupabaseAdmin();

  const scope = await loadFirmClientQboScope(supabase, firmClientId);
  if (!scope) return null;

  const conn = await loadAccountingConnectionForScope(supabase, scope);
  if (!conn) return null;

  if (options?.forceRefresh || isExpiredOrExpiring(conn.expiresAt)) {
    return refreshConnectionInPlace(supabase, conn, scope.ownerUserId, expectedEnv);
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
  const expectedEnv = requireExpectedProviderEnvironment();
  const supabase = getSupabaseAdmin();

  const scope = await loadFirmClientQboScope(supabase, firmClientId);
  if (!scope) return null;

  const conn = await loadAccountingConnectionForScope(supabase, scope, {
    throwOnReject: true,
  });
  if (!conn) return null;

  return refreshConnectionInPlace(supabase, conn, scope.ownerUserId, expectedEnv);
}
