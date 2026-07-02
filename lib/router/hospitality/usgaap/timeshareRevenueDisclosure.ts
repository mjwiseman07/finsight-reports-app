import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasTimeshareInput, type HospitalityEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/hospitality/usgaap/timeshareRevenueDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 978",
  paragraphs: ["978-605-25-1", "978-605-45-1"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitTimeshareRevenueDisclosure(input: HospitalityEmitterInput): EmitterResult {
  if (!hasTimeshareInput(input.extracted)) {
    throw new MissingDisclosureInputError("hospitality.timeshare");
  }
  const timeshare = input.extracted.hospitality!.timeshare!;
  const text =
    `Timeshare revenue $${timeshare.revenue.toLocaleString()} with deferred revenue $${timeshare.deferred.toLocaleString()} ` +
    `recognized per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "timeshare-revenue-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "timeshare-revenue-disclosure", citation: CITATION, text }],
  };
}
