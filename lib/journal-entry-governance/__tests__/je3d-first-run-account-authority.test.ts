/**
 * JE-3D — First controlled sandbox JE account authority tests.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  JE_3D_ACTIVATION_POLICY,
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
} from "../je3d-activation-policy";
import { resolveJe3dActivationPolicy } from "../je3d-first-controlled-create-activation";
import {
  buildFirstRunAccountCandidateReport,
  classifyFirstRunAccountExclusions,
  isEligibleAccruedLiabilityAccount,
  isEligibleOrdinaryExpenseAccount,
  resolveFirstRunExplicitAccountEvidence,
  validateExplicitFirstRunAccounts,
  validateStagedFirstRunAccounts,
  type CoaMirrorAccountRow,
} from "../je3d-first-run-account-authority";

function row(
  over: Partial<CoaMirrorAccountRow> & Pick<CoaMirrorAccountRow, "accountId">,
): CoaMirrorAccountRow {
  return {
    accountName: over.accountName ?? `Account ${over.accountId}`,
    accountType: over.accountType ?? "Expense",
    accountSubtype: over.accountSubtype ?? null,
    active: over.active ?? true,
    ...over,
  };
}

const ordinaryExpense = row({
  accountId: "exp-7",
  accountName: "Advertising",
  accountType: "Expense",
});
const ordinaryAccrued = row({
  accountId: "liab-33",
  accountName: "Accrued Liabilities",
  accountType: "Other Current Liability",
  accountSubtype: "OtherCurrentLiabilities",
});

describe("JE-3D first-run account authority", () => {
  it("1. no explicit first-run account IDs → STOP", () => {
    const result = validateExplicitFirstRunAccounts({
      evidence: {
        expenseAccountId: null,
        accruedLiabilityAccountId: null,
        accountsReviewedAndApproved: false,
      },
      mirrorRows: [ordinaryExpense, ordinaryAccrued],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("first_run_expense_account_id_missing");
  });

  it("2. explicit expense missing from mirror → STOP", () => {
    const result = validateExplicitFirstRunAccounts({
      evidence: {
        expenseAccountId: "missing-exp",
        accruedLiabilityAccountId: "liab-33",
        accountsReviewedAndApproved: true,
      },
      mirrorRows: [ordinaryAccrued],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("first_run_expense_account_not_in_mirror");
  });

  it("3. explicit liability missing from mirror → STOP", () => {
    const result = validateExplicitFirstRunAccounts({
      evidence: {
        expenseAccountId: "exp-7",
        accruedLiabilityAccountId: "missing-liab",
        accountsReviewedAndApproved: true,
      },
      mirrorRows: [ordinaryExpense],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("first_run_liability_account_not_in_mirror");
  });

  it("4. inactive account → STOP", () => {
    const result = validateExplicitFirstRunAccounts({
      evidence: {
        expenseAccountId: "exp-inactive",
        accruedLiabilityAccountId: "liab-33",
        accountsReviewedAndApproved: true,
      },
      mirrorRows: [
        row({ accountId: "exp-inactive", active: false }),
        ordinaryAccrued,
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("first_run_expense_account_inactive");
  });

  it("5. AR control account → STOP", () => {
    const ar = row({
      accountId: "ar-1",
      accountName: "Accounts Receivable",
      accountType: "AccountsReceivable",
    });
    expect(isEligibleOrdinaryExpenseAccount(ar)).toBe(false);
    expect(classifyFirstRunAccountExclusions(ar)).toContain("ar");
  });

  it("6. cash/bank → STOP", () => {
    const bank = row({
      accountId: "bank-1",
      accountName: "Checking",
      accountType: "Bank",
    });
    expect(isEligibleOrdinaryExpenseAccount(bank)).toBe(false);
    expect(classifyFirstRunAccountExclusions(bank)).toContain("bank_cash");
  });

  it("7. inventory → STOP", () => {
    const inv = row({
      accountId: "inv-1",
      accountName: "Inventory Asset",
      accountType: "Inventory",
    });
    expect(isEligibleOrdinaryExpenseAccount(inv)).toBe(false);
    expect(classifyFirstRunAccountExclusions(inv)).toContain("inventory");
  });

  it("8. fixed asset → STOP", () => {
    const fa = row({
      accountId: "fa-1",
      accountName: "Truck",
      accountType: "Fixed Asset",
    });
    expect(isEligibleOrdinaryExpenseAccount(fa)).toBe(false);
    expect(classifyFirstRunAccountExclusions(fa)).toContain("fixed_asset");
  });

  it("9. equity → STOP", () => {
    const eq = row({
      accountId: "eq-1",
      accountName: "Owner Equity",
      accountType: "Equity",
    });
    expect(isEligibleOrdinaryExpenseAccount(eq)).toBe(false);
    expect(classifyFirstRunAccountExclusions(eq)).toContain("equity");
  });

  it("10. revenue → STOP", () => {
    const rev = row({
      accountId: "rev-1",
      accountName: "Sales Income",
      accountType: "Income",
    });
    expect(isEligibleOrdinaryExpenseAccount(rev)).toBe(false);
    expect(classifyFirstRunAccountExclusions(rev)).toContain("revenue");
  });

  it("11. tax/payroll liability → STOP", () => {
    const payroll = row({
      accountId: "pay-1",
      accountName: "Payroll Liabilities",
      accountType: "Other Current Liability",
    });
    const tax = row({
      accountId: "tax-1",
      accountName: "Sales Tax Payable",
      accountType: "Other Current Liability",
    });
    expect(isEligibleAccruedLiabilityAccount(payroll)).toBe(false);
    expect(isEligibleAccruedLiabilityAccount(tax)).toBe(false);
    expect(classifyFirstRunAccountExclusions(payroll)).toContain(
      "payroll_liability",
    );
    expect(classifyFirstRunAccountExclusions(tax)).toContain("tax_payable");
  });

  it("12. valid ordinary expense + accrued liability → eligible", () => {
    const result = validateExplicitFirstRunAccounts({
      evidence: {
        expenseAccountId: "exp-7",
        accruedLiabilityAccountId: "liab-33",
        accountsReviewedAndApproved: true,
      },
      mirrorRows: [ordinaryExpense, ordinaryAccrued],
    });
    expect(result.ok).toBe(true);
  });

  it("13. script never auto-selects first account", () => {
    const src = readFileSync(
      join(process.cwd(), "scripts/je3d/stage-first-controlled-create-pre-dispatch.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/rows\.find\(/);
    expect(src).not.toMatch(/pickAccrualAccounts/);
    expect(src).toContain("buildFirstRunAccountCandidateReport");
    expect(src).toContain("validateStagedFirstRunAccounts");
  });

  it("14. candidate report is read-only", () => {
    const report = buildFirstRunAccountCandidateReport({
      firmClientId: "fc-1",
      rows: [ordinaryExpense, ordinaryAccrued],
    });
    expect(report.read_only).toBe(true);
    expect(report.auto_selection_performed).toBe(false);
    expect(report.eligible_expense_candidates).toHaveLength(1);
    expect(report.eligible_liability_candidates).toHaveLength(1);
  });

  it("15. staged account validation works before explicit account approval", () => {
    const staged = validateStagedFirstRunAccounts({
      evidence: {
        expenseAccountId: "exp-7",
        accruedLiabilityAccountId: "liab-33",
      },
      mirrorRows: [ordinaryExpense, ordinaryAccrued],
    });
    expect(staged.ok).toBe(true);

    const explicit = validateExplicitFirstRunAccounts({
      evidence: {
        expenseAccountId: "exp-7",
        accruedLiabilityAccountId: "liab-33",
        accountsReviewedAndApproved: false,
      },
      mirrorRows: [ordinaryExpense, ordinaryAccrued],
    });
    expect(explicit.ok).toBe(false);
    if (explicit.ok) return;
    expect(explicit.code).toBe("first_run_accounts_not_reviewed");

    const src = readFileSync(
      join(process.cwd(), "scripts/je3d/stage-first-controlled-create-pre-dispatch.ts"),
      "utf8",
    );
    expect(src).toContain("validateStagedFirstRunAccounts");
    expect(src).toContain("output.phase = \"B\"");
    expect(src.indexOf("createContinuousCloseJournalEntryProposal")).toBeGreaterThan(
      src.indexOf("validateStagedFirstRunAccounts"),
    );
  });

  it("16. CREATE disabled after first-run; kill switch ON; production OFF", () => {
    const policy = resolveJe3dActivationPolicy();
    expect(isJe3dCreateCapabilityEnabled(policy)).toBe(false);
    expect(policy.sandboxDispatchKillSwitch).toBe(true);
    expect(policy.productionAllowed).toBe(false);
    expect(JE_3D_ACTIVATION_POLICY.capabilities.CREATE_SANDBOX_JE).toBe(false);
  });

  it("17. VERIFY remains OFF", () => {
    expect(isJe3dVerifyCapabilityEnabled(resolveJe3dActivationPolicy())).toBe(
      false,
    );
    expect(resolveFirstRunExplicitAccountEvidence().expenseAccountId).toBe("15");
  });

  it("18. no POST in staging script", () => {
    const src = readFileSync(
      join(process.cwd(), "scripts/je3d/stage-first-controlled-create-pre-dispatch.ts"),
      "utf8",
    );
    expect(src).not.toContain("executeGovernedJournalEntryCreate");
    expect(src).not.toContain("decideJournalEntryProposal");
    expect(src).not.toContain("postGovernedQboJournalEntryOnce");
    expect(src).toContain("publishPostingStarted: false");
  });
});

describe("JE-3D activation policy single source of truth", () => {
  it("capabilities are sole reviewed authority (no governedCreateAllowed flag)", () => {
    const policy = resolveJe3dActivationPolicy();
    expect("governedCreateAllowed" in policy).toBe(false);
    expect("verificationAllowed" in policy).toBe(false);
    expect(isJe3dCreateCapabilityEnabled(policy)).toBe(false);
    expect(isJe3dVerifyCapabilityEnabled(policy)).toBe(false);
  });
});

