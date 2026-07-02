import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasUsaliInput, type HospitalityEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/hospitality/usgaap/usaliDepartmentalSchedules.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 925",
  paragraphs: ["925-10-50-1", "USALI departmental schedules"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitUsaliDepartmentalSchedules(input: HospitalityEmitterInput): EmitterResult {
  if (!hasUsaliInput(input.extracted)) {
    throw new MissingDisclosureInputError("hospitality.usali");
  }
  const usali = input.extracted.hospitality!.usali!;
  const schedules = usali.departmental_schedules.join(", ");
  const text =
    `USALI ${usali.edition}th Edition departmental schedules (${schedules}) presented for informational operating metrics per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "usali-departmental-schedules",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "usali-departmental-schedules", citation: CITATION, text }],
  };
}
