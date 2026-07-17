import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../../types";
import { IFRS16MaturityIncompleteError } from "../../errors";
import { assertIfrsRtlLeaseOutputNonComingling } from "../../forbidden";
import { FOOTING_TOLERANCE_UNITS, IFRS_16, type RetailLeaseEmitterInput } from "../../types";
import { formatAmountForEmitter } from "../../../format-amount";

export const EMITTER_PATH = "lib/router/lanes/retail/emitters/ifrs/leaseMaturityIFRS.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 16",
  paragraphs: ["58", "IFRS 7.39"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

function assertFramework(input: RetailLeaseEmitterInput): void {
  if (input.framework !== IFRS_16) {
    throw new IFRS16MaturityIncompleteError("framework gate");
  }
}

export function emitLeaseMaturityIFRS(input: RetailLeaseEmitterInput): EmitterResult {
  assertFramework(input);
  const maturity = input.extracted.leases?.ifrs16?.maturity;
  if (!maturity?.bands) {
    throw new IFRS16MaturityIncompleteError("leases.ifrs16.maturity");
  }

  const { bands } = maturity;
  const bandSum =
    bands.within_one_year +
    bands.one_to_two_years +
    bands.two_to_three_years +
    bands.three_to_four_years +
    bands.four_to_five_years +
    bands.beyond_five_years;
  if (Math.abs(bandSum - maturity.total_undiscounted) > FOOTING_TOLERANCE_UNITS) {
    throw new IFRS16MaturityIncompleteError("undiscounted maturity footing");
  }
  if (maturity.weighted_average_ibr_pct <= 0 || maturity.weighted_average_ibr_pct > 25) {
    throw new IFRS16MaturityIncompleteError(
      `weighted-average incremental borrowing rate out of band: ${maturity.weighted_average_ibr_pct}%`,
    );
  }

  const currency = maturity.presentation_currency;
  const rate = maturity.weighted_average_ibr_pct.toFixed(2);
  const text =
    `IFRS 16 maturity analysis of lease liabilities (IFRS 7.39 bands): ` +
    `≤1yr ${formatAmountForEmitter(bands.within_one_year, currency)}, ` +
    `1–2yr ${formatAmountForEmitter(bands.one_to_two_years, currency)}, ` +
    `2–3yr ${formatAmountForEmitter(bands.two_to_three_years, currency)}, ` +
    `3–4yr ${formatAmountForEmitter(bands.three_to_four_years, currency)}, ` +
    `4–5yr ${formatAmountForEmitter(bands.four_to_five_years, currency)}, ` +
    `>5yr ${formatAmountForEmitter(bands.beyond_five_years, currency)}; ` +
    `total undiscounted ${formatAmountForEmitter(maturity.total_undiscounted, currency)}; ` +
    `lease liability carrying amount ${formatAmountForEmitter(maturity.lease_liability_carrying_amount, currency)}; ` +
    `weighted-average incremental borrowing rate ${rate}% per ${CITATION_RESOLVED}.`;
  assertIfrsRtlLeaseOutputNonComingling(text);

  return {
    emitterId: "lease-maturity-ifrs",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "lease-obligations", citation: CITATION, text }],
  };
}
