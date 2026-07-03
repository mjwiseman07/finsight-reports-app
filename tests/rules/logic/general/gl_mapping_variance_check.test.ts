import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { evaluate } from "@/lib/rules/logic/general/gl_mapping_variance_check";
import type { RuleContext } from "@/lib/rules/vertical-types";

const memMock = vi.mocked(queryMemory as (...a: unknown[]) => Promise<unknown[]>);

function ctx(inputs: Record<string, unknown> = { vendorId: "v1", actualGLAccountId: "42" }): RuleContext {
  return {
    firmClientId: "client-1",
    companyId: "co-1",
    industryVertical: "general",
    accountingMethod: "accrual",
    targetType: "transaction",
    targetRef: "txn-1",
    inputs,
    inputsHash: "h",
    qbo: null,
  };
}

// Real vendor_gl_mapping payload shape: { vendor_id, account_id, sample_count, ... }
function memRecord(accountId: string, sampleCount: number, confidence = 0.9) {
  return {
    memory_id: `mem-${accountId}`,
    payload: { vendor_id: "v1", account_id: accountId, sample_count: sampleCount },
    confidence_score: confidence,
  };
}

describe("gen.gl_mapping_variance_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("suppresses no_learned_pattern when vendor has no records", async () => {
    memMock.mockResolvedValue([]);
    const res = await evaluate(ctx());
    expect(res.outcome).toBe("suppressed");
    expect(res.reason_code).toBe("no_learned_pattern");
  });

  it("suppresses insufficient_history when sample_count < 3", async () => {
    memMock.mockResolvedValue([memRecord("42", 1)]);
    const res = await evaluate(ctx());
    expect(res.outcome).toBe("suppressed");
    expect(res.reason_code).toBe("insufficient_history");
  });

  it("suppresses mapping_matches when learned GL equals actual", async () => {
    memMock.mockResolvedValue([memRecord("42", 5)]);
    const res = await evaluate(ctx({ vendorId: "v1", actualGLAccountId: "42" }));
    expect(res.outcome).toBe("suppressed");
    expect(res.reason_code).toBe("mapping_matches");
  });

  it("fires gl_mapping_variance when learned GL differs from actual", async () => {
    memMock.mockResolvedValue([memRecord("42", 5)]);
    const res = await evaluate(ctx({ vendorId: "v1", actualGLAccountId: "60" }));
    expect(res.fired).toBe(true);
    expect(res.outcome).toBe("fired");
    expect(res.reason_code).toBe("gl_mapping_variance");
    expect(res.reason_detail.learnedGL).toBe("42");
  });

  it("suppresses missing_inputs when vendorId absent", async () => {
    const res = await evaluate(ctx({ actualGLAccountId: "42" }));
    expect(res.outcome).toBe("suppressed");
    expect(res.reason_code).toBe("missing_inputs");
    expect(memMock).not.toHaveBeenCalled();
  });

  it("returns error memory_query_failed when queryMemory throws", async () => {
    memMock.mockRejectedValue(new Error("db down"));
    const res = await evaluate(ctx());
    expect(res.outcome).toBe("error");
    expect(res.reason_code).toBe("memory_query_failed");
  });
});
