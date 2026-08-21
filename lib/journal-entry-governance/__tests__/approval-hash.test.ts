import { describe, expect, it } from "vitest";
import {
  canonicalizeJeApprovalPolicy,
  hashJeApprovalIdempotencyKey,
  hashJeApprovalPolicy,
} from "../approval-hash";
import { DEFAULT_JE_APPROVAL_POLICY } from "../approval-types";

describe("JE-2 approval policy hash", () => {
  it("is deterministic and list-order independent", () => {
    const a = hashJeApprovalPolicy({
      ...DEFAULT_JE_APPROVAL_POLICY,
      allowedFirmApproverRoles: ["controller", "firm_admin"],
    });
    const b = hashJeApprovalPolicy({
      ...DEFAULT_JE_APPROVAL_POLICY,
      allowedFirmApproverRoles: ["firm_admin", "controller"],
    });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when policy eligibility fields change", () => {
    const base = hashJeApprovalPolicy(DEFAULT_JE_APPROVAL_POLICY);
    const changed = hashJeApprovalPolicy({
      ...DEFAULT_JE_APPROVAL_POLICY,
      mfaRequiredAboveCents: 1,
    });
    expect(changed).not.toBe(base);
  });

  it("canonical form excludes reviewer/timestamps", () => {
    const c = canonicalizeJeApprovalPolicy(DEFAULT_JE_APPROVAL_POLICY);
    expect(JSON.stringify(c)).not.toMatch(/reviewer|approvedAt|timestamp/i);
  });

  it("idempotency key binds proposal, hashes, reviewer, decision", () => {
    const k1 = hashJeApprovalIdempotencyKey({
      proposalId: "p1",
      proposalHash: "a".repeat(64),
      approvalPolicyHash: "b".repeat(64),
      reviewerUserId: "u1",
      decision: "APPROVED",
    });
    const k2 = hashJeApprovalIdempotencyKey({
      proposalId: "p1",
      proposalHash: "a".repeat(64),
      approvalPolicyHash: "b".repeat(64),
      reviewerUserId: "u2",
      decision: "APPROVED",
    });
    const k3 = hashJeApprovalIdempotencyKey({
      proposalId: "p1",
      proposalHash: "a".repeat(64),
      approvalPolicyHash: "c".repeat(64),
      reviewerUserId: "u1",
      decision: "APPROVED",
    });
    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
  });
});
