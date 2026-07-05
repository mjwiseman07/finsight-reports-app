import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCOUNT_CATEGORIES,
  ASSERTION_IDS,
} from "@/lib/pre-close/assertions-types";
import { makeMockDb } from "../pre-close/_mock-db";

const mock = makeMockDb();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin: () => mock }));
vi.mock("@/lib/llm/anthropic-driver", () => ({ invokeClaude: vi.fn() }));
vi.mock("@/lib/ai/action-logger", () => ({
  logAiAction: vi.fn(),
  sha256: (v: unknown) => String(v),
  summarize: (v: unknown) => String(v),
}));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: vi.fn().mockResolvedValue({ eventId: "e1" }) }));

import { runProjectionWorker } from "@/lib/assertions/projection-worker";

const FC = "fc1";
const CP = "cp1";

function seedBase() {
  const rows = ACCOUNT_CATEGORIES.flatMap((account_category) =>
    ASSERTION_IDS.map((assertion_id) => ({
      account_category,
      assertion_id,
      relevance: "relevant",
    })),
  );
  mock.__seed("assertion_relevance_matrix", rows);
  mock.__seed("firm_clients", [{ id: FC, industry_vertical: "general", firm_id: "firm1" }]);
  mock.__seed("engagements", [{ id: "eng1", firm_id: "firm1", status: "active", engagement_name: "Eng" }]);
  mock.__seed("portcos", [{ engagement_id: "eng1", firm_client_id: FC, created_at: "2026-01-01" }]);
  mock.__seed("advisacor_flags", [
    { flag_key: "assertions_gap_reasoning_enabled", flag_value: false },
    { flag_key: "assertions_projection_worker_enabled", flag_value: true },
  ]);
}

beforeEach(() => {
  mock.__reset();
  seedBase();
});

describe("runProjectionWorker with manual tests", () => {
  it("populates covering_manual_test_ids and manual_test_ref", async () => {
    mock.__seed("manual_test_evidence", [
      {
        id: "mt1",
        firm_client_id: FC,
        close_period_id: CP,
        account_category: "cash",
        assertion_id: "accuracy",
        evidence_type: "bank_statement",
        data_source_reliability_basis: "AS 1105 .10A",
      },
    ]);
    mock.__seed("rule_assertion_coverage", [
      {
        rule_id: "gen.je_balance_check",
        assertion_id: "accuracy",
        coverage_strength: "secondary",
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

    await runProjectionWorker(FC, CP);
    const row = mock.__state.close_assertion_coverage.find(
      (r) => r.account_category === "cash" && r.assertion_id === "accuracy",
    );
    expect(row?.covering_manual_test_ids).toEqual(["mt1"]);
    expect(row?.manual_test_ref).toBe("1 manual test");
    expect(row?.evidence_strength).toBe("strong");
  });

  it("manual-only coverage marks pair tested", async () => {
    mock.__seed("manual_test_evidence", [
      {
        id: "mt2",
        firm_client_id: FC,
        close_period_id: CP,
        account_category: "cash",
        assertion_id: "accuracy",
        evidence_type: "bank_statement",
        data_source_reliability_basis: null,
      },
    ]);
    mock.__seed("rule_assertion_coverage", [
      {
        rule_id: "gen.je_balance_check",
        assertion_id: "accuracy",
        coverage_strength: "primary",
        account_categories: ["cash"],
      },
    ]);

    await runProjectionWorker(FC, CP);
    const row = mock.__state.close_assertion_coverage.find(
      (r) => r.account_category === "cash" && r.assertion_id === "accuracy",
    );
    expect(row?.coverage_status).toBe("tested");
    expect(row?.evidence_strength).toBe("strong");
  });
});
