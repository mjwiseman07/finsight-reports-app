/**
 * Phase MEM-LIFECYCLE Block 3 / 3.5 — the ONE place that writes to
 * pilot_lifecycle_events.
 *
 * Every recordX function in this module funnels through writeLifecycleEvent().
 * No other caller in the codebase writes to this table.
 *
 * Two-tier write:
 *   1. INSERT into pilot_lifecycle_events (DB trigger from Blocks 2/2.5 does
 *      the hash-chaining, chain_seq assignment, and append-only enforcement).
 *   2. Mirror-append into the standards-resolver AuditLogWriter so the app-layer
 *      chain (FileAppendAuditLogWriter) carries the same event.
 *
 * If either tier throws, we surface the error to the caller — this is the
 * fail-closed contract from doctrine (failClosedOnAuditWriteFailure: true).
 *
 * Block 3.5: event_kind is first-class on the DB (created + evidence-attached);
 * to_status may be null only for evidence-attached; no payload.ssot_event_kind.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditEntryPartial,
  AuditLogWriter,
  ActorRef,
} from "@/lib/intelligence/synthetic/standards/audit/types";
import type {
  EvidenceRef,
  PilotLifecycleActor,
  PilotLifecycleActorKind,
  PilotLifecycleDbActorKind,
  PilotLifecycleEventKind,
  PilotLifecycleEventRecord,
  PilotLifecycleSubject,
  PcaobAssertion,
} from "./types";
import { PILOT_LIFECYCLE_TO_AUDIT_KIND } from "./types";

const SCHEMA_VERSION = "42.7E.1" as const;

export interface WriteLifecycleEventInput {
  readonly eventKind: PilotLifecycleEventKind;
  readonly subject: PilotLifecycleSubject;
  readonly actor: PilotLifecycleActor;
  readonly fromStatus: string | null;
  readonly toStatus: string | null;
  readonly reasonCode: string;
  readonly reasonText: string | null;
  readonly assertionsCovered: readonly PcaobAssertion[];
  readonly classificationHint: string | null;
  readonly evidenceRefs: readonly EvidenceRef[];
  readonly payload: Record<string, unknown>;
  readonly eventAt: Date;
}

export interface WriteLifecycleEventDeps {
  readonly supabase: SupabaseClient;
  readonly auditWriter: AuditLogWriter;
}

/** Map ActorRef-style kinds onto Block 1 DB CHECK values. */
export function toDbActorKind(kind: PilotLifecycleActorKind): PilotLifecycleDbActorKind {
  switch (kind) {
    case "human":
      return "user";
    case "system":
    case "cron":
      return "system";
    case "ai-worker":
      return "external";
    default: {
      const _exhaustive: never = kind;
      throw new Error(`unhandled PilotLifecycleActor.kind: ${_exhaustive as string}`);
    }
  }
}

// ActorRef.via is a closed union that does NOT include stripe-webhook or
// cdc-auditor. When a lifecycle actor is one of those DB-only vias, we map
// to the closest ActorRef.via for the mirror-append.
function toActorRefVia(via: PilotLifecycleActor["via"]): ActorRef["via"] {
  switch (via) {
    case "direct-api":
      return "direct-api";
    case "admin-script":
      return "admin-script";
    case "stripe-webhook":
      return "direct-api"; // webhooks are direct HTTP calls into our API layer
    case "cdc-auditor":
      return "admin-script"; // CDC runs as a cron/admin-scripted job
    default: {
      const _exhaustive: never = via;
      throw new Error(`unhandled PilotLifecycleActor.via: ${_exhaustive as string}`);
    }
  }
}

function resolveToStatusForDb(
  eventKind: PilotLifecycleEventKind,
  toStatus: string | null,
): string | null {
  if (eventKind === "pilot.lifecycle.assertion.evidence-attached") {
    return toStatus; // null is legal for this kind (Block 3.5)
  }
  if (toStatus == null || toStatus.length === 0) {
    throw new Error(
      `[pilot-lifecycle] to_status is required for event_kind=${eventKind}`,
    );
  }
  return toStatus;
}

export async function writeLifecycleEvent(
  input: WriteLifecycleEventInput,
  deps: WriteLifecycleEventDeps,
): Promise<PilotLifecycleEventRecord> {
  const { supabase, auditWriter } = deps;
  const eventAtIso = input.eventAt.toISOString();
  const toStatus = resolveToStatusForDb(input.eventKind, input.toStatus);

  // --- Tier 1: DB event row (hash-chain trigger runs inside this INSERT) ---
  const { data: dbRow, error: dbError } = await supabase
    .from("pilot_lifecycle_events")
    .insert({
      event_kind: input.eventKind,
      event_at: eventAtIso,
      schema_version: SCHEMA_VERSION,
      pilot_slot_id: input.subject.pilotSlotId,
      company_id: input.subject.companyId ?? null,
      firm_id: input.subject.firmId ?? null,
      from_status: input.fromStatus,
      to_status: toStatus,
      classification_hint: input.classificationHint,
      actor_kind: toDbActorKind(input.actor.kind),
      actor_user_id: input.actor.userId,
      actor_via: input.actor.via,
      assertions_covered: input.assertionsCovered as unknown as string[],
      evidence_refs: input.evidenceRefs as unknown as object,
      reason_code: input.reasonCode,
      reason_text: input.reasonText,
      // Block 3.5: do not add payload.ssot_event_kind — event_kind is first-class.
      payload: input.payload,
    })
    .select("id, chain_seq, event_kind, event_at, row_hash, prev_hash")
    .single();

  if (dbError || !dbRow) {
    throw new Error(
      `[pilot-lifecycle] DB write failed: ${dbError?.message ?? "no row returned"}`,
    );
  }

  // --- Tier 2: mirror into standards-resolver AuditLogWriter ---
  const auditEntry: AuditEntryPartial = {
    kind: PILOT_LIFECYCLE_TO_AUDIT_KIND[input.eventKind],
    actor: {
      kind: input.actor.kind,
      id: input.actor.userId ?? `system:${input.actor.via}`,
      via: toActorRefVia(input.actor.via),
    },
    subject: {
      tenantId: input.subject.firmId ?? input.subject.companyId,
      orgId: input.subject.firmId ?? input.subject.companyId,
    },
    payload: {
      pilotSlotId: input.subject.pilotSlotId,
      eventKind: input.eventKind,
      dbRowId: dbRow.id as string,
      dbChainSeq: dbRow.chain_seq as number,
      dbRowHash: dbRow.row_hash as string,
      fromStatus: input.fromStatus,
      toStatus,
      reasonCode: input.reasonCode,
      classificationHint: input.classificationHint,
      assertionsCovered: input.assertionsCovered,
      evidenceRefsCount: input.evidenceRefs.length,
      // NOTE: full evidence_refs live in the DB row. AuditLogWriter carries
      // only the count + count-hash pointer so the file-append writer does
      // not blow up on large payloads.
    },
  };

  auditWriter.append(auditEntry);
  await auditWriter.flush();

  return {
    id: dbRow.id as string,
    chainSeq: dbRow.chain_seq as number,
    eventKind: dbRow.event_kind as PilotLifecycleEventKind,
    eventAt: dbRow.event_at as string,
    rowHash: dbRow.row_hash as string,
    prevHash: (dbRow.prev_hash as string | null) ?? null,
  };
}
