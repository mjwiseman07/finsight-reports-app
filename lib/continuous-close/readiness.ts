/**
 * Continuous Close readiness composition (OBSERVE).
 */

import type { ContinuousCloseException } from "./exceptions";
import type { ContinuousCloseReadinessState } from "./types";

export type ContinuousCloseReadinessResult = {
  state: ContinuousCloseReadinessState;
  blockingExceptionCodes: string[];
  openExceptionCodes: string[];
};

export function composeContinuousCloseReadiness(
  exceptions: readonly ContinuousCloseException[],
): ContinuousCloseReadinessResult {
  const blocking = exceptions.filter((e) => e.severity === "block");
  const open = exceptions.filter((e) => e.severity === "open");

  if (blocking.some((e) => e.exceptionClass === "sync_identity_invalid" || e.exceptionClass === "mode_not_executable")) {
    return {
      state: "blocked",
      blockingExceptionCodes: blocking.map((e) => e.code),
      openExceptionCodes: open.map((e) => e.code),
    };
  }

  if (blocking.length > 0) {
    return {
      state: "blocked",
      blockingExceptionCodes: blocking.map((e) => e.code),
      openExceptionCodes: open.map((e) => e.code),
    };
  }

  if (open.some((e) => e.exceptionClass === "statement_control_fail" || e.exceptionClass === "statement_control_missing")) {
    return {
      state: "controls_incomplete",
      blockingExceptionCodes: [],
      openExceptionCodes: open.map((e) => e.code),
    };
  }

  if (open.length > 0) {
    return {
      state: "exceptions_open",
      blockingExceptionCodes: [],
      openExceptionCodes: open.map((e) => e.code),
    };
  }

  if (exceptions.length === 0) {
    return {
      state: "observe_ready",
      blockingExceptionCodes: [],
      openExceptionCodes: [],
    };
  }

  // Only info-severity exceptions remain.
  return {
    state: "observe_ready",
    blockingExceptionCodes: [],
    openExceptionCodes: [],
  };
}
