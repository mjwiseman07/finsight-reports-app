import { describe, it, expect } from "vitest";
import { levenshtein, similarity, metaphone } from "@/lib/ap-intake/vendor/fuzzy";

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("acme", "acme")).toBe(0);
  });
  it("returns length for empty vs non-empty", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });
  it("counts edits correctly", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("acme", "acmi")).toBe(1);
  });
});

describe("similarity threshold", () => {
  it("scores exact match as 1", () => {
    expect(similarity("acme", "acme")).toBe(1);
  });
  it("crosses the 0.85 boundary sensibly", () => {
    expect(similarity("acme widgets", "acme widget")).toBeGreaterThanOrEqual(0.85);
    expect(similarity("acme", "zzzz")).toBeLessThan(0.85);
  });
});

describe("metaphone phonetic bucketing", () => {
  it("groups Smith and Smyth", () => {
    expect(metaphone("Smith")).toBe(metaphone("Smyth"));
  });
  it("groups Kelly and Kelley", () => {
    expect(metaphone("Kelly")).toBe(metaphone("Kelley"));
  });
  it("groups Weinstein variants", () => {
    expect(metaphone("Weinstein")).toBe(metaphone("Wienstein"));
  });
  it("returns empty for non-alpha input", () => {
    expect(metaphone("12345")).toBe("");
  });
});
