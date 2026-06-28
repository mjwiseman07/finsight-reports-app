import {
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIpsasNpoOutputNonComingling } from "../forbidden";
import type { NonprofitEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/nonprofit/ipsas/serviceCostingDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "IPSAS 1",
  paragraphs: ["1.115"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);

export function emitServiceCostingDisclosure(input: NonprofitEmitterInput): EmitterResult {
  const serviceCosts = input.extracted.service_costs;
  if (!serviceCosts?.by_program || Object.keys(serviceCosts.by_program).length === 0) {
    throw new MissingDisclosureInputError("service_costs.by_program");
  }
  if (!serviceCosts.allocation_basis) {
    throw new MissingDisclosureInputError("service_costs.allocation_basis");
  }

  const text = `Service costing narrative for public-sector programs disclosed per ${CITATION_RESOLVED} using ${serviceCosts.allocation_basis}.`;
  assertIpsasNpoOutputNonComingling(text);

  return {
    emitterId: "service-costing-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "service-costing-disclosure",
        citation: CITATION,
        text,
      },
    ],
  };
}
