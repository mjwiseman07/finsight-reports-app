import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import {
  collectForbiddenMatches,
  IFRS_PS_FORBIDDEN_OUTPUT_SUBSTRINGS,
  USGAAP_PS_FORBIDDEN_OUTPUT_SUBSTRINGS,
} from "../../lib/router/professional-services/forbidden";
import { psLaneOutputText } from "../../lib/router/professional-services";
import { emitUnbilledReceivablesDisclosure } from "../../lib/router/professional-services/usgaap/unbilledReceivablesDisclosure";
import { emitPrincipalVsAgentDisclosure as emitIfrsPrincipal } from "../../lib/router/professional-services/ifrs/principalVsAgentDisclosure";
import { buildPsEmitterInput } from "../../lib/router/professional-services/types";
import { MissingDisclosureInputError } from "../../lib/router/professional-services/errors";

const FIXTURE_ROOT = join(import.meta.dirname, "../fixtures/g7-c7a-6");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

describe("professional services framework non-comingling", () => {
  it("US GAAP lane output has zero IFRS forbidden substrings", () => {
    const extracted = loadFixture("usgaap/unbilledReceivablesDisclosure/happy-consulting-firm.json");
    const output = psLaneOutputText(extracted, "us-gaap");
    expect(collectForbiddenMatches(output, USGAAP_PS_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output.length).toBeGreaterThan(0);
  });

  it("IFRS lane output has zero ASC forbidden substrings", () => {
    const extracted = loadFixture("ifrs/unbilledReceivablesDisclosure/happy-uk-consulting.json");
    const output = psLaneOutputText(extracted, "ifrs");
    expect(collectForbiddenMatches(output, IFRS_PS_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output.length).toBeGreaterThan(0);
  });

  it("cross-cutting agent-vs-principal framework-switch: US principal then IFRS agent both framework-pure", () => {
    const extracted = loadFixture("cross-cutting/agent-vs-principal-framework-switch.json");
    const usOutput = psLaneOutputText(extracted, "us-gaap");
    const ifrsOutput = psLaneOutputText(
      {
        ...extracted,
        framework: "ifrs",
        rawFrameworkSignals: ["ifrs-full"],
        engagement: {
          classification: "agent",
          indicators: ["pass-through reimbursable costs without markup"],
        },
      },
      "ifrs",
    );
    expect(collectForbiddenMatches(usOutput, USGAAP_PS_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(collectForbiddenMatches(ifrsOutput, IFRS_PS_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(usOutput).toMatch(/principal/i);
    expect(ifrsOutput).toMatch(/agent/i);
  });

  it("US GAAP fail-closed throws MissingDisclosureInputError on missing balance", () => {
    const extracted = loadFixture("usgaap/unbilledReceivablesDisclosure/fail-closed-missing-balance.json");
    expect(() => emitUnbilledReceivablesDisclosure(buildPsEmitterInput(extracted))).toThrow(
      MissingDisclosureInputError,
    );
  });

  it("IFRS fail-closed throws on missing indicators", () => {
    const extracted = loadFixture("ifrs/principalVsAgentDisclosure/fail-closed-missing-indicators.json");
    expect(() => emitIfrsPrincipal(buildPsEmitterInput(extracted))).toThrow(MissingDisclosureInputError);
  });

  it("comingling-rejected: US GAAP emitter output excludes prefilled IFRS citation from input narrative", () => {
    const extracted = loadFixture("usgaap/principalVsAgentDisclosure/comingling-rejected-ifrs-citation.json");
    const output = psLaneOutputText(extracted, "us-gaap");
    expect(collectForbiddenMatches(output, USGAAP_PS_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
  });
});
