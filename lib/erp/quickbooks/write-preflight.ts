/**
 * QBO Write Preflight (Doc D1).
 *
 * canPostToQBO() is the single gate every write path (D2 JE poster) must call
 * before attempting a QBO write. It confirms the write flag is on, the last
 * health check is recent and healthy (auto-running one if stale), and the token
 * resolves cleanly. D1 does NOT perform writes — this only provides the gate.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { resolveQBOTokenForFirmClient, type QBOTokenBundle } from "@/lib/erp/quickbooks/token-resolver";
import { checkQBOHealth } from "@/lib/erp/quickbooks/health-checker";

export type WritePreflightReason =
  | "write_disabled"
  | "unhealthy_connection"
  | "stale_health_check"
  | "realm_missing";

export interface WritePreflightResult {
  canWrite: boolean;
  reason?: WritePreflightReason;
  lastHealthCheck?: {
    status: string;
    checkedAt: string;
    ageMinutes: number;
  };
  tokenBundle?: QBOTokenBundle;
}

const HEALTH_MAX_AGE_MINUTES = 60;

function ageMinutes(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(iso).getTime()) / 60000;
}

/**
 * Confirms it is safe to write to QBO for a firm_client. Runs a fresh health
 * check inline when the last one is missing or older than 60 minutes.
 */
export async function canPostToQBO(firmClientId: string): Promise<WritePreflightResult> {
  if (!firmClientId) throw new Error("firmClientId is required");
  const supabase = getSupabaseAdmin();

  const { data: client, error } = await supabase
    .from("firm_clients")
    .select("id, qbo_write_enabled, qbo_last_health_check_at, qbo_last_health_check_status")
    .eq("id", firmClientId)
    .maybeSingle();
  if (error) throw new Error(`firm_clients lookup failed: ${error.message}`);
  if (!client) {
    return { canWrite: false, reason: "realm_missing" };
  }

  if (!client.qbo_write_enabled) {
    return { canWrite: false, reason: "write_disabled" };
  }

  let status = client.qbo_last_health_check_status as string | null;
  let checkedAt = client.qbo_last_health_check_at as string | null;

  // Run a fresh check if none exists or the last one is stale.
  if (!checkedAt || ageMinutes(checkedAt) > HEALTH_MAX_AGE_MINUTES) {
    const fresh = await checkQBOHealth(firmClientId);
    status = fresh.status;
    checkedAt = new Date().toISOString();
  }

  const lastHealthCheck = {
    status: status ?? "unknown_error",
    checkedAt: checkedAt ?? new Date().toISOString(),
    ageMinutes: ageMinutes(checkedAt),
  };

  if (status !== "healthy") {
    return { canWrite: false, reason: "unhealthy_connection", lastHealthCheck };
  }

  const tokenBundle = await resolveQBOTokenForFirmClient(firmClientId);
  if (!tokenBundle || !tokenBundle.realmId) {
    return { canWrite: false, reason: "realm_missing", lastHealthCheck };
  }

  return { canWrite: true, lastHealthCheck, tokenBundle };
}
