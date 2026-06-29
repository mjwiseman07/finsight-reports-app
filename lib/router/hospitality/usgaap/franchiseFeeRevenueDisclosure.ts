import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasFranchiseFeesInput, type HospitalityEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/hospitality/usgaap/franchiseFeeRevenueDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 952",
  paragraphs: ["952-605-25-1", "606-10-25-19"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitFranchiseFeeRevenueDisclosure(input: HospitalityEmitterInput): EmitterResult {
  if (!hasFranchiseFeesInput(input.extracted)) {
    throw new MissingDisclosureInputError("hospitality.franchise_fees");
  }
  const fees = input.extracted.hospitality!.franchise_fees!;
  const text =
    `Franchise fee revenue: initial fees $${fees.initial.toLocaleString()}, ongoing royalties $${fees.ongoing.toLocaleString()} ` +
    `recognized per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "franchise-fee-revenue-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "franchise-fee-revenue-disclosure", citation: CITATION, text }],
  };
}
