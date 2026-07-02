import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasCasinoInput, type HospitalityEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/hospitality/usgaap/casinoJackpotAccrual.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 924",
  paragraphs: ["924-605-25-1", "924-605-45-1"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitCasinoJackpotAccrual(input: HospitalityEmitterInput): EmitterResult {
  if (!hasCasinoInput(input.extracted)) {
    throw new MissingDisclosureInputError("hospitality.casino");
  }
  const accrual = input.extracted.hospitality!.casino!.base_jackpot_accrual;
  const text = `Casino progressive jackpot base accrual of $${accrual.toLocaleString()} recorded per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "casino-jackpot-accrual",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "casino-jackpot-accrual", citation: CITATION, text }],
  };
}
