import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — lib/qbo-for-firm-client.js is untyped
import { getQboForFirmClient } from "@/lib/qbo-for-firm-client";
import type { QBOHandle } from "@/lib/rules/vertical-types";

export interface QBOResolveResult {
  handle: QBOHandle | null;
  healthy: boolean;
  reason?: "unhealthy" | "no_connection" | "no_token" | "ok";
}

/**
 * D6.2a — runner-side QBO resolution. Cheap health probe first (read the last
 * recorded health-check status on firm_clients) to avoid a live QBO API call
 * when we already know the connection is unhealthy. Only resolves a token when
 * the last known status is healthy (or unknown/null — first run).
 */
export async function resolveQBOForClient(firmClientId: string): Promise<QBOResolveResult> {
  const supabase = getSupabaseAdmin();

  const { data: fc, error } = await supabase
    .from("firm_clients")
    .select("qbo_last_health_check_status, company_id")
    .eq("id", firmClientId)
    .maybeSingle();

  if (error || !fc) {
    return { handle: null, healthy: false, reason: "no_connection" };
  }

  if (fc.qbo_last_health_check_status && fc.qbo_last_health_check_status !== "healthy") {
    return { handle: null, healthy: false, reason: "unhealthy" };
  }

  // getQboForFirmClient THROWS (not returns null) when there is no owner /
  // active QBO connection, so we must tolerate the throw and degrade to a null
  // handle — rules then self-suppress instead of crashing the whole run.
  let token: { accessToken?: string; realmId?: string } | null = null;
  try {
    token = await getQboForFirmClient(firmClientId);
  } catch {
    return { handle: null, healthy: false, reason: "no_token" };
  }
  if (!token || !token.accessToken || !token.realmId) {
    return { handle: null, healthy: false, reason: "no_token" };
  }

  return {
    handle: { accessToken: token.accessToken, realmId: token.realmId },
    healthy: true,
    reason: "ok",
  };
}
