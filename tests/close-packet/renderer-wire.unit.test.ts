import { describe, expect, it } from "vitest";
import { SECTION_PIPELINE, SECTION_DISPLAY_ORDER } from "@/lib/close-packet/renderer";
import { SECTION_TITLES } from "@/lib/close-packet/section-titles";

describe("renderer assertion_coverage wiring", () => {
  it("SECTION_PIPELINE includes assertion_coverage", () => {
    const keys = SECTION_PIPELINE.map((s) => s.key);
    expect(keys).toContain("assertion_coverage");
  });

  it("SECTION_DISPLAY_ORDER includes assertion_coverage", () => {
    expect(SECTION_DISPLAY_ORDER).toContain("assertion_coverage");
  });

  it("assertion_coverage runs after recon in execution order", () => {
    const keys = SECTION_PIPELINE.map((s) => s.key);
    expect(keys.indexOf("recon")).toBeLessThan(keys.indexOf("assertion_coverage"));
  });

  it("assertion_coverage appears between recon and checklist in display", () => {
    expect(SECTION_DISPLAY_ORDER.indexOf("recon")).toBeLessThan(
      SECTION_DISPLAY_ORDER.indexOf("assertion_coverage"),
    );
    expect(SECTION_DISPLAY_ORDER.indexOf("assertion_coverage")).toBeLessThan(
      SECTION_DISPLAY_ORDER.indexOf("checklist"),
    );
  });

  it("section title is Assertion Coverage Statement", () => {
    expect(SECTION_TITLES.assertion_coverage).toBe("Assertion Coverage Statement");
  });
});
