import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockDb } from "../pre-close/_mock-db";

const mock = makeMockDb();

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => mock,
}));

import {
  CATALOG_FIXTURE,
  ROOT_CAUSES_FIXTURE,
  coverageRow,
} from "./_fixtures/statement";
import { MAX_DRILLDOWNS_PER_CELL, build } from "@/lib/close-packet/sections/assertion_coverage";

const CP = "cp1";
const FC = "fc1";

function assertOk(result: Awaited<ReturnType<typeof build>>) {
  expect(result.status).toBe("ok");
  return result as Record<string, unknown> & { status: "ok" };
}

function seedBase() {
  mock.__seed("assertions_catalog", CATALOG_FIXTURE);
  mock.__seed("assertion_gap_root_causes", ROOT_CAUSES_FIXTURE);
  mock.__seed("close_assertion_coverage", [
    coverageRow("cash", "accuracy", { coverage_status: "tested", evidence_strength: "strong", gap_root_cause_code: null, covering_fire_ids: ["fire-1"], covering_rule_ids: ["gen.rule"] }),
    coverageRow("revenue", "completeness", { relevance_at_computation: "not_applicable", coverage_status: "not_applicable", gap_root_cause_code: null }),
    coverageRow("inventory", "existence_occurrence", { coverage_status: "gap", gap_root_cause_code: "rule_defined_but_not_fired", relevance_at_computation: "relevant" }),
  ]);
  mock.__seed("curated_rule_fires", [
    { fire_id: "fire-1", rule_id: "gen.rule", rule_version: 2, created_at: "2026-06-15T00:00:00Z", outcome: "fired" },
    { fire_id: "fire-orphan", rule_id: "gen.x", rule_version: 1, created_at: "2026-06-15T00:00:00Z", outcome: "fired" },
  ]);
  mock.__seed("pre_close_review_items", [
    { id: "ri-1", fire_id: "fire-1", decision: "approved" },
  ]);
}

beforeEach(() => {
  mock.__reset();
});

