import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasBillAndHoldInput, type LogisticsEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/logistics/usgaap/billAndHoldDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-25-7", "606-10-55-83"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitBillAndHoldDisclosure(input: LogisticsEmitterInput): EmitterResult {
  if (!hasBillAndHoldInput(input.extracted)) {
    throw new MissingDisclosureInputError("logistics.bill_and_hold");
  }
  const b = input.extracted.logistics!.bill_and_hold!;
  const text = `Bill-and-hold arrangement (enabled ${b.enabled}, goods ready ${b.goods_ready}, amount $${b.amount.toLocaleString()}) evaluated per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "bill-and-hold-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "bill-and-hold-disclosure", citation: CITATION, text }],
  };
}
