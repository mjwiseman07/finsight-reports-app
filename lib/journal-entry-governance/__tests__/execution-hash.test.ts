import { describe, expect, it } from "vitest";
import {
  canonicalizeJeExecutionPolicy,
  hashJeExecution,
  hashJeExecutionIdempotencyKey,
  hashJeExecutionPolicy,
} from "../execution-hash";
import { DEFAULT_JE_EXECUTION_POLICY } from "../execution-types";

const BASE = {
  proposalId: "prop-1",
  proposalHash: "a".repeat(64),
  approvalId: "appr-1",
  approvalPolicyHash: "b".repeat(64),
  executionPolicyHash: "c".repeat(64),
  provider: "quickbooks",
  companyId: "co-1",
  accountingConnectionId: "conn-1",
  txnDate: "2026-03-31",
};

describe("JE-3A execution hashes", () => {
  it("39. execution policy hash deterministic", () => {
    const a = hashJeExecutionPolicy(DEFAULT_JE_EXECUTION_POLICY);
    const b = hashJeExecutionPolicy({ ...DEFAULT_JE_EXECUTION_POLICY });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("40. execution hash deterministic", () => {
    expect(hashJeExecution(BASE)).toBe(hashJeExecution({ ...BASE }));
  });

  it("41. proposal hash change changes execution hash", () => {
    expect(
      hashJeExecution({ ...BASE, proposalHash: "d".repeat(64) }),
    ).not.toBe(hashJeExecution(BASE));
  });

  it("42. approval change changes execution hash", () => {
    expect(hashJeExecution({ ...BASE, approvalId: "appr-2" })).not.toBe(
      hashJeExecution(BASE),
    );
  });

  it("43. execution policy change changes execution hash", () => {
    const h1 = hashJeExecutionPolicy(DEFAULT_JE_EXECUTION_POLICY);
    const h2 = hashJeExecutionPolicy({
      ...DEFAULT_JE_EXECUTION_POLICY,
      maxExecutionAmountCents: 1,
    });
    expect(h1).not.toBe(h2);
    expect(
      hashJeExecution({ ...BASE, executionPolicyHash: h2 }),
    ).not.toBe(hashJeExecution({ ...BASE, executionPolicyHash: h1 }));
  });

  it("44. connection change changes execution hash", () => {
    expect(
      hashJeExecution({ ...BASE, accountingConnectionId: "conn-2" }),
    ).not.toBe(hashJeExecution(BASE));
  });

  it("45. timestamps do not affect hash", () => {
    const canon = canonicalizeJeExecutionPolicy(DEFAULT_JE_EXECUTION_POLICY);
    expect(canon).not.toHaveProperty("requestedAt");
    expect(canon).not.toHaveProperty("actor");
    expect(canon).not.toHaveProperty("executionId");
  });

  it("46. same logical execution same idempotency key", () => {
    const a = hashJeExecutionIdempotencyKey(BASE);
    const b = hashJeExecutionIdempotencyKey({ ...BASE });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
});
