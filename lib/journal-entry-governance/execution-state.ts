/**
 * JE-3A / JE-3B1 — Pure execution state-machine transition validator.
 *
 * Layers:
 * 1) Domain vocabulary: full planned lifecycle.
 * 2) JE-3A DB mutation authority: RESERVED → READY_TO_POST | PRECHECK_FAILED.
 * 3) JE-3B1 DB mutation authority: JE-3A + provider lifecycle
 *    (POSTING / POSTED_UNVERIFIED / UNKNOWN_COMMIT / FAILED).
 *    Still forbids POSTED_UNVERIFIED → VERIFIED and UNKNOWN_COMMIT → POSTING.
 */

import {
  JE_EXECUTION_ERROR,
  UNKNOWN_COMMIT_INVARIANT,
  type JeExecutionStatus,
  type JeRetryClassification,
} from "./execution-types";

export class JeExecutionTransitionError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JeExecutionTransitionError";
    this.code = code;
  }
}

/** Full planned lifecycle vocabulary (planning / domain). */
const DOMAIN_ALLOWED: ReadonlyMap<
  JeExecutionStatus,
  readonly JeExecutionStatus[]
> = new Map([
  ["RESERVED", ["PRECHECK_FAILED", "READY_TO_POST"]],
  ["READY_TO_POST", ["POSTING"]],
  ["POSTING", ["POSTED_UNVERIFIED", "UNKNOWN_COMMIT", "FAILED"]],
  ["POSTED_UNVERIFIED", ["VERIFIED", "REVERSAL_REQUIRED"]],
  ["PRECHECK_FAILED", []],
  ["VERIFIED", []],
  ["FAILED", []],
  ["REVERSAL_REQUIRED", []],
  // UNKNOWN_COMMIT: no direct return to POSTING without future discovery decision.
  ["UNKNOWN_COMMIT", []],
]);

/**
 * JE-3A production DB mutation matrix: state transition IFF Patent #6 event.
 * Preserved for prepare-path callers and regression tests.
 */
export const JE_3A_DB_TRANSITION_EVENT_MATRIX = [
  {
    from: "RESERVED" as const,
    to: "READY_TO_POST" as const,
    eventType: "journal_entry.execution_ready" as const,
  },
  {
    from: "RESERVED" as const,
    to: "PRECHECK_FAILED" as const,
    eventType: "journal_entry.execution_precheck_failed" as const,
  },
] as const;

/**
 * JE-3B1 production DB mutation matrix: JE-3A pairs + provider lifecycle.
 * POSTED_UNVERIFIED → VERIFIED remains unauthorized until JE-3C.
 * UNKNOWN_COMMIT → POSTING is never authorized.
 */
export const JE_3B1_DB_TRANSITION_EVENT_MATRIX = [
  ...JE_3A_DB_TRANSITION_EVENT_MATRIX,
  {
    from: "READY_TO_POST" as const,
    to: "POSTING" as const,
    eventType: "journal_entry.posting_started" as const,
  },
  {
    from: "POSTING" as const,
    to: "POSTED_UNVERIFIED" as const,
    eventType: "journal_entry.provider_posted" as const,
  },
  {
    from: "POSTING" as const,
    to: "UNKNOWN_COMMIT" as const,
    eventType: "journal_entry.post_unknown" as const,
  },
  {
    from: "POSTING" as const,
    to: "FAILED" as const,
    eventType: "journal_entry.execution_failed" as const,
  },
] as const;

export type Je3aDbTransitionEvent =
  (typeof JE_3A_DB_TRANSITION_EVENT_MATRIX)[number];

export type Je3b1DbTransitionEvent =
  (typeof JE_3B1_DB_TRANSITION_EVENT_MATRIX)[number];

export function isJeExecutionTransitionAllowed(
  from: JeExecutionStatus,
  to: JeExecutionStatus,
): boolean {
  const next = DOMAIN_ALLOWED.get(from) || [];
  return next.includes(to);
}

export function assertJeExecutionTransition(
  from: JeExecutionStatus,
  to: JeExecutionStatus,
): void {
  if (from === "UNKNOWN_COMMIT" && to === "POSTING") {
    throw new JeExecutionTransitionError(
      JE_EXECUTION_ERROR.TRANSITION_INVALID,
      UNKNOWN_COMMIT_INVARIANT,
    );
  }
  if (!isJeExecutionTransitionAllowed(from, to)) {
    throw new JeExecutionTransitionError(
      JE_EXECUTION_ERROR.TRANSITION_INVALID,
      `Invalid execution transition: ${from} → ${to}`,
    );
  }
}

