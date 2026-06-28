import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterLine,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapConOutputNonComingling } from "../forbidden";
import { hasPostCompletionInput, type ConstructionEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/construction/usgaap/postCompletionAdjustments.ts";

const CITATION_BALANCES: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-45-1", "606-10-50-9", "retainage balance"],
};

const CITATION_COST: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-32-10", "606-10-55-20"],
};

const CITATION_WARRANTY: EmitterCitation = {
  standard: "ASC 460",
  paragraphs: ["460-10-50-4"],
};

export const CITATION_BALANCES_RESOLVED = citationResolved(CITATION_BALANCES);
export const CITATION_COST_RESOLVED = citationResolved(CITATION_COST);
assertUsgaapCitationNonComingling(CITATION_BALANCES_RESOLVED);
assertUsgaapCitationNonComingling(CITATION_COST_RESOLVED);

export function emitPostCompletionAdjustments(input: ConstructionEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasPostCompletionInput(extracted)) {
    throw new MissingDisclosureInputError("construction.post_completion");
  }

  const post = extracted.construction!.post_completion!;
  const balanceText = `Contract balances include retainage of $${post.retainage_balance} per ${CITATION_BALANCES_RESOLVED}.`;
  const costText = `Post-completion ${post.adjustment_history} per ${CITATION_COST_RESOLVED}.`;
  const warrantyText = `Product warranty obligation: ${post.warranty_obligation} per ${citationResolved(CITATION_WARRANTY)}.`;
  assertUsgaapConOutputNonComingling(balanceText);
  assertUsgaapConOutputNonComingling(costText);
  assertUsgaapConOutputNonComingling(warrantyText);

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
