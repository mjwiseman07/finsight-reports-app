import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterLine,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapGovconOutputNonComingling } from "../forbidden";
import { hasIndirectRates, type GovconEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/govcon/usgaap/indirectRateStructure.ts";

const CITATION_GNA: EmitterCitation = {
  standard: "CAS 410",
  paragraphs: ["G&A pool composition", "FAR 42.7 indirect cost rates"],
};

const CITATION_OVERHEAD: EmitterCitation = {
  standard: "CAS 418",
  paragraphs: ["418 allocation of direct and indirect costs", "FAR 42.7 rate true-up"],
};

export const CITATION_GNA_RESOLVED = citationResolved(CITATION_GNA);
export const CITATION_OVERHEAD_RESOLVED = citationResolved(CITATION_OVERHEAD);
assertUsgaapCitationNonComingling(CITATION_GNA_RESOLVED);
assertUsgaapCitationNonComingling(CITATION_OVERHEAD_RESOLVED);

export function emitIndirectRateStructure(input: GovconEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasIndirectRates(extracted)) {
    throw new MissingDisclosureInputError("indirect_rates");
  }

  const rates = extracted.govcon!.indirect_rates!;
  const gnaText = `General and administrative pool indirect rate ${(rates.ga * 100).toFixed(1)}% with fringe ${(rates.fringe * 100).toFixed(1)}% per ${CITATION_GNA_RESOLVED}.`;
  const overheadText = `Overhead pool rate ${(rates.overhead * 100).toFixed(1)}% with annual ${rates.true_up_methodology} per ${CITATION_OVERHEAD_RESOLVED}.`;
  assertUsgaapGovconOutputNonComingling(gnaText);
  assertUsgaapGovconOutputNonComingling(overheadText);

  const lines: EmitterLine[] = [
    { assertionId: "cas-410-gna-pool", citation: CITATION_GNA, text: gnaText },
    { assertionId: "cas-418-overhead", citation: CITATION_OVERHEAD, text: overheadText },
  ];

  return {
    emitterId: "indirect-rate-structure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines,
  };
}
