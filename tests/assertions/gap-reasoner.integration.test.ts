import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockDb } from "../pre-close/_mock-db";

const mock = makeMockDb();
const invokeMock = vi.hoisted(() => vi.fn());
const logMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => mock,
}));
vi.mock("@/lib/llm/anthropic-driver", () => ({
  invokeClaude: invokeMock,
}));
vi.mock("@/lib/ai/action-logger", () => ({
  logAiAction: logMock,
}));

import { reasonGaps } from "@/lib/assertions/gap-reasoner";
import type { DetectedGap } from "@/lib/assertions/gap-detector";

const gap: DetectedGap = {
  account_category: "cash",
  assertion_id: "accuracy",
  root_cause_code: "no_rule_defined",
};

const ctx = {
  firmClientId: "fc1",
  closePeriodId: "cp1",
  workerRunId: "wr1",
  industryVertical: "general",
};

beforeEach(() => {
  mock.__reset();
  invokeMock.mockReset();
  logMock.mockReset();
  logMock.mockResolvedValue({ actionId: "act-1", eventId: "evt-1" });
});

describe("reasonGaps", () => {
  it("flag off returns enabled false without calling LLM", async () => {
    mock.__seed("advisacor_flags", [
      { flag_key: "assertions_gap_reasoning_enabled", flag_value: false },
    ]);
    invokeMock.mockImplementation(() => {
      throw new Error("should not call LLM");
    });
    const out = await reasonGaps([gap], ctx);
    expect(out.enabled).toBe(false);
    expect(out.results).toEqual([]);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("flag on + valid JSON returns parsed result and logs action", async () => {
    mock.__seed("advisacor_flags", [
      { flag_key: "assertions_gap_reasoning_enabled", flag_value: true },
    ]);
    invokeMock.mockResolvedValue({
      text: JSON.stringify({
        root_cause_code: "no_rule_defined",
        recommendation: "Add a primary rule.",
        reasoning: "ISA 315 requires coverage.",
      }),
      inputTokens: 10,
      outputTokens: 20,
      latencyMs: 100,
      provider: "bedrock",
      modelId: "sonnet",
    });
    const out = await reasonGaps([gap], ctx);
    expect(out.enabled).toBe(true);
    expect(out.results).toHaveLength(1);
    expect(out.results[0].result?.root_cause_code).toBe("no_rule_defined");
    expect(out.results[0].result?.action_id).toBe("act-1");
    expect(logMock).toHaveBeenCalledOnce();
  });

  it("flag on + invalid JSON captures error without outer throw", async () => {
    mock.__seed("advisacor_flags", [
      { flag_key: "assertions_gap_reasoning_enabled", flag_value: true },
    ]);
    invokeMock.mockResolvedValue({
      text: "not json",
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 1,
      provider: "bedrock",
      modelId: "sonnet",
    });
    const out = await reasonGaps([gap], ctx);
    expect(out.results[0].error).toContain("non-JSON");
  });

  it("flag on + invalid root_cause_code captures error", async () => {
    mock.__seed("advisacor_flags", [
      { flag_key: "assertions_gap_reasoning_enabled", flag_value: true },
    ]);
    invokeMock.mockResolvedValue({
      text: JSON.stringify({
        root_cause_code: "bogus_code",
        recommendation: "x",
        reasoning: "y",
      }),
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 1,
      provider: "bedrock",
      modelId: "sonnet",
    });
    const out = await reasonGaps([gap], ctx);
    expect(out.results[0].error).toContain("invalid root_cause_code");
  });

  it("each gap gets its own reasoner call", async () => {
    mock.__seed("advisacor_flags", [
      { flag_key: "assertions_gap_reasoning_enabled", flag_value: true },
    ]);
    invokeMock.mockResolvedValue({
      text: JSON.stringify({
        root_cause_code: "no_rule_defined",
        recommendation: "r",
        reasoning: "x",
      }),
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 1,
      provider: "bedrock",
      modelId: "sonnet",
    });
    const gaps: DetectedGap[] = [
      gap,
      { account_category: "revenue", assertion_id: "completeness", root_cause_code: "rule_errored" },
    ];
    const out = await reasonGaps(gaps, ctx);
    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(out.results).toHaveLength(2);
  });

  it("missing flag row defaults to disabled", async () => {
    const out = await reasonGaps([gap], ctx);
    expect(out.enabled).toBe(false);
  });

  it("uses aws_bedrock provider in logAiAction for bedrock path", async () => {
    mock.__seed("advisacor_flags", [
      { flag_key: "assertions_gap_reasoning_enabled", flag_value: true },
    ]);
    invokeMock.mockResolvedValue({
      text: JSON.stringify({
        root_cause_code: "no_rule_defined",
        recommendation: "r",
        reasoning: "x",
      }),
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 1,
      provider: "bedrock",
      modelId: "sonnet",
    });
    await reasonGaps([gap], ctx);
    expect(logMock.mock.calls[0][0].modelProvider).toBe("aws_bedrock");
  });

  it("partial failure on second gap still returns first result", async () => {
    mock.__seed("advisacor_flags", [
      { flag_key: "assertions_gap_reasoning_enabled", flag_value: true },
    ]);
    invokeMock
      .mockResolvedValueOnce({
        text: JSON.stringify({
          root_cause_code: "no_rule_defined",
          recommendation: "r",
          reasoning: "x",
        }),
        inputTokens: 1,
        outputTokens: 1,
        latencyMs: 1,
        provider: "bedrock",
        modelId: "sonnet",
      })
      .mockResolvedValueOnce({ text: "bad", inputTokens: 1, outputTokens: 1, latencyMs: 1, provider: "bedrock", modelId: "sonnet" });
    const out = await reasonGaps(
      [gap, { account_category: "revenue", assertion_id: "completeness", root_cause_code: "rule_errored" }],
      ctx,
    );
    expect(out.results[0].result).toBeDefined();
    expect(out.results[1].error).toBeDefined();
  });
});
