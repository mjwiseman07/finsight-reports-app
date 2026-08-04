/**
 * Phase MEM-LIFECYCLE Block 4 — atomic pilot_slots + pilot_lifecycle_events writer.
 *
 * Wraps the sp_write_pilot_slot_and_event RPC. Both SSOT-adjacent wrappers
 * (checkout creation, subscription-sync / deletion transitions) use this to
 * guarantee slot mutation and event insert are in one transaction.
 *
 * NOT exported from lib/pilot-lifecycle/index.ts — external callers still use
 * recordCreation / recordTransition / recordAssertionEvidence for non-atomic
 * event-only writes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PilotLifecycleActor,
  PilotLifecycleEventKind,
  PilotLifecycleSubject,
  PcaobAssertion,
  EvidenceRef,
} from "./types";
import { toDbActorKind } from "./write-event";
import { guardAtomicWriteOrReject } from "./state-machine-wiring";

const SCHEMA_VERSION = "42.7E.1" as const;

export interface PilotSlotsUpsertPayload {
  readonly op: "upsert";
  readonly tier_key: string;
  readonly firm_id: string | null;
  readonly company_id: string | null;
  readonly pilot_slot_number: number | null;
  readonly pilot_status: string;
  readonly pricing_structure: string;
  readonly pricing_cadence: string;
  readonly stripe_subscription_id: string | null;
  readonly stripe_customer_id: string | null;
  readonly _on_conflict: "tier_key,firm_id" | "tier_key,company_id";
}

export interface PilotSlotsUpdateStatusPayload {
  readonly op: "update_status";
  readonly id: string;
  readonly pilot_status: string;
}

export interface AtomicWriteInput {
  readonly slotOp: PilotSlotsUpsertPayload | PilotSlotsUpdateStatusPayload;
  readonly eventKind: PilotLifecycleEventKind;
  readonly subject: PilotLifecycleSubject;
  readonly actor: PilotLifecycleActor;
  readonly fromStatus: string | null;
  readonly toStatus: string | null;
  readonly reasonCode: string;
  readonly reasonText: string | null;
  readonly classificationHint: string | null;
  readonly assertionsCovered: readonly PcaobAssertion[];
  readonly evidenceRefs: readonly EvidenceRef[];
  readonly payload: Record<string, unknown>;
  readonly eventAt: Date;
}

export interface AtomicWriteResult {
  readonly pilotSlotId: string;
  readonly eventId: string;
  readonly chainSeq: number;
  readonly rowHash: string;
  readonly prevHash: string | null;
}

export async function writePilotSlotAndEventAtomic(
  input: AtomicWriteInput,
  supabase: SupabaseClient,
): Promise<AtomicWriteResult> {
  // Block 6: declarative state-machine guard (pre-RPC). Illegal attempts
  // emit transition.rejected (+ lifecycle_issues) then throw — no slot mutate.
  await guardAtomicWriteOrReject(input, supabase);

  const p_slot_op = input.slotOp.op;
  const p_slot_payload =
    input.slotOp.op === "upsert"
      ? {
          tier_key: input.slotOp.tier_key,
          firm_id: input.slotOp.firm_id,
          company_id: input.slotOp.company_id,
          pilot_slot_number: input.slotOp.pilot_slot_number,
          pilot_status: input.slotOp.pilot_status,
          pricing_structure: input.slotOp.pricing_structure,
          pricing_cadence: input.slotOp.pricing_cadence,
          stripe_subscription_id: input.slotOp.stripe_subscription_id,
          stripe_customer_id: input.slotOp.stripe_customer_id,
          _on_conflict: input.slotOp._on_conflict,
        }
      : {
          id: input.slotOp.id,
          pilot_status: input.slotOp.pilot_status,
        };

  const p_event = {
    event_kind: input.eventKind,
    event_at: input.eventAt.toISOString(),
    schema_version: SCHEMA_VERSION,
    company_id: input.subject.companyId ?? null,
    firm_id: input.subject.firmId ?? null,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    classification_hint: input.classificationHint,
    actor_kind: toDbActorKind(input.actor.kind),
    actor_user_id: input.actor.userId,
    actor_via: input.actor.via,
    assertions_covered: [...input.assertionsCovered],
    evidence_refs: input.evidenceRefs,
    reason_code: input.reasonCode,
    reason_text: input.reasonText,
    payload: input.payload,
  };

  const { data, error } = await supabase.rpc("sp_write_pilot_slot_and_event", {
    p_slot_op,
    p_slot_payload,
    p_event,
  });

  if (error || !data) {
    throw new Error(
      `[pilot-slots-writer] atomic write failed: ${error?.message ?? "no data"}`,
    );
  }

  const row = data as Record<string, unknown>;
  return {
    pilotSlotId: row.pilot_slot_id as string,
    eventId: row.event_id as string,
    chainSeq: row.chain_seq as number,
    rowHash: row.row_hash as string,
    prevHash: (row.prev_hash as string | null) ?? null,
  };
}
