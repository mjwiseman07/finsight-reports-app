import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCOUNT_CATEGORIES,
  ASSERTION_IDS,
} from "@/lib/pre-close/assertions-types";
import { makeMockDb } from "../pre-close/_mock-db";

const mock = makeMockDb();
const invokeMock = vi.hoisted(() => vi.fn());
const logMock = vi.hoisted(() => vi.fn());
const publishMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => mock,
}));
vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => mock,
}));
vi.mock("@/lib/llm/anthropic-driver", () => ({
  invokeClaude: invokeMock,
}));
vi.mock("@/lib/ai/action-logger", () => ({
  logAiAction: logMock,
  sha256: (v: unknown) => String(v),
  summarize: (v: unknown) => String(v),
}));
vi.mock("@/lib/events/publisher", () => ({
  publishEvent: publishMock,
}));

import { runProjectionWorker } from "@/lib/assertions/projection-worker";

const FC = "fc1";
const CP = "cp1";

function seedMatrix() {
  const rows = ACCOUNT_CATEGORIES.flatMap((account_category) =>
    ASSERTION_IDS.map((assertion_id) => ({
      account_category,
      assertion_id,
      relevance: "relevant",
    })),
  );
  mock.__seed("assertion_relevance_matrix", rows);
}

function seedCoverage() {
  mock.__seed("rule_assertion_coverage", [
    {
      rule_id: "gen.je_balance_check",
      assertion_id: "accuracy",
      coverage_strength: "primary",
      account_categories: ["cash"],
    },
  ]);
}

beforeEach(() => {
  mock.__reset();
  invokeMock.mockReset();
  logMock.mockReset();
  publishMock.mockReset();
  publishMock.mockResolvedValue({ eventId: "evt-1" });
  logMock.mockResolvedValue({ actionId: "act-1", eventId: "evt-1" });
  mock.__seed("advisacor_flags", [
    { flag_key: "assertions_gap_reasoning_enabled", flag_value: false },
    { flag_key: "assertions_projection_worker_enabled", flag_value: true },
  ]);
  mock.__seed("firm_clients", [{ id: FC, industry_vertical: "general" }]);
  seedMatrix();
});

