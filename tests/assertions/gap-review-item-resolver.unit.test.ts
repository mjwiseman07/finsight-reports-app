import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockDb } from "../pre-close/_mock-db";
import {
  resolveGapReviewItem,
  validateResolutionMetadata,
  GapResolveError,
} from "@/lib/assertions/gap-review-item-resolver";

const mock = makeMockDb();
const publishMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/events/publisher", () => ({
  publishEvent: publishMock,
}));

function seedOpenGap(id = "gap1") {
  mock.__seed("close_gap_review_items", [
    {
      id,
      firm_client_id: "fc1",
      engagement_id: "eng1",
      close_period_id: "cp1",
      account_category: "cash",
      assertion_id: "accuracy",
      gap_root_cause_code: "no_rule_defined",
      relevance_at_detection: "relevant",
      severity: "critical",
      resolution_status: "open",
    },
  ]);
}

beforeEach(() => {
  mock.__reset();
  publishMock.mockReset();
  publishMock.mockResolvedValue({ eventId: "evt-1" });
});

describe("validateResolutionMetadata", () => {
  it("manual_test requires manual_test_ref + rationale", () => {
    expect(validateResolutionMetadata("manual_test", {}).ok).toBe(false);
    expect(validateResolutionMetadata("manual_test", { manual_test_ref: "mt1" }).ok).toBe(false);
    expect(
      validateResolutionMetadata("manual_test", {
        manual_test_ref: "mt1",
        rationale: "documented",
      }).ok,
    ).toBe(true);
  });

  it("rule_activation requires activated_rule_id", () => {
    expect(validateResolutionMetadata("rule_activation", {}).ok).toBe(false);
    expect(
      validateResolutionMetadata("rule_activation", { activated_rule_id: "gen.rule" }).ok,
    ).toBe(true);
  });

  it("deferred_to_next_period requires defer_reason", () => {
    expect(validateResolutionMetadata("deferred_to_next_period", {}).ok).toBe(false);
    expect(
      validateResolutionMetadata("deferred_to_next_period", { defer_reason: "wait for rule" }).ok,
    ).toBe(true);
  });
});

describe("resolveGapReviewItem", () => {
  it("manual_test writes resolved_remediated status", async () => {
    seedOpenGap();
    const item = await resolveGapReviewItem(mock as never, "gap1", {
      resolutionType: "manual_test",
      resolutionMetadata: { manual_test_ref: "MT-001", rationale: "walkthrough done" },
      resolvedByUserId: "u1",
    });
    expect(item.resolutionStatus).toBe("resolved_remediated");
    expect(item.resolutionType).toBe("manual_test");
  });

  it("rule_activation writes resolved_remediated", async () => {
    seedOpenGap();
    const item = await resolveGapReviewItem(mock as never, "gap1", {
      resolutionType: "rule_activation",
      resolutionMetadata: { activated_rule_id: "gen.je_balance_check" },
      resolvedByUserId: "u1",
    });
    expect(item.resolutionStatus).toBe("resolved_remediated");
  });

  it("not_applicable_override writes resolved_not_applicable", async () => {
    seedOpenGap();
    const item = await resolveGapReviewItem(mock as never, "gap1", {
      resolutionType: "not_applicable_override",
      resolutionMetadata: { rationale: "N/A for this vertical" },
      resolvedByUserId: "u1",
    });
    expect(item.resolutionStatus).toBe("resolved_not_applicable");
  });

  it("deferred_to_next_period writes resolved_deferred", async () => {
    seedOpenGap();
    const item = await resolveGapReviewItem(mock as never, "gap1", {
      resolutionType: "deferred_to_next_period",
      resolutionMetadata: { defer_reason: "pending client docs" },
      resolvedByUserId: "u1",
    });
    expect(item.resolutionStatus).toBe("resolved_deferred");
  });

  it("rejects invalid resolution_type via validation", async () => {
    seedOpenGap();
    await expect(
      resolveGapReviewItem(mock as never, "gap1", {
        resolutionType: "rule_activation",
        resolutionMetadata: {},
        resolvedByUserId: "u1",
      }),
    ).rejects.toThrow(GapResolveError);
  });

  it("rejects double-resolve (already-resolved row)", async () => {
    mock.__seed("close_gap_review_items", [
      {
        id: "gap1",
        firm_client_id: "fc1",
        engagement_id: "eng1",
        close_period_id: "cp1",
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
    await expect(
      resolveGapReviewItem(mock as never, "gap1", {
        resolutionType: "manual_test",
        resolutionMetadata: { manual_test_ref: "x", rationale: "y" },
        resolvedByUserId: "u1",
      }),
    ).rejects.toThrow(/already_resolved/);
  });

  it("emits gap_review_item.resolved ledger event with correct category=assertion", async () => {
    seedOpenGap();
    await resolveGapReviewItem(mock as never, "gap1", {
      resolutionType: "manual_test",
      resolutionMetadata: { manual_test_ref: "MT-1", rationale: "ok" },
      resolvedByUserId: "u1",
    });
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "gap_review_item.resolved",
        eventCategory: "assertion",
        aggregateType: "close_gap_review_item",
        aggregateId: "gap1",
      }),
    );
  });
});
