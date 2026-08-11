/**
 * WBP W1c.3 — Load the AccountingConnectionRecord for a given firm_client_id.
 *
 * Inverse of resolveFirmClientIdForConnection. Resolution:
 *   firm_clients.owner_user_id → accounting_connections.user_id
 *   WHERE provider='quickbooks' AND status='connected'
 *   ORDER BY updated_at DESC LIMIT 1
 *
 * Column deviations vs paste v1.1 draft:
 *   - status='connected' (not is_active=true)
 *   - order by updated_at (not last_refreshed_at)
 *   - home_currency selected from DB (not on AccountingConnectionRecord TS yet)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountingConnectionRecord } from "@/lib/integrations/accounting/types";

export type AccountingConnectionWithHomeCurrency = AccountingConnectionRecord & {
  home_currency: string | null;
};

export type LoadConnectionResult = {
  connection: AccountingConnectionWithHomeCurrency;
};

export async function loadQboConnectionForFirmClient(
  admin: SupabaseClient,
  firmClientId: string,
): Promise<LoadConnectionResult> {
  const { data: fc, error: fcErr } = await admin
    .from("firm_clients")
    .select("owner_user_id, company_id")
    .eq("id", firmClientId)
    .single();
  if (fcErr) throw new Error(`firm_clients_lookup_failed: ${fcErr.message}`);
  if (!fc?.owner_user_id) {
    throw new Error(`firm_client_missing_owner_user_id: ${firmClientId}`);
  }

  const { data: conn, error: connErr } = await admin
    .from("accounting_connections")
    .select("*")
    .eq("user_id", fc.owner_user_id)
    .eq("provider", "quickbooks")
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (connErr) throw new Error(`accounting_connections_lookup_failed: ${connErr.message}`);
  if (!conn) {
    throw new Error(`no_active_qbo_connection_for_owner: ${fc.owner_user_id}`);
  }

  return {
    connection: conn as AccountingConnectionWithHomeCurrency,
  };
}
