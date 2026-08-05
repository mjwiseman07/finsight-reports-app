import { describe, it, expect } from "vitest";
import {
  PCAOB_TO_ISA_MAP,
  ISA_TO_PCAOB_PRIMARY,
  pcaobToIsa,
  isaToPcaob,
} from "../pcaob-assertion-map";
import { ASSERTIONS } from "@/lib/audit-ready/assertion-taxonomy";

describe("pcaob-assertion-map", () => {
  it("maps every PCAOB-6 member to at least one ISA-315 id", () => {
    for (const p of ASSERTIONS) {
      const isa = pcaobToIsa(p);
      expect(isa.length).toBeGreaterThanOrEqual(1);
      expect(PCAOB_TO_ISA_MAP[p]).toBeDefined();
    }
  });

  it("every ISA-315 id in the reverse map round-trips to a PCAOB member", () => {
    for (const [isaId, pcaob] of Object.entries(ISA_TO_PCAOB_PRIMARY)) {
      const forward = pcaobToIsa(pcaob);
      expect(forward).toContain(isaId);
    }
    expect(pcaobToIsa("accuracy")).toEqual(["accuracy", "classification"]);
    expect(pcaobToIsa("presentation_disclosure")).toEqual([
      "presentation_disclosure",
      "cutoff",
    ]);
    expect(isaToPcaob("cutoff")).toBe("presentation_disclosure");
    expect(isaToPcaob("classification")).toBe("accuracy");
  });
});
