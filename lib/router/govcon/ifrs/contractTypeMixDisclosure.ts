/**
 * GovCon IFRS-substitute disclosure.
 *
 * FAR / CAS / DCAA are US-specific federal procurement regulations with no IFRS analog.
 * IFRS reporters in the GovCon vertical use IFRS 8 operating segments + IFRS 15 revenue
 * disaggregation to convey contract-type concentration and backlog horizon.
 *
 * This emitter MUST NOT reference FAR, CAS, DCAA, or any US-specific procurement framework.
 * Substitution rationale documented in: docs/decisions/Phase_G7_C7a/C7a-8.md
 */
import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsGovconOutputNonComingling } from "../forbidden";
import { hasContractTypeMix, type GovconEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/govcon/ifrs/contractTypeMixDisclosure.ts";

export const FRAMEWORK_SUBSTITUTE_NOTE =
  "FAR/CAS/DCAA are US-specific procurement regulations with no IFRS analog. Substitute disclosure uses IFRS 8 operating segments + IFRS 15 revenue disaggregation.";

const CITATION: EmitterCitation = {
  standard: "IFRS 8",
  paragraphs: ["operating segments", "IFRS 15.114 revenue disaggregation by contract type"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

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
  const text = `Operating segment revenue disaggregation by contract type: ${mix} per ${CITATION_RESOLVED}.`;
  assertIfrsGovconOutputNonComingling(text);

  return {
    emitterId: "contract-type-mix-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "contract-type-mix", citation: CITATION, text }],
  };
}
