import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapPsOutputNonComingling } from "../forbidden";
import { hasUnbilledReceivablesInput, type PsEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/professional-services/usgaap/unbilledReceivablesDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-45-1", "606-10-50-9"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitUnbilledReceivablesDisclosure(input: PsEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasUnbilledReceivablesInput(extracted)) {
    throw new MissingDisclosureInputError("receivables/contract_assets");
  }

  const rec = extracted.receivables!;
  const assets = extracted.contract_assets!;
  const text = `Unbilled receivables of $${rec.unbilled} presented as contract assets (opening $${assets.opening}, closing $${assets.closing}) with billed receivables $${rec.billed} per ${CITATION_RESOLVED}.`;
  assertUsgaapPsOutputNonComingling(text);

  return {
    emitterId: "unbilled-receivables-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "unbilled-receivables", citation: CITATION, text }],
  };
}
