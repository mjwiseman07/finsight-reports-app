import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsFaOutputNonComingling } from "../forbidden";
import { hasTopHoldingsInput, type FundAccountingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/fund-accounting/ifrs/topHoldingsDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 13",
  paragraphs: ["93", "IFRS 7.34", "IFRS 12.B16-B18"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

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
  const text = `Concentration of fair value in top ${holdings.top_n} holdings as of ${holdings.as_of_date}: ${summary} per ${CITATION_RESOLVED}.`;
  assertIfrsFaOutputNonComingling(text);

  return {
    emitterId: "top-holdings-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "top-holdings", citation: CITATION, text }],
  };
}
