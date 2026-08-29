/**
 * JE-3D — Staged candidate vs dispatch approval sequencing.
 */
import { describe, expect, it } from "vitest";
import {
  FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED,
  FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID,
  FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID,
  resolveFirstRunExplicitAccountEvidence,
  validateExplicitFirstRunAccounts,
  validateStagedFirstRunAccounts,
  type CoaMirrorAccountRow,
} from "../je3d-first-run-account-authority";
import {
  FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED,
  FIRST_RUN_STAGED_EXECUTION_ID,
  evaluateFirstRunCreateAuthority,
  evaluateFirstRunExecutionIdentityGate,
  isFirstRunDispatchAuthorized,
  resolveFirstRunExecutionIdentityEvidence,
} from "../je3d-first-run-execution-authority";
import { buildJe3dPreDispatchChecklistReport } from "../je3d-pre-dispatch-checklist";
import {
  JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
  resolveJe3dActivationPolicy,
} from "../je3d-first-controlled-create-activation";
import { JE_ACTIVATION_DEMO_ROLE_DEMO_A } from "../je3d-sandbox-company-authority";
import { JE_3D_VERIFIED_DEMO_A_IDENTITY } from "../je3d-first-controlled-create-activation";

const mirrorRows: CoaMirrorAccountRow[] = [
  {
    accountId: "15",
    accountName: "Office Expenses",
    accountType: "Expense",
    accountSubtype: null,
    active: true,
  },
  {
    accountId: "1150040002",
    accountName: "Accrued Expenses",
    accountType: "Other Current Liability",
    accountSubtype: "OtherCurrentLiabilities",
    active: true,
  },
];

describe("JE-3D staged vs approved sequencing", () => {
  it("1. staged execution ID exists while execution approval=false", () => {
    expect(FIRST_RUN_STAGED_EXECUTION_ID).toBeTruthy();
    expect(FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED).toBe(false);
  });

  it("2. staged account IDs exist and accounts are reviewed for create-only staging", () => {
    expect(FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID).toBe("15");
    expect(FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID).toBe("1150040002");
    expect(FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED).toBe(true);
  });

  it("3. staging validation passes while execution approval remains false", () => {
    const staged = validateStagedFirstRunAccounts({
      evidence: {
        expenseAccountId: FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID,
        accruedLiabilityAccountId: FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID,
      },
      mirrorRows,
    });
    expect(staged.ok).toBe(true);
  });

  it("4. preflight reports dispatch_authorized=false", () => {
    const report = buildJe3dPreDispatchChecklistReport({
      policy: resolveJe3dActivationPolicy(),
      qbEnvironment: "sandbox",
      allowlist: {
        allowlistResolution: "resolved",
        demoA: {
          companyId: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId,
          companyName: "Demo A",
          accountingConnectionId:
            JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
          realmId: JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId,
          provider: "quickbooks",
          connectionStatus: "connected",
          providerEnvironment: "sandbox",
          demoRole: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
        },
        allowedCompanyIds: [JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId],
        canonicalConnectionByCompanyId: {
          [JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId]:
            JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
        },
      },
    });
    expect(report.execution_reviewed_and_approved).toBe(false);
    expect(report.accounts_reviewed_and_approved).toBe(true);
    expect(report.dispatch_authorized).toBe(false);
    expect(report.candidate_execution_id).toBe(FIRST_RUN_STAGED_EXECUTION_ID);
  });

  it("5. kill switch ON blocks dispatch even if approvals were hypothetically true", () => {
    expect(
      isFirstRunDispatchAuthorized({
        identityEvidence: {
          stagedExecutionId: FIRST_RUN_STAGED_EXECUTION_ID,
          executionReviewedAndApproved: true,
        },
        accountEvidence: {
          expenseAccountId: "15",
          accruedLiabilityAccountId: "1150040002",
          accountsReviewedAndApproved: true,
        },
        killSwitchActive: true,
      }),
    ).toBe(false);
  });

  it("6. kill switch OFF + execution approval=false blocks dispatch", () => {
    expect(
      isFirstRunDispatchAuthorized({
        identityEvidence: {
          stagedExecutionId: FIRST_RUN_STAGED_EXECUTION_ID,
          executionReviewedAndApproved: false,
        },
        accountEvidence: {
          expenseAccountId: "15",
          accruedLiabilityAccountId: "1150040002",
          accountsReviewedAndApproved: true,
        },
        killSwitchActive: false,
      }),
    ).toBe(false);
    expect(
      evaluateFirstRunExecutionIdentityGate(FIRST_RUN_STAGED_EXECUTION_ID!, {
        stagedExecutionId: FIRST_RUN_STAGED_EXECUTION_ID,
        executionReviewedAndApproved: false,
      }).ok,
    ).toBe(false);
  });

  it("7. kill switch OFF + account approval=false blocks dispatch", () => {
    const unapprovedAccounts = {
      ...resolveFirstRunExplicitAccountEvidence(),
      accountsReviewedAndApproved: false as const,
    };
    expect(
      isFirstRunDispatchAuthorized({
        identityEvidence: {
          stagedExecutionId: FIRST_RUN_STAGED_EXECUTION_ID,
          executionReviewedAndApproved: true,
        },
        accountEvidence: unapprovedAccounts,
        killSwitchActive: false,
      }),
    ).toBe(false);
    expect(
      validateExplicitFirstRunAccounts({
        evidence: unapprovedAccounts,
        mirrorRows,
      }).ok,
    ).toBe(false);
  });

  it("8. only both approvals true + kill switch OFF authorizes dispatch path", () => {
    expect(
      isFirstRunDispatchAuthorized({
        identityEvidence: {
          stagedExecutionId: FIRST_RUN_STAGED_EXECUTION_ID,
          executionReviewedAndApproved: true,
        },
        accountEvidence: {
          expenseAccountId: "15",
          accruedLiabilityAccountId: "1150040002",
          accountsReviewedAndApproved: true,
        },
        killSwitchActive: false,
      }),
    ).toBe(true);
  });

  it("9. CREATE ON, VERIFY OFF, kill switch ON in effective policy", () => {
    const policy = JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY;
    expect(policy.capabilities.CREATE_SANDBOX_JE).toBe(true);
    expect(policy.capabilities.VERIFY_SANDBOX_JE).toBe(false);
    expect(policy.sandboxDispatchKillSwitch).toBe(true);
  });

  it("10. default identity evidence reflects staged-not-approved", () => {
    const identity = resolveFirstRunExecutionIdentityEvidence();
    expect(identity.stagedExecutionId).toBe(FIRST_RUN_STAGED_EXECUTION_ID);
    expect(identity.executionReviewedAndApproved).toBe(false);
  });
});
