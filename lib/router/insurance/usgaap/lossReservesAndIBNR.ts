import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasLossReservesInput, type InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/usgaap/lossReservesAndIBNR.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 944",
  paragraphs: ["944-40-55-1", "944-40-55-8"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitLossReservesAndIBNR(input: InsuranceEmitterInput): EmitterResult {
  if (!input.insurance.hasShortDurationContracts || !hasLossReservesInput(input.insurance)) {
    throw new MissingDisclosureInputError("insurance.lossReserves");
  }
  const lr = input.insurance.lossReserves!;
  const text = `Short-duration loss reserves: case $${lr.caseReserves.toLocaleString()}, IBNR $${lr.ibnr.toLocaleString()}, total incurred $${lr.totalIncurred.toLocaleString()} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "loss-reserves-and-ibnr",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "loss-reserves-and-ibnr", citation: CITATION, text }],
  };
}
