import { describe, expect, it } from "vitest";

describe("SAAS-2 cascade channel-count regression (10→11)", () => {
  it("lib audit channel count is 11 post LOCK-NPO-1", async () => {
    const idx = await import(
      "../../../lib/intelligence/synthetic/audit/channels/index.ts"
    );
    expect(idx.AUDIT_CHANNEL_COUNT).toBe(11);
  });

  it("src audit channel count is 11 + D0 cascade sealed", async () => {
    const registry = await import("../../../src/audit/channel-registry.ts");
    const d0 = await import("../../../src/registry/d0.ts");
    expect(registry.AUDIT_CHANNEL_COUNT).toBe(11);
    expect(d0.D0.cascadeStatus).toBe("COMPLETE-9-VERTICAL-W2-ALL");
    expect(d0.D0.verticalsW2Sealed).toBe(9);
    expect(d0.D0.verticalWaveStatus.RTL).toBe("W2");
  });
});
