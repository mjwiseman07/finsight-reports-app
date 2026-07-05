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
const ENG = "eng1";

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

function seedEngagement() {
  mock.__seed("firm_clients", [{ id: FC, industry_vertical: "general", firm_id: "firm1" }]);
  mock.__seed("engagements", [{ id: ENG, firm_id: "firm1", status: "active", engagement_name: "Eng" }]);
  mock.__seed("portcos", [{ engagement_id: ENG, firm_client_id: FC, created_at: "2026-01-01" }]);
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
  seedEngagement();
  seedMatrix();
});

describe("runProjectionWorker gap sync", () => {
  it("calls syncGapReviewItems and returns sync counts in WorkerResult", async () => {
    const result = await runProjectionWorker(FC, CP);
    expect(result.gapItemsOpened).toBeGreaterThan(0);
    expect(result.gapItemsRefreshed).toBe(0);
    expect(mock.__state.close_gap_review_items.length).toBe(result.gapsDetected);
  });

  it("emits gap_review_items_synced event", async () => {
    const result = await runProjectionWorker(FC, CP);
    const evt = mock.__state.close_assertion_coverage_events.find(
      (e) => e.event_type === "gap_review_items_synced" && e.worker_run_id === result.workerRunId,
    );
    expect(evt).toBeDefined();
    expect(evt?.payload).toMatchObject({
      opened: expect.any(Number),
      refreshed: expect.any(Number),
      auto_closed_stale: expect.any(Number),
      reopened: expect.any(Number),
    });
  });

  it("second run with same gaps refreshes (not duplicates) via UPSERT", async () => {
    const first = await runProjectionWorker(FC, CP);
    const countAfterFirst = mock.__state.close_gap_review_items.length;
    const second = await runProjectionWorker(FC, CP);
    expect(mock.__state.close_gap_review_items.length).toBe(countAfterFirst);
    expect(second.gapItemsOpened).toBe(0);
    expect(second.gapItemsRefreshed).toBeGreaterThan(0);
    expect(first.gapItemsOpened).toBeGreaterThan(0);
  });

  it("rule is added mid-period → gap auto-closes on next run", async () => {
    await runProjectionWorker(FC, CP);
    const openGap = mock.__state.close_gap_review_items.find(
      (g) => g.account_category === "cash" && g.assertion_id === "accuracy",
    );
    expect(openGap?.resolution_status).toBe("open");

    mock.__seed("rule_assertion_coverage", [
      {
        rule_id: "gen.je_balance_check",
        assertion_id: "accuracy",
        coverage_strength: "primary",
        account_categories: ["cash"],
      },
    ]);
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

    const second = await runProjectionWorker(FC, CP);
    expect(second.gapItemsAutoClosedStale).toBeGreaterThan(0);
    const stale = mock.__state.close_gap_review_items.find((g) => g.id === openGap?.id);
    expect(stale?.resolution_status).toBe("resolved_stale");
  });

  it("reasoner-updated recommendation propagates onto the gap item on next run", async () => {
    mock.__state.advisacor_flags = [
      { flag_key: "assertions_gap_reasoning_enabled", flag_value: true },
      { flag_key: "assertions_projection_worker_enabled", flag_value: true },
    ];
    mock.__seed("rule_assertion_coverage", [
      {
        rule_id: "gen.je_balance_check",
        assertion_id: "accuracy",
        coverage_strength: "primary",
        account_categories: ["cash"],
      },
    ]);
    invokeMock.mockResolvedValue({
      text: JSON.stringify({
        root_cause_code: "rule_defined_but_not_fired",
        recommendation: "Add rule X",
        reasoning: "ISA 315.",
      }),
      inputTokens: 1,
      outputTokens: 1,
      latencyMs: 1,
      provider: "bedrock",
      modelId: "sonnet",
    });
    const result = await runProjectionWorker(FC, CP);
    expect(result.reasonerEnabled).toBe(true);
    expect(result.reasonerSucceeded).toBeGreaterThan(0);
    const covGap = mock.__state.close_assertion_coverage.find(
      (r) => r.coverage_status === "gap" && r.gap_recommendation,
    );
    expect(covGap?.gap_recommendation).toBe("Add rule X");
    const gapItem = mock.__state.close_gap_review_items.find(
      (g) =>
        g.account_category === covGap?.account_category &&
        g.assertion_id === covGap?.assertion_id,
    );
    expect(gapItem?.gap_recommendation).toBe("Add rule X");
  });

  it("sync failures propagate (no silent swallow)", async () => {
    const savedFrom = mock.from;
    mock.from = vi.fn((table: string) => {
      if (table === "close_gap_review_items") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: null, error: { message: "boom" } }),
            }),
          }),
        };
      }
      return (savedFrom as (table: string) => object)(table);
    }) as typeof mock.from;
    try {
      await expect(runProjectionWorker(FC, CP)).rejects.toThrow();
    } finally {
      mock.from = savedFrom;
    }
  });
});
