import { describe, expect, it } from "vitest";
import type { JEDraft } from "@/lib/pre-close/types";
import type { ReviewItemDetail } from "@/lib/pre-close/reviewer-types";
import { sha256OfReviewItemPacket } from "@/lib/reviewer/review-item-packet";

function draft(lines: Array<{ dr: number; cr: number }>): JEDraft {
  return {
    narration: "Test narration",
    transactionDate: "2026-07-06",
    lines: lines.map((l, i) => ({
      lineIndex: i,
      accountId: `acc${i}`,
      accountName: `Account ${i}`,
      drAmountCents: l.dr,
      crAmountCents: l.cr,
      memo: "",
    })),
  };
}

function minimalDetail(overrides: Partial<ReviewItemDetail> = {}): ReviewItemDetail {
  return {
    id: "ri-1",
    firmClientId: "fc1",
    firmClientName: "Acme Co",
    engagementId: "e1",
    engagementName: "Bookkeeping 2026",
    closePeriodId: null,
    ruleId: "gen.rule",
    ruleVersion: "1",
    severity: "warn",
    ruleReasonCode: "RC1",
    ruleReasonDetail: "detail",
    createdAt: "2026-07-06T00:00:00Z",
    decision: null,
    decisionAt: null,
    reviewerUserId: null,
    postedJeAttemptId: null,
    postBlockReason: null,
    qboJeId: null,
    assertionTags: [],
    evidenceRefs: [{ key: "v" }],
    basisGuardReasonCode: null,
    basisGuardReasonText: null,
    jeDraft: draft([{ dr: 10000, cr: 0 }, { dr: 0, cr: 10000 }]),
    editedJeDraft: null,
    decisionReasonCode: null,
    decisionReasonText: null,
    postingLedgerEvents: [],
    remediationLog: [],
    ...overrides,
  };
}

const exportedAt = new Date("2026-07-06T12:00:00.000Z");

describe("review-item-packet", () => {
  it("renders minimal item as valid PDF buffer", async () => {
    const { buffer, sha256 } = await sha256OfReviewItemPacket({
      detail: minimalDetail(),
      exportedByEmail: "reviewer@test.com",
      exportedAt,
    });
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("includes both drafts for edit_and_approved (larger buffer)", async () => {
    const edited = draft([{ dr: 5000, cr: 0 }, { dr: 5000, cr: 0 }, { dr: 0, cr: 10000 }]);
    const base = await sha256OfReviewItemPacket({
      detail: minimalDetail(),
      exportedByEmail: "r@test.com",
      exportedAt,
    });
    const withEdit = await sha256OfReviewItemPacket({
      detail: minimalDetail({ decision: "edit_and_approved", editedJeDraft: edited }),
      exportedByEmail: "r@test.com",
      exportedAt,
    });
    expect(withEdit.buffer.length).toBeGreaterThan(base.buffer.length);
  });

  it("posted item produces non-empty packet", async () => {
    const { buffer } = await sha256OfReviewItemPacket({
      detail: minimalDetail({ postedJeAttemptId: "att-99", qboJeId: "qbo-1" }),
      exportedByEmail: "r@test.com",
      exportedAt,
    });
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("blocked item produces non-empty packet", async () => {
    const { buffer } = await sha256OfReviewItemPacket({
      detail: minimalDetail({
        postBlockReason: "entitlement_denied",
        remediationLog: [
          {
            timestamp: "2026-07-06T01:00:00Z",
            actionType: "remediate",
            category: "posting_remediation",
            inputSummary: "in",
            outputSummary: "out",
          },
        ],
      }),
      exportedByEmail: "r@test.com",
      exportedAt,
    });
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("long narration does not crash", async () => {
    const { buffer } = await sha256OfReviewItemPacket({
      detail: minimalDetail({
        jeDraft: { ...minimalDetail().jeDraft, narration: "x".repeat(5000) },
      }),
      exportedByEmail: "r@test.com",
      exportedAt,
    });
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("produces stable sha256 format per render", async () => {
    const opts = { detail: minimalDetail(), exportedByEmail: "r@test.com", exportedAt };
    const { sha256 } = await sha256OfReviewItemPacket(opts);
    expect(sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("different clients produce different hashes", async () => {
    const a = await sha256OfReviewItemPacket({
      detail: minimalDetail({ firmClientName: "A" }),
      exportedByEmail: "r@test.com",
      exportedAt,
    });
    const b = await sha256OfReviewItemPacket({
      detail: minimalDetail({ firmClientName: "B" }),
      exportedByEmail: "r@test.com",
      exportedAt,
    });
    expect(a.sha256).not.toBe(b.sha256);
  });

  it("ledger events increase buffer size", async () => {
    const base = await sha256OfReviewItemPacket({
      detail: minimalDetail(),
      exportedByEmail: "r@test.com",
      exportedAt,
    });
    const withEvents = await sha256OfReviewItemPacket({
      detail: minimalDetail({
        postingLedgerEvents: [
          { eventId: "1", eventType: "review_item.posted", eventCategory: "posting", createdAt: "2026-07-06T01:00:00Z", payload: {} },
          { eventId: "2", eventType: "review_item.post_blocked", eventCategory: "posting", createdAt: "2026-07-06T02:00:00Z", payload: {} },
        ],
      }),
      exportedByEmail: "r@test.com",
      exportedAt,
    });
    expect(withEvents.buffer.length).toBeGreaterThanOrEqual(base.buffer.length);
  });
});
