/**
 * JE-3A — Pure execution state-machine transition validator.
 *
 * Two layers:
 * 1) Domain vocabulary (this module): describes the planned full lifecycle
 *    including future JE-3B provider states (POSTING, UNKNOWN_COMMIT, …).
 * 2) JE-3A DB mutation authority: narrower — only RESERVED → READY_TO_POST |
 *    PRECHECK_FAILED, each paired with its exact Patent #6 event.
 *
 * Defining future vocabulary ≠ authorizing future DB mutation.
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

/** Full planned lifecycle vocabulary (planning / domain). JE-3B widens DB later. */
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
 * Provider lifecycle transitions are intentionally absent until JE-3B.
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

export type Je3aDbTransitionEvent =
  (typeof JE_3A_DB_TRANSITION_EVENT_MATRIX)[number];

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

/**
 * True only for transitions the JE-3A SQL RPC will execute.
 * Future domain transitions (e.g. READY_TO_POST → POSTING) return false here.
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
