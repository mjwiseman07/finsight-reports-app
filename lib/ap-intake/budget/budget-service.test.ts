import { describe, it, expect } from "vitest";

describe("Block 6b — budget result classification", () => {
  function classify(total: number, budget: number, tolerancePct: number) {
    const toleranceCents = Math.floor((budget * tolerancePct) / 100);
    if (total <= budget) return "within_budget";
    if (total <= budget + toleranceCents) return "within_tolerance";
    return "exceeds_budget";
  }

  it("classifies within_budget", () => {
    expect(classify(50_000_00, 100_000_00, 0)).toBe("within_budget");
  });

  it("classifies within_tolerance", () => {
    expect(classify(105_000_00, 100_000_00, 10)).toBe("within_tolerance");
  });

  it("classifies exceeds_budget", () => {
    expect(classify(120_000_00, 100_000_00, 10)).toBe("exceeds_budget");
  });
});
