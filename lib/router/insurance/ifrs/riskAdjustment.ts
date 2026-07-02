import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasIfrs17Input, type InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/ifrs/riskAdjustment.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 17",
  paragraphs: ["17.37", "17.119"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitRiskAdjustment(input: InsuranceEmitterInput): EmitterResult {
  if (!hasIfrs17Input(input.insurance)) {
    throw new MissingDisclosureInputError("ifrs17.riskAdjustment");
  }
  const method = input.insurance.ifrs17!.riskAdjustmentMethodology;
  const text = `IFRS 17 risk adjustment disclosed using ${method} methodology per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "risk-adjustment",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "risk-adjustment", citation: CITATION, text }],
  };
}
