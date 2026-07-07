/**
 * Phase D6.5 Part 2 — Block 3
 * qc-02: Bookkeeper Allowlist Gate.
 * Admin/reviewer tier → auto-pass. Bookkeeper tier → must have an active
 * bookkeeper_release_allowlist row for the firm.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type ReviewerTier = "admin" | "bookkeeper" | "reviewer";

export interface Qc02Context {
  supabase: SupabaseClient;
  firmId: string;
  releaseActorUserId: string;
  releaseActorTier: ReviewerTier;
}

export interface Qc02Result {
  gate_id: "qc-02";
  pass: boolean;
  reason: string;
  evidence: Record<string, unknown>;
}

export async function evaluateQc02(ctx: Qc02Context): Promise<Qc02Result> {
  if (ctx.releaseActorTier !== "bookkeeper") {
    return {
      gate_id: "qc-02",
      pass: true,
      reason: "not_bookkeeper_tier",
      evidence: { tier: ctx.releaseActorTier, allowlist_hit: false },
    };
  }

  const { data } = await ctx.supabase
    .from("bookkeeper_release_allowlist")
    .select("id, revoked_at")
    .eq("firm_id", ctx.firmId)
    .eq("user_id", ctx.releaseActorUserId)
    .eq("scope", "quarantine_release")
    .is("revoked_at", null)
    .maybeSingle();

  if (data) {
    return {
      gate_id: "qc-02",
      pass: true,
      reason: "on_allowlist",
      evidence: { tier: ctx.releaseActorTier, allowlist_hit: true, allowlist_id: data.id },
    };
  }

  return {
    gate_id: "qc-02",
    pass: false,
    reason: "bookkeeper_not_on_allowlist",
    evidence: { tier: ctx.releaseActorTier, allowlist_hit: false },
  };
}
