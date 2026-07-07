/**
 * Phase D6.5 Part 2 — Block 3
 * qc-04: Fraud Score Ceiling Gate.
 * Blocks release when ap_intake_bills.fraud_score_current >= 0.90.
 * Block 3 stubs the score at 0 for all rows (Block 5 L11 computes real scores).
 * The gate ships wired up so it flips live automatically when Block 5 lands.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Qc04Context {
  supabase: SupabaseClient;
  billId: string;
}

export interface Qc04Result {
  gate_id: "qc-04";
  pass: boolean;
  reason: string;
  evidence: Record<string, unknown>;
}

export const FRAUD_SCORE_CEILING = 0.9;

export async function evaluateQc04(ctx: Qc04Context): Promise<Qc04Result> {
  const { data } = await ctx.supabase
    .from("ap_intake_bills")
    .select("fraud_score_current")
    .eq("id", ctx.billId)
    .maybeSingle();

  const score = Number(data?.fraud_score_current ?? 0);
  const pass = score < FRAUD_SCORE_CEILING;

  return {
    gate_id: "qc-04",
    pass,
    reason: pass ? "under_ceiling" : "at_or_over_ceiling",
    evidence: { current_score: score, threshold: FRAUD_SCORE_CEILING },
  };
}
