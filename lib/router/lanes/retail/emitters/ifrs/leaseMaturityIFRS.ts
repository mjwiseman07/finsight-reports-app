import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../../types";
import { IFRS16MaturityIncompleteError } from "../../errors";
import { assertIfrsRtlLeaseOutputNonComingling } from "../../forbidden";
import { FOOTING_TOLERANCE_UNITS, IFRS_16, type RetailLeaseEmitterInput } from "../../types";

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

  const currency = maturity.presentation_currency ?? "units";
  const rate = maturity.weighted_average_ibr_pct.toFixed(2);
  const text =
    `IFRS 16 maturity analysis of lease liabilities (IFRS 7.39 bands): ` +
    `≤1yr ${bands.within_one_year.toLocaleString("en-US")} ${currency}, ` +
    `1–2yr ${bands.one_to_two_years.toLocaleString("en-US")} ${currency}, ` +
    `2–3yr ${bands.two_to_three_years.toLocaleString("en-US")} ${currency}, ` +
    `3–4yr ${bands.three_to_four_years.toLocaleString("en-US")} ${currency}, ` +
    `4–5yr ${bands.four_to_five_years.toLocaleString("en-US")} ${currency}, ` +
    `>5yr ${bands.beyond_five_years.toLocaleString("en-US")} ${currency}; ` +
    `total undiscounted ${maturity.total_undiscounted.toLocaleString("en-US")} ${currency}; ` +
    `lease liability carrying amount ${maturity.lease_liability_carrying_amount.toLocaleString("en-US")} ${currency}; ` +
    `weighted-average incremental borrowing rate ${rate}% per ${CITATION_RESOLVED}.`;
  assertIfrsRtlLeaseOutputNonComingling(text);

  return {
    emitterId: "lease-maturity-ifrs",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "lease-obligations", citation: CITATION, text }],
  };
}
