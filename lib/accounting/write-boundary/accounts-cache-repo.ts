// WBP W1b — Data access for xero_accounts_cache / qbo_accounts_cache.
// Only module in write-boundary that talks to these tables directly.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { XeroAccountSnapshot, QboAccountSnapshot } from "./types";

export async function readXeroAccounts(
  admin: SupabaseClient,
  connectionId: string,
): Promise<XeroAccountSnapshot[]> {
  const { data, error } = await admin
    .from("xero_accounts_cache")
    .select("*")
    .eq("connection_id", connectionId)
    .eq("status", "ACTIVE");
  if (error) {
    throw new Error(`readXeroAccounts failed for connection ${connectionId}: ${error.message}`);
  }
  return (data ?? []) as XeroAccountSnapshot[];
}

export async function readQboAccounts(
  admin: SupabaseClient,
  connectionId: string,
): Promise<QboAccountSnapshot[]> {
  const { data, error } = await admin
    .from("qbo_accounts_cache")
    .select("*")
    .eq("connection_id", connectionId)
    .eq("active", true);
  if (error) {
    throw new Error(`readQboAccounts failed for connection ${connectionId}: ${error.message}`);
  }
  return (data ?? []) as QboAccountSnapshot[];
}

export type XeroAccountUpsertInput = Omit<XeroAccountSnapshot, "cached_at"> & {
  cached_at?: string;
};

export async function upsertXeroAccounts(
  admin: SupabaseClient,
  rows: XeroAccountUpsertInput[],
): Promise<{ inserted: number; updated: number }> {
  if (rows.length === 0) return { inserted: 0, updated: 0 };
  const { data, error } = await admin
    .from("xero_accounts_cache")
    .upsert(rows, { onConflict: "connection_id,account_code", ignoreDuplicates: false })
    .select("id");
  if (error) {
    throw new Error(`upsertXeroAccounts failed: ${error.message}`);
  }
  // Supabase upsert doesn't distinguish inserted vs updated in return count.
  // Return both as totalReturned; the caller uses the delta from a prior count.
  const total = data?.length ?? 0;
  return { inserted: total, updated: 0 };
}

export type QboAccountUpsertInput = Omit<QboAccountSnapshot, "cached_at"> & {
  cached_at?: string;
};

export async function upsertQboAccounts(
  admin: SupabaseClient,
  rows: QboAccountUpsertInput[],
): Promise<{ inserted: number; updated: number }> {
  if (rows.length === 0) return { inserted: 0, updated: 0 };
  const { data, error } = await admin
    .from("qbo_accounts_cache")
    .upsert(rows, { onConflict: "connection_id,account_id", ignoreDuplicates: false })
    .select("id");
  if (error) {
    throw new Error(`upsertQboAccounts failed: ${error.message}`);
  }
  const total = data?.length ?? 0;
  return { inserted: total, updated: 0 };
}

export async function countXeroAccounts(
  admin: SupabaseClient,
  connectionId: string,
): Promise<number> {
  const { count, error } = await admin
    .from("xero_accounts_cache")
    .select("id", { count: "exact", head: true })
    .eq("connection_id", connectionId);
  if (error) throw new Error(`countXeroAccounts failed: ${error.message}`);
  return count ?? 0;
}

export async function countQboAccounts(
  admin: SupabaseClient,
  connectionId: string,
): Promise<number> {
  const { count, error } = await admin
    .from("qbo_accounts_cache")
    .select("id", { count: "exact", head: true })
    .eq("connection_id", connectionId);
  if (error) throw new Error(`countQboAccounts failed: ${error.message}`);
  return count ?? 0;
}

// =========================================================================
// WBP W1c.4a — Extensions for refreshAccountsCache
// =========================================================================

/**
 * Read ALL Xero accounts regardless of status — needed for accurate diff
 * during cache refresh. `readXeroAccounts` filters by status='ACTIVE' and
 * cannot see accounts we need to mark inactive.
 */
export async function readAllXeroAccounts(
  admin: SupabaseClient,
  connectionId: string,
): Promise<XeroAccountSnapshot[]> {
  const { data, error } = await admin
    .from("xero_accounts_cache")
    .select("*")
    .eq("connection_id", connectionId);
  if (error) {
    throw new Error(`readAllXeroAccounts failed for connection ${connectionId}: ${error.message}`);
  }
  return (data ?? []) as XeroAccountSnapshot[];
}

/**
 * Read ALL QBO accounts regardless of active flag — needed for accurate diff.
 * `readQboAccounts` filters active=true.
 */
export async function readAllQboAccounts(
  admin: SupabaseClient,
  connectionId: string,
): Promise<QboAccountSnapshot[]> {
  const { data, error } = await admin
    .from("qbo_accounts_cache")
    .select("*")
    .eq("connection_id", connectionId);
  if (error) {
    throw new Error(`readAllQboAccounts failed for connection ${connectionId}: ${error.message}`);
  }
  return (data ?? []) as QboAccountSnapshot[];
}

/**
 * Mark Xero accounts inactive when they no longer appear upstream. NEVER
 * hard-deletes — audit trail requires preserving historical account references
 * from prior journal entries.
 *
 * `exceptCodes` is the set of account_codes still present upstream (i.e.
 * everything not in this set becomes ARCHIVED).
 *
 * Safety guard: bails out on empty exceptCodes to defend against transient
 * upstream failures that return `{ Accounts: [] }`.
 */
export async function markXeroAccountsInactive(
  admin: SupabaseClient,
  connectionId: string,
  exceptCodes: string[],
): Promise<number> {
  if (exceptCodes.length === 0) return 0;

  const { data, error } = await admin
    .from("xero_accounts_cache")
    .update({ status: "ARCHIVED" })
    .eq("connection_id", connectionId)
    .neq("status", "ARCHIVED")
    .not("account_code", "in", `(${exceptCodes.map((c) => `"${c}"`).join(",")})`)
    .select("id");

  if (error) {
    throw new Error(`markXeroAccountsInactive failed: ${error.message}`);
  }
  return data?.length ?? 0;
}

/**
 * Mark QBO accounts inactive (active=false) when they no longer appear upstream.
 * Same safety guard against transient upstream empty responses.
 */
export async function markQboAccountsInactive(
  admin: SupabaseClient,
  connectionId: string,
  exceptIds: string[],
): Promise<number> {
  if (exceptIds.length === 0) return 0;

  const { data, error } = await admin
    .from("qbo_accounts_cache")
    .update({ active: false })
    .eq("connection_id", connectionId)
    .eq("active", true)
    .not("account_id", "in", `(${exceptIds.map((c) => `"${c}"`).join(",")})`)
    .select("id");

  if (error) {
    throw new Error(`markQboAccountsInactive failed: ${error.message}`);
  }
  return data?.length ?? 0;
}
