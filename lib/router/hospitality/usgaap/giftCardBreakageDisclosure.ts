import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasGiftCardsInput, type HospitalityEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/hospitality/usgaap/giftCardBreakageDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-55-48", "606-10-55-50"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitGiftCardBreakageDisclosure(input: HospitalityEmitterInput): EmitterResult {
  if (!hasGiftCardsInput(input.extracted)) {
    throw new MissingDisclosureInputError("hospitality.gift_cards");
  }
  const giftCards = input.extracted.hospitality!.gift_cards!;
  const text =
    `Gift card outstanding balance $${giftCards.outstanding.toLocaleString()} with breakage estimate ` +
    `$${giftCards.breakage_estimate.toLocaleString()} recognized per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "gift-card-breakage-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "gift-card-breakage-disclosure", citation: CITATION, text }],
  };
}
