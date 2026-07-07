/**
 * Phase D6.5 Part 2 — Block 3
 * qc-03: Second-Person Rule Gate.
 * Releaser must differ from:
 *   - the vendor_bank_history actor who first recorded the bank info (if bank_change_detected)
 *   - any prior successful releaser on this same quarantine
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Qc03Context {
  supabase: SupabaseClient;
  quarantineId: string;
  billId: string;
  releaseActorUserId: string;
}

export interface Qc03Result {
  gate_id: "qc-03";
  pass: boolean;
  reason: string;
  evidence: Record<string, unknown>;
}

export async function evaluateQc03(ctx: Qc03Context): Promise<Qc03Result> {
  const { supabase, quarantineId, billId, releaseActorUserId } = ctx;

  // Look up the bill's resolved vendor
  const { data: bill } = await supabase
    .from("ap_intake_bills")
    .select("resolved_vendor_id, firm_client_id")
    .eq("id", billId)
    .maybeSingle();

  let bankChangeActor: string | null = null;
  if (bill?.resolved_vendor_id) {
    const { data: hist } = await supabase
      .from("vendor_bank_history")
      .select("actor_user_id")
      .eq("firm_client_id", bill.firm_client_id)
      .eq("vendor_id", bill.resolved_vendor_id)
      .order("last_observed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    bankChangeActor = hist?.actor_user_id ?? null;
  }

  // Prior successful releasers on this quarantine
  const { data: priorAttempts } = await supabase
    .from("quarantine_release_attempts")
    .select("actor_user_id, overall_pass")
    .eq("quarantine_id", quarantineId);
  const priorReleasers = (priorAttempts ?? [])
    .filter((r) => r.overall_pass)
    .map((r) => r.actor_user_id);

  if (bankChangeActor && bankChangeActor === releaseActorUserId) {
    return {
      gate_id: "qc-03",
      pass: false,
      reason: "releaser_is_bank_change_actor",
      evidence: { bank_change_actor: bankChangeActor, releaser: releaseActorUserId, prior_releasers: priorReleasers },
    };
  }

  if (priorReleasers.includes(releaseActorUserId)) {
    return {
      gate_id: "qc-03",
      pass: false,
      reason: "releaser_previously_released_same_quarantine",
      evidence: { bank_change_actor: bankChangeActor, releaser: releaseActorUserId, prior_releasers: priorReleasers },
    };
  }

  return {
    gate_id: "qc-03",
    pass: true,
    reason: "distinct_actor",
    evidence: { bank_change_actor: bankChangeActor, releaser: releaseActorUserId, prior_releasers: priorReleasers },
  };
}
