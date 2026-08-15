/**
 * Accounting connection selection safety.
 *
 * Explicit connectionId: exact identity or fail closed — never fall back to
 * "latest connection for user/provider".
 *
 * No connectionId authority model (provider-neutral):
 *   1. company scope → companies.<provider>_tenant/realm → exact tenant match
 *   2. tenant scope → exact tenant_or_realm_id match
 *   3. otherwise exactly one unambiguous connected candidate for the user
 *   4. otherwise fail closed — never "latest wins" / never recency windows
 *
 * Company identity is canonical companies row identity, NOT metadata_json.company_id
 * (historical poison: metadata_json.company_id === user_id).
 *
 * status = superseded is never authoritative. When an explicit superseded row is
 * requested, throw ACCOUNTING_CONNECTION_SUPERSEDED. successorConnectionId is
 * only exposed after validating the successor grant identity.
 */
import type { AccountingConnectionRecord, AccountingConnectionStatus } from "./types";
import {
  deriveProviderTenantId,
  rejectUserIdShapedCompanyId,
} from "./resolve-or-create-company";

export type AccountingConnectionSelectionErrorCode =
  | "ACCOUNTING_CONNECTION_EXPIRED"
  | "ACCOUNTING_CONNECTION_DISCONNECTED"
  | "ACCOUNTING_CONNECTION_FAILED"
  | "ACCOUNTING_CONNECTION_NOT_READY"
  | "ACCOUNTING_CONNECTION_ENTITY_SELECTION_REQUIRED"
  | "ACCOUNTING_CONNECTION_SUPERSEDED"
  | "ACCOUNTING_CONNECTION_AMBIGUOUS"
  | "ACCOUNTING_CONNECTION_SCOPE_MISMATCH";

export class AccountingConnectionSelectionError extends Error {
  code: AccountingConnectionSelectionErrorCode;
  httpStatus: number;
  connectionId: string;
  status: AccountingConnectionStatus | string;
  successorConnectionId?: string | null;

  constructor(args: {
    code: AccountingConnectionSelectionErrorCode;
    message: string;
    connectionId: string;
    status: AccountingConnectionStatus | string;
    httpStatus: number;
    successorConnectionId?: string | null;
  }) {
    super(args.message);
    this.name = "AccountingConnectionSelectionError";
    this.code = args.code;
    this.connectionId = args.connectionId;
    this.status = args.status;
    this.httpStatus = args.httpStatus;
    if (args.successorConnectionId) {
      this.successorConnectionId = args.successorConnectionId;
    }
  }
}

type ConnectionQueryClient = {
  from: (table: string) => any;
};

type ProviderKind = "xero" | "quickbooks";

const TENANT_COLUMN_BY_PROVIDER: Record<ProviderKind, "xero_tenant_id" | "qbo_realm_id"> = {
  xero: "xero_tenant_id",
  quickbooks: "qbo_realm_id",
};

function normalizeProvider(sourceSystem: string | null | undefined): ProviderKind | null {
  const raw = String(sourceSystem || "").trim().toLowerCase();
  if (raw === "xero") return "xero";
  if (raw === "quickbooks" || raw === "qbo") return "quickbooks";
  return null;
}

/** Reject self-successor links at the business layer. */
export function isSelfSupersession(connection: {
  id?: string | null;
  superseded_by_connection_id?: string | null;
}): boolean {
  const id = String(connection.id || "").trim();
  const successor = String(connection.superseded_by_connection_id || "").trim();
  return Boolean(id && successor && id === successor);
}

/**
 * Expose successorConnectionId only when the FK points at a connected grant
 * for the same user + provider + tenant. Never blindly return the FK value.
 */
export function isExposableSupersessionSuccessor(args: {
  predecessor: AccountingConnectionRecord;
  successor: AccountingConnectionRecord | null | undefined;
}): boolean {
  const { predecessor, successor } = args;
  if (!successor) return false;
  if (isSelfSupersession({ id: predecessor.id, superseded_by_connection_id: successor.id })) return false;
  if (successor.status !== "connected") return false;
  if (String(successor.user_id) !== String(predecessor.user_id)) return false;
  if (String(successor.provider) !== String(predecessor.provider)) return false;
  const predTenant = String(predecessor.tenant_or_realm_id || "");
  const succTenant = String(successor.tenant_or_realm_id || "");
  if (!predTenant || !succTenant || predTenant !== succTenant) return false;
  return true;
}

