import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsPsOutputNonComingling } from "../forbidden";
import { hasUnbilledReceivablesInput, type PsEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/professional-services/ifrs/unbilledReceivablesDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["105", "116"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitUnbilledReceivablesDisclosure(input: PsEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasUnbilledReceivablesInput(extracted)) {
    throw new MissingDisclosureInputError("receivables/contract_assets");
  }

  const rec = extracted.receivables!;
  const assets = extracted.contract_assets!;
  const text = `Unbilled receivables of GBP ${rec.unbilled} presented as contract assets (opening GBP ${assets.opening}, closing GBP ${assets.closing}) per ${CITATION_RESOLVED}.`;
  assertIfrsPsOutputNonComingling(text);

  return {
    emitterId: "unbilled-receivables-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "unbilled-receivables", citation: CITATION, text }],
  };
}
