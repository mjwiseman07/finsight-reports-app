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
const FIXTURE_ROOT = join(ROOT, "tests/fixtures/g7-c7-w1");

function loadPairFixture(file: string): PairCrossoverContext {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, file), "utf8")) as Pick<
    PairCrossoverContext,
    "pair" | "pairEntities" | "disclosures"
  >;
  const base = loadDefaultCrossoverContext(ROOT);
  return {
    ...base,
    pair: raw.pair,
    pairEntities: raw.pairEntities,
    disclosures: raw.disclosures,
  };
}

describe("G7-C7 Wave 1 — infra", () => {
  // W1 owns the 4 patent-named pairs. Total ALL_PAIRS length is
  // owned by the wave that last extended the registry (currently W2).
  const W1_CODES = ["hc-npo", "re-hos", "bank-ins", "fa-ins"] as const;

  it("ALL_PAIRS contains the 4 patent-named W1 pairs", () => {
    const patentNamed = ALL_PAIRS.filter((p) => p.patentNamed);
    expect(patentNamed).toHaveLength(4);
    expect(patentNamed.map((p) => p.code).sort()).toEqual([...W1_CODES].sort());
  });
  it("describePair resolves all 4 W1 codes with correct primary verticals", () => {
    expect(describePair("hc-npo").primary).toBe("hc");
    expect(describePair("re-hos").primary).toBe("re");
    expect(describePair("bank-ins").primary).toBe("bank");
    expect(describePair("fa-ins").primary).toBe("fa");
  });
});

describe("G7-C7 Wave 1 — HC×NPO", () => {
  it("happy path passes all validators", () => {
    const ctx = loadPairFixture("hc-npo.fixture.json");
    const results = runCrossoverForPair(ctx);
    expect(results.every((r) => r.passed)).toBe(true);
  });
  it("fail: charity care threshold met without NFP functional expense throws", () => {
    const ctx = loadPairFixture("hc-npo.fixture.json");
    ctx.pairEntities[0].nfpFunctionalExpenseAllocated = false;
    expect(() => runCrossoverForPair(ctx)).toThrow(/charity-care-nfp-reconciliation/);
  });
  it("fail: comingled framework disclosure throws", () => {
    const ctx = loadPairFixture("hc-npo.fixture.json");
    ctx.disclosures.push({
      entityId: "ACME-HOSP-501C3",
      framework: "WRONG_FRAMEWORK",
      emitterPath: "x.ts",
      text: "comingled",
    });
    expect(() => runCrossoverForPair(ctx)).toThrow();
  });
});

describe("G7-C7 Wave 1 — RE×HOSP", () => {
  it("happy path passes all validators", () => {
    const ctx = loadPairFixture("re-hos.fixture.json");
    const results = runCrossoverForPair(ctx);
    expect(results.every((r) => r.passed)).toBe(true);
  });
  it("fail: REIT claims 90% test met but hotel ADR is zero", () => {
    const ctx = loadPairFixture("re-hos.fixture.json");
    ctx.pairEntities[0].hotelADR = 0;
    expect(() => runCrossoverForPair(ctx)).toThrow(/reit-90-hotel-inclusion/);
  });
  it("fail: lessor duality without lessor-side disclosure throws", () => {
    const ctx = loadPairFixture("re-hos.fixture.json");
    ctx.disclosures = ctx.disclosures.filter(
      (d) => !d.emitterPath.toLowerCase().includes("propertyimpairment"),
    );
    expect(() => runCrossoverForPair(ctx)).toThrow(/lessor-lessee-duality/);
  });
});

describe("G7-C7 Wave 1 — BANK×INS", () => {
  it("happy path passes all validators", () => {
    const ctx = loadPairFixture("bank-ins.fixture.json");
    const results = runCrossoverForPair(ctx);
    expect(results.every((r) => r.passed)).toBe(true);
  });
  it("fail: CECL scope reversed across entities", () => {
    const ctx = loadPairFixture("bank-ins.fixture.json");
    ctx.pairEntities[0].ceclScopeFull = false;
    ctx.pairEntities[0].ceclScopeNarrow = true;
    expect(() => runCrossoverForPair(ctx)).toThrow(/cecl-scope/);
  });
  it("fail: RBC + Basel both reported without reconciliation entry", () => {
    const ctx = loadPairFixture("bank-ins.fixture.json");
    ctx.pairEntities[1].baselReported = true;
    ctx.disclosures = ctx.disclosures.filter((d) => d.framework !== "META_RECONCILIATION");
    expect(() => runCrossoverForPair(ctx)).toThrow(/capital-double-count/);
  });
  it("fail: bank entity comingles FFIEC 051 with IFRS 17 lane", () => {
    const ctx = loadPairFixture("bank-ins.fixture.json");
    ctx.pairEntities[0].ifrs17Lane = "BBA";
    expect(() => runCrossoverForPair(ctx)).toThrow(/lane-commingling/);
  });
});

describe("G7-C7 Wave 1 — FA×INS", () => {
  it("happy path passes all validators", () => {
    const ctx = loadPairFixture("fa-ins.fixture.json");
    const results = runCrossoverForPair(ctx);
    expect(results.every((r) => r.passed)).toBe(true);
  });
  it("fail: ILS without contract-boundary documentation throws", () => {
    const ctx = loadPairFixture("fa-ins.fixture.json");
    ctx.pairEntities[0].ilsContractBoundaryDocumented = false;
    expect(() => runCrossoverForPair(ctx)).toThrow(/ils-contract-boundary/);
  });
  it("fail: NAV and reserves present but no reconciliation entry", () => {
    const ctx = loadPairFixture("fa-ins.fixture.json");
    ctx.disclosures = ctx.disclosures.filter(
      (d) => !d.emitterPath.includes("nav-reserves-reconciliation"),
    );
    expect(() => runCrossoverForPair(ctx)).toThrow(/nav-reserves-reconciliation/);
  });
});
