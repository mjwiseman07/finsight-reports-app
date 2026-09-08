/**
 * PR D — reconnect-in-place for accounting_connections OAuth grants.
 *
 * Product rule: OAuth reconnect refreshes authorization; it does NOT re-elect
 * accounting truth. When a connected row already exists for
 * (user_id, provider, tenant_or_realm_id), update that same row so the
 * connection id and sync-pointer lineage stay stable while credentials rotate.
 *
 * Authority lookup key (matches partial unique index):
 *   user_id + provider + tenant_or_realm_id
 * when status='connected' AND tenant_or_realm_id IS NOT NULL.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { rejectUserIdShapedCompanyId } from "./resolve-or-create-company";
import {
  resolvePersistedQboProviderEnvironment,
  type PersistedQboProviderEnvironment,
} from "@/lib/erp/quickbooks/persisted-provider-environment";
import {
  QboCredentialCasError,
  updateCanonicalQboCredentialsConditional,
} from "./canonical-qbo-credential-cas";
import type {
  AccountingConnectionRecord,
  AccountingConnectionStatus,
  AccountingProvider,
} from "./types";

export { QboCredentialCasError };

const REVIVABLE_STATUSES: AccountingConnectionStatus[] = [
  "pending",
  "needs_entity_selection",
  "expired",
  "disconnected",
  "failed",
];

/** Lineage / memory keys that reconnect must not wipe. */
export const PRESERVED_CONNECTION_METADATA_KEYS = [
  "active_normalized_sync_id",
  "last_sync_id",
  "latest_sync_by_source",
  "last_synced_at",
  "connected_at",
] as const;

export type PersistCanonicalGrantOutcome =
  | "updated_connected"
  | "revived"
  | "inserted"
  | "updated_tenantless";

export interface PersistCanonicalConnectionGrantArgs {
  admin: SupabaseClient;
  userId: string;
  provider: AccountingProvider;
  providerFamily: string;
  providerProduct: string;
  tenantOrRealmId: string | null;
  externalEntityId: string | null;
  externalEntityName: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  scopes: string[];
  status: AccountingConnectionStatus;
  /** Fresh OAuth / entity fields. Must not include user_id-shaped company_id. */
  metadataPatch: Record<string, unknown>;
  /** Canonical companies.id when known; never user_id. */
  companyId?: string | null;
  /** QBO / lead extras (home_currency, qbo_edition, …). */
  extraColumns?: Record<string, unknown>;
  nowIso?: string;
  /**
   * Verified OAuth-state environment for QuickBooks. When supplied, must equal
   * the current server QB_ENVIRONMENT. Never accepted from browser input.
   */
  verifiedProviderEnvironment?: PersistedQboProviderEnvironment | null;
}

export class AmbiguousAccountingConnectionGrantError extends Error {
  constructor(message = "Multiple accounting connection grants matched authority") {
    super(message);
    this.name = "AmbiguousAccountingConnectionGrantError";
  }
}

export class QboProviderEnvironmentAuthorityError extends Error {
  readonly code: "missing" | "mismatch";

  constructor(code: "missing" | "mismatch", message: string) {
    super(message);
    this.name = "QboProviderEnvironmentAuthorityError";
    this.code = code;
  }
}

export interface PersistCanonicalConnectionGrantResult {
  connectionId: string;
  outcome: PersistCanonicalGrantOutcome;
}

type GrantRow = Pick<AccountingConnectionRecord, "id" | "status" | "metadata_json"> & {
  updated_at?: string | null;
  tenant_or_realm_id?: string | null;
};

/** Partial unique index enforcing one connected grant per authority key. */
export const ACCOUNTING_CONNECTIONS_ONE_CONNECTED_GRANT_UIDX =
  "accounting_connections_one_connected_grant_uidx";

/**
 * Canonical OAuth custody columns that must never be supplied via extraColumns.
 * provider_environment for QuickBooks is derived only from deployment QB_ENVIRONMENT.
 */
export const RESERVED_CANONICAL_CONNECTION_EXTRA_COLUMNS = [
  "provider_environment",
] as const;

export class ReservedCanonicalConnectionExtraColumnError extends Error {
  readonly column: string;

  constructor(column: string) {
    super(
      `Reserved canonical connection column cannot be supplied via extraColumns: ${column}`,
    );
    this.name = "ReservedCanonicalConnectionExtraColumnError";
    this.column = column;
  }
}

export function assertNoReservedExtraColumns(
  extraColumns: Record<string, unknown> | undefined,
): void {
  if (!extraColumns) return;
  for (const key of RESERVED_CANONICAL_CONNECTION_EXTRA_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(extraColumns, key)) {
      throw new ReservedCanonicalConnectionExtraColumnError(key);
    }
  }
}

