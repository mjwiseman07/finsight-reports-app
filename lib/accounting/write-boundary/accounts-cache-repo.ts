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
