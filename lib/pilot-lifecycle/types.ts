/**
 * Phase MEM-LIFECYCLE Block 3 — pilot-lifecycle SSOT types
 *
 * These types are the *only* legal input shapes for pilot-slot state changes
 * from any call site in the codebase. Block 4 rewires subscription-sync and
 * stripe-pilot-checkout to use these.
 *
 * All state changes go through recordTransition / recordCreation /
 * recordAssertionEvidence. No caller writes to pilot_slots or
 * pilot_lifecycle_events directly.
 *
 * Taxonomy alignment (locked_db): assertions + DB actor_kind / event_kind CHECKs
 * from Block 1 take precedence over the original Block 3 paste where they conflict.
 */

import type { AuditEventKind } from "@/lib/intelligence/synthetic/standards/audit/types";
import type { Assertion } from "@/lib/audit-ready/assertion-taxonomy";

// Match DB CHECK constraint on pilot_lifecycle_events.actor_via.
// This is broader than ActorRef.via because Stripe webhooks and CDC
// auditors ARE legitimate actors on the DB row, they just don't map
// to the closed application-layer ActorRef union.
export type PilotLifecycleActorVia =
  | "direct-api"
  | "admin-script"
  | "stripe-webhook"
  | "cdc-auditor";

/** App-layer actor kinds (ActorRef). Mapped to DB actor_kind on write. */
export type PilotLifecycleActorKind = "human" | "ai-worker" | "system" | "cron";

/** DB CHECK: actor_kind IN ('user', 'system', 'external'). */
export type PilotLifecycleDbActorKind = "user" | "system" | "external";

export interface PilotLifecycleActor {
  readonly kind: PilotLifecycleActorKind;
  readonly userId: string | null; // NULL for system/cron/stripe-webhook
  readonly via: PilotLifecycleActorVia;
}

/**
 * Locked PCAOB-6 (lib/audit-ready/assertion-taxonomy.ts + Block 1 CHECK).
 * presentation_disclosure — not paste-literal cutoff/presentation.
 */
export type PcaobAssertion = Assertion;

// Evidence artifact reference. Block 9 anchors over these via RFC 3161.
export interface EvidenceRef {
  readonly kind: "stripe_event" | "pbc_upload" | "qbo_report" | "admin_note";
  readonly uri: string; // storage path or external ID (e.g. Stripe evt_...)
  readonly sha256: string; // required for anchoring
}

export interface PilotLifecycleSubject {
  readonly pilotSlotId: string; // UUID
  readonly companyId?: string; // one of company_id XOR firm_id must be set
  readonly firmId?: string;
}

// --- Event-specific inputs ---

export type PilotStatus = "pending" | "active" | "paused" | "cancelled" | "expired";

export interface RecordTransitionInput {
  readonly subject: PilotLifecycleSubject;
  readonly actor: PilotLifecycleActor;
  readonly fromStatus: PilotStatus;
  readonly toStatus: PilotStatus;
  readonly reasonCode: string; // stable enum-ish string; free-text -> reasonText
  readonly reasonText: string | null;
  readonly assertionsCovered: readonly PcaobAssertion[];
  readonly classificationHint: string | null; // industry treatment handle
  readonly evidenceRefs: readonly EvidenceRef[];
  readonly payload: Record<string, unknown>; // additional context; hashed by DB trigger
  readonly eventAt?: Date; // defaults to now()
}

export interface RecordCreationInput {
  readonly subject: PilotLifecycleSubject;
  readonly actor: PilotLifecycleActor;
  readonly initialStatus: PilotStatus;
  readonly reasonCode: string;
  readonly reasonText: string | null;
  readonly assertionsCovered: readonly PcaobAssertion[];
  readonly classificationHint: string | null;
  readonly evidenceRefs: readonly EvidenceRef[];
  readonly payload: Record<string, unknown>;
  readonly eventAt?: Date;
}

export interface RecordAssertionEvidenceInput {
  readonly subject: PilotLifecycleSubject;
  readonly actor: PilotLifecycleActor;
  readonly assertionsCovered: readonly PcaobAssertion[]; // MUST be non-empty
  readonly classificationHint: string | null;
  readonly evidenceRefs: readonly EvidenceRef[]; // MUST be non-empty
  readonly reasonCode: string;
  readonly reasonText: string | null;
  readonly payload: Record<string, unknown>;
  readonly eventAt?: Date;
}

// --- Return shape (mirrors DB row minus internal chain fields) ---

export interface PilotLifecycleEventRecord {
  readonly id: string;
  readonly chainSeq: number;
  /** DB event_kind (first-class as of Block 3.5). */
  readonly eventKind: PilotLifecycleEventKind;
  readonly eventAt: string; // ISO-8601
  readonly rowHash: string; // sha256:... from Block 2 trigger
  readonly prevHash: string | null;
}

/**
 * SSOT / AuditLogWriter / DB event kinds (Block 3.5 first-class CHECK).
 */
export type PilotLifecycleEventKind =
  | "pilot.lifecycle.created"
  | "pilot.lifecycle.transition"
  | "pilot.lifecycle.assertion.evidence-attached";

/** DB CHECK–legal event_kind values (includes Block 3.5 additions). */
export type PilotLifecycleDbEventKind =
  | "pilot.lifecycle.transition"
  | "pilot.lifecycle.drift-detected"
  | "pilot.lifecycle.auto-reconciled"
  | "pilot.lifecycle.escalated"
  | "pilot.lifecycle.recurred"
  | "pilot.lifecycle.created"
  | "pilot.lifecycle.assertion.evidence-attached";

/**
 * @deprecated Block 3.5 — evidence-attached rows use to_status NULL.
 * Kept briefly so any accidental import fails closed at compile if removed later.
 */
export const EVIDENCE_ONLY_TO_STATUS = "__unchanged__" as const;

// Mapping to AuditEventKind (extended in Block 3 additive change).
export const PILOT_LIFECYCLE_TO_AUDIT_KIND: Readonly<
  Record<PilotLifecycleEventKind, AuditEventKind>
> = {
  "pilot.lifecycle.created": "pilot.lifecycle.created",
  "pilot.lifecycle.transition": "pilot.lifecycle.transition",
  "pilot.lifecycle.assertion.evidence-attached":
    "pilot.lifecycle.assertion.evidence-attached",
} as const;
