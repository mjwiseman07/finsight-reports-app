/**
 * WBP W1c.4b — Pure diff computation for account cache refreshes.
 *
 * Compares an upstream account list (freshly fetched) against the cached
 * snapshot to compute added / updated / removed sets. Runs entirely in-memory
 * so the caller can pass the results to markInactive + upsert + emit + memory
 * without additional DB round trips.
 *
 * Update-detection compares raw_payload JSON.stringify equality against the
 * cached row's raw_payload — any material field change (name, type, active,
 * sub-type, currency, parent, etc.) triggers "updated". This is deliberately
 * conservative: a customer renaming an account in QBO is a memory-worthy event
 * even if their COA classification hasn't changed.
 */

import type { QboAccountSnapshot, XeroAccountSnapshot } from "./types";
import type { QboAccountUpsertInput, XeroAccountUpsertInput } from "./accounts-cache-repo";

export type AccountsCacheDiff = {
  addedCount: number;
  updatedCount: number;
  removedCount: number;
  /**
   * Codes/IDs of accounts that changed in any way (added, updated, or removed).
   * Populated for the CacheRefreshedPayload.changed_account_codes field so
   * Pulse can surface "3 new/changed accounts since last review" insights.
   */
  changedIdentifiers: string[];
};

/**
 * Compare upstream QBO accounts (freshly fetched, transformed to upsert-input rows)
 * against the current cached snapshots.
 */
export function diffQboAccounts(
  cached: QboAccountSnapshot[],
  upstream: QboAccountUpsertInput[],
): AccountsCacheDiff {
  const cachedById = new Map(cached.map((r) => [r.account_id, r]));
  const upstreamIds = new Set(upstream.map((r) => r.account_id));

  let added = 0;
  let updated = 0;
  const changed: string[] = [];

  for (const u of upstream) {
    const prior = cachedById.get(u.account_id);
    if (!prior) {
      added += 1;
      changed.push(u.account_id);
      continue;
    }
    // Prior existed — check for material changes.
    // We stringify raw_payload from both sides: cached.raw_payload is the
    // last upstream snapshot we saw, upstream row's raw_payload is now.
    // If equal, no update. Anything different (rename, type change, activation
    // flip, etc.) counts.
    const priorRaw = JSON.stringify(prior.raw_payload ?? {});
    const nowRaw = JSON.stringify(u.raw_payload ?? {});
    if (priorRaw !== nowRaw) {
      updated += 1;
      changed.push(u.account_id);
    }
  }

  // Removed = cached rows that are ACTIVE but not present in upstream anymore.
  // We only count "active → gone upstream" as removed; already-inactive rows
  // that are still missing upstream aren't a state change.
  let removed = 0;
  for (const c of cached) {
    if (c.active === true && !upstreamIds.has(c.account_id)) {
      removed += 1;
      changed.push(c.account_id);
    }
  }

  return {
    addedCount: added,
    updatedCount: updated,
    removedCount: removed,
    changedIdentifiers: changed,
  };
}

/**
 * Compare upstream Xero accounts (freshly fetched, transformed to upsert-input
 * rows) against the current cached snapshots. Xero uses account_code as the
 * business key (not account_id — Xero has both, but account_code is what
 * appears on financial reports and what upstream users edit).
 */
export function diffXeroAccounts(
  cached: XeroAccountSnapshot[],
  upstream: XeroAccountUpsertInput[],
): AccountsCacheDiff {
  const cachedByCode = new Map(cached.map((r) => [r.account_code, r]));
  const upstreamCodes = new Set(upstream.map((r) => r.account_code));

  let added = 0;
  let updated = 0;
  const changed: string[] = [];

  for (const u of upstream) {
    const prior = cachedByCode.get(u.account_code);
    if (!prior) {
      added += 1;
      changed.push(u.account_code);
      continue;
    }
    const priorRaw = JSON.stringify(prior.raw_payload ?? {});
    const nowRaw = JSON.stringify(u.raw_payload ?? {});
    if (priorRaw !== nowRaw) {
      updated += 1;
      changed.push(u.account_code);
    }
  }

  // "Removed" = cached row with status='ACTIVE' but no longer in upstream.
  // Xero's business-facing status field: 'ACTIVE' (live) vs 'ARCHIVED' (marked
  // by us when previously seen but now gone upstream).
  let removed = 0;
  for (const c of cached) {
    if (c.status === "ACTIVE" && !upstreamCodes.has(c.account_code)) {
      removed += 1;
      changed.push(c.account_code);
    }
  }

  return {
    addedCount: added,
    updatedCount: updated,
    removedCount: removed,
    changedIdentifiers: changed,
  };
}
