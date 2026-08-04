/**
 * Pilot lifecycle state machine — declarative legal transitions.
 *
 * STATE_TRANSITIONS is the single source of truth for legal
 * (from_status, to_status, event_kind) triples. Every SSOT atomic write
 * calls assertTransitionLegal() before the RPC.
 */

export type PilotStatus =
  | "pending"
  | "active"
  | "converted"
  | "cancelled"
  | "complimentary";

export const PILOT_STATUSES: readonly PilotStatus[] = [
  "pending",
  "active",
  "converted",
  "cancelled",
  "complimentary",
] as const;

export const TERMINAL_STATUSES: ReadonlySet<PilotStatus> = new Set([
  "converted",
  "cancelled",
]);

export type LegalTransition = {
  from: PilotStatus | null; // null = creation
  to: PilotStatus;
  kinds: readonly string[];
};

export const EVENT_KIND_CREATED = "pilot.lifecycle.created";
export const EVENT_KIND_TRANSITION = "pilot.lifecycle.transition";
export const EVENT_KIND_EVIDENCE = "pilot.lifecycle.assertion.evidence-attached";
export const EVENT_KIND_REJECTED = "pilot.lifecycle.transition.rejected";

/** Sentinel to_status for rejected transition audit rows (non-null CHECK). */
export const REJECTED_TO_STATUS = "__rejected__" as const;

export const STATE_TRANSITIONS: readonly LegalTransition[] = [
  // Creations
  { from: null, to: "pending", kinds: [EVENT_KIND_CREATED] },
  { from: null, to: "active", kinds: [EVENT_KIND_CREATED] },
  { from: null, to: "complimentary", kinds: [EVENT_KIND_CREATED] },

  // From pending
  { from: "pending", to: "active", kinds: [EVENT_KIND_TRANSITION] },
  { from: "pending", to: "cancelled", kinds: [EVENT_KIND_TRANSITION] },
  { from: "pending", to: "complimentary", kinds: [EVENT_KIND_TRANSITION] },
  { from: "pending", to: "pending", kinds: [EVENT_KIND_TRANSITION] }, // no-op

  // From active
  { from: "active", to: "cancelled", kinds: [EVENT_KIND_TRANSITION] },
  { from: "active", to: "converted", kinds: [EVENT_KIND_TRANSITION] },
  { from: "active", to: "complimentary", kinds: [EVENT_KIND_TRANSITION] },
  { from: "active", to: "active", kinds: [EVENT_KIND_TRANSITION] }, // no-op (Block 3 smokes)

  // From complimentary
  { from: "complimentary", to: "active", kinds: [EVENT_KIND_TRANSITION] },
  { from: "complimentary", to: "cancelled", kinds: [EVENT_KIND_TRANSITION] },
  { from: "complimentary", to: "complimentary", kinds: [EVENT_KIND_TRANSITION] }, // no-op

  // Terminals — same-status audit no-ops only (no resurrection)
  { from: "converted", to: "converted", kinds: [EVENT_KIND_TRANSITION] },
  { from: "cancelled", to: "cancelled", kinds: [EVENT_KIND_TRANSITION] },
] as const;

export class IllegalTransitionError extends Error {
  readonly from: PilotStatus | null;
  readonly to: PilotStatus | null;
  readonly kind: string;
  readonly pilot_slot_id: string;
  constructor(args: {
    from: PilotStatus | null;
    to: PilotStatus | null;
    kind: string;
    pilot_slot_id: string;
    reason: string;
  }) {
    super(
      `Illegal pilot lifecycle transition: ${args.from ?? "∅"} → ${args.to ?? "∅"} (kind=${args.kind}, slot=${args.pilot_slot_id}): ${args.reason}`,
    );
    this.from = args.from;
    this.to = args.to;
    this.kind = args.kind;
    this.pilot_slot_id = args.pilot_slot_id;
    this.name = "IllegalTransitionError";
  }
}

export function assertTransitionLegal(args: {
  from: PilotStatus | null;
  to: PilotStatus | null;
  kind: string;
  pilot_slot_id: string;
}): void {
  const { from, to, kind, pilot_slot_id } = args;

  if (kind === EVENT_KIND_EVIDENCE) return;
  if (kind === EVENT_KIND_REJECTED) return;

  // Terminals cannot transition *out* to a different status.
  if (
    from !== null &&
    TERMINAL_STATUSES.has(from) &&
    to !== from
  ) {
    throw new IllegalTransitionError({
      from,
      to,
      kind,
      pilot_slot_id,
      reason: `terminal status '${from}' cannot transition out`,
    });
  }

  if (to === null) {
    throw new IllegalTransitionError({
      from,
      to,
      kind,
      pilot_slot_id,
      reason: "to_status is required for non-evidence transitions",
    });
  }

  const match = STATE_TRANSITIONS.find(
    (t) => t.from === from && t.to === to && t.kinds.includes(kind),
  );

  if (!match) {
    throw new IllegalTransitionError({
      from,
      to,
      kind,
      pilot_slot_id,
      reason: `no legal transition matches (from=${from ?? "∅"}, to=${to}, kind=${kind})`,
    });
  }
}

export function describeTransition(args: {
  from: PilotStatus | null;
  to: PilotStatus | null;
  kind: string;
}): string {
  if (args.kind === EVENT_KIND_EVIDENCE) {
    return `evidence attached (status unchanged from ${args.from ?? "∅"})`;
  }
  if (args.kind === EVENT_KIND_REJECTED) {
    return `attempted transition rejected: ${args.from ?? "∅"} → ${args.to ?? "∅"}`;
  }
  return `${args.from ?? "∅"} → ${args.to ?? "∅"}`;
}
