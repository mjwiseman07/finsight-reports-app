import { describe, it, expect } from "vitest";
import { normalizeForHash, computeContentHash } from "@/lib/ap-intake/duplicate/content-hash";

describe("content-hash", () => {
  it("strips email headers before hashing", () => {
    const raw = "From: vendor@x.com\nSubject: Invoice\n\nLine item $100";
    const norm = normalizeForHash(raw);
    expect(norm).not.toContain("from:");
    expect(norm).toContain("line item $100");
  });

  it("produces stable sha256 for same normalized text", () => {
    const a = computeContentHash("  Invoice   TOTAL  $50.00  ");
    const b = computeContentHash("invoice total $50.00");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns null for empty after normalization", () => {
    expect(computeContentHash("From: x\nTo: y")).toBeNull();
  });
});
