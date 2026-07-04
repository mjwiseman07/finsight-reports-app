/**
 * D6.4c-1 — Directive lifecycle tests (set-once, fire reflection, audit).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockDb } from "../pre-close/_mock-db";

const mock = makeMockDb();
const publishSpy = vi.hoisted(() =>
  vi.fn(async (_input: { eventCategory?: string; [k: string]: unknown }) => ({ eventId: "evt-1" })),
);
const reinforceSpy = vi.hoisted(() => vi.fn(async () => undefined));
const postApprovedSpy = vi.hoisted(() => vi.fn(async () => ({ status: "posted" as const })));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));
vi.mock("@/lib/events/publisher", () => ({ publishEvent: publishSpy }));
vi.mock("@/lib/memory/client-memory-service", () => ({ reinforce: reinforceSpy }));
vi.mock("@/lib/pre-close/post-approved-review-item", () => ({
  postApprovedReviewItem: postApprovedSpy,
}));

import { applyDirective } from "@/lib/directives/apply-directive";
import type { DirectiveInput, JEDraft } from "@/lib/pre-close/types";

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

function seedPending(id: string, fireId: string, extra: Record<string, unknown> = {}) {
  mock.__seed("pre_close_review_items", [
    {
      id,
      fire_id: fireId,
      firm_client_id: "fc1",
      engagement_id: "eng1",
      close_period_id: null,
      rule_id: "gen.rule",
      rule_version: 1,
      accounting_method: "accrual",
      je_draft: balanced(),
      je_draft_total_debit_cents: 500,
      je_draft_total_credit_cents: 500,
      je_draft_line_count: 2,
      rule_reason_code: "rc",
      rule_reason_detail: {},
      severity: "info",
      evidence_refs: [],
      basis_guard_reason_code: null,
      basis_guard_reason_text: null,
      decision: null,
      decision_reason_code: null,
      decision_reason_text: null,
      reviewer_user_id: null,
      decision_at: null,
      edited_je_draft: null,
      posted_je_attempt_id: null,
      created_at: "2026-07-06T00:00:00Z",
      ...extra,
    },
  ]);
  mock.__seed("curated_rule_fires", [{ fire_id: fireId, reviewer_action: null }]);
}

function directive(over: Partial<DirectiveInput> = {}): DirectiveInput {
  return {
    reviewItemId: "ri-1",
    decision: "approved",
    decisionReasonCode: "looks_good",
    decisionReasonText: "approved by reviewer",
    reviewerUserId: "u1",
    actorType: "user",
    ...over,
  };
}

beforeEach(() => {
  mock.__reset();
  publishSpy.mockClear();
  reinforceSpy.mockClear();
  postApprovedSpy.mockClear();
  postApprovedSpy.mockResolvedValue({ status: "posted" });
});

describe("directives/apply-directive applyDirective", () => {
  it("approved on pending -> applied, fire accepted, event + ai_action_log", async () => {
    seedPending("ri-1", "fire-1");
    const r = await applyDirective(directive());
    expect(r.status).toBe("applied");
    expect(mock.__state.curated_rule_fires[0].reviewer_action).toBe("accepted");
    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(publishSpy.mock.calls[0][0].eventCategory).toBe("directive");
    expect(mock.__state.ai_action_log).toHaveLength(1);
    expect(mock.__state.ai_action_log[0].action_category).toBe("directive_apply");
  });

  it("rejected -> fire reviewer_action dismissed", async () => {
    seedPending("ri-1", "fire-1");
    const r = await applyDirective(directive({ decision: "rejected", decisionReasonCode: "wrong" }));
    expect(r.status).toBe("applied");
    expect(mock.__state.curated_rule_fires[0].reviewer_action).toBe("dismissed");
  });

  it("deferred -> fire reviewer_action escalated", async () => {
    seedPending("ri-1", "fire-1");
    await applyDirective(directive({ decision: "deferred", decisionReasonCode: "need_info" }));
    expect(mock.__state.curated_rule_fires[0].reviewer_action).toBe("escalated");
  });

  it("edit_and_approved with valid edited draft -> editedJeDraft populated", async () => {
    seedPending("ri-1", "fire-1");
    const edited = balanced();
    edited.narration = "edited";
    const r = await applyDirective(
      directive({ decision: "edit_and_approved", decisionReasonCode: "tweaked", editedJeDraft: edited }),
    );
    expect(r.status).toBe("applied");
    if (r.status === "applied") {
      expect(r.row.editedJeDraft).not.toBeNull();
      expect(r.row.editedJeDraft?.narration).toBe("edited");
    }
    expect(mock.__state.curated_rule_fires[0].reviewer_action).toBe("accepted");
  });

  it("edit_and_approved without editedJeDraft -> throws", async () => {
    seedPending("ri-1", "fire-1");
    await expect(
      applyDirective(directive({ decision: "edit_and_approved", decisionReasonCode: "x" })),
    ).rejects.toThrow();
  });

  it("apply on already-decided item -> already_decided, no double-write", async () => {
    seedPending("ri-1", "fire-1", {
      decision: "approved",
      decision_reason_code: "prior",
      decision_reason_text: "prior",
      decision_at: "2026-07-06T00:00:00Z",
      reviewer_user_id: "u0",
    });
    const r = await applyDirective(directive({ decisionReasonCode: "second" }));
    expect(r.status).toBe("already_decided");
    expect(mock.__state.ai_action_log).toHaveLength(0);
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it("apply on non-existent id -> not_found", async () => {
    const r = await applyDirective(directive({ reviewItemId: "does-not-exist" }));
    expect(r.status).toBe("not_found");
  });
});

describe("apply-directive D6.4c-3 post wiring", () => {
  it("approved invokes postApprovedReviewItem", async () => {
    seedPending("ri-post", "fire-post");
    await applyDirective(directive({ reviewItemId: "ri-post" }));
    expect(postApprovedSpy).toHaveBeenCalledOnce();
    const calls = postApprovedSpy.mock.calls as unknown as Array<[{ reviewItemId: string }]>;
    expect(calls[0][0].reviewItemId).toBe("ri-post");
  });

  it("rejected does NOT invoke postApprovedReviewItem", async () => {
    seedPending("ri-rej", "fire-rej");
    await applyDirective(directive({ reviewItemId: "ri-rej", decision: "rejected", decisionReasonCode: "no" }));
    expect(postApprovedSpy).not.toHaveBeenCalled();
  });

  it("deferred does NOT invoke postApprovedReviewItem", async () => {
    seedPending("ri-def", "fire-def");
    await applyDirective(directive({ reviewItemId: "ri-def", decision: "deferred", decisionReasonCode: "wait" }));
    expect(postApprovedSpy).not.toHaveBeenCalled();
  });

  it("edit_and_approved invokes postApprovedReviewItem", async () => {
    seedPending("ri-edit", "fire-edit");
    const edited = balanced();
    edited.narration = "edited";
    await applyDirective(
      directive({
        reviewItemId: "ri-edit",
        decision: "edit_and_approved",
        decisionReasonCode: "tweak",
        editedJeDraft: edited,
      }),
    );
    expect(postApprovedSpy).toHaveBeenCalledOnce();
  });

  it("poster throw is non-fatal — directive still applied", async () => {
    seedPending("ri-throw", "fire-throw");
    postApprovedSpy.mockRejectedValueOnce(new Error("poster boom"));
    const r = await applyDirective(directive({ reviewItemId: "ri-throw" }));
    expect(r.status).toBe("applied");
  });
});
