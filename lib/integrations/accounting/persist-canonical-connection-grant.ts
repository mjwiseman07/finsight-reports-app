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
import type {
  AccountingConnectionRecord,
  AccountingConnectionStatus,
  AccountingProvider,
} from "./types";

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
}

export interface PersistCanonicalConnectionGrantResult {
  connectionId: string;
  outcome: PersistCanonicalGrantOutcome;
}

type GrantRow = Pick<AccountingConnectionRecord, "id" | "status" | "metadata_json">;

function asErrorRecord(error: unknown): { code?: string; message?: string } {
  if (!error || typeof error !== "object") return {};
  return error as { code?: string; message?: string };
}

export function isAccountingConnectionsUniqueViolation(error: unknown): boolean {
  const { code, message } = asErrorRecord(error);
  if (code === "23505") return true;
  const text = String(message || "");
  return (
    /duplicate key|unique constraint|unique_violation/i.test(text) &&
    /accounting_connections_one_connected_grant_uidx|accounting_connections/i.test(text)
  );
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
    .select("id, status, metadata_json")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("tenant_or_realm_id", tenantOrRealmId)
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0] as GrantRow | undefined) || null;
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
    .limit(1);
  if (error) throw error;
  return (data?.[0] as GrantRow | undefined) || null;
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
    .limit(1);
  if (error) throw error;
  return (data?.[0] as GrantRow | undefined) || null;
}

function buildWritePayload(args: PersistCanonicalConnectionGrantArgs, metadata: Record<string, unknown>) {
  const nowIso = args.nowIso || new Date().toISOString();
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
    ...(args.extraColumns || {}),
  };
}

async function updateGrantById(
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
      const connectionId = await updateGrantById(args.admin, existing.id, {
        ...payload,
        superseded_by_connection_id: null,
      });
      return { connectionId, outcome };
    } catch (error) {
      // Revive race: another request already created the connected grant.
      if (tenantId && isAccountingConnectionsUniqueViolation(error)) {
        const raced = await selectConnectedGrant(args.admin, args.userId, args.provider, tenantId);
        if (raced && raced.id !== existing.id) {
          const racedMetadata = buildMergedMetadata(raced.metadata_json || {});
          const racedPayload = buildWritePayload(args, racedMetadata);
          const connectionId = await updateGrantById(args.admin, raced.id, {
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
