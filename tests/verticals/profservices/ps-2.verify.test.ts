import { describe, expect, it } from "vitest";

describe("PS-2 cascade channel-count regression (10→11)", () => {
  it("lib audit channel count is 11 post LOCK-NPO-1", async () => {
    const idx = await import(
      "../../../lib/intelligence/synthetic/audit/channels/index.ts"
    );
    expect(idx.AUDIT_CHANNEL_COUNT).toBe(11);
  });

  it("src audit channel count is 11 post LOCK-NPO-2", async () => {
    const registry = await import("../../../src/audit/channel-registry.ts");
    expect(registry.AUDIT_CHANNEL_COUNT).toBe(11);
  });
});
