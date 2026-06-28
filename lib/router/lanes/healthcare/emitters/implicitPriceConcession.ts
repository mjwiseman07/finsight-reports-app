import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../types";
import { IPCBadDebtMislabelError, IPCMethodologyMissingError } from "../errors";
import { assertUsgaapHcRevenueOutputNonComingling } from "../forbidden";
import { US_GAAP_ASC606, type HealthcareRevenueEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/lanes/healthcare/emitters/implicitPriceConcession.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-32-7", "606-10-50-12", "ASU 2014-09"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

function assertFramework(input: HealthcareRevenueEmitterInput): void {
  if (input.framework !== US_GAAP_ASC606) {
    throw new IPCMethodologyMissingError("framework gate");
  }
}

export function emitImplicitPriceConcession(input: HealthcareRevenueEmitterInput): EmitterResult {
  assertFramework(input);
  const ipc = input.extracted.healthcare_revenue?.asc606?.implicit_price_concession;
  if (!ipc) {
    throw new IPCMethodologyMissingError("healthcare_revenue.asc606.implicit_price_concession");
  }
  if (ipc.methodology !== "portfolio" && ipc.methodology !== "individual") {
    throw new IPCMethodologyMissingError("methodology must be portfolio or individual");
  }
  if (!ipc.lookback_months || ipc.lookback_months < 1) {
    throw new IPCMethodologyMissingError("lookback_months");
  }
  if (!ipc.collection_rates_by_payor || Object.keys(ipc.collection_rates_by_payor).length === 0) {
    throw new IPCMethodologyMissingError("collection_rates_by_payor");
  }

  const rates = Object.entries(ipc.collection_rates_by_payor)
    .map(([payor, rate]) => `${payor} ${(rate * 100).toFixed(1)}%`)
    .join(", ");
  const text =
    `Implicit price concession recognized at contract inception using ${ipc.methodology} approach per ${CITATION_RESOLVED}. ` +
    `Historical collection rates (${ipc.lookback_months}-month lookback): ${rates}. ` +
    `Total implicit price concession reducing net patient service revenue: $${ipc.total_ipc.toLocaleString("en-US")}. ` +
    `Charity care is distinguished from implicit price concession per ASU 2011-07.`;
  if (/bad debt expense/i.test(text)) {
    throw new IPCBadDebtMislabelError();
  }
  assertUsgaapHcRevenueOutputNonComingling(text);

  return {
    emitterId: "implicit-price-concession",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "bad-debt-vs-charity", citation: CITATION, text }],
  };
}
