/**
 * WBP W1c.4c — Preflight cache check for writeJournalEntry.
 *
 * Called from both provider writeJournalEntry paths BEFORE the underlying HTTP
 * write. Determines whether the account cache is stale (age > threshold) or
 * has a miss (write references an account_id / account_code not in cache) and
 * returns a typed decision. Callers act on `shouldRefresh` and pass `trigger`
 * to the subsequent refreshAccountsCache invocation so the lifecycle event
 * records the accurate self-heal cause.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CacheRefreshedPayload } from "./types";

const DEFAULT_MAX_AGE_HOURS = 24;

function getMaxAgeHours(): number {
  const raw = process.env.ACCOUNTS_CACHE_MAX_AGE_HOURS;
  if (!raw) return DEFAULT_MAX_AGE_HOURS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_MAX_AGE_HOURS;
  return n;
}

export type PreflightCacheDecision =
  | { shouldRefresh: false; reason: "fresh" }
  | {
      shouldRefresh: true;
      trigger: Extract<CacheRefreshedPayload["trigger"], "preflight-stale" | "preflight-miss">;
      ageHours: number | null;
    };

export type QboPreflightCacheInput = {
  admin: SupabaseClient;
  connectionId: string;
  /** account_ids that the pending journal entry references (QBO business key). */
  referencedAccountIds: string[];
};

export type XeroPreflightCacheInput = {
  admin: SupabaseClient;
  connectionId: string;
  /** account_codes that the pending journal entry references (Xero business key). */
  referencedAccountCodes: string[];
};

/**
 * Check the cache for a QBO connection. Fires "preflight-miss" first (highest
 * signal — a genuine unknown account), falls back to "preflight-stale" if age
 * exceeded, otherwise "fresh".
 */
export async function checkQboCacheForWrite(
  input: QboPreflightCacheInput,
): Promise<PreflightCacheDecision> {
  const { admin, connectionId, referencedAccountIds } = input;

  if (referencedAccountIds.length > 0) {
    const { data } = await admin
      .from("qbo_accounts_cache")
      .select("account_id, active")
      .eq("connection_id", connectionId)
      .in("account_id", referencedAccountIds);
    const foundActive = new Set(
      (data ?? []).filter((r) => r.active === true).map((r) => String(r.account_id)),
    );
    const missing = referencedAccountIds.filter((id) => !foundActive.has(id));
    if (missing.length > 0) {
      return { shouldRefresh: true, trigger: "preflight-miss", ageHours: null };
    }
  }

  const { data: ageRow } = await admin
    .from("qbo_accounts_cache")
    .select("cached_at")
    .eq("connection_id", connectionId)
    .order("cached_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!ageRow?.cached_at) {
    return { shouldRefresh: true, trigger: "preflight-miss", ageHours: null };
  }

  const cachedAtMs = Date.parse(String(ageRow.cached_at));
  const ageHours = (Date.now() - cachedAtMs) / (1000 * 60 * 60);
  if (ageHours > getMaxAgeHours()) {
    return { shouldRefresh: true, trigger: "preflight-stale", ageHours };
  }

  return { shouldRefresh: false, reason: "fresh" };
}

/**
 * Check the cache for a Xero connection. Same shape as QBO but keys on
 * account_code (Xero business key) and account status='ACTIVE'.
 */
export async function checkXeroCacheForWrite(
  input: XeroPreflightCacheInput,
): Promise<PreflightCacheDecision> {
  const { admin, connectionId, referencedAccountCodes } = input;

  if (referencedAccountCodes.length > 0) {
    const { data } = await admin
      .from("xero_accounts_cache")
      .select("account_code, status")
      .eq("connection_id", connectionId)
      .in("account_code", referencedAccountCodes);
    const foundActive = new Set(
      (data ?? []).filter((r) => r.status === "ACTIVE").map((r) => String(r.account_code)),
    );
    const missing = referencedAccountCodes.filter((c) => !foundActive.has(c));
    if (missing.length > 0) {
      return { shouldRefresh: true, trigger: "preflight-miss", ageHours: null };
    }
  }

  const { data: ageRow } = await admin
    .from("xero_accounts_cache")
    .select("cached_at")
    .eq("connection_id", connectionId)
    .order("cached_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!ageRow?.cached_at) {
    return { shouldRefresh: true, trigger: "preflight-miss", ageHours: null };
  }

  const cachedAtMs = Date.parse(String(ageRow.cached_at));
  const ageHours = (Date.now() - cachedAtMs) / (1000 * 60 * 60);
  if (ageHours > getMaxAgeHours()) {
    return { shouldRefresh: true, trigger: "preflight-stale", ageHours };
  }

  return { shouldRefresh: false, reason: "fresh" };
}