/** Map a non-connected status to the fail-closed selection error (active-context contract). */
export function mapNonConnectedStatus(connection: AccountingConnectionRecord): AccountingConnectionSelectionError {
  const status = String(connection.status || "");
  const id = String(connection.id);
  switch (status) {
    case "superseded":
      return new AccountingConnectionSelectionError({
        code: "ACCOUNTING_CONNECTION_SUPERSEDED",
        message: "Accounting connection has been superseded; use the successor connection.",
        connectionId: id,
        status,
        httpStatus: 409,
      });
    case "expired":
      return new AccountingConnectionSelectionError({
        code: "ACCOUNTING_CONNECTION_EXPIRED",
        message: "Accounting connection expired; reconnect required.",
        connectionId: id,
        status,
        httpStatus: 409,
      });
    case "disconnected":
      return new AccountingConnectionSelectionError({
        code: "ACCOUNTING_CONNECTION_DISCONNECTED",
        message: "Accounting connection is disconnected; reconnect required.",
        connectionId: id,
        status,
        httpStatus: 409,
      });
    case "failed":
      return new AccountingConnectionSelectionError({
        code: "ACCOUNTING_CONNECTION_FAILED",
        message: "Accounting connection is in a failed state.",
        connectionId: id,
        status,
        httpStatus: 409,
      });
    case "pending":
      return new AccountingConnectionSelectionError({
        code: "ACCOUNTING_CONNECTION_NOT_READY",
        message: "Accounting connection is not ready yet.",
        connectionId: id,
        status,
        httpStatus: 422,
      });
    case "needs_entity_selection":
      return new AccountingConnectionSelectionError({
        code: "ACCOUNTING_CONNECTION_ENTITY_SELECTION_REQUIRED",
        message: "Accounting connection requires entity selection.",
        connectionId: id,
        status,
        httpStatus: 422,
      });
    default:
      return new AccountingConnectionSelectionError({
        code: "ACCOUNTING_CONNECTION_NOT_READY",
        message: `Accounting connection status "${status}" is not authoritative.`,
        connectionId: id,
        status,
        httpStatus: 422,
      });
  }
}

/**
 * Enforce authoritative status for an exact connection row.
 * Unknown/missing rows stay null (non-disclosing not-found).
 * For superseded rows without a validated successor, throws without successor id.
 */
export function assertExplicitConnectionAuthoritative(
  connection: AccountingConnectionRecord | null | undefined,
): AccountingConnectionRecord | null {
  if (!connection) return null;
  if (connection.status === "connected") return connection;
  throw mapNonConnectedStatus(connection);
}

async function loadConnectionById(
  supabase: ConnectionQueryClient,
  connectionId: string,
): Promise<AccountingConnectionRecord | null> {
  const { data, error } = await supabase
    .from("accounting_connections")
    .select("*")
    .eq("id", connectionId)
    .limit(1);
  if (error) throw error;
  return ((data?.[0] as AccountingConnectionRecord | undefined) || null);
}

/**
 * Throw ACCOUNTING_CONNECTION_SUPERSEDED (409). Exposes successorConnectionId only
 * after validating the successor grant identity (same user/provider/tenant, connected).
 */
export async function throwSupersededSelectionError(
  supabase: ConnectionQueryClient,
  connection: AccountingConnectionRecord,
): Promise<never> {
  let successorConnectionId: string | null = null;
  const candidateId = String(connection.superseded_by_connection_id || "").trim();
  if (candidateId && !isSelfSupersession(connection)) {
    const successor = await loadConnectionById(supabase, candidateId);
    if (isExposableSupersessionSuccessor({ predecessor: connection, successor })) {
      successorConnectionId = String(successor!.id);
    }
  }
  throw new AccountingConnectionSelectionError({
    code: "ACCOUNTING_CONNECTION_SUPERSEDED",
    message: "Accounting connection has been superseded; use the successor connection.",
    connectionId: String(connection.id),
    status: "superseded",
    httpStatus: 409,
    successorConnectionId,
  });
}

