import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ALL_PAIRS,
  describePair,
  runCrossoverForPair,
  type PairCrossoverContext,
} from "../../../lib/router/crossover";
import { loadDefaultCrossoverContext } from "../../../lib/router/crossover/index";

const ROOT = join(import.meta.dirname, "../../..");
const FIXTURE_ROOT = join(ROOT, "tests/fixtures/g7-c7-w2");

function loadPairFixture(file: string): PairCrossoverContext {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, file), "utf8")) as Pick<
    PairCrossoverContext,
    "pair" | "pairEntities" | "disclosures"
  >;
  const base = loadDefaultCrossoverContext(ROOT);
  return { ...base, pair: raw.pair, pairEntities: raw.pairEntities, disclosures: raw.disclosures };
}

describe("G7-C7 Wave 2 — infra extension", () => {
  it("ALL_PAIRS contains 7 pairs total (4 patent-named + 3 Tier 2)", () => {
    expect(ALL_PAIRS).toHaveLength(7);
    expect(ALL_PAIRS.filter((p) => p.patentNamed)).toHaveLength(4);
    expect(ALL_PAIRS.filter((p) => !p.patentNamed)).toHaveLength(3);
  });
  it("describePair resolves all 3 new Tier 2 codes", () => {
    expect(describePair("hc-edu").primary).toBe("hc");
    expect(describePair("mfg-rtl").primary).toBe("mfg");
    expect(describePair("con-re").primary).toBe("con");
  });
});

describe("G7-C7 Wave 2 — HC×EDU", () => {
  it("happy path: academic medical center with all flags green passes", () => {
    const ctx = loadPairFixture("hc-edu.fixture.json");
    const results = runCrossoverForPair(ctx);
    expect(results.every((r) => r.passed)).toBe(true);
  });
  it("fail: 501(c)(3) without Schedule H disclosure throws", () => {
    const ctx = loadPairFixture("hc-edu.fixture.json");
    ctx.pairEntities[0].hasScheduleHDisclosure = false;
    expect(() => runCrossoverForPair(ctx)).toThrow(/schedule-h-e-reference/);
  });
  it("fail: endowment not segregated throws", () => {
    const ctx = loadPairFixture("hc-edu.fixture.json");
    ctx.pairEntities[0].endowmentSegregated = false;
    expect(() => runCrossoverForPair(ctx)).toThrow(/endowment-segregation/);
  });
  it("fail: restricted research grant without dual disclosure throws", () => {
    const ctx = loadPairFixture("hc-edu.fixture.json");
    ctx.disclosures = ctx.disclosures.filter((d) => !d.emitterPath.includes("education"));
    expect(() => runCrossoverForPair(ctx)).toThrow(/medical-research-grant-classification/);
  });
});

describe("G7-C7 Wave 2 — MFG×RTL", () => {
  it("happy path: DTC brand with owned mfg + leased retail passes", () => {
    const ctx = loadPairFixture("mfg-rtl.fixture.json");
    const results = runCrossoverForPair(ctx);
    expect(results.every((r) => r.passed)).toBe(true);
  });
  it("fail: retail entity carrying WIP throws", () => {
    const ctx = loadPairFixture("mfg-rtl.fixture.json");
    ctx.pairEntities[1].inventoryHasWIP = true;
    expect(() => runCrossoverForPair(ctx)).toThrow(/inventory-decomposition/);
  });
  it("fail: manufacturing entity using markup margin throws", () => {
    const ctx = loadPairFixture("mfg-rtl.fixture.json");
    ctx.pairEntities[0].marginMethod = "markup";
    expect(() => runCrossoverForPair(ctx)).toThrow(/margin-method-consistency/);
  });
  it("fail: owned-mfg + leased-rtl without lease duality disclosures throws", () => {
    const ctx = loadPairFixture("mfg-rtl.fixture.json");
    ctx.disclosures = ctx.disclosures.filter(
      (d) => !d.text.toLowerCase().includes("lease") && !d.text.toLowerCase().includes("lessor"),
    );
    expect(() => runCrossoverForPair(ctx)).toThrow(/lease-portfolio-duality/);
  });
});

describe("G7-C7 Wave 2 — CON×RE", () => {
  it("happy path: build-to-rent held-for-investment with POC passes", () => {
    const ctx = loadPairFixture("con-re.fixture.json");
    const results = runCrossoverForPair(ctx);
    expect(results.every((r) => r.passed)).toBe(true);
  });
  it("fail: both held-for-sale and held-for-investment throws", () => {
    const ctx = loadPairFixture("con-re.fixture.json");
    ctx.pairEntities[0].heldForSale = true;
    expect(() => runCrossoverForPair(ctx)).toThrow(/held-for-sale-vs-investment/);
  });
  it("fail: held-for-investment without capitalization cutover throws", () => {
    const ctx = loadPairFixture("con-re.fixture.json");
    ctx.pairEntities[0].capitalizationCutoverDocumented = false;
    expect(() => runCrossoverForPair(ctx)).toThrow(/capitalization-cutover/);
  });
  it("fail: build-to-rent lease-up without lessor disclosure throws", () => {
    const ctx = loadPairFixture("con-re.fixture.json");
    ctx.disclosures = ctx.disclosures.filter((d) => !d.text.toLowerCase().includes("lessor"));
    expect(() => runCrossoverForPair(ctx)).toThrow(/build-to-rent-lessor/);
  });
});
