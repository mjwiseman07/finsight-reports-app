import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import {
  collectIfrsHealthcareForbiddenMatches,
  IFRS_HEALTHCARE_FORBIDDEN_OUTPUT_SUBSTRINGS,
} from "../../lib/router/healthcare/ifrs/forbidden";
import {
  ifrsHealthcareEmitterOutputText,
  runHealthcareRouter,
} from "../../lib/router/healthcare";

const FIXTURE_ROOT = join(import.meta.dirname, "../fixtures/g7-c7a-3");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

describe("healthcare IFRS non-comingling", () => {
  it("HLMA IFRS emitter output has zero forbidden §501(r)/CHNA/Form 990 substrings", () => {
    const extracted = loadFixture("happy/HLMA-annual-ifrs.json");
    const output = ifrsHealthcareEmitterOutputText(extracted);
    expect(collectIfrsHealthcareForbiddenMatches(output)).toEqual([]);
  });

  it("501(c)(3) IFRS hospital produces neutral community-benefit output with zero forbidden substrings", () => {
    const extracted = loadFixture("happy/501c3-hospital-ifrs.json");
    const router = runHealthcareRouter(extracted);
    expect(router.results[0]?.status).toBe("satisfied");
    const output = ifrsHealthcareEmitterOutputText(extracted);
    expect(output).toMatch(/community benefit assessment cycle/i);
    expect(output).toMatch(/public benefit purpose evaluation/i);
    expect(output).toMatch(/charitable purpose disclosure/i);
    for (const forbidden of IFRS_HEALTHCARE_FORBIDDEN_OUTPUT_SUBSTRINGS) {
      expect(output.includes(forbidden)).toBe(false);
    }
  });

  it("comingling-rejected: synthetic IFRS output containing §501(r) is flagged", () => {
    const leaked = "Community benefit per §501(r) regulations";
    expect(collectIfrsHealthcareForbiddenMatches(leaked).length).toBeGreaterThan(0);
  });
});
