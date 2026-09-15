import { describe, expect, it } from "vitest";
import {
  isRaProCutoverCommerceClosed,
  resolveRaProCutoverCommerceGate,
  resolveRaProCutoverCommerceGateValue,
  RA_PRO_CUTOVER_COMMERCE_GATED_CODE,
} from "@/lib/review-assist-pro/cutover-commerce-gate";

describe("RA Pro cutover commerce gate", () => {
  it("open allows commerce", () => {
    expect(resolveRaProCutoverCommerceGateValue("open")).toBe("open");
    expect(isRaProCutoverCommerceClosed({ RA_PRO_CUTOVER_COMMERCE_GATE: "open" })).toBe(
      false,
    );
  });

  it("closed blocks commerce", () => {
    expect(resolveRaProCutoverCommerceGateValue("closed")).toBe("closed");
    expect(isRaProCutoverCommerceClosed({ RA_PRO_CUTOVER_COMMERCE_GATE: "closed" })).toBe(
      true,
    );
  });

  it("missing or malformed fails closed", () => {
    expect(resolveRaProCutoverCommerceGateValue(undefined)).toBe("closed");
    expect(resolveRaProCutoverCommerceGateValue("")).toBe("closed");
    expect(resolveRaProCutoverCommerceGateValue("OPEN")).toBe("open");
    expect(resolveRaProCutoverCommerceGateValue("yes")).toBe("closed");
    expect(resolveRaProCutoverCommerceGateValue("on")).toBe("closed");
    expect(resolveRaProCutoverCommerceGateValue("true")).toBe("closed");
    expect(resolveRaProCutoverCommerceGate({})).toBe("closed");
    expect(isRaProCutoverCommerceClosed({})).toBe(true);
  });

  it("exposes stable gated failure code", () => {
    expect(RA_PRO_CUTOVER_COMMERCE_GATED_CODE).toBe("ra_pro_cutover_commerce_gated");
  });
});
