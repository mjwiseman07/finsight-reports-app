import { describe, expect, it } from "vitest";
import {
  isRaProCutoverCommerceClosed,
  resolveRaProCutoverCommerceGate,
  resolveRaProCutoverCommerceGateValue,
  RA_PRO_CUTOVER_COMMERCE_GATED_CODE,
} from "@/lib/review-assist-pro/cutover-commerce-gate";

describe("RA Pro cutover commerce gate resolver (prep)", () => {
  it("only explicit open enables commerce", () => {
    expect(resolveRaProCutoverCommerceGateValue("open")).toBe("open");
    expect(isRaProCutoverCommerceClosed({ RA_PRO_CUTOVER_COMMERCE_GATE: "open" })).toBe(
      false,
    );
  });

  it("missing, malformed, and closed fail closed", () => {
    expect(resolveRaProCutoverCommerceGate({})).toBe("closed");
    expect(resolveRaProCutoverCommerceGateValue(undefined)).toBe("closed");
    expect(resolveRaProCutoverCommerceGateValue("")).toBe("closed");
    expect(resolveRaProCutoverCommerceGateValue("CLOSED")).toBe("closed");
    expect(resolveRaProCutoverCommerceGateValue("yes")).toBe("closed");
    expect(isRaProCutoverCommerceClosed({ RA_PRO_CUTOVER_COMMERCE_GATE: "closed" })).toBe(
      true,
    );
    expect(isRaProCutoverCommerceClosed({})).toBe(true);
  });

  it("exports stable gated code", () => {
    expect(RA_PRO_CUTOVER_COMMERCE_GATED_CODE).toBe("ra_pro_cutover_commerce_gated");
  });
});
