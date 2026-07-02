import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasDemurrageDetentionInput, type LogisticsEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/logistics/usgaap/demurrageDetentionRevenue.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-32-2", "606-10-55-91"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitDemurrageDetentionRevenue(input: LogisticsEmitterInput): EmitterResult {
  if (!hasDemurrageDetentionInput(input.extracted)) {
    throw new MissingDisclosureInputError("logistics.demurrage_detention");
  }
  const d = input.extracted.logistics!.demurrage_detention!;
  const text = `Demurrage and detention revenue (demurrage $${d.demurrage.toLocaleString()}, detention $${d.detention.toLocaleString()}) recognized per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "demurrage-detention-revenue",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "demurrage-detention-revenue", citation: CITATION, text }],
  };
}
