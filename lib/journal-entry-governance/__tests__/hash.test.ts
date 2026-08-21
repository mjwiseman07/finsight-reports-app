import { describe, expect, it } from "vitest";
import {
  canonicalizeJeProposal,
  hashJeProposal,
  hashJeProposalIdempotencyKey,
  hashJeProposalPolicy,
} from "../proposal-hash";
import { DEFAULT_JE_PROPOSAL_POLICY, type JeProposalLine } from "../types";

const lines: JeProposalLine[] = [
  {
    sequence: 1,
    accountId: "exp-1",
    debitCents: 1000,
    creditCents: 0,
    description: "accrual",
  },
  {
    sequence: 2,
    accountId: "liab-1",
    debitCents: 0,
    creditCents: 1000,
    description: null,
  },
];

const base = {
  companyId: "co-1",
  engagementId: "eng-1",
  firmClientId: "fc-1",
  periodEnd: "2026-07-31",
  sourceContinuousCloseRunId: "cc-1",
  sourceAccountingSyncId: "sync-1",
  sourceReconRunIds: ["run-ar", "run-ap"],
  originType: "ACCRUAL" as const,
  reasonCode: "cutoff",
  memo: "July accrual",
  currency: "USD",
  txnDate: "2026-07-31",
  lines,
  totalDebitsCents: 1000,
  totalCreditsCents: 1000,
  expectedEffects: [
    {
      type: "RESIDUAL_DELTA" as const,
      reconKind: "ar_aging",
      expectedDeltaCents: -1000,
    },
  ],
  policyHash: "a".repeat(64),
};

describe("JE proposal hashes", () => {
  it("policy hash is deterministic", () => {
    expect(hashJeProposalPolicy(DEFAULT_JE_PROPOSAL_POLICY)).toBe(
      hashJeProposalPolicy(DEFAULT_JE_PROPOSAL_POLICY),
    );
  });

  it("policy change changes hash", () => {
    const a = hashJeProposalPolicy(DEFAULT_JE_PROPOSAL_POLICY);
    const b = hashJeProposalPolicy({
      ...DEFAULT_JE_PROPOSAL_POLICY,
      maxProposalAmountCents: 1,
    });
    expect(a).not.toBe(b);
  });

  it("proposal hash is deterministic", () => {
    expect(hashJeProposal(base)).toBe(hashJeProposal({ ...base }));
  });

  it("proposalId / proposedAt are not in canonical body", () => {
    const canonical = canonicalizeJeProposal(base);
    expect(canonical).not.toHaveProperty("proposalId");
    expect(canonical).not.toHaveProperty("id");
    expect(canonical).not.toHaveProperty("proposedAt");
    expect(canonical).not.toHaveProperty("proposedBy");
  });

  it("line amount change changes hash", () => {
    expect(
      hashJeProposal({
        ...base,
        lines: [
          { ...lines[0], debitCents: 2000 },
          { ...lines[1], creditCents: 2000 },
        ],
        totalDebitsCents: 2000,
        totalCreditsCents: 2000,
      }),
    ).not.toBe(hashJeProposal(base));
  });

  it("account change changes hash", () => {
    expect(
      hashJeProposal({
        ...base,
        lines: [{ ...lines[0], accountId: "exp-2" }, lines[1]],
      }),
    ).not.toBe(hashJeProposal(base));
  });

  it("txnDate change changes hash", () => {
    expect(hashJeProposal({ ...base, txnDate: "2026-07-30" })).not.toBe(
      hashJeProposal(base),
    );
  });

  it("memo change changes hash", () => {
    expect(hashJeProposal({ ...base, memo: "other" })).not.toBe(hashJeProposal(base));
  });

  it("expected effect change changes hash", () => {
    expect(
      hashJeProposal({
        ...base,
        expectedEffects: [
          { type: "CC_EXCEPTION_CLEAR", exceptionCode: "X" },
        ],
      }),
    ).not.toBe(hashJeProposal(base));
  });

  it("source CC change changes hash", () => {
    expect(
      hashJeProposal({ ...base, sourceContinuousCloseRunId: "cc-2" }),
    ).not.toBe(hashJeProposal(base));
  });

  it("source recon change changes hash", () => {
    expect(
      hashJeProposal({ ...base, sourceReconRunIds: ["run-inv"] }),
    ).not.toBe(hashJeProposal(base));
  });

  it("policyHash change changes proposal hash", () => {
    expect(hashJeProposal({ ...base, policyHash: "b".repeat(64) })).not.toBe(
      hashJeProposal(base),
    );
  });

  it("idempotency key is deterministic for same company/engagement/cc/proposalHash", () => {
    const key = {
      companyId: "co-1",
      engagementId: "eng-1",
      sourceContinuousCloseRunId: "cc-1",
      proposalHash: hashJeProposal(base),
    };
    expect(hashJeProposalIdempotencyKey(key)).toBe(hashJeProposalIdempotencyKey({ ...key }));
  });

  it("sorts recon ids in canonical form", () => {
    const a = canonicalizeJeProposal({
      ...base,
      sourceReconRunIds: ["run-b", "run-a"],
    });
    expect(a.sourceReconRunIds).toEqual(["run-a", "run-b"]);
  });
});