function asErrorRecord(error: unknown): { code?: string; message?: string } {
  if (!error || typeof error !== "object") return {};
  return error as { code?: string; message?: string };
}

/**
 * True only for a unique violation on the connected-grant authority index.
 * Bare 23505 is not enough — unrelated unique constraints must not trigger
 * reconnect race recovery (credential redirect onto an existing grant).
 */
export function isAccountingConnectionsUniqueViolation(error: unknown): boolean {
  const { code, message } = asErrorRecord(error);
  if (code !== "23505") return false;
  const text = String(message || "");
  return text.includes(ACCOUNTING_CONNECTIONS_ONE_CONNECTED_GRANT_UIDX);
}

/**
 * Merge reconnect metadata onto an existing row.
 * Incoming OAuth fields win; lineage pointers and original connected_at are kept
 * unless absent on the existing row.
 */
export function mergeConnectionGrantMetadata(args: {
  existing: Record<string, unknown> | null | undefined;
  incoming: Record<string, unknown>;
  userId: string;
  companyId?: string | null;
}): Record<string, unknown> {
  const existing = { ...(args.existing || {}) };
  const merged: Record<string, unknown> = {
    ...existing,
    ...args.incoming,
  };

  for (const key of PRESERVED_CONNECTION_METADATA_KEYS) {
    const prior = existing[key];
    if (prior !== undefined && prior !== null && prior !== "") {
      merged[key] = prior;
    }
  }

  const resolvedCompany =
    rejectUserIdShapedCompanyId(args.companyId, args.userId) ||
    rejectUserIdShapedCompanyId(merged.company_id, args.userId) ||
    rejectUserIdShapedCompanyId(existing.company_id, args.userId);

  if (resolvedCompany) {
    merged.company_id = resolvedCompany;
  } else {
    delete merged.company_id;
  }

  if (!merged.connected_at) {
    merged.connected_at = args.incoming.connected_at || args.incoming.last_reconnected_at || null;
  }
  if (args.incoming.last_reconnected_at) {
    merged.last_reconnected_at = args.incoming.last_reconnected_at;
  }

  return merged;
}

async function selectConnectedGrant(
  admin: SupabaseClient,
  userId: string,
  provider: AccountingProvider,
  tenantOrRealmId: string,
): Promise<GrantRow | null> {
  const { data, error } = await admin
    .from("accounting_connections")
    .select("id, status, metadata_json, updated_at, tenant_or_realm_id")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("tenant_or_realm_id", tenantOrRealmId)
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(2);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  if (rows.length > 1) throw new AmbiguousAccountingConnectionGrantError();
  return (rows[0] as GrantRow | undefined) || null;
}

async function selectRevivableGrant(
  admin: SupabaseClient,
  userId: string,
  provider: AccountingProvider,
  tenantOrRealmId: string,
): Promise<GrantRow | null> {
  const { data, error } = await admin
    .from("accounting_connections")
    .select("id, status, metadata_json, updated_at")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("tenant_or_realm_id", tenantOrRealmId)
    .in("status", REVIVABLE_STATUSES)
    .order("updated_at", { ascending: false })
    .limit(2);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  if (rows.length > 1) throw new AmbiguousAccountingConnectionGrantError();
  return (rows[0] as GrantRow | undefined) || null;
}

async function selectTenantlessGrant(
  admin: SupabaseClient,
  userId: string,
  provider: AccountingProvider,
): Promise<GrantRow | null> {
  const { data, error } = await admin
    .from("accounting_connections")
    .select("id, status, metadata_json, tenant_or_realm_id, updated_at")
    .eq("user_id", userId)
    .eq("provider", provider)
    .is("tenant_or_realm_id", null)
    .neq("status", "superseded")
    .order("updated_at", { ascending: false })
    .limit(2);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  if (rows.length > 1) throw new AmbiguousAccountingConnectionGrantError();
  return (rows[0] as GrantRow | undefined) || null;
}

function resolveQboProviderEnvironmentForWrite(
  args: PersistCanonicalConnectionGrantArgs,
): PersistedQboProviderEnvironment {
  const serverEnv = resolvePersistedQboProviderEnvironment();
  if (args.verifiedProviderEnvironment != null) {
    if (args.verifiedProviderEnvironment !== serverEnv) {
      throw new QboProviderEnvironmentAuthorityError(
        "mismatch",
        "Verified OAuth provider environment does not match server configuration",
      );
    }
    return args.verifiedProviderEnvironment;
  }
  return serverEnv;
}

