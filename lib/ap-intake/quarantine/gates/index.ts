/**
 * Phase D6.5 Part 2 — Block 3
 * Runs all four quarantine gates. Every gate runs (no short-circuit) so the
 * audit trail carries per-gate evidence even when earlier gates fail.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateQc01 } from "./qc-01-attestation";
import { evaluateQc02, type ReviewerTier } from "./qc-02-bookkeeper-allowlist";
import { evaluateQc03 } from "./qc-03-second-person";
import { evaluateQc04 } from "./qc-04-fraud-score-ceiling";
import type { GateResultRecord } from "@/lib/ap-intake/quarantine/schema";

export interface GateContext {
  supabase: SupabaseClient;
  firmId: string;
  firmClientId: string;
  billId: string;
  quarantineId: string;
  releaseActorUserId: string;
  attestationText: string;
  releaseActorTier: ReviewerTier;
}

export interface EvaluateAllGatesResult {
  overallPass: boolean;
  gateResults: GateResultRecord[];
  blockingGates: string[];
}

export async function evaluateAllGates(ctx: GateContext): Promise<EvaluateAllGatesResult> {
  const qc01 = await evaluateQc01({
    supabase: ctx.supabase,
    quarantineId: ctx.quarantineId,
    attestationText: ctx.attestationText,
  });
  const qc02 = await evaluateQc02({
    supabase: ctx.supabase,
    firmId: ctx.firmId,
    releaseActorUserId: ctx.releaseActorUserId,
    releaseActorTier: ctx.releaseActorTier,
  });
  const qc03 = await evaluateQc03({
    supabase: ctx.supabase,
    quarantineId: ctx.quarantineId,
    billId: ctx.billId,
    releaseActorUserId: ctx.releaseActorUserId,
  });
  const qc04 = await evaluateQc04({
    supabase: ctx.supabase,
    billId: ctx.billId,
  });

  const gateResults: GateResultRecord[] = [qc01, qc02, qc03, qc04];
  const blockingGates = gateResults.filter((g) => !g.pass).map((g) => g.gate_id);

  return {
    overallPass: blockingGates.length === 0,
    gateResults,
    blockingGates,
  };
}

export type { ReviewerTier };