/**
 * JE-3A DB authority: transition and event type are one semantic operation.
 */
export function assertJe3aDbTransitionEventPair(args: {
  from: JeExecutionStatus;
  to: JeExecutionStatus;
  eventType: string;
}): Je3aDbTransitionEvent {
  const pair = JE_3A_DB_TRANSITION_EVENT_MATRIX.find(
    (row) =>
      row.from === args.from &&
      row.to === args.to &&
      row.eventType === args.eventType,
  );
  if (!pair) {
    throw new JeExecutionTransitionError(
      JE_EXECUTION_ERROR.TRANSITION_INVALID,
      `Invalid JE-3A transition/event pairing: ${args.from} → ${args.to} with ${args.eventType}`,
    );
  }
  return pair;
}

/**
 * JE-3B1 DB authority: JE-3A + provider lifecycle pairs.
 */
export function assertJe3b1DbTransitionEventPair(args: {
  from: JeExecutionStatus;
  to: JeExecutionStatus;
  eventType: string;
}): Je3b1DbTransitionEvent {
  const pair = JE_3B1_DB_TRANSITION_EVENT_MATRIX.find(
    (row) =>
      row.from === args.from &&
      row.to === args.to &&
      row.eventType === args.eventType,
  );
  if (!pair) {
    throw new JeExecutionTransitionError(
      JE_EXECUTION_ERROR.TRANSITION_INVALID,
      `Invalid JE-3B1 transition/event pairing: ${args.from} → ${args.to} with ${args.eventType}`,
    );
  }
  return pair;
}

export function assertJe3aEventPayloadStatusMatches(args: {
  payloadStatus: unknown;
  newStatus: JeExecutionStatus;
}): void {
  if (String(args.payloadStatus ?? "") !== args.newStatus) {
    throw new JeExecutionTransitionError(
      JE_EXECUTION_ERROR.TRANSITION_INVALID,
      `Event payload status ${String(args.payloadStatus)} does not match new status ${args.newStatus}`,
    );
  }
}

/** Alias — payload status coupling is identical for JE-3B1. */
export const assertJe3b1EventPayloadStatusMatches =
  assertJe3aEventPayloadStatusMatches;

/**
 * True only for transitions the JE-3A prepare-path SQL authority covers.
 */
export function isJe3aDbTransitionAuthorized(
  from: JeExecutionStatus,
  to: JeExecutionStatus,
): boolean {
  return JE_3A_DB_TRANSITION_EVENT_MATRIX.some(
    (row) => row.from === from && row.to === to,
  );
}

/**
 * True for transitions the JE-3B1 SQL RPC will execute.
 * Still false for POSTED_UNVERIFIED → VERIFIED and UNKNOWN_COMMIT → *.
 */
export function isJe3b1DbTransitionAuthorized(
  from: JeExecutionStatus,
  to: JeExecutionStatus,
): boolean {
  return JE_3B1_DB_TRANSITION_EVENT_MATRIX.some(
    (row) => row.from === from && row.to === to,
  );
}

/**
 * Retry classification vocabulary for JE-3B+. No provider retry here.
 */
export function classifyJeExecutionRetry(
  status: JeExecutionStatus,
): JeRetryClassification {
  switch (status) {
    case "RESERVED":
    case "PRECHECK_FAILED":
    case "READY_TO_POST":
      return "SAFE_BEFORE_SEND";
    case "POSTING":
      return "DISCOVERY_REQUIRED";
    case "POSTED_UNVERIFIED":
      return "SAFE_READBACK_ONLY";
    case "UNKNOWN_COMMIT":
      return "DISCOVERY_REQUIRED";
    case "VERIFIED":
      return "NO_RETRY";
    case "FAILED":
      return "MANUAL_INTERVENTION";
    case "REVERSAL_REQUIRED":
      return "MANUAL_INTERVENTION";
    default:
      return "MANUAL_INTERVENTION";
  }
}

export function assertUnknownCommitCannotBlindRetry(
  status: JeExecutionStatus,
): void {
  if (status === "UNKNOWN_COMMIT") {
    throw new JeExecutionTransitionError(
      JE_EXECUTION_ERROR.TRANSITION_INVALID,
      UNKNOWN_COMMIT_INVARIANT,
    );
  }
}