function throwAmbiguousSelection(args: {
  candidates: AccountingConnectionRecord[];
  scoped: boolean;
}): never {
  const ids = args.candidates.map((row) => String(row.id));
  throw new AccountingConnectionSelectionError({
    code: "ACCOUNTING_CONNECTION_AMBIGUOUS",
    message: args.scoped
      ? "Multiple connected accounting grants match the requested company/tenant scope; pass an explicit connectionId."
      : "Multiple connected accounting grants exist for this user; pass companyId, tenantOrRealmId, or an explicit connectionId.",
    connectionId: ids[0] || "",
    status: "connected",
    httpStatus: 409,
  });
}

function throwScopeMismatch(args: {
  connectionId: string;
  message: string;
}): never {
  throw new AccountingConnectionSelectionError({
    code: "ACCOUNTING_CONNECTION_SCOPE_MISMATCH",
    message: args.message,
    connectionId: args.connectionId,
    status: "connected",
    httpStatus: 409,
  });
}

export type CanonicalCompanyTenantResolution = {
  companyId: string;
  provider: ProviderKind;
  tenantId: string;
};

/**
 * Resolve company → provider tenant/realm from the canonical companies row.
 * Never uses metadata_json.company_id.
 */
export async function resolveCanonicalCompanyProviderTenant(
  supabase: ConnectionQueryClient,
  args: {
    companyId: string;
    userId: string;
    sourceSystem?: string | null;
  },
): Promise<CanonicalCompanyTenantResolution | null> {
  const safeCompanyId = rejectUserIdShapedCompanyId(args.companyId, args.userId);
  if (!safeCompanyId) return null;

  const { data, error } = await supabase
    .from("companies")
    .select("id, xero_tenant_id, qbo_realm_id")
    .eq("id", safeCompanyId)
    .limit(1);
  if (error) throw error;
  const company = (data?.[0] as
    | { id?: string; xero_tenant_id?: string | null; qbo_realm_id?: string | null }
    | undefined) || null;
  if (!company?.id) return null;

  const xeroTenant = deriveProviderTenantId(company.xero_tenant_id);
  const qboRealm = deriveProviderTenantId(company.qbo_realm_id);
  const requested = normalizeProvider(args.sourceSystem);

  let provider: ProviderKind | null = requested;
  if (!provider) {
    if (xeroTenant && !qboRealm) provider = "xero";
    else if (qboRealm && !xeroTenant) provider = "quickbooks";
    else return null; // ambiguous or unbound without explicit provider
  }

  const tenantId = provider === "xero" ? xeroTenant : qboRealm;
  if (!tenantId) return null;

  return { companyId: String(company.id), provider, tenantId };
}

async function assertOptionalScopeMatchesConnection(args: {
  supabase: ConnectionQueryClient;
  connection: AccountingConnectionRecord;
  userId: string;
  companyId?: string | null;
  tenantOrRealmId?: string | null;
  sourceSystem?: string | null;
}): Promise<void> {
  const companyId = String(args.companyId || "").trim();
  const requestedTenant = deriveProviderTenantId(args.tenantOrRealmId);
  if (!companyId && !requestedTenant) return;

  const connectionTenant = deriveProviderTenantId(args.connection.tenant_or_realm_id);
  if (requestedTenant && connectionTenant && requestedTenant !== connectionTenant) {
    throwScopeMismatch({
      connectionId: String(args.connection.id),
      message:
        "Explicit accounting connection tenant does not match the requested tenantOrRealmId scope.",
    });
  }

  if (!companyId) return;

  const canonical = await resolveCanonicalCompanyProviderTenant(args.supabase, {
    companyId,
    userId: args.userId,
    sourceSystem: args.sourceSystem || args.connection.provider,
  });
  if (!canonical) {
    throwScopeMismatch({
      connectionId: String(args.connection.id),
      message:
        "Explicit accounting connection could not be verified against the requested company scope.",
    });
  }
  if (connectionTenant && canonical.tenantId !== connectionTenant) {
    throwScopeMismatch({
      connectionId: String(args.connection.id),
      message:
        "Explicit accounting connection tenant does not match the company's canonical provider tenant.",
    });
  }
  if (requestedTenant && requestedTenant !== canonical.tenantId) {
    throwScopeMismatch({
      connectionId: String(args.connection.id),
      message:
        "Requested company and tenantOrRealmId disagree on the canonical provider tenant.",
    });
  }
}

