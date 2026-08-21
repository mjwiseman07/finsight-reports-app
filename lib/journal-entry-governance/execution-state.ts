/**
 * JE-3A — Pure execution state-machine transition validator.
 * Locks UNKNOWN_COMMIT so it cannot loop into blind POST retry.
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

const ALLOWED: ReadonlyMap<JeExecutionStatus, readonly JeExecutionStatus[]> =
  new Map([
    ["RESERVED", ["PRECHECK_FAILED", "READY_TO_POST"]],
    ["READY_TO_POST", ["POSTING"]],
    ["POSTING", ["POSTED_UNVERIFIED", "UNKNOWN_COMMIT", "FAILED"]],
    ["POSTED_UNVERIFIED", ["VERIFIED", "REVERSAL_REQUIRED"]],
    // Terminal / recovery-gated:
    ["PRECHECK_FAILED", []],
    ["VERIFIED", []],
    ["FAILED", []],
    ["REVERSAL_REQUIRED", []],
    // UNKNOWN_COMMIT: no direct return to POSTING without future discovery decision.
    ["UNKNOWN_COMMIT", []],
  ]);

export function isJeExecutionTransitionAllowed(
  from: JeExecutionStatus,
  to: JeExecutionStatus,
): boolean {
  const next = ALLOWED.get(from) || [];
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
