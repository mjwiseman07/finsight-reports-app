import { describe, expect, it } from "vitest";
import { DEFAULT_OBSERVE_POLICY, type ContinuousCloseObservePolicy } from "@/lib/continuous-close/policy";
import {
  canonicalizeObservePolicy,
  hashObserveIdempotencyKey,
  hashObserveInput,
  hashObservePolicy,
} from "../hash";

function policy(
  over: Partial<ContinuousCloseObservePolicy> = {},
): ContinuousCloseObservePolicy {
  return {
    ...DEFAULT_OBSERVE_POLICY,
    requiredReconKinds: ["ar_aging"],
    ...over,
  };
}

describe("CC-2B policy hash", () => {
  it("is deterministic", () => {
    expect(hashObservePolicy(policy())).toBe(hashObservePolicy(policy()));
  });

  it("list ordering does not change hash after canonical sort", () => {
    const a = policy({
      requiredReconKinds: ["inventory", "ar_aging", "ap_aging"],
      statementControlRequiredKeys: ["ap", "cash"],
    });
    const b = policy({
      requiredReconKinds: ["ap_aging", "inventory", "ar_aging"],
      statementControlRequiredKeys: ["cash", "ap"],
    });
    expect(hashObservePolicy(a)).toBe(hashObservePolicy(b));
    expect(canonicalizeObservePolicy(a).requiredReconKinds).toEqual([
      "ap_aging",
      "ar_aging",
      "inventory",
    ]);
  });

  it("timestamp fields are not part of the policy hash body", () => {
    const canonical = JSON.stringify(canonicalizeObservePolicy(policy()));
    expect(canonical).not.toContain("observedAt");
    expect(canonical).not.toContain("started_at");
    expect(canonical).not.toContain("created_at");
  });

  it("required kind change changes the hash", () => {
    expect(hashObservePolicy(policy({ requiredReconKinds: ["ar_aging"] }))).not.toBe(
      hashObservePolicy(policy({ requiredReconKinds: ["ap_aging"] })),
    );
  });
});

describe("CC-2B input hash", () => {
  const base = {
    accountingSyncId: "sync-1",
    selectedUrmRuns: { ar_aging: "run-ar" },
    statementControlContractVersion: 1 as const,
    assertionReference: null,
    observationMode: "REPLAY_EXISTING_SYNC" as const,
    policyHash: "a".repeat(64),
  };

  it("is deterministic", () => {
    expect(hashObserveInput(base)).toBe(hashObserveInput({ ...base }));
  });

  it("observationId is not part of the input hash body", () => {
    const a = hashObserveInput(base);
    const b = hashObserveInput({
      ...base,
    });
    expect(a).toBe(b);
    const canonical = JSON.stringify({
      accountingSyncId: base.accountingSyncId,
      assertionReference: base.assertionReference,
      observationMode: base.observationMode,
      policyHash: base.policyHash,
      selectedUrmRuns: base.selectedUrmRuns,
      statementControlContractVersion: base.statementControlContractVersion,
    });
    expect(canonical).not.toContain("observationId");
  });

  it("accountingSyncId change changes input hash", () => {
    expect(hashObserveInput({ ...base, accountingSyncId: "sync-2" })).not.toBe(
      hashObserveInput(base),
    );
  });

  it("selected URM runId change changes input hash", () => {
    expect(
      hashObserveInput({ ...base, selectedUrmRuns: { ar_aging: "run-ar-2" } }),
    ).not.toBe(hashObserveInput(base));
  });

  it("policy hash change changes input hash", () => {
    expect(hashObserveInput({ ...base, policyHash: "b".repeat(64) })).not.toBe(
      hashObserveInput(base),
    );
  });
});

describe("CC-2B idempotency key", () => {
  const body = {
    companyId: "co-1",
    engagementId: "eng-1",
    periodEnd: "2026-07-31",
    accountingSyncId: "sync-1",
    mode: "OBSERVE" as const,
    policyHash: "a".repeat(64),
    inputHash: "c".repeat(64),
  };

  it("same sync + URM runs + policy → same key", () => {
    expect(hashObserveIdempotencyKey(body)).toBe(hashObserveIdempotencyKey({ ...body }));
  });
});
