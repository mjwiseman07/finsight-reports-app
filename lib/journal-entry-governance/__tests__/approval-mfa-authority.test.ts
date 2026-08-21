import { describe, expect, it } from "vitest";
import { mfaRequiredForProposal } from "../approval-custody";
import { DEFAULT_JE_APPROVAL_POLICY } from "../approval-types";
import { JeApprovalAuthorityError } from "../approval-authority";
import { JE_APPROVAL_ERROR } from "../approval-types";

describe("JE-2 MFA threshold helpers", () => {
  it("does not require MFA below threshold without alwaysRequireMfa", () => {
    expect(
      mfaRequiredForProposal({
        policy: {
          ...DEFAULT_JE_APPROVAL_POLICY,
          alwaysRequireMfa: false,
          mfaRequiredAboveCents: 100_000,
        },
        totalDebitsCents: 99_999,
      }),
    ).toBe(false);
  });

  it("requires MFA at threshold and when alwaysRequireMfa", () => {
    expect(
      mfaRequiredForProposal({
        policy: {
          ...DEFAULT_JE_APPROVAL_POLICY,
          alwaysRequireMfa: false,
          mfaRequiredAboveCents: 100_000,
        },
        totalDebitsCents: 100_000,
      }),
    ).toBe(true);
    expect(
      mfaRequiredForProposal({
        policy: {
          ...DEFAULT_JE_APPROVAL_POLICY,
          alwaysRequireMfa: true,
          mfaRequiredAboveCents: null,
        },
        totalDebitsCents: 1,
      }),
    ).toBe(true);
  });
});

describe("JE-2 authority error codes", () => {
  it("exposes firm can_approve and role denial codes", () => {
    const e1 = new JeApprovalAuthorityError(
      JE_APPROVAL_ERROR.FIRM_CAN_APPROVE_REQUIRED,
      "need can_approve",
    );
    const e2 = new JeApprovalAuthorityError(
      JE_APPROVAL_ERROR.APPROVER_ROLE_DENIED,
      "role denied",
    );
    expect(e1.code).toBe(JE_APPROVAL_ERROR.FIRM_CAN_APPROVE_REQUIRED);
    expect(e2.code).toBe(JE_APPROVAL_ERROR.APPROVER_ROLE_DENIED);
  });
});
