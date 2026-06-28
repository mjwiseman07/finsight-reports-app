/**
 * GovCon IFRS-substitute disclosure.
 *
 * FAR / CAS / DCAA are US-specific federal procurement regulations with no IFRS analog.
 * IFRS reporters in the GovCon vertical use IFRS 15 remaining performance obligation horizon
 * disclosures instead of US funded vs unfunded backlog terminology.
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
import { hasBacklogHorizon, type GovconEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/govcon/ifrs/backlogDisclosure.ts";

export const FRAMEWORK_SUBSTITUTE_NOTE =
  "FAR/CAS/DCAA are US-specific procurement regulations with no IFRS analog. Substitute disclosure uses IFRS 15.120-.122 expected satisfaction horizon.";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["15.120", "15.121", "15.122"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitBacklogDisclosure(input: GovconEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasBacklogHorizon(extracted)) {
    throw new MissingDisclosureInputError("backlog.horizon_years");
  }

  const backlog = extracted.govcon!.backlog!;
  const horizons = backlog.horizon_years!.join(", ");
  const text = `Remaining performance obligations of $${backlog.funded + backlog.unfunded} expected to be satisfied within ${horizons} years per ${CITATION_RESOLVED}.`;
  assertIfrsGovconOutputNonComingling(text);

  return {
    emitterId: "backlog-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "backlog-funded-split", citation: CITATION, text }],
  };
}
