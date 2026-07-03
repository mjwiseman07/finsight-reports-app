import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveQBOTokenForFirmClient } from "@/lib/erp/quickbooks/token-resolver";

// Resolution path (D1.1): firm_client -> owner_user_id -> unified QBO token
// resolver (prefers accounting_connections, falls back to erp_connections if it
// exists). Returns { qbo, accessToken, realmId, userId, tokenSource } for a
// given firm_client_id, or throws a clear error.
//
// `qbo` is retained for return-shape compatibility but is now null: every
// current caller uses accessToken + realmId with the qbo-rest REST wrappers,
// not the node-quickbooks client.
export async function getQboForFirmClient(firmClientId) {
  const supabase = getSupabaseAdmin();

  const { data: fc, error: fcErr } = await supabase
    .from("firm_clients")
    .select("id, owner_user_id")
    .eq("id", firmClientId)
    .maybeSingle();
  if (fcErr) throw new Error(`firm_clients lookup failed: ${fcErr.message}`);
  if (!fc) throw new Error(`firm_client ${firmClientId} not found`);
  if (!fc.owner_user_id) {
    throw new Error(
      `firm_client ${firmClientId} has no owner_user_id — cannot resolve QBO connection. ` +
        `Assign an owner via /api/admin/firm-clients/[id]/assign-owner.`,
    );
  }

  const bundle = await resolveQBOTokenForFirmClient(firmClientId);
  if (!bundle) {
    throw new Error(
      `firm_client ${firmClientId} has no active QBO connection (no accounting_connections row for owner user).`,
    );
  }

  return {
    qbo: null,
    accessToken: bundle.accessToken,
    realmId: bundle.realmId,
    userId: fc.owner_user_id,
    tokenSource: bundle.tokenSource,
  };
}
