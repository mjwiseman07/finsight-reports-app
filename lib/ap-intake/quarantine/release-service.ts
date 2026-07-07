/**
 * Phase D6.5 Part 2 — Block 3
 * Release Service — orchestrates gate evaluation, audit-trail write,
 * and quarantine status transition.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { publishEvent } from "@/lib/events/publisher";
import { assertEntitlement } from "@/lib/entitlements/gate";
import { logAiAction } from "@/lib/ai/action-logger";
import { evaluateAllGates, type ReviewerTier } from "./gates";
import type { GateResultRecord } from "./schema";

export class NoOpenQuarantineError extends Error {
  constructor(billId: string) {
    super(`No open quarantine for bill ${billId}`);
    this.name = "NoOpenQuarantineError";
  }
}

export interface RequestQuarantineReleaseArgs {
  supabase: SupabaseClient;
  firmId: string;
  firmClientId: string;
  billId: string;
  releaseActorUserId: string;
  releaseActorTier: ReviewerTier;
  attestationText: string;
  engagementId: string | null;
}

export interface RequestQuarantineReleaseResult {
  released: boolean;
  quarantineId: string;
  gateResults: GateResultRecord[];
  blockingGates: string[];
}

export async function requestQuarantineRelease(
  args: RequestQuarantineReleaseArgs,
): Promise<RequestQuarantineReleaseResult> {
  const {
    supabase,
    firmId,
    firmClientId,
    billId,
    releaseActorUserId,
    releaseActorTier,
    attestationText,
    engagementId,
  } = args;

  // Entitlement gate — firm must have quarantine_review addon active
  await assertEntitlement("quarantine_review", engagementId, {
    caller: "release_service",
    firmClientId,
    actorType: "user",
    actorId: releaseActorUserId,
  });

  // Find the open quarantine
  const { data: quarantine } = await supabase
    .from("ap_intake_quarantine")
    .select("id, status")
    .eq("bill_id", billId)
    .maybeSingle();
  if (!quarantine || quarantine.status !== "open") {
    throw new NoOpenQuarantineError(billId);
  }
  const quarantineId = quarantine.id as string;

  // Publish attempt-received event BEFORE gate evaluation so the ledger reflects the attempt
  await publishEvent({
    eventType: "bill.release_requested",
    eventCategory: "ap",
    firmId,
    firmClientId,
    aggregateType: "bill",
    aggregateId: billId,
    actorType: "user",
    actorId: releaseActorUserId,
    payload: { quarantine_id: quarantineId, attestation_length: attestationText.length },
  });

  const gateOutcome = await evaluateAllGates({
    supabase,
    firmId,
    firmClientId,
    billId,
    quarantineId,
    releaseActorUserId,
    attestationText,
    releaseActorTier,
  });

  // Audit-trail write — regardless of pass/fail
  await supabase.from("quarantine_release_attempts").insert({
    firm_id: firmId,
    quarantine_id: quarantineId,
    bill_id: billId,
    actor_user_id: releaseActorUserId,
    attestation_text: attestationText,
    gate_results: gateOutcome.gateResults,
    overall_pass: gateOutcome.overallPass,
    blocking_gates: gateOutcome.blockingGates,
  });

  // AI action log — this is a rule-engine "decision"
  await logAiAction({
    firmClientId,
    actionType: "quarantine_gate_evaluation",
    actionCategory: "quarantine_gate_evaluation",
    modelName: "rule-engine-v1",
    modelProvider: "local",
    input: { quarantine_id: quarantineId, actor: releaseActorUserId, tier: releaseActorTier },
    output: {
      overall_pass: gateOutcome.overallPass,
      blocking_gates: gateOutcome.blockingGates,
      gates: gateOutcome.gateResults,
    },
  });

  if (gateOutcome.overallPass) {
    await supabase
      .from("ap_intake_quarantine")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
        released_by_user_id: releaseActorUserId,
        release_notes: attestationText,
      })
      .eq("id", quarantineId);

    await publishEvent({
      eventType: "bill.released",
      eventCategory: "ap",
      firmId,
      firmClientId,
      aggregateType: "bill",
      aggregateId: billId,
      actorType: "user",
      actorId: releaseActorUserId,
      payload: {
        quarantine_id: quarantineId,
        gate_results: gateOutcome.gateResults,
      },
    });
  } else {
    await publishEvent({
      eventType: "bill.release_blocked",
      eventCategory: "ap",
      firmId,
      firmClientId,
      aggregateType: "bill",
      aggregateId: billId,
      actorType: "system",
      payload: {
        quarantine_id: quarantineId,
        blocking_gates: gateOutcome.blockingGates,
        gate_results: gateOutcome.gateResults,
      },
    });
  }

  return {
    released: gateOutcome.overallPass,
    quarantineId,
    gateResults: gateOutcome.gateResults,
    blockingGates: gateOutcome.blockingGates,
  };
}
