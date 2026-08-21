import { describe, expect, it } from "vitest";
import {
  assertJeExecutionTransition,
  assertUnknownCommitCannotBlindRetry,
  classifyJeExecutionRetry,
  isJeExecutionTransitionAllowed,
  JeExecutionTransitionError,
} from "../execution-state";
import { UNKNOWN_COMMIT_INVARIANT } from "../execution-types";

describe("JE-3A execution state machine", () => {
  it("55. RESERVED → READY_TO_POST allowed", () => {
    expect(isJeExecutionTransitionAllowed("RESERVED", "READY_TO_POST")).toBe(true);
    expect(() =>
      assertJeExecutionTransition("RESERVED", "READY_TO_POST"),
    ).not.toThrow();
  });

  it("56. RESERVED → PRECHECK_FAILED allowed", () => {
    expect(isJeExecutionTransitionAllowed("RESERVED", "PRECHECK_FAILED")).toBe(
      true,
    );
  });

  it("57. READY_TO_POST → POSTING defined for future", () => {
    expect(isJeExecutionTransitionAllowed("READY_TO_POST", "POSTING")).toBe(true);
  });

  it("58. POSTING → UNKNOWN_COMMIT defined", () => {
    expect(isJeExecutionTransitionAllowed("POSTING", "UNKNOWN_COMMIT")).toBe(true);
  });

  it("59. POSTING → POSTED_UNVERIFIED defined", () => {
    expect(isJeExecutionTransitionAllowed("POSTING", "POSTED_UNVERIFIED")).toBe(
      true,
    );
  });

  it("60. POSTED_UNVERIFIED → VERIFIED defined", () => {
    expect(isJeExecutionTransitionAllowed("POSTED_UNVERIFIED", "VERIFIED")).toBe(
      true,
    );
  });

  it("61. POSTED_UNVERIFIED → REVERSAL_REQUIRED defined", () => {
    expect(
      isJeExecutionTransitionAllowed("POSTED_UNVERIFIED", "REVERSAL_REQUIRED"),
    ).toBe(true);
  });

  it("62. UNKNOWN_COMMIT → POSTING direct retry forbidden", () => {
    expect(isJeExecutionTransitionAllowed("UNKNOWN_COMMIT", "POSTING")).toBe(
      false,
    );
    expect(() =>
      assertJeExecutionTransition("UNKNOWN_COMMIT", "POSTING"),
    ).toThrow(JeExecutionTransitionError);
    expect(() => assertUnknownCommitCannotBlindRetry("UNKNOWN_COMMIT")).toThrow(
      /UNKNOWN_COMMIT/,
    );
    expect(UNKNOWN_COMMIT_INVARIANT).toMatch(/must not permit a new POST/i);
  });

  it("63. invalid transition rejected", () => {
    expect(() =>
      assertJeExecutionTransition("VERIFIED", "POSTING"),
    ).toThrow(/Invalid execution transition/);
  });

  it("retry classification vocabulary", () => {
    expect(classifyJeExecutionRetry("READY_TO_POST")).toBe("SAFE_BEFORE_SEND");
    expect(classifyJeExecutionRetry("UNKNOWN_COMMIT")).toBe("DISCOVERY_REQUIRED");
    expect(classifyJeExecutionRetry("POSTED_UNVERIFIED")).toBe("SAFE_READBACK_ONLY");
    expect(classifyJeExecutionRetry("VERIFIED")).toBe("NO_RETRY");
    expect(classifyJeExecutionRetry("FAILED")).toBe("MANUAL_INTERVENTION");
  });
});
