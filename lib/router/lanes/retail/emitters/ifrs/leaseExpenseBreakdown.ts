import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../../types";
import { IFRS16ExpenseIncompleteError } from "../../errors";
import { assertIfrsRtlLeaseOutputNonComingling } from "../../forbidden";
import { IFRS_16, type RetailLeaseEmitterInput } from "../../types";
import { formatAmountForEmitter } from "../../../format-amount";

export const EMITTER_PATH = "lib/router/lanes/retail/emitters/ifrs/leaseExpenseBreakdown.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 16",
  paragraphs: ["53(a)", "53(b)", "53(c)", "53(d)", "53(e)"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

function assertFramework(input: RetailLeaseEmitterInput): void {
  if (input.framework !== IFRS_16) {
    throw new IFRS16ExpenseIncompleteError("framework gate");
  }
}

export function emitLeaseExpenseBreakdown(input: RetailLeaseEmitterInput): EmitterResult {
  assertFramework(input);
  const breakdown = input.extracted.leases?.ifrs16?.expense_breakdown;
  if (!breakdown) {
    throw new IFRS16ExpenseIncompleteError("leases.ifrs16.expense_breakdown");
  }

  if (
    !breakdown.depreciation_rou_by_class ||
    Object.keys(breakdown.depreciation_rou_by_class).length === 0
  ) {
    throw new IFRS16ExpenseIncompleteError("leases.ifrs16.expense_breakdown.depreciation_rou_by_class");
  }
  const requiredScalars = [
    "interest_on_lease_liabilities",
    "short_term_lease_expense",
    "low_value_lease_expense",
    "variable_lease_payments",
  ] as const;
  for (const field of requiredScalars) {
    if (breakdown[field] === undefined || breakdown[field] === null) {
      throw new IFRS16ExpenseIncompleteError(`leases.ifrs16.expense_breakdown.${field}`);
    }
  }
  if (breakdown.short_term_lease_expense === breakdown.low_value_lease_expense && breakdown.short_term_lease_expense > 0) {
    throw new IFRS16ExpenseIncompleteError("short-term and low-value lease expense must not be collapsed");
  }

  const currency = breakdown.presentation_currency;
  const depreciationSummary = Object.entries(breakdown.depreciation_rou_by_class)
    .map(
      ([cls, amount]: [string, number]) =>
        `${cls}: ${formatAmountForEmitter(amount, currency)}`,
    )
    .join("; ");
  const subleaseIncome = breakdown.sublease_income ?? 0;
  const subleaseLine =
    subleaseIncome !== 0
      ? ` Income from subleasing right-of-use assets: ${formatAmountForEmitter(subleaseIncome, currency)}.`
      : "";
  const text =
    `IFRS 16 lessee lease expense by nature: depreciation of right-of-use assets (${depreciationSummary}); ` +
    `interest on lease liabilities ${formatAmountForEmitter(breakdown.interest_on_lease_liabilities, currency)}; ` +
    `short-term lease expense ${formatAmountForEmitter(breakdown.short_term_lease_expense, currency)}; ` +
    `low-value asset lease expense ${formatAmountForEmitter(breakdown.low_value_lease_expense, currency)}; ` +
    `variable lease payments not in liability measurement ${formatAmountForEmitter(breakdown.variable_lease_payments, currency)}.${subleaseLine} ` +
    `per ${CITATION_RESOLVED}.`;
  assertIfrsRtlLeaseOutputNonComingling(text);

  return {
    emitterId: "lease-expense-breakdown",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "lease-obligations", citation: CITATION, text }],
  };
}
