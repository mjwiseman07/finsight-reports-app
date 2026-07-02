import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasSapInput, type InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/sap/rbcRatioDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 944",
  paragraphs: ["944-40-S99", "NAIC RBC action level"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitRbcRatioDisclosure(input: InsuranceEmitterInput): EmitterResult {
  if (!hasSapInput(input.insurance)) {
    throw new MissingDisclosureInputError("insurance.sap.rbcRatio");
  }
  const sap = input.insurance.sap!;
  const pct = (sap.rbcRatio * 100).toFixed(0);
  const text = `NAIC risk-based capital ratio ${pct}% (${sap.rbcActionLevel} action level) per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "rbc-ratio-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "rbc-ratio-disclosure", citation: CITATION, text }],
  };
}
