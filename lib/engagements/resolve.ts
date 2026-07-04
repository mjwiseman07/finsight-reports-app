/**
 * D6.4c-1 — Resolve the engagement for a firm_client.
 *
 * firm_clients has no engagement_id column. Portcos is the join table:
 * portcos.firm_client_id -> portcos.engagement_id. If a firm_client has no
 * portco row, fall back to the firm's single active engagement.
 *
 * If neither resolution path finds exactly one engagement, throw. Never guess.
 */
import { createServiceClient } from "@/lib/supabase/service";

export type EngagementResolutionSource = "portco" | "firm_default";

export interface EngagementResolution {
  engagementId: string;
  source: EngagementResolutionSource;
}

export class AmbiguousEngagementError extends Error {
  constructor(public readonly firmClientId: string, public readonly candidateCount: number) {
    super(`Ambiguous engagement for firm_client=${firmClientId}: ${candidateCount} candidates`);
    this.name = "AmbiguousEngagementError";
  }
}

export class UnresolvedEngagementError extends Error {
  constructor(public readonly firmClientId: string) {
    super(`No engagement resolvable for firm_client=${firmClientId}`);
    this.name = "UnresolvedEngagementError";
  }
}

export async function resolveEngagementForFirmClient(
  firmClientId: string,
): Promise<EngagementResolution> {
  if (!firmClientId) throw new Error("resolveEngagementForFirmClient: firmClientId required");

  const supabase = createServiceClient();

  // 1. Portco path (preferred): earliest portco row wins for determinism
  const { data: portcos, error: portcoErr } = await supabase
    .from("portcos")
    .select("engagement_id, created_at")
    .eq("firm_client_id", firmClientId)
    .order("created_at", { ascending: true });

  if (portcoErr) {
    throw new Error(`resolveEngagementForFirmClient: portcos lookup failed: ${portcoErr.message}`);
  }
  if (portcos && portcos.length > 0) {
    const first = portcos[0];
    if (!first.engagement_id) {
      throw new UnresolvedEngagementError(firmClientId);
    }
    return { engagementId: first.engagement_id as string, source: "portco" };
  }

  // 2. Firm-default path: firm_client -> firm -> engagements where status='active'
  const { data: fc, error: fcErr } = await supabase
    .from("firm_clients")
    .select("firm_id")
    .eq("id", firmClientId)
    .maybeSingle();

  if (fcErr) {
    throw new Error(`resolveEngagementForFirmClient: firm_clients lookup failed: ${fcErr.message}`);
  }
  if (!fc) throw new UnresolvedEngagementError(firmClientId);

  const { data: engagements, error: engErr } = await supabase
    .from("engagements")
    .select("id")
    .eq("firm_id", fc.firm_id)
    .eq("status", "active");

  if (engErr) {
    throw new Error(`resolveEngagementForFirmClient: engagements lookup failed: ${engErr.message}`);
  }
  if (!engagements || engagements.length === 0) {
    throw new UnresolvedEngagementError(firmClientId);
  }
  if (engagements.length > 1) {
    throw new AmbiguousEngagementError(firmClientId, engagements.length);
  }

  return { engagementId: engagements[0].id as string, source: "firm_default" };
}
