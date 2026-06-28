import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapGovconOutputNonComingling } from "../forbidden";
import { hasBacklogSplit, type GovconEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/govcon/usgaap/backlogFundedVsUnfunded.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-50-13", "funded vs unfunded backlog split"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitBacklogFundedVsUnfunded(input: GovconEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasBacklogSplit(extracted)) {
    throw new MissingDisclosureInputError("backlog.funded/unfunded");
  }

  const backlog = extracted.govcon!.backlog!;
  const optionYears = backlog.option_years ?? "unspecified";
  const text = `Remaining performance obligations split: funded backlog $${backlog.funded} (obligated) vs unfunded backlog $${backlog.unfunded} (option years not yet exercised, ${optionYears} years) per ${CITATION_RESOLVED}.`;
  assertUsgaapGovconOutputNonComingling(text);

  return {
    emitterId: "backlog-funded-vs-unfunded",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "backlog-funded-split", citation: CITATION, text }],
  };
}
