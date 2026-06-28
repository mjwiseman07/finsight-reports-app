import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapGovconOutputNonComingling } from "../forbidden";
import { hasContractTypeMix, type GovconEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/govcon/usgaap/contractTypeMixDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 280",
  paragraphs: ["280-10-50-40", "FAR 16.2 FFP", "FAR 16.3 cost-reimbursement", "FAR 16.4 incentive", "FAR 16.5 IDIQ", "FAR 16.6 T&M"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

function formatMix(byType: Record<string, number>): string {
  return Object.entries(byType)
    .map(([type, pct]) => `${type} ${pct}%`)
    .join(", ");
}

export function emitContractTypeMixDisclosure(input: GovconEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasContractTypeMix(extracted)) {
    throw new MissingDisclosureInputError("contracts.by_type");
  }
  const usGovPct = extracted.govcon?.customer_concentration?.us_government_pct;
  if (usGovPct === undefined) {
    throw new MissingDisclosureInputError("customer_concentration.us_government_pct");
  }

  const mix = formatMix(extracted.govcon!.contracts!.by_type);
  let text = `Government contract revenue concentration by contract type: ${mix} per ${CITATION_RESOLVED}.`;
  if (usGovPct > 10) {
    text += ` US Government customer concentration ${usGovPct}% of revenue triggers ASC 280-10-50-40 major customer disclosure.`;
  }
  assertUsgaapGovconOutputNonComingling(text);

  return {
    emitterId: "contract-type-mix-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "contract-type-mix", citation: CITATION, text }],
  };
}