async function selectConnectedByExactTenant(args: {
  supabase: ConnectionQueryClient;
  userId: string;
  tenantId: string;
  provider?: ProviderKind | null;
}): Promise<AccountingConnectionRecord | null> {
  let query = args.supabase
    .from("accounting_connections")
    .select("*")
    .eq("user_id", args.userId)
    .eq("status", "connected")
    .eq("tenant_or_realm_id", args.tenantId);
  if (args.provider) query = query.eq("provider", args.provider);
  // limit 2 only to detect ambiguity — not an authority window over a larger set.
  const { data, error } = await query.limit(2);
  if (error) throw error;
  const rows = (data || []) as AccountingConnectionRecord[];
  if (rows.length === 1) return rows[0];
  if (rows.length === 0) return null;
  throwAmbiguousSelection({ candidates: rows, scoped: true });
}

/**
 * Select a connection for active accounting context.
 * - Explicit connectionId: exact id + user (+ provider when supplied). No fallback.
 * - Optional company/tenant args on explicit path must not contradict the row.
 * - No connectionId:
 *     company → companies.xero_tenant_id / qbo_realm_id → exact tenant match
 *     else tenant → exact tenant match
 *     else exactly one connected grant for the user (+ provider)
 *     else fail closed (never newest-updated_at / never metadata company_id)
 */
export async function selectAccountingConnectionForActiveContext(args: {
  supabase: ConnectionQueryClient;
  userId: string;
  connectionId?: string | null;
  sourceSystem?: string | null;
  companyId?: string | null;
  tenantOrRealmId?: string | null;
}): Promise<AccountingConnectionRecord | null> {
  const explicitId = String(args.connectionId || "").trim();
  const provider = normalizeProvider(args.sourceSystem);
  const companyId = String(args.companyId || "").trim();
  const tenantOrRealmId = deriveProviderTenantId(args.tenantOrRealmId);

  if (explicitId) {
    let query = args.supabase
      .from("accounting_connections")
      .select("*")
      .eq("id", explicitId)
      .eq("user_id", args.userId);
    if (provider) query = query.eq("provider", provider);
    const { data, error } = await query.limit(1);
    if (error) throw error;
    const row = (data?.[0] as AccountingConnectionRecord | undefined) || null;
    if (!row) return null;
    if (row.status === "connected") {
      await assertOptionalScopeMatchesConnection({
        supabase: args.supabase,
        connection: row,
        userId: args.userId,
        companyId,
        tenantOrRealmId,
        sourceSystem: args.sourceSystem,
      });
      return row;
    }
    if (row.status === "superseded") {
      await throwSupersededSelectionError(args.supabase, row);
    }
    throw mapNonConnectedStatus(row);
  }

  if (companyId) {
    const canonical = await resolveCanonicalCompanyProviderTenant(args.supabase, {
      companyId,
      userId: args.userId,
      sourceSystem: args.sourceSystem,
    });
    if (!canonical) return null;
    if (tenantOrRealmId && tenantOrRealmId !== canonical.tenantId) {
      throwScopeMismatch({
        connectionId: "",
        message:
          "Requested company and tenantOrRealmId disagree on the canonical provider tenant.",
      });
    }
    return selectConnectedByExactTenant({
      supabase: args.supabase,
      userId: args.userId,
      tenantId: canonical.tenantId,
      provider: provider || canonical.provider,
    });
  }

  if (tenantOrRealmId) {
    return selectConnectedByExactTenant({
      supabase: args.supabase,
      userId: args.userId,
      tenantId: tenantOrRealmId,
      provider,
    });
  }

  // Unscoped: exactly one connected candidate, else fail closed.
  // limit 2 detects ambiguity without a recency-ordered authority window.
  let query = args.supabase
    .from("accounting_connections")
    .select("*")
    .eq("user_id", args.userId)
    .eq("status", "connected");
  if (provider) query = query.eq("provider", provider);
  const { data, error } = await query.limit(2);
  if (error) throw error;
  const rows = (data || []) as AccountingConnectionRecord[];
  if (rows.length === 1) return rows[0];
  if (rows.length === 0) return null;
  throwAmbiguousSelection({ candidates: rows, scoped: false });
}

export function accountingConnectionSelectionErrorBody(error: AccountingConnectionSelectionError) {
  const body: Record<string, unknown> = {
    error: error.message,
    code: error.code,
    status: error.status,
    connectionId: error.connectionId,
  };
  if (error.successorConnectionId) {
    body.successorConnectionId = error.successorConnectionId;
  }
  return body;
}
