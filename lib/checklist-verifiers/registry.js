import { zeroUncategorizedTxns } from "./zero_uncategorized_txns";
import { allBankAccountsReconciled } from "./all_bank_accounts_reconciled_through_period_end";
import { allCcAccountsReconciled } from "./all_cc_accounts_reconciled_through_period_end";
import { apAgingNoStaleOver90 } from "./ap_aging_no_stale_over_90";
import { arAgingReviewed } from "./ar_aging_reviewed";
import { recurringAccrualsPosted } from "./recurring_accruals_posted";
import { salesTaxLiabilityCurrent } from "./sales_tax_liability_current";

export const VERIFIERS = {
  zero_uncategorized_txns: zeroUncategorizedTxns,
  all_bank_accounts_reconciled_through_period_end: allBankAccountsReconciled,
  all_cc_accounts_reconciled_through_period_end: allCcAccountsReconciled,
  ap_aging_no_stale_over_90: apAgingNoStaleOver90,
  ar_aging_reviewed: arAgingReviewed,
  recurring_accruals_posted: recurringAccrualsPosted,
  sales_tax_liability_current: salesTaxLiabilityCurrent,
};

export async function runVerifier(code, ctx) {
  const fn = VERIFIERS[code];
  if (!fn) {
    return {
      passed: false,
      detail: `Unknown verifier: ${code}. Please confirm manually.`,
      raw: { error: "unknown_verifier" },
    };
  }
  try {
    return await fn(ctx);
  } catch (err) {
    return {
      passed: false,
      detail: `Unable to verify automatically — please confirm manually. (${err.message})`,
      raw: { error: err.message },
    };
  }
}
