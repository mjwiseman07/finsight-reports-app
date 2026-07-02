import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedQuickBooksClient } from "@/lib/quickbooks";

// Resolution path: firm_client -> owner_user_id -> accounting_connections (QBO).
// Returns { qbo, realmId, userId } for a given firm_client_id, or throws.
//
// NOTE: accounting_connections.status defaults to 'connected' in this repo (not
// 'active'), so we accept both to avoid silently matching zero rows.
export async function getQboForFirmClient(firmClientId) {
  const supabase = getSupabaseAdmin();

  const { data: fc, error: fcErr } = await supabase
    .from("firm_clients")
    .select("id, owner_user_id")
    .eq("id", firmClientId)
    .single();
  if (fcErr || !fc) throw new Error(`firm_client ${firmClientId} not found`);
  if (!fc.owner_user_id) {
    throw new Error(`firm_client ${firmClientId} has no owner_user_id`);
  }

  const { data: conn, error: connErr } = await supabase
    .from("accounting_connections")
    .select("tenant_or_realm_id, provider, status")
    .eq("user_id", fc.owner_user_id)
    .eq("provider", "quickbooks")
    .in("status", ["active", "connected"])
    .maybeSingle();
  if (connErr) throw new Error(connErr.message);
  if (!conn?.tenant_or_realm_id) {
    throw new Error(`no active QuickBooks connection for user ${fc.owner_user_id}`);
  }

  // getAuthenticatedQuickBooksClient returns { qbo, accessToken, realmId } where
  // qbo is a raw node-quickbooks client (callback-based). Verifiers in A2 should
  // wrap qbo methods in a promise or use the REST report/query endpoints.
  const client = await getAuthenticatedQuickBooksClient(fc.owner_user_id);

  return {
    qbo: client.qbo,
    accessToken: client.accessToken,
    realmId: client.realmId || conn.tenant_or_realm_id,
    userId: fc.owner_user_id,
  };
}
