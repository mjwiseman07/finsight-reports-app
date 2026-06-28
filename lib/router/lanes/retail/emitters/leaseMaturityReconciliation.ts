import type { LeaseMaturitySchedule } from "../../../../../scripts/external-truth/types";
import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../types";
import { LeaseMaturityReconciliationError } from "../errors";
import { assertUsgaapRtlLeaseOutputNonComingling } from "../forbidden";
import {
  FOOTING_TOLERANCE_UNITS,
  US_GAAP_ASC842,
  type RetailLeaseEmitterInput,
} from "../types";

export const EMITTER_PATH = "lib/router/lanes/retail/emitters/leaseMaturityReconciliation.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 842",
  paragraphs: ["842-20-50-6"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

function assertFramework(input: RetailLeaseEmitterInput): void {
  if (input.framework !== US_GAAP_ASC842) {
    throw new LeaseMaturityReconciliationError("framework gate");
  }
}

function formatSchedule(label: "Operating" | "Finance", schedule: LeaseMaturitySchedule): string {
  const undiscountedSum =
    schedule.year_1 +
    schedule.year_2 +
    schedule.year_3 +
    schedule.year_4 +
    schedule.year_5 +
    schedule.thereafter;
  if (Math.abs(undiscountedSum - schedule.total_undiscounted) > FOOTING_TOLERANCE_UNITS) {
    throw new LeaseMaturityReconciliationError(`${label} undiscounted maturity footing`);
  }
  const pvCheck = schedule.total_undiscounted - schedule.imputed_interest;
  if (Math.abs(pvCheck - schedule.present_value) > FOOTING_TOLERANCE_UNITS) {
    throw new LeaseMaturityReconciliationError(`${label} present value footing`);
  }

  return (
    `${label} leases — Y1 $${schedule.year_1.toLocaleString("en-US")}, Y2 $${schedule.year_2.toLocaleString("en-US")}, ` +
    `Y3 $${schedule.year_3.toLocaleString("en-US")}, Y4 $${schedule.year_4.toLocaleString("en-US")}, ` +
    `Y5 $${schedule.year_5.toLocaleString("en-US")}, thereafter $${schedule.thereafter.toLocaleString("en-US")}; ` +
    `total undiscounted $${schedule.total_undiscounted.toLocaleString("en-US")}; less imputed interest $${schedule.imputed_interest.toLocaleString("en-US")}; ` +
    `present value of lease liability $${schedule.present_value.toLocaleString("en-US")}`
  );
}

export function emitLeaseMaturityReconciliation(input: RetailLeaseEmitterInput): EmitterResult {
  assertFramework(input);
  const maturity = input.extracted.leases?.asc842?.maturity;
  if (!maturity?.operating || !maturity?.finance) {
    throw new LeaseMaturityReconciliationError("leases.asc842.maturity");
  }

  const operatingText = formatSchedule("Operating", maturity.operating);
  const financeText = formatSchedule("Finance", maturity.finance);
  const totalPv = maturity.operating.present_value + maturity.finance.present_value;

  let balanceSheetNote = "";
  if (maturity.balance_sheet) {
    const bsTotal =
      maturity.balance_sheet.operating_lease_liability + maturity.balance_sheet.finance_lease_liability;
    const diff = Math.abs(bsTotal - totalPv);
    if (diff > FOOTING_TOLERANCE_UNITS) {
      throw new LeaseMaturityReconciliationError(
        `balance sheet lease liability reconciliation diff $${diff.toLocaleString("en-US")}`,
      );
    }
    balanceSheetNote =
      ` Reconciled to balance sheet operating lease liability $${maturity.balance_sheet.operating_lease_liability.toLocaleString("en-US")} ` +
      `and finance lease liability $${maturity.balance_sheet.finance_lease_liability.toLocaleString("en-US")} (diff $${diff.toLocaleString("en-US")}).`;
  }

  const text = `ASC 842 lease maturity reconciliation: ${operatingText}. ${financeText}.${balanceSheetNote} per ${CITATION_RESOLVED}.`;
  assertUsgaapRtlLeaseOutputNonComingling(text);

  return {
    emitterId: "lease-maturity-reconciliation",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "lease-obligations", citation: CITATION, text }],
  };
}
