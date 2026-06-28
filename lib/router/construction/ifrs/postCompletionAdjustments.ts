import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterLine,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsConOutputNonComingling } from "../forbidden";
import { hasPostCompletionInput, type ConstructionEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/construction/ifrs/postCompletionAdjustments.ts";

const CITATION_BALANCES: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["105", "116", "retainage balance"],
};

const CITATION_COST: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["50", "51", "52", "B18"],
};

const CITATION_WARRANTY: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["B30", "B31", "B32", "B33", "IAS 37"],
};

export const CITATION_BALANCES_RESOLVED = citationResolved(CITATION_BALANCES);
export const CITATION_COST_RESOLVED = citationResolved(CITATION_COST);
assertIfrsCitationNonComingling(CITATION_BALANCES_RESOLVED);
assertIfrsCitationNonComingling(CITATION_COST_RESOLVED);

export function emitPostCompletionAdjustments(input: ConstructionEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasPostCompletionInput(extracted)) {
    throw new MissingDisclosureInputError("construction.post_completion");
  }

  const post = extracted.construction!.post_completion!;
  const balanceText = `Contract balances include retainage of $${post.retainage_balance} per ${CITATION_BALANCES_RESOLVED}.`;
  const costText = `Post-completion ${post.adjustment_history} per ${CITATION_COST_RESOLVED}.`;
  const warrantyText = `Warranty provision: ${post.warranty_obligation} per ${citationResolved(CITATION_WARRANTY)}.`;
  assertIfrsConOutputNonComingling(balanceText);
  assertIfrsConOutputNonComingling(costText);
  assertIfrsConOutputNonComingling(warrantyText);

  const lines: EmitterLine[] = [
    { assertionId: "contract-balances-rollforward", citation: CITATION_BALANCES, text: balanceText },
    { assertionId: "cost-to-cost-ratio", citation: CITATION_COST, text: costText },
  ];

  return {
    emitterId: "post-completion-adjustments",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines,
  };
}
