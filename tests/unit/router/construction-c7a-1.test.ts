import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import {
  assertIfrsCitationNonComingling,
  assertUsgaapCitationNonComingling,
} from "../../../lib/router/types";
import {
  emitterSatisfiesAssertion,
  runConstructionRouter,
} from "../../../lib/router/construction";
import { CITATION_RESOLVED as US_POC_CITATION } from "../../../lib/router/construction/usgaap/pocMethodDisclosure";
import { CITATION_RESOLVED as IFRS_POC_CITATION } from "../../../lib/router/construction/ifrs/pocMethodDisclosure";

const FIXTURE_ROOT = join(import.meta.dirname, "../fixtures/g7-c7a-1");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

describe("G7-C7a-1 construction router emitters", () => {
  it("happy path: FLR US GAAP satisfies poc, cost, and contract balances", () => {
    const extracted = loadFixture("happy/FLR-10k-usgaap.json");
    const router = runConstructionRouter(extracted);
    expect(emitterSatisfiesAssertion(router.results, "poc-method-declared").satisfied).toBe(true);
    expect(emitterSatisfiesAssertion(router.results, "cost-to-cost-ratio").satisfied).toBe(true);
    expect(emitterSatisfiesAssertion(router.results, "contract-balances-rollforward").satisfied).toBe(true);
    assertUsgaapCitationNonComingling(US_POC_CITATION);
  });

  it("happy path: BBY IFRS satisfies poc, cost, and contract balances", () => {
    const extracted = loadFixture("happy/BBY-annual-ifrs.json");
    const router = runConstructionRouter(extracted);
    expect(emitterSatisfiesAssertion(router.results, "poc-method-declared").satisfied).toBe(true);
    expect(emitterSatisfiesAssertion(router.results, "cost-to-cost-ratio").satisfied).toBe(true);
    expect(emitterSatisfiesAssertion(router.results, "contract-balances-rollforward").satisfied).toBe(true);
    assertIfrsCitationNonComingling(IFRS_POC_CITATION);
  });

  it("fail-closed: empty corpus yields no satisfied emitters", () => {
    const extracted = loadFixture("fail-closed/empty-corpus.json");
    const router = runConstructionRouter(extracted);
    expect(router.results.every((result) => result.status === "fail-closed")).toBe(true);
  });

  it("comingling-rejected: US GAAP citation must not include IFRS tokens", () => {
    expect(() => assertUsgaapCitationNonComingling("IFRS 15.114 revenue disaggregation")).toThrow(
      /comingling/,
    );
  });

  it("comingling-rejected: IFRS citation must not include ASC tokens", () => {
    expect(() => assertIfrsCitationNonComingling("ASC 606-10-50-5 revenue disaggregation")).toThrow(
      /comingling/,
    );
  });
});