describe("runProjectionWorker", () => {
  it("writes 144 rows end-to-end", async () => {
    const result = await runProjectionWorker(FC, CP);
    expect(result.rowsWritten).toBe(144);
    expect(mock.__state.close_assertion_coverage).toHaveLength(144);
  });

  it("rerun is idempotent on row count", async () => {
    await runProjectionWorker(FC, CP);
    const second = await runProjectionWorker(FC, CP);
    expect(second.rowsWritten).toBe(144);
    expect(mock.__state.close_assertion_coverage).toHaveLength(144);
  });

  it("emits projection_started and projection_completed", async () => {
    const result = await runProjectionWorker(FC, CP);
    const types = mock.__state.close_assertion_coverage_events
      .filter((e) => e.worker_run_id === result.workerRunId)
      .map((e) => e.event_type);
    expect(types).toContain("projection_started");
    expect(types).toContain("projection_completed");
  });

  it("emits gap_detected per gap", async () => {
    const result = await runProjectionWorker(FC, CP);
    const gapEvents = mock.__state.close_assertion_coverage_events.filter(
      (e) => e.event_type === "gap_detected" && e.worker_run_id === result.workerRunId,
    );
    expect(gapEvents.length).toBe(result.gapsDetected);
    expect(gapEvents.length).toBeGreaterThan(0);
  });

  it("emits gap_reasoner_skipped_flag_off when reasoner disabled", async () => {
    const result = await runProjectionWorker(FC, CP);
    const skip = mock.__state.close_assertion_coverage_events.find(
      (e) => e.event_type === "gap_reasoner_skipped_flag_off" && e.worker_run_id === result.workerRunId,
    );
    expect(skip).toBeDefined();
    expect(result.reasonerEnabled).toBe(false);
  });

  it("correlation_id threads through all events", async () => {
    const result = await runProjectionWorker(FC, CP);
    const events = mock.__state.close_assertion_coverage_events.filter(
      (e) => e.worker_run_id === result.workerRunId,
    );
    expect(events.every((e) => e.correlation_id === result.workerRunId)).toBe(true);
  });

  it("throws when assertions_projection_worker_enabled=false", async () => {
    mock.__state.advisacor_flags = [
      { flag_key: "assertions_projection_worker_enabled", flag_value: false },
    ];
    await expect(runProjectionWorker(FC, CP)).rejects.toThrow("refusing to run");
  });

  it("fire outcome error → gap with rule_errored", async () => {
    seedCoverage();
    mock.__seed("curated_rule_fires", [
      { fire_id: "fire-1", rule_id: "gen.je_balance_check", outcome: "error" },
    ]);
    mock.__seed("pre_close_review_items", [
      {
        fire_id: "fire-1",
        rule_id: "gen.je_balance_check",
        firm_client_id: FC,
        close_period_id: CP,
      },
    ]);
    await runProjectionWorker(FC, CP);
    const row = mock.__state.close_assertion_coverage.find(
      (r) => r.account_category === "cash" && r.assertion_id === "accuracy",
    );
    expect(row?.coverage_status).toBe("gap");
    expect(row?.gap_root_cause_code).toBe("rule_errored");
  });

  it("suppressed without fired → gap with rule_fired_but_all_suppressed", async () => {
    seedCoverage();
    mock.__seed("curated_rule_fires", [
      { fire_id: "fire-1", rule_id: "gen.je_balance_check", outcome: "suppressed" },
    ]);
    mock.__seed("pre_close_review_items", [
      {
        fire_id: "fire-1",
        rule_id: "gen.je_balance_check",
        firm_client_id: FC,
        close_period_id: CP,
      },
    ]);
    await runProjectionWorker(FC, CP);
    const row = mock.__state.close_assertion_coverage.find(
      (r) => r.account_category === "cash" && r.assertion_id === "accuracy",
    );
    expect(row?.coverage_status).toBe("gap");
    expect(row?.gap_root_cause_code).toBe("rule_fired_but_all_suppressed");
  });

  it("primary fired → tested row", async () => {
    seedCoverage();
    mock.__seed("curated_rule_fires", [
      { fire_id: "fire-1", rule_id: "gen.je_balance_check", outcome: "fired" },
    ]);
    mock.__seed("pre_close_review_items", [
      {
        fire_id: "fire-1",
        rule_id: "gen.je_balance_check",
        firm_client_id: FC,
        close_period_id: CP,
      },
    ]);
    await runProjectionWorker(FC, CP);
    const row = mock.__state.close_assertion_coverage.find(
      (r) => r.account_category === "cash" && r.assertion_id === "accuracy",
    );
    expect(row?.coverage_status).toBe("tested");
  });

  it("reasoner on writes gap_recommendation and gap_reasoning_action_id", async () => {
    mock.__state.advisacor_flags = [
      { flag_key: "assertions_gap_reasoning_enabled", flag_value: true },
      { flag_key: "assertions_projection_worker_enabled", flag_value: true },
    ];
    seedCoverage();
    invokeMock.mockResolvedValue({
      text: JSON.stringify({
        root_cause_code: "rule_defined_but_not_fired",
        recommendation: "Run the rule.",
        reasoning: "ISA 330.",
      }),
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 1,
      provider: "bedrock",
      modelId: "sonnet",
    });
    await runProjectionWorker(FC, CP);
    const gapRow = mock.__state.close_assertion_coverage.find((r) => r.coverage_status === "gap");
    expect(gapRow?.gap_recommendation).toBe("Run the rule.");
    expect(gapRow?.gap_reasoning_action_id).toBe("act-1");
  });

  it("reasoner on emits gap_reasoner_completed events", async () => {
    mock.__state.advisacor_flags = [
      { flag_key: "assertions_gap_reasoning_enabled", flag_value: true },
      { flag_key: "assertions_projection_worker_enabled", flag_value: true },
    ];
    invokeMock.mockResolvedValue({
      text: JSON.stringify({
        root_cause_code: "no_rule_defined",
        recommendation: "Add rule.",
        reasoning: "PCAOB QC 1000.",
      }),
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 1,
      provider: "bedrock",
      modelId: "sonnet",
    });
    const result = await runProjectionWorker(FC, CP);
    const completed = mock.__state.close_assertion_coverage_events.some(
      (e) => e.event_type === "gap_reasoner_completed" && e.worker_run_id === result.workerRunId,
    );
    expect(completed).toBe(true);
    expect(result.reasonerSucceeded).toBeGreaterThan(0);
  });

  it("returns WorkerResult summary shape", async () => {
    const result = await runProjectionWorker(FC, CP);
    expect(result.firmClientId).toBe(FC);
    expect(result.closePeriodId).toBe(CP);
    expect(result.summary.totalPairs).toBe(144);
  });

  it("stores computed_by_worker_run_id on rows", async () => {
    const result = await runProjectionWorker(FC, CP);
    expect(
      mock.__state.close_assertion_coverage.every(
        (r) => r.computed_by_worker_run_id === result.workerRunId,
      ),
    ).toBe(true);
  });
});
