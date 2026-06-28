import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../../types";
import { IFRS9ForwardLookingMissingError, IFRS9StageIncompleteError } from "../../errors";
import { assertIfrsHcRevenueOutputNonComingling } from "../../forbidden";
import {
  HC_FOOTING_TOLERANCE_USD,
  IFRS_9,
  type HealthcareRevenueEmitterInput,
} from "../../types";

export const EMITTER_PATH = "lib/router/lanes/healthcare/emitters/ifrs/receivablesECL.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 9",
  paragraphs: ["5.5.17", "5.5.5"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

function assertFramework(input: HealthcareRevenueEmitterInput): void {
  if (input.framework !== IFRS_9) {
    throw new IFRS9StageIncompleteError("framework gate");
  }
}

export function emitReceivablesECL(input: HealthcareRevenueEmitterInput): EmitterResult {
  assertFramework(input);
  const ecl = input.extracted.healthcare_revenue?.ifrs?.receivables_ecl;
  if (!ecl?.stages) {
    throw new IFRS9StageIncompleteError("healthcare_revenue.ifrs.receivables_ecl");
  }

  const { stage_1, stage_2, stage_3 } = ecl.stages;
  if (!stage_1 || !stage_2 || !stage_3) {
    throw new IFRS9StageIncompleteError("missing ECL stage");
  }
  if (!ecl.forward_looking_inputs?.length) {
    throw new IFRS9ForwardLookingMissingError();
  }

  const totalClosing = stage_1.closing + stage_2.closing + stage_3.closing;
  if (Math.abs(totalClosing - ecl.total_closing_allowance) > HC_FOOTING_TOLERANCE_USD) {
    throw new IFRS9StageIncompleteError("ECL stage closing footing");
  }

  const currency = ecl.presentation_currency ?? "units";
  const macro = ecl.forward_looking_inputs.join("; ");
  const text =
    `IFRS 9 expected credit loss allowance: Stage 1 (12-month ECL) opening ${stage_1.opening.toLocaleString("en-US")} ${currency}, closing ${stage_1.closing.toLocaleString("en-US")} ${currency}; ` +
    `Stage 2 (lifetime ECL) opening ${stage_2.opening.toLocaleString("en-US")} ${currency}, closing ${stage_2.closing.toLocaleString("en-US")} ${currency}; ` +
    `Stage 3 (credit-impaired lifetime ECL) opening ${stage_3.opening.toLocaleString("en-US")} ${currency}, closing ${stage_3.closing.toLocaleString("en-US")} ${currency}. ` +
    `Forward-looking macroeconomic inputs: ${macro}. Total closing ECL allowance ${ecl.total_closing_allowance.toLocaleString("en-US")} ${currency} per ${CITATION_RESOLVED}.`;
  assertIfrsHcRevenueOutputNonComingling(text);

  return {
    emitterId: "receivables-ecl",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "bad-debt-vs-charity", citation: CITATION, text }],
  };
}
