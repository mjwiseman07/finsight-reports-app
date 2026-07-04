import { describe, expect, it } from "vitest";
import { draftBalanceCents, parseDollarsToCents } from "@/lib/reviewer/je-draft-utils";

describe("je-draft-utils", () => {
  it("parseDollars 12.34 -> 1234", () => {
    expect(parseDollarsToCents("12.34")).toBe(1234);
  });

  it("parseDollars avoids float drift", () => {
    expect(parseDollarsToCents("0.29")).toBe(29);
  });

  it("balance detects unbalanced", () => {
    expect(draftBalanceCents([{ drAmountCents: 100, crAmountCents: 0 }])).toMatchObject({
      balanced: false,
    });
  });

  it("balance detects balanced", () => {
    expect(
      draftBalanceCents([
        { drAmountCents: 100, crAmountCents: 0 },
        { drAmountCents: 0, crAmountCents: 100 },
      ]).balanced,
    ).toBe(true);
  });

  it("empty parses to 0", () => {
    expect(parseDollarsToCents("")).toBe(0);
  });
});
