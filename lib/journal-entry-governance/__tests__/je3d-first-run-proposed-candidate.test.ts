/**
 * JE-3D — Proposed first-run candidate is read-only evidence only.
 */
import { describe, expect, it } from "vitest";
import { JE_3D_FIRST_RUN_PROPOSED_CANDIDATE } from "../je3d-first-run-proposed-candidate";
import {
  FIRST_RUN_APPROVED_EXECUTION_ID,
  FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED,
} from "../je3d-first-run-execution-authority";
import {
  FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED,
  FIRST_RUN_ACCRUED_LIABILITY_ACCOUNT_ID,
  FIRST_RUN_EXPENSE_ACCOUNT_ID,
} from "../je3d-first-run-account-authority";
import {
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
} from "../je3d-activation-policy";
import { resolveJe3dActivationPolicy } from "../je3d-first-controlled-create-activation";

describe("JE_3D_FIRST_RUN_PROPOSED_CANDIDATE", () => {
  it("documents Office Expenses ↔ Accrued Expenses pair without enabling CREATE", () => {
    expect(JE_3D_FIRST_RUN_PROPOSED_CANDIDATE.debit.qboAccountId).toBe("15");
    expect(JE_3D_FIRST_RUN_PROPOSED_CANDIDATE.credit.qboAccountId).toBe(
      "1150040002",
    );
    expect(JE_3D_FIRST_RUN_PROPOSED_CANDIDATE.amountCents).toBe(100);
    expect(JE_3D_FIRST_RUN_PROPOSED_CANDIDATE.currency).toBe("USD");
    expect(JE_3D_FIRST_RUN_PROPOSED_CANDIDATE.governanceRowsCreated).toBe(false);
    expect(JE_3D_FIRST_RUN_PROPOSED_CANDIDATE.providerAttemptCreated).toBe(false);
    expect(JE_3D_FIRST_RUN_PROPOSED_CANDIDATE.qboPostMade).toBe(false);
    expect(JE_3D_FIRST_RUN_PROPOSED_CANDIDATE.autoSelectionPerformed).toBe(false);

    expect(FIRST_RUN_EXPENSE_ACCOUNT_ID).toBeNull();
    expect(FIRST_RUN_ACCRUED_LIABILITY_ACCOUNT_ID).toBeNull();
    expect(FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED).toBe(false);
    expect(FIRST_RUN_APPROVED_EXECUTION_ID).toBeNull();
    expect(FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED).toBe(false);

    const policy = resolveJe3dActivationPolicy();
    expect(isJe3dCreateCapabilityEnabled(policy)).toBe(false);
    expect(isJe3dVerifyCapabilityEnabled(policy)).toBe(false);
    expect(policy.sandboxDispatchKillSwitch).toBe(true);
  });
});
