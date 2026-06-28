import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { ConstructionEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/construction/ifrs/contractBalanceRollforward.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["116", "117", "118"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitContractBalanceRollforward(input: ConstructionEmitterInput): EmitterResult {
  const hasSignal =
    input.hasContractLiabilityNarrative ||
    /contract asset|contract liability|ifrs 15|contract revenue/i.test(input.narrativeHaystack);

  if (!hasSignal) {
    return {
      emitterId: "contract-balances-rollforward",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No IFRS 15 contract balance indicators",
    };
  }

  return {
    emitterId: "contract-balances-rollforward",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "contract-balances-rollforward",
        citation: CITATION,
        text: `Contract assets and contract liabilities rollforward presented per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
