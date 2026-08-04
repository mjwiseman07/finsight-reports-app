/**
 * Pre-RPC state-machine guard for writePilotSlotAndEventAtomic.
 * Illegal transitions emit a hashed rejection event (event_only) + lifecycle_issues row.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertTransitionLegal,
  IllegalTransitionError,
  EVENT_KIND_REJECTED,
  REJECTED_TO_STATUS,
  type PilotStatus,
} from "./state-machine";
import { recordIssue } from "./issue-recorder";
import type { AtomicWriteInput } from "./pilot-slots-writer";
import { toDbActorKind } from "./write-event";

const PLACEHOLDER_SLOT_ID = "00000000-0000-4000-8000-000000000000";
const SCHEMA_VERSION = "42.7E.1" as const;

function resolveRealSlotId(input: AtomicWriteInput): string | null {
  if (input.slotOp.op === "update_status") return input.slotOp.id;
  const id = input.subject.pilotSlotId;
  if (!id || id === PLACEHOLDER_SLOT_ID) return null;
  return id;
}

export async function guardAtomicWriteOrReject(
  input: AtomicWriteInput,
  supabase: SupabaseClient,
): Promise<void> {
  const slotIdForMsg = resolveRealSlotId(input) ?? PLACEHOLDER_SLOT_ID;

  try {
    assertTransitionLegal({
      from: (input.fromStatus as PilotStatus | null) ?? null,
      to: (input.toStatus as PilotStatus | null) ?? null,
      kind: input.eventKind,
      pilot_slot_id: slotIdForMsg,
    });
  } catch (e) {
    if (!(e instanceof IllegalTransitionError)) throw e;

    const companyId = input.subject.companyId ?? null;
    const firmId = input.subject.firmId ?? null;
    const realSlotId = resolveRealSlotId(input);

    if (realSlotId && (companyId || firmId)) {
      await supabase.rpc("sp_write_pilot_slot_and_event", {
        p_slot_op: "event_only",
        p_slot_payload: { id: realSlotId },
        p_event: {
          event_kind: EVENT_KIND_REJECTED,
          event_at: new Date().toISOString(),
          schema_version: SCHEMA_VERSION,
          company_id: companyId,
          firm_id: firmId,
          from_status: input.fromStatus,
          to_status: REJECTED_TO_STATUS,
          classification_hint: null,
          actor_kind: toDbActorKind(input.actor.kind),
          actor_user_id: input.actor.userId,
          actor_via: input.actor.via,
          assertions_covered: [],
          evidence_refs: [],
          reason_code: "state_machine.rejected",
          reason_text: e.message,
          payload: {
            ...(input.payload ?? {}),
            attempted_to_status: input.toStatus,
            attempted_event_kind: input.eventKind,
            rejection_reason: e.message,
          },
        },
      });

      await recordIssue({
        fingerprint: `rejected:${realSlotId}:${input.fromStatus ?? "null"}:${input.toStatus ?? "null"}:${input.eventKind}`,
        level: "warning",
        issueKind: "pilot.lifecycle.transition.rejected",
        pilotSlotId: realSlotId,
        companyId,
        firmId,
        tags: {
          event_kind: input.eventKind,
          from_status: input.fromStatus ?? "null",
          to_status: input.toStatus ?? "null",
        },
        extra: { reason: e.message, attempted_payload: input.payload ?? {} },
        message: e.message,
      });
    } else if (companyId || firmId) {
      // Creation upsert with placeholder slot id — cannot hash-chain yet.
      await recordIssue({
        fingerprint: `rejected:create:${companyId ?? "null"}:${firmId ?? "null"}:${input.toStatus ?? "null"}`,
        level: "warning",
        issueKind: "pilot.lifecycle.transition.rejected",
        companyId,
        firmId,
        tags: {
          event_kind: input.eventKind,
          from_status: "null",
          to_status: input.toStatus ?? "null",
        },
        extra: { reason: e.message, attempted_payload: input.payload ?? {} },
        message: e.message,
      });
    }

    throw e;
  }
}
