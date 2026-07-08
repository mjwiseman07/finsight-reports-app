import { describe, it, expect } from "vitest";
import { DeterministicKeywordClassifier, normalizeClassifierOutput } from "@/lib/ap-intake/inbox/classifier";

describe("keyword classifier", () => {
  const c = new DeterministicKeywordClassifier();

  it("catches wire transfer intent (permanent excluded)", async () => {
    const r = await c.classifyMessage({
      channel: "email",
      subject: "Please initiate wire transfer",
      body_text: "Send wire to our account",
      sender_address: "x@vendor.com",
    });
    expect(r.intent).toBe("wire_transfer_initiation");
  });

  it("catches bank_change_request", async () => {
    const r = await c.classifyMessage({
      channel: "email",
      subject: "Update bank",
      body_text: "Please change bank account for our remittance",
      sender_address: "x@vendor.com",
    });
    expect(r.intent).toBe("bank_change_request");
  });

  it("falls back to generic on unknown content", async () => {
    const r = await c.classifyMessage({
      channel: "email",
      subject: "hi",
      body_text: "hello",
      sender_address: "x@vendor.com",
    });
    expect(r.intent).toBe("generic");
    expect(r.confidence).toBe(0);
  });

  it("normalizes an invalid adapter output to generic/0", () => {
    const r = normalizeClassifierOutput({ intent: "not_a_real_intent", confidence: 5 });
    expect(r.intent).toBe("generic");
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });
});
