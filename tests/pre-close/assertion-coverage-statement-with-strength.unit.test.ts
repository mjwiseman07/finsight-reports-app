import { describe, expect, it } from "vitest";
import { evidenceStrengthLabel } from "@/lib/close-packet/pdf/AssertionCoverageStatement";

describe("assertion coverage PDF evidence strength labels", () => {
  it("renders strong/moderate/weak/unassessed badges", () => {
    expect(evidenceStrengthLabel("strong")).toContain("Strong");
    expect(evidenceStrengthLabel("moderate")).toContain("Moderate");
    expect(evidenceStrengthLabel("weak")).toContain("Weak");
    expect(evidenceStrengthLabel("unassessed")).toContain("Unassessed");
  });

  it("uses distinct symbols per tier", () => {
    const labels = ["strong", "moderate", "weak", "unassessed"].map(evidenceStrengthLabel);
    expect(new Set(labels).size).toBe(4);
  });
});
