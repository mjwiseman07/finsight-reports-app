import type { LeaseMaturitySchedule } from "../../../../scripts/external-truth/types";
import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasOperatingLeaseMaturityInput, type HospitalityEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/hospitality/usgaap/operatingLeaseCommitments.ts";

const FOOTING_TOLERANCE_UNITS = 1;

const CITATION: EmitterCitation = {
  standard: "ASC 842",
  paragraphs: ["842-20-50-6"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

function formatOperatingSchedule(schedule: LeaseMaturitySchedule): string {
  const undiscountedSum =
    schedule.year_1 +
    schedule.year_2 +
    schedule.year_3 +
    schedule.year_4 +
    schedule.year_5 +
    schedule.thereafter;
  if (Math.abs(undiscountedSum - schedule.total_undiscounted) > FOOTING_TOLERANCE_UNITS) {
    throw new MissingDisclosureInputError("leases.asc842.maturity.operating footing");
  }
  const pvCheck = schedule.total_undiscounted - schedule.imputed_interest;
  if (Math.abs(pvCheck - schedule.present_value) > FOOTING_TOLERANCE_UNITS) {
    throw new MissingDisclosureInputError("leases.asc842.maturity.operating present value footing");
  }

  return (
    `Operating lease commitments — Y1 $${schedule.year_1.toLocaleString("en-US")}, Y2 $${schedule.year_2.toLocaleString("en-US")}, ` +
    `Y3 $${schedule.year_3.toLocaleString("en-US")}, Y4 $${schedule.year_4.toLocaleString("en-US")}, ` +
    `Y5 $${schedule.year_5.toLocaleString("en-US")}, thereafter $${schedule.thereafter.toLocaleString("en-US")}; ` +
    `total undiscounted $${schedule.total_undiscounted.toLocaleString("en-US")}; less imputed interest $${schedule.imputed_interest.toLocaleString("en-US")}; ` +
    `present value of operating lease liability $${schedule.present_value.toLocaleString("en-US")}`
  );
}

export function emitOperatingLeaseCommitments(input: HospitalityEmitterInput): EmitterResult {
  const operating = input.extracted.leases?.asc842?.maturity?.operating;
  if (!hasOperatingLeaseMaturityInput(input.extracted) || !operating) {
    throw new MissingDisclosureInputError("leases.asc842.maturity.operating");
  }

  const text = `${formatOperatingSchedule(operating)} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "operating-lease-commitments",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "operating-lease-commitments", citation: CITATION, text }],
  };
}
