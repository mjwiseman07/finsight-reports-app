import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { canonicalPayloadJson, computeEventHash } from "@/lib/ledger/merkle";

describe("canonicalPayloadJson", () => {
  it("sorts object keys recursively for stable serialization", () => {
    expect(canonicalPayloadJson({ b: 2, a: { d: 4, c: 3 } })).toBe(
      JSON.stringify({ a: { c: 3, d: 4 }, b: 2 }),
    );
  });

  it("normalizes undefined to null in arrays and objects", () => {
    expect(canonicalPayloadJson({ items: [undefined, 1] })).toBe(
      JSON.stringify({ items: [null, 1] }),
    );
  });
});

describe("computeEventHash", () => {
  it("produces deterministic sha256 over prev hash + id + type + canonical payload", () => {
    const payload = { amount: 1234.56, vendor: "ACME" };
    const canonical = canonicalPayloadJson(payload);
    const eventId = "11111111-1111-1111-1111-111111111111";
    const eventType = "bill.received";
    const previousEventHash = "abc123";

    const expected = createHash("sha256")
      .update(previousEventHash + eventId + eventType + canonical, "utf8")
      .digest("hex");

    expect(
      computeEventHash({
        previousEventHash,
        eventId,
        eventType,
        payload,
      }),
    ).toBe(expected);
  });

  it("treats null previous hash as empty string prefix", () => {
    const payload = { z: 1 };
    const hash = computeEventHash({
      previousEventHash: null,
      eventId: "evt-1",
      eventType: "bill.fraud_score_updated",
      payload,
    });

    const expected = createHash("sha256")
      .update("" + "evt-1" + "bill.fraud_score_updated" + canonicalPayloadJson(payload), "utf8")
      .digest("hex");

    expect(hash).toBe(expected);
  });
});
