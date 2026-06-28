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
  runFundAccountingRouter,
} from "../../../lib/router/fund-accounting";
import { CITATION_RESOLVED as US_NAV_CITATION } from "../../../lib/router/fund-accounting/usgaap/navPerShareRollforward";
import { CITATION_RESOLVED as IFRS_EXPENSE_CITATION } from "../../../lib/router/fund-accounting/ifrs/expenseRatioDisclosure";
import { FRAMEWORK_SUBSTITUTE_NOTE } from "../../../lib/router/fund-accounting/ifrs/expenseRatioDisclosure";

const FIXTURE_ROOT = join(import.meta.dirname, "../../fixtures/g7-c7a-2");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

describe("G7-C7a-2 fund-accounting router emitters", () => {
  it("happy path: FXAIX US GAAP satisfies nav, expense, portfolio, realized gains", () => {
    const extracted = loadFixture("happy/FXAIX-NCSR-usgaap.json");
    const router = runFundAccountingRouter(extracted);
    expect(emitterSatisfiesAssertion(router.results, "nav-computation").satisfied).toBe(true);
    expect(emitterSatisfiesAssertion(router.results, "expense-ratio").satisfied).toBe(true);
    expect(emitterSatisfiesAssertion(router.results, "portfolio-composition").satisfied).toBe(true);
    expect(emitterSatisfiesAssertion(router.results, "realized-unrealized-gains").satisfied).toBe(true);
    assertUsgaapCitationNonComingling(US_NAV_CITATION);
  });

  it("happy path: IFRS stub satisfies all four emitters with substitute expense disclosure", () => {
    const extracted = loadFixture("happy/IFRS-fund-stub.json");
    const router = runFundAccountingRouter(extracted);
    expect(emitterSatisfiesAssertion(router.results, "nav-computation").satisfied).toBe(true);
    expect(emitterSatisfiesAssertion(router.results, "expense-ratio").satisfied).toBe(true);
    expect(FRAMEWORK_SUBSTITUTE_NOTE).toContain("ASC 946");
    assertIfrsCitationNonComingling(IFRS_EXPENSE_CITATION);
  });

  it("fail-closed: non-FA vertical yields no satisfied emitters", () => {
    const extracted = loadFixture("fail-closed/non-fa-corpus.json");
    const router = runFundAccountingRouter(extracted);
    expect(router.results.every((result) => result.status === "fail-closed")).toBe(true);
  });

  it("comingling-rejected: US GAAP citation must not include IFRS tokens", () => {
    expect(() => assertUsgaapCitationNonComingling("IFRS 7 expense breakdown")).toThrow(/comingling/);
  });

  it("comingling-rejected: IFRS citation must not include ASC tokens", () => {
    expect(() => assertIfrsCitationNonComingling("ASC 946-205-50-15 expense ratio")).toThrow(/comingling/);
  });
});
