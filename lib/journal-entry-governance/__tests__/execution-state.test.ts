import { describe, expect, it } from "vitest";
import {
  assertJe3aDbTransitionEventPair,
  assertJe3aEventPayloadStatusMatches,
  assertJeExecutionTransition,
  assertUnknownCommitCannotBlindRetry,
  classifyJeExecutionRetry,
  isJe3aDbTransitionAuthorized,
  isJeExecutionTransitionAllowed,
  JE_3A_DB_TRANSITION_EVENT_MATRIX,
  JeExecutionTransitionError,
} from "../execution-state";
import { UNKNOWN_COMMIT_INVARIANT } from "../execution-types";

describe("JE-3A execution state machine", () => {
  it("55. RESERVED → READY_TO_POST allowed (domain)", () => {
    expect(isJeExecutionTransitionAllowed("RESERVED", "READY_TO_POST")).toBe(true);
    expect(() =>
      assertJeExecutionTransition("RESERVED", "READY_TO_POST"),
    ).not.toThrow();
  });

  it("56. RESERVED → PRECHECK_FAILED allowed (domain)", () => {
    expect(isJeExecutionTransitionAllowed("RESERVED", "PRECHECK_FAILED")).toBe(
      true,
    );
  });

  it("57. READY_TO_POST → POSTING domain allowed; JE-3A DB still narrow", () => {
    expect(isJeExecutionTransitionAllowed("READY_TO_POST", "POSTING")).toBe(true);
    expect(isJe3aDbTransitionAuthorized("READY_TO_POST", "POSTING")).toBe(false);
  });

  it("58. POSTING → UNKNOWN_COMMIT domain allowed; JE-3A DB still narrow", () => {
    expect(isJeExecutionTransitionAllowed("POSTING", "UNKNOWN_COMMIT")).toBe(true);
    expect(isJe3aDbTransitionAuthorized("POSTING", "UNKNOWN_COMMIT")).toBe(false);
  });

  it("59. POSTING → POSTED_UNVERIFIED domain allowed; JE-3A DB still narrow", () => {
    expect(isJeExecutionTransitionAllowed("POSTING", "POSTED_UNVERIFIED")).toBe(
      true,
    );
    expect(isJe3aDbTransitionAuthorized("POSTING", "POSTED_UNVERIFIED")).toBe(
      false,
    );
  });

  it("60. POSTED_UNVERIFIED → VERIFIED defined (domain only)", () => {
    expect(isJeExecutionTransitionAllowed("POSTED_UNVERIFIED", "VERIFIED")).toBe(
      true,
    );
    expect(isJe3aDbTransitionAuthorized("POSTED_UNVERIFIED", "VERIFIED")).toBe(
      false,
    );
  });

  it("61. POSTED_UNVERIFIED → REVERSAL_REQUIRED defined (domain only)", () => {
    expect(
      isJeExecutionTransitionAllowed("POSTED_UNVERIFIED", "REVERSAL_REQUIRED"),
    ).toBe(true);
    expect(
      isJe3aDbTransitionAuthorized("POSTED_UNVERIFIED", "REVERSAL_REQUIRED"),
    ).toBe(false);
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

describe("JE-3A DB transition ↔ Patent #6 event coupling", () => {
  it("1-2. RESERVED→READY/PRECHECK with matching events allowed", () => {
    expect(() =>
      assertJe3aDbTransitionEventPair({
        from: "RESERVED",
        to: "READY_TO_POST",
        eventType: "journal_entry.execution_ready",
      }),
    ).not.toThrow();
    expect(() =>
      assertJe3aDbTransitionEventPair({
        from: "RESERVED",
        to: "PRECHECK_FAILED",
        eventType: "journal_entry.execution_precheck_failed",
      }),
    ).not.toThrow();
    expect(JE_3A_DB_TRANSITION_EVENT_MATRIX).toHaveLength(2);
  });

  it("3. RESERVED→READY_TO_POST with precheck_failed event rejected", () => {
    expect(() =>
      assertJe3aDbTransitionEventPair({
        from: "RESERVED",
        to: "READY_TO_POST",
        eventType: "journal_entry.execution_precheck_failed",
      }),
    ).toThrow(/transition\/event pairing/);
  });

  it("4. RESERVED→PRECHECK_FAILED with execution_ready event rejected", () => {
    expect(() =>
      assertJe3aDbTransitionEventPair({
        from: "RESERVED",
        to: "PRECHECK_FAILED",
        eventType: "journal_entry.execution_ready",
      }),
    ).toThrow(/transition\/event pairing/);
  });

  it("5-6. matching payload status allowed", () => {
    expect(() =>
      assertJe3aEventPayloadStatusMatches({
        payloadStatus: "READY_TO_POST",
        newStatus: "READY_TO_POST",
      }),
    ).not.toThrow();
    expect(() =>
      assertJe3aEventPayloadStatusMatches({
        payloadStatus: "PRECHECK_FAILED",
        newStatus: "PRECHECK_FAILED",
      }),
    ).not.toThrow();
  });

  it("7. payload status differs from new status → rejected", () => {
    expect(() =>
      assertJe3aEventPayloadStatusMatches({
        payloadStatus: "PRECHECK_FAILED",
        newStatus: "READY_TO_POST",
      }),
    ).toThrow(/does not match/);
  });

  it("8-10. JE-3A matrix remains narrow; JE-3B1 widens separately", () => {
    expect(isJe3aDbTransitionAuthorized("READY_TO_POST", "POSTING")).toBe(false);
    expect(isJe3aDbTransitionAuthorized("POSTING", "UNKNOWN_COMMIT")).toBe(false);
    expect(isJe3aDbTransitionAuthorized("POSTED_UNVERIFIED", "VERIFIED")).toBe(
      false,
    );
    expect(() =>
      assertJe3aDbTransitionEventPair({
        from: "READY_TO_POST",
        to: "POSTING",
        eventType: "journal_entry.execution_ready",
      }),
    ).toThrow(/transition\/event pairing/);
  });

  it("11. pure TS domain vocabulary still defines future transitions", () => {
    expect(isJeExecutionTransitionAllowed("READY_TO_POST", "POSTING")).toBe(true);
    expect(isJeExecutionTransitionAllowed("POSTING", "UNKNOWN_COMMIT")).toBe(true);
    expect(isJeExecutionTransitionAllowed("POSTED_UNVERIFIED", "VERIFIED")).toBe(
      true,
    );
  });

  it("12. UNKNOWN_COMMIT → POSTING remains forbidden in TS", () => {
    expect(isJeExecutionTransitionAllowed("UNKNOWN_COMMIT", "POSTING")).toBe(
      false,
    );
  });
});
