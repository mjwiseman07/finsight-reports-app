import { describe, expect, it } from "vitest";

describe("W1c.1 write-boundary barrel exposes qbo-preflight + type-adapters", () => {
  it("exports qboPreflight namespace with all expected helpers", async () => {
    const mod = await import("@/lib/accounting/write-boundary");
    expect(mod.qboPreflight).toBeDefined();
    expect(typeof mod.qboPreflight.canPostToQBO).toBe("function");
    expect(typeof mod.qboPreflight.validateJEPayload).toBe("function");
    expect(typeof mod.qboPreflight.resolveCurrencyForFirmClient).toBe("function");
    expect(typeof mod.qboPreflight.resolveExchangeRate).toBe("function");
    expect(typeof mod.qboPreflight.resolveQBOTokenForFirmClient).toBe("function");
    expect(typeof mod.qboPreflight.capabilityForEdition).toBe("function");
    expect(typeof mod.qboPreflight.parseSubscriptionStatus).toBe("function");
    expect(typeof mod.qboPreflight.subscriptionAllowsWrites).toBe("function");
  });

  it("exports typeAdapters namespace with both converters", async () => {
    const mod = await import("@/lib/accounting/write-boundary");
    expect(typeof mod.typeAdapters.toJEPayload).toBe("function");
    expect(typeof mod.typeAdapters.toWriteReceipt).toBe("function");
  });
});
