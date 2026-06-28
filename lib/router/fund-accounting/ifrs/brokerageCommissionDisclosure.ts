/**
 * IFRS substitute: no direct Form N-CSR Item 31 brokerage commission breakdown.
 * Uses IFRS 9 transaction cost narrative + IAS 1 material expense classification.
 */
import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsFaOutputNonComingling } from "../forbidden";
import { hasBrokerageInput, type FundAccountingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/fund-accounting/ifrs/brokerageCommissionDisclosure.ts";

export const FRAMEWORK_SUBSTITUTE_NOTE =
  "IFRS has no direct equivalent to US regulatory brokerage commission breakdown; substitute uses IFRS 9.B5.4.8 transaction costs + IAS 1.97-.98 material expense classification.";

const CITATION: EmitterCitation = {
  standard: "IFRS 9",
  paragraphs: ["B5.4.8", "IAS 1.97", "IAS 1.98"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitBrokerageCommissionDisclosure(input: FundAccountingEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasBrokerageInput(extracted)) {
    throw new MissingDisclosureInputError("fund_accounting.brokerage");
  }

  const brokerage = extracted.fund_accounting!.brokerage!;
  const total = brokerage.commissions_by_broker.reduce((sum, b) => sum + b.amount, 0);
  const text = `Transaction costs of $${total} presented as material expense classification per ${CITATION_RESOLVED}.`;
  assertIfrsFaOutputNonComingling(text);

  return {
    emitterId: "brokerage-commission-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "brokerage-commissions", citation: CITATION, text }],
  };
}
