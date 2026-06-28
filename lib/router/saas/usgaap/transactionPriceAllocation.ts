import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapSaasOutputNonComingling } from "../forbidden";
import { hasTransactionPriceAllocation, type SaasEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/saas/usgaap/transactionPriceAllocation.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-32-31", "606-10-50-13"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitTransactionPriceAllocation(input: SaasEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasTransactionPriceAllocation(extracted)) {
    throw new MissingDisclosureInputError("contract_revenue.transaction_price_allocation");
  }

  const allocations = extracted.contract_revenue!.transaction_price_allocation!;
  const summary = allocations.map((row) => `${row.obligation}: $${row.amount}`).join("; ");
  const text = `Transaction price allocated to performance obligations (${summary}) per ${CITATION_RESOLVED}.`;
  assertUsgaapSaasOutputNonComingling(text);

  return {
    emitterId: "transaction-price-allocation",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "transaction-price-allocation", citation: CITATION, text }],
  };
}
