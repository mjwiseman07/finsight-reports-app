import { describe, it, expect } from "vitest";
import {
  assertTransitionLegal,
  IllegalTransitionError,
  STATE_TRANSITIONS,
  EVENT_KIND_CREATED,
  EVENT_KIND_TRANSITION,
  EVENT_KIND_EVIDENCE,
  EVENT_KIND_REJECTED,
} from "../state-machine";

const slot = "00000000-0000-0000-0000-000000000001";

describe("assertTransitionLegal", () => {
  it("accepts every declared legal transition", () => {
    for (const t of STATE_TRANSITIONS) {
      for (const kind of t.kinds) {
        expect(() =>
          assertTransitionLegal({
            from: t.from,
            to: t.to,
            kind,
            pilot_slot_id: slot,
          }),
        ).not.toThrow();
      }
    }
  });

  it("rejects active → pending (backwards downgrade)", () => {
    expect(() =>
      assertTransitionLegal({
        from: "active",
        to: "pending",
        kind: EVENT_KIND_TRANSITION,
        pilot_slot_id: slot,
      }),
    ).toThrow(IllegalTransitionError);
  });

  it("rejects any transition out of terminal cancelled", () => {
    expect(() =>
      assertTransitionLegal({
        from: "cancelled",
        to: "active",
        kind: EVENT_KIND_TRANSITION,
        pilot_slot_id: slot,
      }),
    ).toThrow(/terminal status 'cancelled'/);
  });

  it("rejects any transition out of terminal converted", () => {
    expect(() =>
      assertTransitionLegal({
        from: "converted",
        to: "pending",
        kind: EVENT_KIND_TRANSITION,
        pilot_slot_id: slot,
      }),
    ).toThrow(/terminal status 'converted'/);
  });

  it("evidence-attached bypasses status legality (any from, null to)", () => {
    expect(() =>
      assertTransitionLegal({
        from: "active",
        to: null,
        kind: EVENT_KIND_EVIDENCE,
        pilot_slot_id: slot,
      }),
    ).not.toThrow();
    expect(() =>
      assertTransitionLegal({
        from: "cancelled",
        to: null,
        kind: EVENT_KIND_EVIDENCE,
        pilot_slot_id: slot,
      }),
    ).not.toThrow();
  });

  it("rejected sentinel kind is always accepted (state-machine-wiring emits it)", () => {
    expect(() =>
      assertTransitionLegal({
        from: "active",
        to: "pending",
        kind: EVENT_KIND_REJECTED,
        pilot_slot_id: slot,
      }),
    ).not.toThrow();
  });

  it("accepts active → active no-op (Block 3 historic smokes)", () => {
    expect(() =>
      assertTransitionLegal({
        from: "active",
        to: "active",
        kind: EVENT_KIND_TRANSITION,
        pilot_slot_id: slot,
      }),
    ).not.toThrow();
  });

  it("accepts created ∅ → active", () => {
    expect(() =>
      assertTransitionLegal({
        from: null,
        to: "active",
        kind: EVENT_KIND_CREATED,
        pilot_slot_id: slot,
      }),
    ).not.toThrow();
  });
});
