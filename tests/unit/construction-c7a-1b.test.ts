import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import {
  collectForbiddenMatches,
  IFRS_CON_FORBIDDEN_OUTPUT_SUBSTRINGS,
  USGAAP_CON_FORBIDDEN_OUTPUT_SUBSTRINGS,
} from "../../lib/router/construction/forbidden";
import { constructionLaneOutputText, runConstructionRouter } from "../../lib/router/construction";
import { emitUnitsOfDeliveryOutputMeasure } from "../../lib/router/construction/usgaap/unitsOfDeliveryOutputMeasure";
import { buildConstructionEmitterInput } from "../../lib/router/construction/types";
import { MissingDisclosureInputError } from "../../lib/router/construction/errors";
import { FrameworkViolationError } from "../../lib/router/errors/FrameworkViolationError";

const FIXTURE_ROOT = join(import.meta.dirname, "../fixtures/g7-c7a-1b");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

describe("construction C7a-1b framework non-comingling", () => {
  it("US GAAP lane output has zero IFRS forbidden substrings across new emitters", () => {
    const extracted = loadFixture("usgaap/unitsOfDeliveryOutputMeasure/happy-housing-units.json");
    const output = constructionLaneOutputText(extracted, "us_gaap");
    expect(collectForbiddenMatches(output, USGAAP_CON_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output.length).toBeGreaterThan(0);
  });

  it("IFRS lane output has zero ASC forbidden substrings across new emitters", () => {
    const extracted = loadFixture("ifrs/milestoneOutputMeasure/happy-uk-infrastructure-milestones.json");
    const output = constructionLaneOutputText(extracted, "ifrs");
    expect(collectForbiddenMatches(output, IFRS_CON_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output.length).toBeGreaterThan(0);
  });

  it("cross-cutting output-measure method-switch: units and milestones emit; invalid method throws FrameworkViolationError", () => {
    const extracted = loadFixture("cross-cutting/output-measure-method-switch.json");
    const unitsOutput = constructionLaneOutputText(extracted, "us_gaap");
    expect(collectForbiddenMatches(unitsOutput, USGAAP_CON_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(unitsOutput).toMatch(/units-of-delivery/i);

    const milestonesOutput = constructionLaneOutputText(
      {
        ...extracted,
        construction: {
          output_measure: {
            method: "milestones",
            milestones_defined: ["foundation complete", "final inspection"],
            milestones_achieved: ["foundation complete"],
          },
        },
      },
      "us_gaap",
    );
    expect(milestonesOutput).toMatch(/milestone/i);

    const invalidRouter = runConstructionRouter(
      JSON.parse(
        JSON.stringify({
          ...extracted,
          construction: { output_measure: { method: "invalid-method" } },
        }),
      ) as ExtractedFiling,
    );
    expect(invalidRouter.frameworkViolation).toBeInstanceOf(FrameworkViolationError);
    expect(invalidRouter.results).toHaveLength(0);
  });

  it("US GAAP fail-closed throws MissingDisclosureInputError on missing unit definition", () => {
    const extracted = loadFixture("usgaap/unitsOfDeliveryOutputMeasure/fail-closed-missing-unit-definition.json");
    expect(() => emitUnitsOfDeliveryOutputMeasure(buildConstructionEmitterInput(extracted))).toThrow(
      MissingDisclosureInputError,
    );
  });

  it("comingling-rejected: IFRS emitter output excludes prefilled ASC citation from input narrative", () => {
    const extracted = loadFixture("ifrs/unitsOfDeliveryOutputMeasure/comingling-rejected-asc-citation.json");
    const output = constructionLaneOutputText(extracted, "ifrs");
    expect(collectForbiddenMatches(output, IFRS_CON_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
  });
});