function buildWritePayload(args: PersistCanonicalConnectionGrantArgs, metadata: Record<string, unknown>) {
  assertNoReservedExtraColumns(args.extraColumns);
  const nowIso = args.nowIso || new Date().toISOString();
  const providerEnvironment =
    args.provider === "quickbooks" ? resolveQboProviderEnvironmentForWrite(args) : null;
  const safeExtraColumns = args.extraColumns || {};
  return {
    user_id: args.userId,
    provider: args.provider,
    provider_family: args.providerFamily,
    provider_product: args.providerProduct,
    external_entity_id: args.externalEntityId,
    external_entity_name: args.externalEntityName,
    access_token: args.accessToken,
    refresh_token: args.refreshToken,
    token_expires_at: args.tokenExpiresAt,
    tenant_or_realm_id: args.tenantOrRealmId,
    scopes: args.scopes,
    status: args.status,
    metadata_json: metadata,
    updated_at: nowIso,
    ...safeExtraColumns,
    ...(providerEnvironment ? { provider_environment: providerEnvironment } : {}),
  };
}

/**
 * Non-QuickBooks (or non-credential) updates only. QuickBooks credential
 * updates must use updateCanonicalQboCredentialsConditional.
 */
async function updateGrantByIdUnconditional(
  admin: SupabaseClient,
  connectionId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await admin
    .from("accounting_connections")
    .update(payload)
    .eq("id", connectionId)
    .select("id")
    .limit(1);
  if (error) throw error;
  const id = data?.[0]?.id ? String(data[0].id) : connectionId;
  return id;
}

async function updateQuickBooksGrantConditional(
  args: PersistCanonicalConnectionGrantArgs,
  existing: GrantRow,
  payload: Record<string, unknown>,
  tenantId: string,
): Promise<string> {
  const concurrencyToken = String(existing.updated_at || "").trim();
  if (!concurrencyToken) {
    throw new QboCredentialCasError(
      "missing_concurrency_token",
      "Connection concurrency token is missing",
    );
  }
  const providerEnvironment =
    typeof payload.provider_environment === "string"
      ? (payload.provider_environment as "sandbox" | "production")
      : undefined;
  if (!providerEnvironment) {
    throw new QboProviderEnvironmentAuthorityError(
      "missing",
      "QuickBooks provider environment is required for credential persistence",
    );
  }

  await updateCanonicalQboCredentialsConditional(
    args.admin,
    {
      connectionId: existing.id,
      userId: args.userId,
      tenantOrRealmId: tenantId,
      concurrencyToken,
      expectedStatus: existing.status || "connected",
      // OAuth grant rotation must not require the prior refresh_token match —
      // CAS on updated_at + binding is the concurrency gate.
    },
    {
      accessToken: String(payload.access_token || ""),
      refreshToken: String(payload.refresh_token || ""),
      tokenExpiresAt: String(payload.token_expires_at || ""),
      updatedAt: String(payload.updated_at || args.nowIso || new Date().toISOString()),
      providerEnvironment,
      status: payload.status != null ? String(payload.status) : args.status,
      externalEntityId:
        payload.external_entity_id === undefined
          ? undefined
          : (payload.external_entity_id as string | null),
      externalEntityName:
        payload.external_entity_name === undefined
          ? undefined
          : (payload.external_entity_name as string | null),
      scopes: Array.isArray(payload.scopes) ? (payload.scopes as string[]) : undefined,
      metadataJson:
        payload.metadata_json && typeof payload.metadata_json === "object"
          ? (payload.metadata_json as Record<string, unknown>)
          : undefined,
      homeCurrency:
        payload.home_currency === undefined
          ? undefined
          : (payload.home_currency as string | null),
      qboEdition:
        payload.qbo_edition === undefined ? undefined : (payload.qbo_edition as string | null),
      qboSubscriptionStatus:
        payload.qbo_subscription_status === undefined
          ? undefined
          : (payload.qbo_subscription_status as string | null),
      clearSupersededBy: true,
    },
  );
  return existing.id;
}

async function insertGrant(
  admin: SupabaseClient,
  payload: Record<string, unknown>,
  createdAt: string,
): Promise<{ connectionId: string } | { uniqueViolation: true }> {
  const { data, error } = await admin
    .from("accounting_connections")
    .insert({
      ...payload,
      created_at: createdAt,
    })
    .select("id")
    .limit(1);
  if (error) {
    if (isAccountingConnectionsUniqueViolation(error)) return { uniqueViolation: true };
    throw error;
  }
  const id = data?.[0]?.id ? String(data[0].id) : "";
  if (!id) throw new Error("Accounting connection insert returned no id");
  return { connectionId: id };
}

