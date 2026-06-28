import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapFaOutputNonComingling } from "../forbidden";
import { hasBrokerageInput, type FundAccountingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/fund-accounting/usgaap/brokerageCommissionDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 946",
  paragraphs: ["946-225-45-3", "Item 31", "Rule 17a-7"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitBrokerageCommissionDisclosure(input: FundAccountingEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasBrokerageInput(extracted)) {
    throw new MissingDisclosureInputError("fund_accounting.brokerage");
  }

  const brokerage = extracted.fund_accounting!.brokerage!;
  const summary = brokerage.commissions_by_broker.map((b) => `${b.broker} $${b.amount}`).join(", ");
  const softDollar = brokerage.soft_dollar_arrangements ? ` ${brokerage.soft_dollar_arrangements}.` : "";
  const text = `Brokerage commissions by broker: ${summary}.${softDollar} per ${CITATION_RESOLVED}.`;
  assertUsgaapFaOutputNonComingling(text);

  return {
    emitterId: "brokerage-commission-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "brokerage-commissions", citation: CITATION, text }],
  };
}
