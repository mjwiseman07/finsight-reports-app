import { describe, it, expect } from "vitest";
import { isValidFirmSlug } from "@/lib/intake/address";

describe("isValidFirmSlug", () => {
  it("accepts valid slugs (3-32 chars, alphanumeric anchors, hyphens allowed inside)", () => {
    expect(isValidFirmSlug("abc")).toBe(true);
    expect(isValidFirmSlug("northstar-manufacturing")).toBe(true);
    expect(isValidFirmSlug("co-a1b2c3d4")).toBe(true);
    expect(isValidFirmSlug("a".repeat(32))).toBe(true);
  });

  it("rejects too short", () => {
    expect(isValidFirmSlug("")).toBe(false);
    expect(isValidFirmSlug("a")).toBe(false);
    expect(isValidFirmSlug("ab")).toBe(false);
  });

  it("rejects too long (>32 chars)", () => {
    expect(isValidFirmSlug("a".repeat(33))).toBe(false);
  });

  it("rejects leading or trailing hyphen", () => {
    expect(isValidFirmSlug("-abc")).toBe(false);
    expect(isValidFirmSlug("abc-")).toBe(false);
    expect(isValidFirmSlug("-abc-")).toBe(false);
  });

  it("rejects uppercase, underscores, spaces, dots", () => {
    expect(isValidFirmSlug("ABC")).toBe(false);
    expect(isValidFirmSlug("a_b")).toBe(false);
    expect(isValidFirmSlug("a b")).toBe(false);
    expect(isValidFirmSlug("a.b")).toBe(false);
  });
});
