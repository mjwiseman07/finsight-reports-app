/**
 * D6.4c-1 — insertReviewItem DB path + event emission tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockDb } from "./_mock-db";

const mock = makeMockDb();
const publishSpy = vi.hoisted(() =>
  vi.fn(async (_input: { eventCategory?: string; [k: string]: unknown }) => ({ eventId: "evt-1" })),
);
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: publishSpy }));

import { insertReviewItem, InsertReviewItemError } from "@/lib/pre-close/insert-review-item";
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
    basisGuardReasonCode: null,
    basisGuardReasonText: null,
    ...over,
  };
}

beforeEach(() => {
  mock.__reset();
  publishSpy.mockClear();
});

describe("pre-close/insert-review-item insertReviewItem", () => {
  it("insert balanced draft -> row present with totals, event published", async () => {
    const row = await insertReviewItem(input());
    expect(row.jeDraftTotalDebitCents).toBe(500);
    expect(row.jeDraftTotalCreditCents).toBe(500);
    expect(row.jeDraftLineCount).toBe(2);
    expect(mock.__state.pre_close_review_items).toHaveLength(1);
    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy.mock.calls[0][0].eventCategory).toBe("rule");
  });

  it("insert unbalanced draft -> throws InsertReviewItemError", async () => {
    const bad = balanced();
    bad.lines[1].crAmountCents = 499;
    await expect(insertReviewItem(input({ jeDraft: bad }))).rejects.toBeInstanceOf(
      InsertReviewItemError,
    );
    expect(mock.__state.pre_close_review_items).toHaveLength(0);
  });

  it("insert 3-line balanced draft -> line_count=3", async () => {
    const three: JEDraft = {
      narration: "n",
      transactionDate: "2026-07-06",
      lines: [
        { lineIndex: 0, accountId: "a", accountName: "A", drAmountCents: 300, crAmountCents: 0, memo: "" },
        { lineIndex: 1, accountId: "b", accountName: "B", drAmountCents: 200, crAmountCents: 0, memo: "" },
        { lineIndex: 2, accountId: "c", accountName: "C", drAmountCents: 0, crAmountCents: 500, memo: "" },
      ],
    };
    const row = await insertReviewItem(input({ jeDraft: three }));
    expect(row.jeDraftLineCount).toBe(3);
  });

  it("second insert with same fire_id -> unique index violation", async () => {
    await insertReviewItem(input({ fireId: "dup-fire" }));
    await expect(insertReviewItem(input({ fireId: "dup-fire" }))).rejects.toBeInstanceOf(
      InsertReviewItemError,
    );
    expect(mock.__state.pre_close_review_items).toHaveLength(1);
  });
});
