import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasRoomsRevenueInput, type HospitalityEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/hospitality/usgaap/roomsRevenueDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-25-19", "606-10-55-91"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitRoomsRevenueDisclosure(input: HospitalityEmitterInput): EmitterResult {
  if (!hasRoomsRevenueInput(input.extracted)) {
    throw new MissingDisclosureInputError("hospitality.revenue.rooms");
  }
  const rooms = input.extracted.hospitality!.revenue!.rooms;
  const text = `Rooms revenue of $${rooms.toLocaleString()} recognized over the guest stay performance obligation per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "rooms-revenue-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "rooms-revenue-disclosure", citation: CITATION, text }],
  };
}
