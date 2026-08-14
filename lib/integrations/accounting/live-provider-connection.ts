/**
 * Live provider access vs historical connection identity.
 *
 * Only status=connected and needs_entity_selection may use live provider
 * authorization (entity onboarding needs tokens before the grant is "connected").
 * superseded rows are permanent historical evidence but credential-dead.
 *
 * Contracts stay distinct from active-context selection:
 * - selectAccountingConnectionForActiveContext: connected-only (needs_entity_selection → 422)
 * - getLiveProviderConnectionForUser: connected + needs_entity_selection (after supersession checks)
 * - getAccountingConnectionRecordForUser: evidence / identity lookup (no tokens)
 */
import { supabaseAdmin } from "../../supabase";
import {
  AccountingConnectionSelectionError,
  mapNonConnectedStatus,
  throwSupersededSelectionError,
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
 * Live-token gateway for provider authorization (entity list/select, report fetch helpers
 * that intentionally allow needs_entity_selection).
 *
 * Does NOT call selectAccountingConnectionForActiveContext — that selector rejects
 * needs_entity_selection with 422 by design. Active dashboard/report context must use
 * the active-context selector separately.
 *
 * Fail-closed: superseded → 409 + validated successor; disconnected/other → mapped errors.
 */
export async function getLiveProviderConnectionForUser(
  connectionId: string,
  userId: string,
  sourceSystem?: string | null,
): Promise<AccountingConnectionRecord> {
  const row = await getAccountingConnectionRecordForUser(connectionId, userId);
  const providerFilter = String(sourceSystem || "").trim();
  if (providerFilter && String(row.provider) !== providerFilter) {
    throw new Error("Accounting connection not found");
  }

  const status = String(row.status || "");
  if (status === "superseded") {
    await throwSupersededSelectionError(requireSupabase(), row);
  }
  if (!isLiveProviderConnectionStatus(status)) {
    throw mapNonConnectedStatus(row);
  }
  return ensureFreshTokens(row);
}

/**
 * Backward-compatible name for the live-token gateway.
 * Historical/audit readers must use getAccountingConnectionRecordForUser instead.
 * Active-context (connected-only) readers must use selectAccountingConnectionForActiveContext.
 */
export async function getConnectionForUser(
  connectionId: string,
  userId: string,
): Promise<AccountingConnectionRecord> {
  return getLiveProviderConnectionForUser(connectionId, userId);
}
