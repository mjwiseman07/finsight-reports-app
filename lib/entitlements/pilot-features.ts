/**
 * D6.5 Part 2 — Block 6a: pilot feature allowlist gate.
 * Layered on top of assertEntitlement. Both must pass.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
export type PilotFeatureCode =
  | "ap_requisitions"
  | "ap_baseline_harvest"
  | "ap_three_way_match"
  | "ap_approval_matrix"
  | "ap_budget_controls";
export class PilotFeatureDenied extends Error {
  code: PilotFeatureCode;
  firmId: string;
  reason: "not_allowed" | "revoked" | "db_error";
  constructor(code: PilotFeatureCode, firmId: string, reason: "not_allowed" | "revoked" | "db_error") {
    super(`Pilot feature '${code}' not enabled for firm ${firmId} (reason: ${reason})`);
    this.name = "PilotFeatureDenied";
    this.code = code;
    this.firmId = firmId;
    this.reason = reason;
  }
}
export async function hasPilotFeature(
  code: PilotFeatureCode,
  firmId: string,
  supabase?: SupabaseClient,
): Promise<{ allowed: boolean; reason: "active" | "not_allowed" | "revoked" | "db_error" }> {
  const client = supabase ?? createServiceClient();
  const { data, error } = await client
    .from("pilot_feature_allowlist")
    .select("id, revoked_at")
    .eq("firm_id", firmId)
    .eq("feature_code", code)
    .maybeSingle();
  if (error) return { allowed: false, reason: "db_error" };
  if (!data) return { allowed: false, reason: "not_allowed" };
  if (data.revoked_at) return { allowed: false, reason: "revoked" };
  return { allowed: true, reason: "active" };
}
export async function assertPilotFeature(
  code: PilotFeatureCode,
  firmId: string,
  supabase?: SupabaseClient,
): Promise<void> {
  const r = await hasPilotFeature(code, firmId, supabase);
  if (!r.allowed) {
    throw new PilotFeatureDenied(code, firmId, r.reason as "not_allowed" | "revoked" | "db_error");
  }
}
