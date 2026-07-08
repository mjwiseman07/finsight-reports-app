import { describe, expect, it, vi } from "vitest";
import { makeMockDb } from "../pre-close/_mock-db";

const mock = makeMockDb();

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => mock,
}));

import { build } from "@/lib/close-packet/sections/assertion_coverage.js";

const FC = "fc1";
const CP = "cp1";

function coverageRow(status: string, account = "cash", assertion = "accuracy") {
  return {
    close_period_id: CP,
    firm_client_id: FC,
    account_category: account,
    assertion_id: assertion,
    relevance_at_computation: "relevant",
    coverage_status: status,
    evidence_strength: "unassessed",
    covering_rule_ids: [],
    covering_fire_ids: [],
    gap_root_cause_code: status === "gap" ? "no_rule_defined" : null,
    gap_recommendation: null,
  };
}

describe("assertion coverage remediation drill-down", () => {
  it("gap-status cell includes remediation field with gap_item_id when a gap item exists", async () => {
    mock.__reset();
    mock.__seed("close_assertion_coverage", [coverageRow("gap")]);
    mock.__seed("close_gap_review_items", [
      {
        id: "gap-item-1",
        firm_client_id: FC,
        close_period_id: CP,
        account_category: "cash",
        assertion_id: "accuracy",
        resolution_status: "open",
        resolution_type: null,
      },
    ]);
    mock.__seed("assertions_catalog", [
      {
        assertion_id: "accuracy",
        display_name: "Accuracy",
        description: "d",
        isa_315_label: "l",
        authoritative_citation: "c",
      },
    ]);
    mock.__seed("assertion_gap_root_causes", [
      {
        root_cause_code: "no_rule_defined",
        display_name: "No rule",
        description: "d",
        pcaob_reference: "ref",
      },
    ]);

    const result = await build({
      closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30" },
      firmClient: { id: FC, name: "Client" },
      supabase: mock,
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const ok = result as typeof result & { coverage_cells: Array<{ account_category: string; assertion_id: string; remediation?: unknown }> };
    const cell = ok.coverage_cells.find(
      (c: { account_category: string; assertion_id: string }) =>
        c.account_category === "cash" && c.assertion_id === "accuracy",
    );
    expect(cell?.remediation).toEqual({
      gap_item_id: "gap-item-1",
      status: "open",
      type: null,
    });
  });

  it("gap-status cell has remediation: null when no gap item exists", async () => {
    mock.__reset();
    mock.__seed("close_assertion_coverage", [coverageRow("gap")]);
    mock.__seed("assertions_catalog", [
      {
        assertion_id: "accuracy",
        display_name: "Accuracy",
        description: "d",
        isa_315_label: "l",
        authoritative_citation: "c",
      },
    ]);
    mock.__seed("assertion_gap_root_causes", []);

    const result = await build({
      closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30" },
      firmClient: { id: FC, name: "Client" },
      supabase: mock,
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const ok = result as typeof result & { coverage_cells: Array<{ account_category: string; assertion_id: string; remediation?: unknown }> };
    const cell = ok.coverage_cells.find(
      (c: { account_category: string; assertion_id: string }) =>
        c.account_category === "cash" && c.assertion_id === "accuracy",
    );
    expect(cell?.remediation).toBeNull();
  });

  it("tested/partial/not_applicable cells have no remediation field", async () => {
    mock.__reset();
    mock.__seed("close_assertion_coverage", [
      coverageRow("tested"),
      coverageRow("partial", "accounts_receivable", "completeness"),
      coverageRow("not_applicable", "inventory", "cutoff"),
    ]);
    mock.__seed("assertions_catalog", []);
    mock.__seed("assertion_gap_root_causes", []);

    const result = await build({
      closePeriod: { id: CP, firm_client_id: FC, period_start: "2026-06-01", period_end: "2026-06-30" },
      firmClient: { id: FC, name: "Client" },
      supabase: mock,
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const ok = result as typeof result & { coverage_cells: Array<Record<string, unknown>> };
    for (const cell of ok.coverage_cells) {
      expect(cell).not.toHaveProperty("remediation");
    }
  });
});
