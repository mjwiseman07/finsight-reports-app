import { describe, test, expect } from "vitest";
import { isGenericEnoughToPool } from "./payer-pattern-classifier";

describe("isGenericEnoughToPool — positives (both sides generic)", () => {
  test("Microsoft <-> Microsoft", () => {
    expect(isGenericEnoughToPool("MICROSOFT CORPORATION", "Microsoft Corp")).toBe(true);
  });
  test("Google <-> Alphabet-adjacent naming", () => {
    expect(isGenericEnoughToPool("GOOGLE LLC", "Google LLC")).toBe(true);
  });
  test("Comcast <-> Comcast", () => {
    expect(isGenericEnoughToPool("COMCAST CORPORATION", "Comcast Corp")).toBe(true);
  });
  test("JPMorgan Chase variants match each other", () => {
    expect(isGenericEnoughToPool("JP MORGAN CHASE BANK NA", "JPMorgan Chase")).toBe(true);
  });
  test("PG&E <-> Pacific Gas and Electric", () => {
    expect(isGenericEnoughToPool("PG&E", "Pacific Gas and Electric Company")).toBe(true);
  });
  test("AT&T <-> AT&T Inc", () => {
    expect(isGenericEnoughToPool("AT&T", "AT&T Inc.")).toBe(true);
  });
  test("Walmart <-> Walmart Inc", () => {
    expect(isGenericEnoughToPool("WALMART INC", "Walmart")).toBe(true);
  });
  test("Delta Air Lines <-> Delta Airlines spelling variant", () => {
    expect(isGenericEnoughToPool("DELTA AIR LINES INC", "Delta Airlines")).toBe(true);
  });
  test("FedEx <-> UPS both generic (cross-brand call still both individually generic)", () => {
    expect(isGenericEnoughToPool("FEDEX CORPORATION", "UPS")).toBe(true);
  });
  test("Charles Schwab <-> Schwab shorthand", () => {
    expect(isGenericEnoughToPool("CHARLES SCHWAB CO INC", "Schwab")).toBe(true);
  });
});

describe("isGenericEnoughToPool — negatives (at least one side not generic)", () => {
  test("Bob's Local Plumbing is not generic", () => {
    expect(isGenericEnoughToPool("BOB'S LOCAL PLUMBING LLC", "Microsoft Corp")).toBe(false);
  });
  test("Smith Family Trust is not generic", () => {
    expect(isGenericEnoughToPool("SMITH FAMILY TRUST", "JPMorgan Chase")).toBe(false);
  });
  test("Acme Consulting LLC is not in curated list", () => {
    expect(isGenericEnoughToPool("ACME CONSULTING LLC", "Acme Consulting LLC")).toBe(false);
  });
  test("random personal name is not generic", () => {
    expect(isGenericEnoughToPool("JOHN Q PUBLIC", "John Q Public")).toBe(false);
  });
  test("one side generic, other side not, fails the pair", () => {
    expect(isGenericEnoughToPool("MICROSOFT CORPORATION", "Bob's Local Plumbing")).toBe(false);
  });
  test("corporate suffix alone does not qualify without brand-list match", () => {
    expect(isGenericEnoughToPool("RANDOM SMALL BUSINESS INC", "Random Small Business Inc")).toBe(false);
  });
  test("null payer name returns false", () => {
    expect(isGenericEnoughToPool(null, "Microsoft Corp")).toBe(false);
  });
  test("null customer name returns false", () => {
    expect(isGenericEnoughToPool("Microsoft Corp", null)).toBe(false);
  });
  test("empty strings return false", () => {
    expect(isGenericEnoughToPool("", "")).toBe(false);
  });
  test("regional credit union not in curated bank list", () => {
    expect(isGenericEnoughToPool("RIVERTOWN COMMUNITY CREDIT UNION", "JPMorgan Chase")).toBe(false);
  });
  test("local municipal utility not in curated utility list", () => {
    expect(isGenericEnoughToPool("SPRINGFIELD MUNICIPAL WATER DEPT", "PG&E")).toBe(false);
  });
  test("low fuzzy overlap does not falsely match a curated brand", () => {
    expect(isGenericEnoughToPool("MICRO SOLUTIONS INC", "Microsoft Corp")).toBe(false);
  });
  test("whitespace-only input returns false", () => {
    expect(isGenericEnoughToPool("   ", "Microsoft Corp")).toBe(false);
  });
});
