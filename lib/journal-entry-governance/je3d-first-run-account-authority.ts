/**
 * JE-3D — First controlled sandbox JE account authority.
 *
 * Controlled first-run evidence only. Not caller API overrides.
 * No heuristic "first matching account" selection.
 */

import type { JeProposalAccountMeta } from "./types";

/** Staged candidate account IDs — not dispatch-approved until explicit review. */
export const FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID: string | null = "15";
export const FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID: string | null =
  "1150040002";

/** @deprecated Use FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID */
export const FIRST_RUN_EXPENSE_ACCOUNT_ID: string | null =
  FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID;

/** @deprecated Use FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID */
export const FIRST_RUN_ACCRUED_LIABILITY_ACCOUNT_ID: string | null =
  FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID;

/**
 * Must be true before dispatch. Staged account IDs may exist while this is false.
 */
export const FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED = false;

export const FIRST_RUN_JE_AMOUNT_CENTS = 100;
export const FIRST_RUN_JE_CURRENCY = "USD";

export const FIRST_RUN_ACCOUNT_APPROVAL_RECOMMENDATION =
  "ACCOUNT SELECTION REQUIRES CHATGPT APPROVAL" as const;

export type CoaMirrorAccountRow = {
  accountId: string;
  accountName: string;
  accountType: string;
  accountSubtype: string | null;
  active: boolean;
};

export type FirstRunAccountExclusion =
  | "ar"
  | "ap"
  | "bank_cash"
  | "inventory"
  | "fixed_asset"
  | "equity"
  | "revenue"
  | "tax_payable"
  | "payroll_liability"
  | "credit_card"
  | "loan_debt"
  | "intercompany"
  | "retained_earnings"
  | "undeposited_funds"
  | "control_account"
  | "inactive"
  | "wrong_expense_type"
  | "wrong_liability_type";

export type FirstRunAccountCandidate = CoaMirrorAccountRow & {
  eligible_for_ordinary_expense: boolean;
  eligible_for_accrued_liability: boolean;
  exclusion_reasons: FirstRunAccountExclusion[];
  is_control_account: boolean;
};

export type FirstRunAccountCandidateReport = {
  read_only: true;
  firm_client_id: string;
  candidates: FirstRunAccountCandidate[];
  eligible_expense_candidates: FirstRunAccountCandidate[];
  eligible_liability_candidates: FirstRunAccountCandidate[];
  auto_selection_performed: false;
};

const PROHIBITED_ACCOUNT_TYPES = new Set([
  "AccountsReceivable",
  "AccountsPayable",
  "Bank",
  "Credit Card",
  "Equity",
  "Income",
  "Other Income",
  "Fixed Asset",
  "Inventory",
]);

const ORDINARY_EXPENSE_TYPES = new Set(["Expense", "Other Expense"]);
const ORDINARY_ACCRUED_LIABILITY_TYPES = new Set(["Other Current Liability"]);

