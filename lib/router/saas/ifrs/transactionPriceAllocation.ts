import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsSaasOutputNonComingling } from "../forbidden";
import { hasTransactionPriceAllocation, type SaasEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/saas/ifrs/transactionPriceAllocation.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["73", "74", "86"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitTransactionPriceAllocation(input: SaasEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasTransactionPriceAllocation(extracted)) {
    throw new MissingDisclosureInputError("contract_revenue.transaction_price_allocation");
  }

  const allocations = extracted.contract_revenue!.transaction_price_allocation!;
  const summary = allocations.map((row) => `${row.obligation}: EUR ${row.amount}`).join("; ");
  const text = `Transaction price allocated to performance obligations (${summary}) per ${CITATION_RESOLVED}.`;
  assertIfrsSaasOutputNonComingling(text);

  return {
    emitterId: "transaction-price-allocation",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "transaction-price-allocation", citation: CITATION, text }],
  };
}
