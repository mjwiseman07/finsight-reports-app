import { describe, it, expect } from "vitest";
import {
  supportSlaCommitments,
  supportFaqEntries,
  supportSetupGuides,
} from "../../lib/support-center";

describe("Support Center content constants", () => {
  it("exposes three severity commitments", () => {
    expect(supportSlaCommitments.map((s) => s.severity)).toEqual([
      "Critical",
      "High",
      "Standard",
    ]);
    for (const entry of supportSlaCommitments) {
      expect(entry.definition.length).toBeGreaterThan(10);
      expect(entry.responseTime.toLowerCase()).toContain("business");
    }
  });

  it("exposes at least 8 FAQ entries with real answers", () => {
    expect(supportFaqEntries.length).toBeGreaterThanOrEqual(8);
    for (const entry of supportFaqEntries) {
      expect(entry.question.trim().length).toBeGreaterThan(0);
      expect(entry.answer.trim().length).toBeGreaterThan(30);
    }
  });

  it("exposes at least 4 setup guides with unique anchors", () => {
    expect(supportSetupGuides.length).toBeGreaterThanOrEqual(4);
    const anchors = supportSetupGuides.map((g) => g.anchor);
    expect(new Set(anchors).size).toBe(anchors.length);
  });
});
