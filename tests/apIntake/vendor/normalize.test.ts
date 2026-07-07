import { describe, it, expect } from "vitest";
import { normalizeVendorName } from "@/lib/ap-intake/vendor/normalize";

describe("normalizeVendorName", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeVendorName("Acme, Inc.")).toBe("acme");
  });
  it("strips entity suffixes", () => {
    expect(normalizeVendorName("ACME LLC")).toBe("acme");
    expect(normalizeVendorName("Foo Corporation")).toBe("foo");
    expect(normalizeVendorName("Bar Company")).toBe("bar");
  });
  it("collapses whitespace", () => {
    expect(normalizeVendorName("  Acme   Widgets  ")).toBe("acme widgets");
  });
  it("handles unicode punctuation", () => {
    expect(normalizeVendorName("Café — Inc.")).toBe("café");
  });
  it("returns empty on empty input", () => {
    expect(normalizeVendorName("")).toBe("");
  });
});