describe("assertion_coverage section builder", () => {
  it("returns status ok when close_period has coverage", async () => {
    seedBase();
    const result = assertOk(
      await build({
      closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30", status: "prep" },
      firmClient: { id: FC, name: "Client", industry_vertical: "general", accounting_method: "accrual", is_demo: false },
      supabase: mock,
    }),
    );
    expect(result.status).toBe("ok");
    expect(result.coverage_cells).toHaveLength(3);
  });

  it("returns status error on missing close_period.id", async () => {
    const result = await build({ closePeriod: {}, firmClient: { id: FC } });
    expect(result.status).toBe("error");
    expect(result.error_message).toContain("closePeriod.id");
  });

  it("summary math adds up to total_cells", async () => {
    seedBase();
    const result = assertOk(
      await build({
        closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30" },
        firmClient: { id: FC },
        supabase: mock,
      }),
    );
    const s = result.summary as { tested: number; partial: number; gap: number; not_applicable: number; total_cells: number };
    expect(s.tested + s.partial + s.gap + s.not_applicable).toBe(s.total_cells);
  });

  it("coverage_rate_pct rounded to 1 decimal", async () => {
    seedBase();
    const result = assertOk(
      await build({
        closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30" },
        firmClient: { id: FC },
        supabase: mock,
      }),
    );
    expect((result.summary as { coverage_rate_pct: number }).coverage_rate_pct).toBe(50);
  });

  it("coverage_rate_pct is 0 when relevantCells=0", async () => {
    mock.__seed("assertions_catalog", CATALOG_FIXTURE.slice(0, 1));
    mock.__seed("assertion_gap_root_causes", ROOT_CAUSES_FIXTURE);
    mock.__seed("close_assertion_coverage", [
      coverageRow("cash", "accuracy", { relevance_at_computation: "not_applicable", coverage_status: "not_applicable", gap_root_cause_code: null }),
    ]);
    const result = assertOk(
      await build({
        closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30" },
        firmClient: { id: FC },
        supabase: mock,
      }),
    );
    expect((result.summary as { coverage_rate_pct: number }).coverage_rate_pct).toBe(0);
  });

  it("critical_gaps only counts relevance=relevant", async () => {
    seedBase();
    const result = assertOk(
      await build({
        closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30" },
        firmClient: { id: FC },
        supabase: mock,
      }),
    );
    expect((result.summary as { critical_gaps: number }).critical_gaps).toBe(1);
  });

  it("gaps_by_root_cause aggregates correctly", async () => {
    seedBase();
    const result = assertOk(
      await build({
        closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30" },
        firmClient: { id: FC },
        supabase: mock,
      }),
    );
    expect((result.summary as { gaps_by_root_cause: Record<string, number> }).gaps_by_root_cause.rule_defined_but_not_fired).toBe(1);
  });

  it("assertions_catalog loaded in stable order", async () => {
    seedBase();
    const result = assertOk(
      await build({
        closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30" },
        firmClient: { id: FC },
        supabase: mock,
      }),
    );
    const ids = (result.assertions_catalog as Array<{ assertion_id: string }>).map((c) => c.assertion_id);
    expect(ids).toEqual([...ids].sort());
  });

  it("gap_root_causes loaded in stable order", async () => {
    seedBase();
    const result = assertOk(
      await build({
        closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30" },
        firmClient: { id: FC },
        supabase: mock,
      }),
    );
    expect((result.gap_root_causes as Array<{ root_cause_code: string }>)[0].root_cause_code).toBe("no_rule_defined");
  });

  it("drilldowns capped at MAX_DRILLDOWNS_PER_CELL", async () => {
    mock.__seed("assertions_catalog", CATALOG_FIXTURE.slice(0, 1));
    mock.__seed("assertion_gap_root_causes", ROOT_CAUSES_FIXTURE);
    const fireIds = Array.from({ length: 15 }, (_, i) => `fire-${i}`);
    mock.__seed("close_assertion_coverage", [
      coverageRow("cash", "accuracy", {
        coverage_status: "tested",
        gap_root_cause_code: null,
        covering_fire_ids: fireIds,
      }),
    ]);
    mock.__seed(
      "curated_rule_fires",
      fireIds.map((id) => ({ fire_id: id, rule_id: "gen.r", rule_version: 1, created_at: "2026-06-01", outcome: "fired" })),
    );
    const result = assertOk(
      await build({
        closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30" },
        firmClient: { id: FC },
        supabase: mock,
      }),
    );
    expect((result.coverage_cells as Array<{ drilldowns: unknown[] }>)[0].drilldowns).toHaveLength(MAX_DRILLDOWNS_PER_CELL);
  });

  it("drilldowns exclude fires with no matching curated_rule_fires row", async () => {
    seedBase();
    mock.__state.close_assertion_coverage[0].covering_fire_ids = ["fire-1", "fire-missing"];
    const result = assertOk(
      await build({
        closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30" },
        firmClient: { id: FC },
        supabase: mock,
      }),
    );
    const cell = (result.coverage_cells as Array<{ account_category: string; drilldowns: unknown[] }>).find(
      (c) => c.account_category === "cash",
    );
    expect(cell?.drilldowns).toHaveLength(1);
  });

  it("drilldowns include review_item_id and decision", async () => {
    seedBase();
    const result = assertOk(
      await build({
        closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30" },
        firmClient: { id: FC },
        supabase: mock,
      }),
    );
    const dd = (
      result.coverage_cells as Array<{ account_category: string; drilldowns: Array<{ review_item_id: string; review_item_decision: string }> }>
    )
      .find((c) => c.account_category === "cash")
      ?.drilldowns[0];
    expect(dd?.review_item_id).toBe("ri-1");
    expect(dd?.review_item_decision).toBe("approved");
  });

  it("content_type constant is assertion_coverage_statement", async () => {
    seedBase();
    const result = assertOk(
      await build({
        closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30" },
        firmClient: { id: FC },
        supabase: mock,
      }),
    );
    expect(result.content_type).toBe("assertion_coverage_statement");
  });

  it("version constant is 1", async () => {
    seedBase();
    const result = assertOk(
      await build({
        closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30" },
        firmClient: { id: FC },
        supabase: mock,
      }),
    );
    expect(result.version).toBe(1);
  });
});