/**
 * Persist an OAuth grant against the canonical connected row for the authority key.
 * Disconnected / expired / failed / needs_entity_selection rows may be revived when
 * no connected row exists. Superseded rows are never revived.
 */
export async function persistCanonicalAccountingConnectionGrant(
  args: PersistCanonicalConnectionGrantArgs,
): Promise<PersistCanonicalConnectionGrantResult> {
  const nowIso = args.nowIso || new Date().toISOString();
  const tenantId = args.tenantOrRealmId ? String(args.tenantOrRealmId).trim() : "";

  const buildMergedMetadata = (existing: Record<string, unknown> | null | undefined) =>
    mergeConnectionGrantMetadata({
      existing: existing || {},
      incoming: {
        ...args.metadataPatch,
        last_reconnected_at: nowIso,
        ...(existing?.connected_at ? {} : { connected_at: args.metadataPatch.connected_at || nowIso }),
      },
      userId: args.userId,
      companyId: args.companyId,
    });

  const applyUpdate = async (
    existing: GrantRow,
    outcome: PersistCanonicalGrantOutcome,
  ): Promise<PersistCanonicalConnectionGrantResult> => {
    const metadata = buildMergedMetadata(existing.metadata_json || {});
    const payload = buildWritePayload(args, metadata);
    try {
      if (args.provider === "quickbooks") {
        if (!tenantId) {
          throw new QboCredentialCasError(
            "missing_binding",
            "QuickBooks credential updates require a realm binding",
          );
        }
        const connectionId = await updateQuickBooksGrantConditional(
          args,
          existing,
          { ...payload, superseded_by_connection_id: null },
          tenantId,
        );
        return { connectionId, outcome };
      }
      const connectionId = await updateGrantByIdUnconditional(args.admin, existing.id, {
        ...payload,
        superseded_by_connection_id: null,
      });
      return { connectionId, outcome };
    } catch (error) {
      if (error instanceof QboCredentialCasError) throw error;
      // Revive race: another request already created the connected grant.
      if (tenantId && isAccountingConnectionsUniqueViolation(error)) {
        const raced = await selectConnectedGrant(args.admin, args.userId, args.provider, tenantId);
        if (raced && raced.id !== existing.id) {
          const racedMetadata = buildMergedMetadata(raced.metadata_json || {});
          const racedPayload = buildWritePayload(args, racedMetadata);
          if (args.provider === "quickbooks") {
            const connectionId = await updateQuickBooksGrantConditional(
              args,
              raced,
              { ...racedPayload, superseded_by_connection_id: null },
              tenantId,
            );
            return { connectionId, outcome: "updated_connected" };
          }
          const connectionId = await updateGrantByIdUnconditional(args.admin, raced.id, {
            ...racedPayload,
            superseded_by_connection_id: null,
          });
          return { connectionId, outcome: "updated_connected" };
        }
      }
      throw error;
    }
  };

  if (tenantId) {
    const connected = await selectConnectedGrant(args.admin, args.userId, args.provider, tenantId);
    if (connected) return applyUpdate(connected, "updated_connected");

    const revivable = await selectRevivableGrant(args.admin, args.userId, args.provider, tenantId);
    if (revivable) return applyUpdate(revivable, "revived");

    const metadata = buildMergedMetadata({});
    const payload = buildWritePayload(args, metadata);
    const inserted = await insertGrant(args.admin, payload, nowIso);
    if ("connectionId" in inserted) {
      return { connectionId: inserted.connectionId, outcome: "inserted" };
    }

    // Race: another request won the unique connected grant — refresh that row.
    const raced = await selectConnectedGrant(args.admin, args.userId, args.provider, tenantId);
    if (!raced) {
      throw new Error(
        `Accounting connection unique violation for ${args.provider} tenant ${tenantId} but no connected row found`,
      );
    }
    return applyUpdate(raced, "updated_connected");
  }

  // Tenant-less (organization selection still required): never overwrite a
  // tenant-scoped connected grant. Only reuse null-tenant rows.
  const tenantless = await selectTenantlessGrant(args.admin, args.userId, args.provider);
  if (tenantless) return applyUpdate(tenantless, "updated_tenantless");

  const metadata = buildMergedMetadata({});
  const payload = buildWritePayload(args, metadata);
  const inserted = await insertGrant(args.admin, payload, nowIso);
  if ("connectionId" in inserted) {
    return { connectionId: inserted.connectionId, outcome: "inserted" };
  }
  throw new Error("Unexpected unique violation inserting tenant-less accounting connection");
}
