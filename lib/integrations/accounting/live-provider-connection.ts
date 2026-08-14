/**
 * Live provider access vs historical connection identity.
 *
 * Only status=connected (and needs_entity_selection for pre-connect entity pick)
 * may use live provider authorization. superseded rows are permanent historical
 * evidence but credential-dead — never refresh or provider-fetch through them.
 *
 * Split responsibilities:
 * - getAccountingConnectionRecordForUser: evidence / identity lookup (no tokens)
 * - getLiveProviderConnectionForUser / getConnectionForUser: live-token gateway
 */
import { supabaseAdmin } from "../../supabase";
import {
  AccountingConnectionSelectionError,
  selectAccountingConnectionForActiveContext,
} from "./connection-selection";
import { ensureFreshTokens } from "./ensure-fresh-tokens";
import type { AccountingConnectionRecord, AccountingConnectionStatus } from "./types";

const LIVE_PROVIDER_STATUSES = new Set<AccountingConnectionStatus>([
  "connected",
  "needs_entity_selection",
]);

function requireSupabase() {
  if (!supabaseAdmin) throw new Error("Supabase admin client is not configured");
  return supabaseAdmin;
}

export function isLiveProviderConnectionStatus(
  status: AccountingConnectionStatus | string | null | undefined,
): boolean {
  return LIVE_PROVIDER_STATUSES.has(String(status || "") as AccountingConnectionStatus);
}

/**
 * Evidence / identity lookup. Does not decrypt, refresh, or authorize provider calls.
 * Safe for historical/audit readers that need the row without live credentials.
 */
export async function getAccountingConnectionRecordForUser(
  connectionId: string,
  userId: string,
): Promise<AccountingConnectionRecord> {
  const { data, error } = await requireSupabase()
    .from("accounting_connections")
    .select("*")
    .eq("id", connectionId)
    .eq("user_id", userId)
    .limit(1);
  if (error) throw error;
  if (!data?.[0]) throw new Error("Accounting connection not found");
  return data[0] as AccountingConnectionRecord;
}

/**
 * Live-token gateway. Fail-closed via connection selection (409 SUPERSEDED with
 * validated successor when applicable). Only connected grants receive ensureFreshTokens.
 */
export async function getLiveProviderConnectionForUser(
  connectionId: string,
  userId: string,
  sourceSystem?: string | null,
): Promise<AccountingConnectionRecord> {
  const selected = await selectAccountingConnectionForActiveContext({
    supabase: requireSupabase(),
    userId,
    connectionId,
    sourceSystem,
  });
  if (!selected) {
    throw new Error("Accounting connection not found");
  }
  if (!isLiveProviderConnectionStatus(selected.status)) {
    throw new AccountingConnectionSelectionError({
      code: "ACCOUNTING_CONNECTION_NOT_READY",
      message: `Accounting connection status "${selected.status}" is not authorized for live provider access.`,
      connectionId: String(selected.id),
      status: selected.status,
      httpStatus: 422,
    });
  }
  return ensureFreshTokens(selected);
}

/**
 * Backward-compatible name for the live-token gateway.
 * Historical/audit readers must use getAccountingConnectionRecordForUser instead.
 */
export async function getConnectionForUser(
  connectionId: string,
  userId: string,
): Promise<AccountingConnectionRecord> {
  return getLiveProviderConnectionForUser(connectionId, userId);
}
