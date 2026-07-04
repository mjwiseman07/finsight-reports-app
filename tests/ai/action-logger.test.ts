import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeMockClient, type MockClientHandle } from "../events/_mock-supabase-events";

const state = vi.hoisted(() => ({ handle: null as unknown as MockClientHandle }));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => state.handle.client,
}));

import {
  logAiAction,
  sha256,
  summarize,
  type AiActionCategory,
  type ModelProvider,
} from "@/lib/ai/action-logger";

function okEvent() {
  return {
    data: {
      event_id: "evt-linked",
      event_sequence: 5,
      event_type: "ai.intake_ocr.executed",
      event_category: "ai_action",
      occurred_at: "2026-07-06T00:00:00.000Z",
      recorded_at: "2026-07-06T00:00:00.000Z",
    },
    error: null as { message: string } | null,
  };
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    firmClientId: "fc-1",
    actionType: "extract",
    actionCategory: "intake_ocr" as AiActionCategory,
    modelName: "claude-3-5-sonnet-20241022",
    modelProvider: "anthropic" as ModelProvider,
    input: { pdf: "s3://x/y.pdf" },
    output: { vendor: "ACME", amount: 100 },
    ...overrides,
  };
}

/** Queue the standard 2-write happy path: action insert + linked ledger event. */
function queueHappyPath(actionId = "act-1") {
  state.handle.queue("ai_action_log", { data: { action_id: actionId }, error: null });
  state.handle.queue("ledger_events", okEvent());
}

beforeEach(() => {
  state.handle = makeMockClient();
});

describe("sha256 / summarize helpers", () => {
  it("sha256 is deterministic and stable for objects", () => {
    expect(sha256({ a: 1 })).toBe(sha256({ a: 1 }));
    expect(sha256({ a: 1 })).toHaveLength(64);
    expect(sha256("x")).not.toBe(sha256("y"));
  });

  it("summarize passes through short values and truncates long ones", () => {
    expect(summarize("short")).toBe("short");
    const long = "a".repeat(1000);
    const s = summarize(long, 400);
    expect(s).toHaveLength(400);
    expect(s.endsWith("...")).toBe(true);
  });
});

describe("logAiAction", () => {
  it("returns actionId + eventId", async () => {
    queueHappyPath("act-99");
    const res = await logAiAction(baseInput());
    expect(res.actionId).toBe("act-99");
    expect(res.eventId).toBe("evt-linked");
  });

  it("hashes input and output onto the row", async () => {
    queueHappyPath();
    const input = { pdf: "s3://x/y.pdf" };
    const output = { vendor: "ACME", amount: 100 };
    await logAiAction(baseInput({ input, output }));
    const row = state.handle.firstArg("ai_action_log", "insert") as Record<string, unknown>;
    expect(row.input_hash).toBe(sha256(input));
    expect(row.output_hash).toBe(sha256(output));
  });

  it("derives summaries from input/output when not provided", async () => {
    queueHappyPath();
    await logAiAction(baseInput({ input: "hello", output: "world" }));
    const row = state.handle.firstArg("ai_action_log", "insert") as Record<string, unknown>;
    expect(row.input_summary).toBe("hello");
    expect(row.output_summary).toBe("world");
  });

  it("uses provided summaries when given", async () => {
    queueHappyPath();
    await logAiAction(baseInput({ inputSummary: "IN", outputSummary: "OUT" }));
    const row = state.handle.firstArg("ai_action_log", "insert") as Record<string, unknown>;
    expect(row.input_summary).toBe("IN");
    expect(row.output_summary).toBe("OUT");
  });

  it("publishes an ai_action ledger event with the right type/actor", async () => {
    queueHappyPath();
    await logAiAction(baseInput({ actionCategory: "cash_app_reasoning" }));
    const row = state.handle.firstArg("ledger_events", "insert") as Record<string, unknown>;
    expect(row.event_type).toBe("ai.cash_app_reasoning.executed");
    expect(row.event_category).toBe("ai_action");
    expect(row.actor_type).toBe("ai_agent");
    expect(row.actor_id).toBe("anthropic:claude-3-5-sonnet-20241022");
  });

  it("links the published event back onto the action row", async () => {
    queueHappyPath();
    await logAiAction(baseInput());
    const updateRow = state.handle.firstArg("ai_action_log", "update") as Record<string, unknown>;
    expect(updateRow.linked_event_id).toBe("evt-linked");
  });

  it("shares one correlation_id between the action row and the event", async () => {
    queueHappyPath();
    await logAiAction(baseInput());
    const actionRow = state.handle.firstArg("ai_action_log", "insert") as Record<string, unknown>;
    const eventRow = state.handle.firstArg("ledger_events", "insert") as Record<string, unknown>;
    expect(actionRow.correlation_id).toBe(eventRow.correlation_id);
  });

  it("passes through numeric telemetry fields", async () => {
    queueHappyPath();
    await logAiAction(
      baseInput({ confidence: 0.98, latencyMs: 1234, costUsd: 0.018, inputTokens: 400, outputTokens: 120, temperature: 0.2, seed: 7 }),
    );
    const row = state.handle.firstArg("ai_action_log", "insert") as Record<string, unknown>;
    expect(row.confidence).toBe(0.98);
    expect(row.latency_ms).toBe(1234);
    expect(row.cost_usd).toBe(0.018);
    expect(row.input_tokens).toBe(400);
    expect(row.output_tokens).toBe(120);
    expect(row.temperature).toBe(0.2);
    expect(row.seed).toBe(7);
  });

  it("throws when the action insert errors (before publishing)", async () => {
    state.handle.queue("ai_action_log", { data: null, error: { message: "insert failed" } });
    await expect(logAiAction(baseInput())).rejects.toThrow(/logAiAction insert failed: insert failed/);
    expect(state.handle.callsFor("ledger_events")).toHaveLength(0);
  });

  const categories: AiActionCategory[] = [
    "intake_ocr",
    "intake_classify",
    "cash_app_reasoning",
    "ar_dunning_draft",
    "assertion_reasoning",
    "je_proposal",
    "anomaly_reasoning",
    "recon_reasoning",
    "agent_close_walkthrough",
    "other",
  ];
  it.each(categories)("emits ai.%s.executed for category", async (cat) => {
    queueHappyPath();
    await logAiAction(baseInput({ actionCategory: cat }));
    const row = state.handle.firstArg("ledger_events", "insert") as Record<string, unknown>;
    expect(row.event_type).toBe(`ai.${cat}.executed`);
  });

  const providers: ModelProvider[] = ["anthropic", "openai", "google", "aws_bedrock", "local"];
  it.each(providers)("prefixes actor_id with provider '%s'", async (prov) => {
    queueHappyPath();
    await logAiAction(baseInput({ modelProvider: prov, modelName: "m1" }));
    const row = state.handle.firstArg("ledger_events", "insert") as Record<string, unknown>;
    expect(row.actor_id).toBe(`${prov}:m1`);
  });
});
