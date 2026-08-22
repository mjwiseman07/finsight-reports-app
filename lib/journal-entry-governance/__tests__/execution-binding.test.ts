import { describe, expect, it } from "vitest";
import {
  assertExactExecutionBindingMatch,
  assertProviderRequestHashAligned,
  extractJeExecutionImmutableBinding,
  jeExecutionBindingsEqual,
} from "../execution-binding";
import { JE_EXECUTION_ERROR } from "../execution-types";

const base = {
  proposal_id: "prop-1",
  approval_id: "appr-1",
  company_id: "co-1",
  engagement_id: "eng-1",
  source_continuous_close_run_id: "cc-1",
  source_accounting_sync_id: "sync-1",
  accounting_connection_id: "conn-1",
  provider: "quickbooks",
  proposal_hash: "a".repeat(64),
  approval_policy_hash: "b".repeat(64),
  execution_policy_hash: "c".repeat(64),
  execution_hash: "d".repeat(64),
  idempotency_key: "e".repeat(64),
};

describe("JE-3A immutable execution binding", () => {
  it("exact binding equality", () => {
    const a = extractJeExecutionImmutableBinding(base as never);
    const b = extractJeExecutionImmutableBinding({ ...base } as never);
    expect(jeExecutionBindingsEqual(a, b)).toBe(true);
  });

  it("policy / connection / hash divergence is conflict", () => {
    const existing = extractJeExecutionImmutableBinding(base as never);
    expect(() =>
      assertExactExecutionBindingMatch({
        existing,
        requested: extractJeExecutionImmutableBinding({
          ...base,
          execution_policy_hash: "f".repeat(64),
        } as never),
      }),
    ).toThrowError(/different immutable binding/);

    try {
      assertExactExecutionBindingMatch({
        existing,
        requested: extractJeExecutionImmutableBinding({
          ...base,
          accounting_connection_id: "conn-2",
        } as never),
      });
      expect.fail("expected conflict");
    } catch (err) {
      expect((err as { code?: string }).code).toBe(
        JE_EXECUTION_ERROR.BINDING_CONFLICT,
      );
    }
  });

  it("provider_request_hash mismatch fails closed", () => {
    expect(() =>
      assertProviderRequestHashAligned({
        existingHash: "a".repeat(64),
        reconstructedHash: "b".repeat(64),
      }),
    ).toThrow(/provider_request_hash/);
  });

  it("missing provider_request_hash skips hash alignment", () => {
    expect(() =>
      assertProviderRequestHashAligned({
        existingHash: null,
        reconstructedHash: "a".repeat(64),
      }),
    ).not.toThrow();
  });
});
