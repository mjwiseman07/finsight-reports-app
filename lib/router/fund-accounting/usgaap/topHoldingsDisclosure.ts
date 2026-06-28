import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapFaOutputNonComingling } from "../forbidden";
import { hasTopHoldingsInput, type FundAccountingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/fund-accounting/usgaap/topHoldingsDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 946",
  paragraphs: ["946-210-50-1", "946-210-50-6", "N-1A Item 27(d)(1)"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitTopHoldingsDisclosure(input: FundAccountingEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasTopHoldingsInput(extracted)) {
    throw new MissingDisclosureInputError("fund_accounting.holdings");
  }

  const holdings = extracted.fund_accounting!.holdings!;
  const summary = holdings.entries
    .slice(0, holdings.top_n)
    .map((e) => `${e.issuer} ${e.pct_of_net_assets}%`)
    .join(", ");
  const text = `Top ${holdings.top_n} portfolio holdings as of ${holdings.as_of_date}: ${summary} per ${CITATION_RESOLVED}.`;
  assertUsgaapFaOutputNonComingling(text);

  return {
    emitterId: "top-holdings-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "top-holdings", citation: CITATION, text }],
  };
}
