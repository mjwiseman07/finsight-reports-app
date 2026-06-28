import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapFaOutputNonComingling } from "../forbidden";
import { hasPortfolioTurnoverInput, type FundAccountingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/fund-accounting/usgaap/portfolioTurnoverDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 946",
  paragraphs: ["946-205-50-15", "N-1A Item 27"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitPortfolioTurnoverDisclosure(input: FundAccountingEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasPortfolioTurnoverInput(extracted)) {
    throw new MissingDisclosureInputError("fund_accounting.portfolio_turnover");
  }

  const turnover = extracted.fund_accounting!.portfolio_turnover!;
  const ratio = turnover.numerator / turnover.denominator;
  const text = `Portfolio turnover ratio ${(ratio * 100).toFixed(1)}% using ${turnover.methodology} per ${CITATION_RESOLVED}.`;
  assertUsgaapFaOutputNonComingling(text);

  return {
    emitterId: "portfolio-turnover-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "portfolio-turnover", citation: CITATION, text }],
  };
}
