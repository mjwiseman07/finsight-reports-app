import { describe, expect, it } from "vitest";
import { classifyMaterialityBucket } from "@/lib/pre-close/require-approval";

describe("Gap 3 classifyMaterialityBucket (mirrors SQL defaults)", () => {
  it("50000 → low under platform default $1K", () => {
    expect(classifyMaterialityBucket(50_000)).toBe("low");
  });

  it("50000 → medium when engagement low_max is $200", () => {
    expect(
      classifyMaterialityBucket(50_000, { lowMaxCents: 20_000, mediumMaxCents: 1_000_000 }),
    ).toBe("medium");
  });

  it("NULL → null", () => {
    expect(classifyMaterialityBucket(null)).toBeNull();
  });

  it("high bucket boundary above medium max", () => {
    expect(classifyMaterialityBucket(1_000_001)).toBe("high");
    expect(classifyMaterialityBucket(1_000_000)).toBe("medium");
  });

  it("per-engagement medium ceiling shifts high boundary", () => {
    expect(
      classifyMaterialityBucket(500_000, { lowMaxCents: 100_000, mediumMaxCents: 400_000 }),
    ).toBe("high");
  });
});
