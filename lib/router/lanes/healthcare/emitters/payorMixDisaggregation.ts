import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../types";
import { PayorMixIncompleteError } from "../errors";
import { assertUsgaapHcRevenueOutputNonComingling } from "../forbidden";
import {
  assertRequiredUsPayorClasses,
  HC_FOOTING_TOLERANCE_USD,
  US_GAAP_ASC606,
  type HealthcareRevenueEmitterInput,
} from "../types";

export const EMITTER_PATH = "lib/router/lanes/healthcare/emitters/payorMixDisaggregation.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-50-5"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

const CLASS_LABELS: Record<string, string> = {
  medicare_traditional: "Medicare Traditional",
  medicare_advantage: "Medicare Advantage",
  medicaid: "Medicaid",
  managed_care: "Managed Care",
  self_pay: "Self-Pay",
  other: "Other",
};

function assertFramework(input: HealthcareRevenueEmitterInput): void {
  if (input.framework !== US_GAAP_ASC606) {
    throw new PayorMixIncompleteError("framework gate");
  }
}

export function emitPayorMixDisaggregation(input: HealthcareRevenueEmitterInput): EmitterResult {
  assertFramework(input);
  const mix = input.extracted.healthcare_revenue?.asc606?.payor_mix;
  if (!mix?.payors?.length) {
    throw new PayorMixIncompleteError("healthcare_revenue.asc606.payor_mix");
  }

  try {
    assertRequiredUsPayorClasses(mix.payors);
  } catch (error) {
    throw new PayorMixIncompleteError((error as Error).message);
  }

  let netSum = 0;
  const rows = mix.payors.map((payor) => {
    netSum += payor.net_patient_service_revenue;
    const label = payor.label ?? CLASS_LABELS[payor.class] ?? payor.class;
    return (
      `${label}: gross $${payor.gross_charges.toLocaleString("en-US")}, contractual adjustments $${payor.contractual_adjustments.toLocaleString("en-US")}, ` +
      `implicit price concessions $${payor.implicit_price_concessions.toLocaleString("en-US")}, net $${payor.net_patient_service_revenue.toLocaleString("en-US")}`
    );
  });

  if (Math.abs(netSum - mix.total_net_patient_service_revenue) > HC_FOOTING_TOLERANCE_USD) {
    throw new PayorMixIncompleteError("payor mix footing to total net patient service revenue");
  }

  const text =
    `Net patient service revenue disaggregated by payor class per ${CITATION_RESOLVED}: ${rows.join("; ")}. ` +
    `Total net patient service revenue $${mix.total_net_patient_service_revenue.toLocaleString("en-US")}.`;
  assertUsgaapHcRevenueOutputNonComingling(text);

  return {
    emitterId: "payor-mix-disaggregation",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "payor-mix", citation: CITATION, text }],
  };
}
