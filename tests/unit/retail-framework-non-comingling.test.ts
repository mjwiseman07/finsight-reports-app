import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import {
  collectForbiddenMatches,
  IFRS_RTL_FORBIDDEN_OUTPUT_SUBSTRINGS,
} from "../../lib/router/retail/forbidden";
import { ifrsRetailEmitterOutputText, runRetailRouter } from "../../lib/router/retail";
import { emitInventoryMethodDeclaration } from "../../lib/router/retail/ifrs/inventoryMethodDeclaration";
import { buildRetailEmitterInput } from "../../lib/router/retail/types";
import { MissingDisclosureInputError } from "../../lib/router/retail/errors";
import { FrameworkViolationError } from "../../lib/router/errors/FrameworkViolationError";

const FIXTURE_ROOT = join(import.meta.dirname, "../fixtures/g7-c7a-7");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

describe("retail framework non-comingling", () => {
  it("IFRS FIFO output has zero ASC/LIFO forbidden substrings", () => {
    const extracted = loadFixture("ifrs/inventoryMethodDeclaration/happy-fifo.json");
    const output = ifrsRetailEmitterOutputText(extracted);
    expect(collectForbiddenMatches(output, IFRS_RTL_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/FIFO/i);
    expect(output.includes("LIFO")).toBe(false);
  });

  it("IFRS weighted-average output is framework-pure", () => {
    const extracted = loadFixture("ifrs/inventoryMethodDeclaration/happy-weighted-average.json");
    const output = ifrsRetailEmitterOutputText(extracted);
    expect(collectForbiddenMatches(output, IFRS_RTL_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/weighted-average/i);
  });

  it("LIFO declaration throws FrameworkViolationError with IAS 2.25 citation", () => {
    const extracted = loadFixture("ifrs/inventoryMethodDeclaration/framework-violation-lifo.json");
    expect(() => emitInventoryMethodDeclaration(buildRetailEmitterInput(extracted))).toThrow(
      FrameworkViolationError,
    );
    try {
      emitInventoryMethodDeclaration(buildRetailEmitterInput(extracted));
    } catch (error) {
      expect(error).toBeInstanceOf(FrameworkViolationError);
      const violation = error as FrameworkViolationError;
      expect(violation.citation).toBe("IAS 2.25");
      expect(violation.remediation).toMatch(/FIFO or weighted_average/i);
    }
  });

  it("router surfaces FrameworkViolationError without silent downstream emission", () => {
    const extracted = loadFixture("cross-cutting/lifo-rejection-end-to-end.json");
    const router = runRetailRouter(extracted);
    expect(router.frameworkViolation?.citation).toBe("IAS 2.25");
    expect(router.results.length).toBe(0);
    expect(router.augmentedNarratives).toEqual(extracted.narrativeSnippets);

    const fixed = loadFixture("cross-cutting/lifo-rejection-end-to-end.json");
    fixed.inventory = { cost_formula: "FIFO", carrying_amounts: { merchandise: 100 } };
    const success = runRetailRouter(fixed);
    expect(success.frameworkViolation).toBeUndefined();
    expect(success.results[0]?.status).toBe("satisfied");
  });

  it("fail-closed throws MissingDisclosureInputError on missing cost_formula", () => {
    const extracted = loadFixture("ifrs/inventoryMethodDeclaration/fail-closed-missing-method.json");
    expect(() => emitInventoryMethodDeclaration(buildRetailEmitterInput(extracted))).toThrow(
      MissingDisclosureInputError,
    );
  });
});