const NAME_EXCLUSION_PATTERNS: Array<{ reason: FirstRunAccountExclusion; re: RegExp }> =
  [
    { reason: "payroll_liability", re: /payroll|wage|salary|401k|withholding/i },
    { reason: "tax_payable", re: /sales\s*tax|tax\s*payable|income\s*tax|payroll\s*tax/i },
    { reason: "loan_debt", re: /loan|note\s*payable|line\s*of\s*credit|mortgage|debt/i },
    { reason: "credit_card", re: /credit\s*card/i },
    { reason: "intercompany", re: /intercompany|inter-company/i },
    { reason: "retained_earnings", re: /retained\s*earnings/i },
    { reason: "undeposited_funds", re: /undeposited\s*funds/i },
    { reason: "ar", re: /accounts?\s*receivable|a\/r\b/i },
    { reason: "ap", re: /accounts?\s*payable|a\/p\b/i },
    { reason: "inventory", re: /\binventory\b/i },
    { reason: "fixed_asset", re: /fixed\s*asset|accumulated\s*depreciation/i },
    { reason: "equity", re: /\bequity\b|owner'?s?\s*equity|capital\s*stock/i },
    { reason: "revenue", re: /\brevenue\b|\bincome\b|\bsales\b/i },
    { reason: "bank_cash", re: /\bbank\b|\bcash\b|\bchecking\b|\bsavings\b/i },
  ];

function normalizeText(value: string | null | undefined): string {
  return String(value || "").trim();
}

export function classifyFirstRunAccountExclusions(
  row: CoaMirrorAccountRow,
): FirstRunAccountExclusion[] {
  const reasons = new Set<FirstRunAccountExclusion>();
  const type = normalizeText(row.accountType);
  const subtype = normalizeText(row.accountSubtype);
  const name = normalizeText(row.accountName);
  const haystack = `${name} ${type} ${subtype}`;

  if (!row.active) reasons.add("inactive");

  if (type === "AccountsReceivable") reasons.add("ar");
  if (type === "AccountsPayable") reasons.add("ap");
  if (type === "Bank") reasons.add("bank_cash");
  if (type === "Credit Card") reasons.add("credit_card");
  if (type === "Inventory") reasons.add("inventory");
  if (type === "Fixed Asset") reasons.add("fixed_asset");
  if (type === "Equity") reasons.add("equity");
  if (type === "Income" || type === "Other Income") reasons.add("revenue");
  if (PROHIBITED_ACCOUNT_TYPES.has(type)) {
    reasons.add("control_account");
  }

  for (const { reason, re } of NAME_EXCLUSION_PATTERNS) {
    if (re.test(haystack)) reasons.add(reason);
  }

  if (subtype === "UndepositedFunds") reasons.add("undeposited_funds");

  return [...reasons];
}

export function isEligibleOrdinaryExpenseAccount(
  row: CoaMirrorAccountRow,
): boolean {
  const exclusions = classifyFirstRunAccountExclusions(row);
  if (exclusions.length > 0) return false;
  return ORDINARY_EXPENSE_TYPES.has(normalizeText(row.accountType));
}

export function isEligibleAccruedLiabilityAccount(
  row: CoaMirrorAccountRow,
): boolean {
  const exclusions = classifyFirstRunAccountExclusions(row);
  if (exclusions.length > 0) return false;
  return ORDINARY_ACCRUED_LIABILITY_TYPES.has(normalizeText(row.accountType));
}

export function buildFirstRunAccountCandidate(
  row: CoaMirrorAccountRow,
): FirstRunAccountCandidate {
  const exclusion_reasons = classifyFirstRunAccountExclusions(row);
  const eligible_for_ordinary_expense = isEligibleOrdinaryExpenseAccount(row);
  const eligible_for_accrued_liability = isEligibleAccruedLiabilityAccount(row);
  return {
    ...row,
    eligible_for_ordinary_expense,
    eligible_for_accrued_liability,
    exclusion_reasons,
    is_control_account: exclusion_reasons.includes("control_account"),
  };
}

export function buildFirstRunAccountCandidateReport(args: {
  firmClientId: string;
  rows: readonly CoaMirrorAccountRow[];
}): FirstRunAccountCandidateReport {
  const candidates = args.rows.map(buildFirstRunAccountCandidate);
  return {
    read_only: true,
    firm_client_id: args.firmClientId,
    candidates,
    eligible_expense_candidates: candidates.filter(
      (c) => c.eligible_for_ordinary_expense,
    ),
    eligible_liability_candidates: candidates.filter(
      (c) => c.eligible_for_accrued_liability,
    ),
    auto_selection_performed: false,
  };
}

export type FirstRunExplicitAccountEvidence = {
  expenseAccountId: string | null;
  accruedLiabilityAccountId: string | null;
  accountsReviewedAndApproved: boolean;
};

export function resolveFirstRunExplicitAccountEvidence(): FirstRunExplicitAccountEvidence {
  return {
    expenseAccountId: FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID,
    accruedLiabilityAccountId: FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID,
    accountsReviewedAndApproved: FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED,
  };
}

export function resolveFirstRunStagedAccountEvidence(): Omit<
  FirstRunExplicitAccountEvidence,
  "accountsReviewedAndApproved"
> & { accountsReviewedAndApproved: false } {
  return {
    expenseAccountId: FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID,
    accruedLiabilityAccountId: FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID,
    accountsReviewedAndApproved: false,
  };
}

export type FirstRunAccountAuthorityFailureCode =
  | "first_run_expense_account_id_missing"
  | "first_run_accrued_liability_account_id_missing"
  | "first_run_accounts_not_reviewed"
  | "first_run_expense_account_not_in_mirror"
  | "first_run_liability_account_not_in_mirror"
  | "first_run_expense_account_inactive"
  | "first_run_liability_account_inactive"
  | "first_run_expense_account_prohibited"
  | "first_run_liability_account_prohibited";

export type FirstRunAccountAuthorityResult =
  | {
      ok: true;
      expense: CoaMirrorAccountRow;
      liability: CoaMirrorAccountRow;
      expenseCandidate: FirstRunAccountCandidate;
      liabilityCandidate: FirstRunAccountCandidate;
    }
  | {
      ok: false;
      code: FirstRunAccountAuthorityFailureCode;
      message: string;
      recommendation: typeof FIRST_RUN_ACCOUNT_APPROVAL_RECOMMENDATION;
    };

export function validateStagedFirstRunAccounts(args: {
  evidence: Pick<
    FirstRunExplicitAccountEvidence,
    "expenseAccountId" | "accruedLiabilityAccountId"
  >;
  mirrorRows: readonly CoaMirrorAccountRow[];
}): FirstRunAccountAuthorityResult {
  return validateFirstRunAccountsInternal({
    evidence: {
      ...args.evidence,
      accountsReviewedAndApproved: true,
    },
    mirrorRows: args.mirrorRows,
    requireApproval: false,
  });
}

export function validateExplicitFirstRunAccounts(args: {
  evidence: FirstRunExplicitAccountEvidence;
  mirrorRows: readonly CoaMirrorAccountRow[];
}): FirstRunAccountAuthorityResult {
  return validateFirstRunAccountsInternal({
    evidence: args.evidence,
    mirrorRows: args.mirrorRows,
    requireApproval: true,
  });
}

function validateFirstRunAccountsInternal(args: {
  evidence: FirstRunExplicitAccountEvidence;
  mirrorRows: readonly CoaMirrorAccountRow[];
  requireApproval: boolean;
}): FirstRunAccountAuthorityResult {
  const { evidence, mirrorRows, requireApproval } = args;
  const byId = new Map(mirrorRows.map((row) => [row.accountId, row]));

  if (!evidence.expenseAccountId) {
    return fail(
      "first_run_expense_account_id_missing",
      "FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID is not set.",
    );
  }
  if (!evidence.accruedLiabilityAccountId) {
    return fail(
      "first_run_accrued_liability_account_id_missing",
      "FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID is not set.",
    );
  }
  if (requireApproval && !evidence.accountsReviewedAndApproved) {
    return fail(
      "first_run_accounts_not_reviewed",
      "FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED is false; explicit account IDs require human review before proposal creation.",
    );
  }

  const expense = byId.get(evidence.expenseAccountId);
  if (!expense) {
    return fail(
      "first_run_expense_account_not_in_mirror",
      `Expense account ${evidence.expenseAccountId} is not present in qbo_coa_mirror.`,
    );
  }
  const liability = byId.get(evidence.accruedLiabilityAccountId);
  if (!liability) {
    return fail(
      "first_run_liability_account_not_in_mirror",
      `Accrued liability account ${evidence.accruedLiabilityAccountId} is not present in qbo_coa_mirror.`,
    );
  }

  if (!expense.active) {
    return fail(
      "first_run_expense_account_inactive",
      `Expense account ${expense.accountId} is inactive.`,
    );
  }
  if (!liability.active) {
    return fail(
      "first_run_liability_account_inactive",
      `Accrued liability account ${liability.accountId} is inactive.`,
    );
  }

  const expenseCandidate = buildFirstRunAccountCandidate(expense);
  if (!expenseCandidate.eligible_for_ordinary_expense) {
    return fail(
      "first_run_expense_account_prohibited",
      `Expense account ${expense.accountId} violates first-run restrictions: ${expenseCandidate.exclusion_reasons.join(", ") || "wrong_expense_type"}.`,
    );
  }

  const liabilityCandidate = buildFirstRunAccountCandidate(liability);
  if (!liabilityCandidate.eligible_for_accrued_liability) {
    return fail(
      "first_run_liability_account_prohibited",
      `Accrued liability account ${liability.accountId} violates first-run restrictions: ${liabilityCandidate.exclusion_reasons.join(", ") || "wrong_liability_type"}.`,
    );
  }

  return {
    ok: true,
    expense,
    liability,
    expenseCandidate,
    liabilityCandidate,
  };
}

function fail(
  code: FirstRunAccountAuthorityFailureCode,
  message: string,
): FirstRunAccountAuthorityResult {
  return {
    ok: false,
    code,
    message,
    recommendation: FIRST_RUN_ACCOUNT_APPROVAL_RECOMMENDATION,
  };
}

export function coaMirrorRowToProposalMeta(
  row: CoaMirrorAccountRow,
): JeProposalAccountMeta {
  return {
    accountId: row.accountId,
    accountType: row.accountType,
    accountSubtype: row.accountSubtype,
    active: row.active,
    name: row.accountName,
  };
}
