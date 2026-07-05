import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockDb } from "./_mock-db";

const mock = makeMockDb();
const publishSpy = vi.hoisted(() =>
  vi.fn(async () => ({ eventId: "evt-1" })),
);
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: publishSpy }));

import { insertReviewItem } from "@/lib/pre-close/insert-review-item";
import { clearResolverCache } from "@/lib/assertions/resolve-rule-assertions";
import type { JEDraft, ReviewItemCompositionInput } from "@/lib/pre-close/types";

function balanced(): JEDraft {
  return {
    narration: "n",
    transactionDate: "2026-07-06",
    lines: [
      { lineIndex: 0, accountId: "a", accountName: "A", drAmountCents: 500, crAmountCents: 0, memo: "" },
      { lineIndex: 1, accountId: "b", accountName: "B", drAmountCents: 0, crAmountCents: 500, memo: "" },
    ],
  };
}

function input(over: Partial<ReviewItemCompositionInput> = {}): ReviewItemCompositionInput {
  return {
    fireId: "fire-1",
    firmClientId: "fc1",
    engagementId: "eng1",
    closePeriodId: null,
    ruleId: "gen.rule",
    ruleVersion: 1,
    accountingMethod: "accrual",
    ruleReasonCode: "rc",
    ruleReasonDetail: {},
    severity: "info",
    jeDraft: balanced(),
    evidenceRefs: [],
    ...over,
  };
}

beforeEach(() => {
  mock.__reset();
  clearResolverCache(mock as never);
  publishSpy.mockClear();
});

describe("insertReviewItem assertion_tags", () => {
  it("inserted review item has assertion_tags populated from rule_assertion_coverage", async () => {
    mock.__seed("rule_assertion_coverage", [
      { rule_id: "gen.rule", assertion_id: "completeness" },
      { rule_id: "gen.rule", assertion_id: "accuracy" },
    ]);
    await insertReviewItem(input());
    expect(mock.__state.pre_close_review_items[0].assertion_tags).toEqual([
      "accuracy",
      "completeness",
    ]);
  });

  it("unmapped rule_id inserts with assertion_tags = []", async () => {
    await insertReviewItem(input({ ruleId: "gen.unmapped" }));
    expect(mock.__state.pre_close_review_items[0].assertion_tags).toEqual([]);
  });

  it("returned ReviewItemRow.assertionTags matches DB row", async () => {
    mock.__seed("rule_assertion_coverage", [{ rule_id: "gen.rule", assertion_id: "cutoff" }]);
    const row = await insertReviewItem(input());
    expect(row.assertionTags).toEqual(["cutoff"]);
  });

  it("review_item.composed event payload includes assertion_tags", async () => {
    mock.__seed("rule_assertion_coverage", [{ rule_id: "gen.rule", assertion_id: "classification" }]);
    await insertReviewItem(input());
    const calls = publishSpy.mock.calls as unknown as Array<[{ payload: { assertion_tags: string[] } }]>;
    expect(calls[0][0].payload.assertion_tags).toEqual(["classification"]);
  });

  it("assertion_tags contains no duplicates and is sorted", async () => {
    mock.__seed("rule_assertion_coverage", [
      { rule_id: "gen.rule", assertion_id: "valuation_allocation" },
      { rule_id: "gen.rule", assertion_id: "accuracy" },
      { rule_id: "gen.rule", assertion_id: "valuation_allocation" },
    ]);
    await insertReviewItem(input());
    expect(mock.__state.pre_close_review_items[0].assertion_tags).toEqual([
      "accuracy",
      "valuation_allocation",
    ]);
  });
});
