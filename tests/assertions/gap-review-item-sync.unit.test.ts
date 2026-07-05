import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockDb } from "../pre-close/_mock-db";
import { syncGapReviewItems } from "@/lib/assertions/gap-review-item-sync";
import type { DetectedGap } from "@/lib/assertions/gap-detector";

const mock = makeMockDb();
const FC = "fc1";
const CP = "cp1";
const ENG = "eng1";

function gap(account: string, assertion: string, code = "no_rule_defined"): DetectedGap {
  return { account_category: account as DetectedGap["account_category"], assertion_id: assertion as DetectedGap["assertion_id"], root_cause_code: code as DetectedGap["root_cause_code"] };
}

function projRow(
  account: string,
  assertion: string,
  relevance: "relevant" | "usually_not_primary" = "relevant",
  recommendation: string | null = null,
) {
  return {
    account_category: account,
    assertion_id: assertion,
    relevance_at_computation: relevance,
    gap_recommendation: recommendation,
  };
}

beforeEach(() => {
  mock.__reset();
  mock.__seed("close_gap_review_items", []);
});

describe("syncGapReviewItems", () => {
  it("opens a new gap item when the pair is a first-time gap", async () => {
    const result = await syncGapReviewItems(
      mock as never,
      FC,
      CP,
      ENG,
      [gap("cash", "accuracy")],
      [projRow("cash", "accuracy")],
      "wr1",
    );
    expect(result.opened).toBe(1);
    expect(mock.__state.close_gap_review_items).toHaveLength(1);
    expect(mock.__state.close_gap_review_items[0].resolution_status).toBe("open");
  });

  it("refreshes last_projected_at on an already-open gap item", async () => {
    mock.__seed("close_gap_review_items", [
      {
        id: "g1",
        firm_client_id: FC,
        close_period_id: CP,
        engagement_id: ENG,
        account_category: "cash",
        assertion_id: "accuracy",
        gap_root_cause_code: "no_rule_defined",
        relevance_at_detection: "relevant",
        severity: "critical",
        resolution_status: "open",
        last_projected_at: "2020-01-01T00:00:00Z",
      },
    ]);
    const result = await syncGapReviewItems(
      mock as never,
      FC,
      CP,
      ENG,
      [gap("cash", "accuracy")],
      [projRow("cash", "accuracy")],
      "wr2",
    );
    expect(result.refreshed).toBe(1);
    expect(result.opened).toBe(0);
    expect(mock.__state.close_gap_review_items[0].last_projected_at).not.toBe("2020-01-01T00:00:00Z");
  });

  it("reopens a previously-resolved gap when it re-appears, preserving resolution_status_prior", async () => {
    mock.__seed("close_gap_review_items", [
      {
        id: "g1",
        firm_client_id: FC,
        close_period_id: CP,
        engagement_id: ENG,
        account_category: "cash",
        assertion_id: "accuracy",
        gap_root_cause_code: "no_rule_defined",
        relevance_at_detection: "relevant",
        severity: "critical",
        resolution_status: "resolved_remediated",
        resolution_type: "manual_test",
        resolved_at: "2026-01-01T00:00:00Z",
      },
    ]);
    const result = await syncGapReviewItems(
      mock as never,
      FC,
      CP,
      ENG,
      [gap("cash", "accuracy")],
      [projRow("cash", "accuracy")],
      "wr3",
    );
    expect(result.reopened).toBe(1);
    const row = mock.__state.close_gap_review_items[0];
    expect(row.resolution_status).toBe("open");
    expect(row.resolution_status_prior).toBe("resolved_remediated");
    expect(row.resolution_type).toBeNull();
    expect(row.resolved_at).toBeNull();
  });

  it("auto-closes stale open items whose pair no longer appears in the current gap set", async () => {
    mock.__seed("close_gap_review_items", [
      {
        id: "g1",
        firm_client_id: FC,
        close_period_id: CP,
        engagement_id: ENG,
        account_category: "cash",
        assertion_id: "accuracy",
        gap_root_cause_code: "no_rule_defined",
        relevance_at_detection: "relevant",
        severity: "critical",
        resolution_status: "open",
      },
    ]);
    const result = await syncGapReviewItems(mock as never, FC, CP, ENG, [], [], "wr4");
    expect(result.auto_closed_stale).toBe(1);
    expect(mock.__state.close_gap_review_items[0].resolution_status).toBe("resolved_stale");
  });

  it("severity=critical when relevance_at_computation=relevant", async () => {
    await syncGapReviewItems(
      mock as never,
      FC,
      CP,
      ENG,
      [gap("cash", "accuracy")],
      [projRow("cash", "accuracy", "relevant")],
      "wr5",
    );
    expect(mock.__state.close_gap_review_items[0].severity).toBe("critical");
  });

  it("severity=warning when relevance=usually_not_primary", async () => {
    await syncGapReviewItems(
      mock as never,
      FC,
      CP,
      ENG,
      [gap("cash", "accuracy")],
      [projRow("cash", "accuracy", "usually_not_primary")],
      "wr6",
    );
    expect(mock.__state.close_gap_review_items[0].severity).toBe("warning");
  });

  it("carries gap_recommendation from the projected rows onto the item", async () => {
    await syncGapReviewItems(
      mock as never,
      FC,
      CP,
      ENG,
      [gap("cash", "accuracy")],
      [projRow("cash", "accuracy", "relevant", "Enable gen.je_balance_check")],
      "wr7",
    );
    expect(mock.__state.close_gap_review_items[0].gap_recommendation).toBe(
      "Enable gen.je_balance_check",
    );
  });

  it("never DELETEs — only status transitions", async () => {
    mock.__seed("close_gap_review_items", [
      {
        id: "g1",
        firm_client_id: FC,
        close_period_id: CP,
        engagement_id: ENG,
        account_category: "cash",
        assertion_id: "accuracy",
        gap_root_cause_code: "no_rule_defined",
        relevance_at_detection: "relevant",
        severity: "critical",
        resolution_status: "open",
      },
    ]);
    await syncGapReviewItems(mock as never, FC, CP, ENG, [], [], "wr8");
    expect(mock.__state.close_gap_review_items).toHaveLength(1);
    expect(mock.__state.close_gap_review_items[0].id).toBe("g1");
  });
});
