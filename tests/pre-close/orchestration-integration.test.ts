/**
 * D6.4c-2 — Orchestration end-to-end integration.
 *
 * Exercises the REAL composeProposal + REAL insertReviewItem + REAL publishEvent
 * against the pre-close in-memory DB mock (no mocking of composer/inserter). This
 * is the paired integration test for the wiring covered by unit mocks in
 * tests/rules/runner/orchestrate-proposal.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockDb } from "./_mock-db";

const mock = makeMockDb();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));

import { composeProposal } from "@/lib/pre-close/compose-proposal";
import { insertReviewItem } from "@/lib/pre-close/insert-review-item";
import type { JEDraft } from "@/lib/pre-close/types";

function balancedDraft(): JEDraft {
  return {
    narration: "reverse accrual",
    transactionDate: "2026-07-06",
    lines: [
      { lineIndex: 0, accountId: "6000", accountName: "Rent", drAmountCents: 10000, crAmountCents: 0, memo: "" },
      { lineIndex: 1, accountId: "2100", accountName: "Accrued Liab", drAmountCents: 0, crAmountCents: 10000, memo: "" },
    ],
  };
}

function composeInput(fireId: string, proposedJE: JEDraft) {
  return {
    fireId,
    firmClientId: "fc1",
    ruleId: "gen.canary",
    ruleVersion: 1,
    ruleReasonCode: "canary_fire",
    ruleReasonDetail: {},
    severity: "warning" as const,
    closePeriodId: null,
    proposedJE,
    evidenceRefs: [],
  };
}

beforeEach(() => {
  mock.__reset();
  mock.__seed("portcos", [{ firm_client_id: "fc1", engagement_id: "eng1", created_at: "2026-01-01T00:00:00Z" }]);
  mock.__seed("firm_clients", [{ id: "fc1", accounting_method: "accrual", firm_id: "firm1" }]);
  mock.__seed("curated_rules_registry", [
    { rule_id: "gen.canary", applies_to_cash_basis: false, applies_to_accrual_basis: true, is_active: true },
  ]);
});

describe("D6.4c-2 orchestration end-to-end (real composer + real inserter)", () => {
  it("composed row lands in pre_close_review_items with balanced totals", async () => {
    const composed = await composeProposal(composeInput("fire-1", balancedDraft()));
    expect(composed.status).toBe("composed");
    if (composed.status !== "composed") throw new Error("expected composed");
    const inserted = await insertReviewItem(composed.row);
    expect(inserted.jeDraftTotalDebitCents).toBe(10000);
    expect(inserted.jeDraftTotalCreditCents).toBe(10000);
    expect(inserted.basisGuardReasonCode).toBeNull();
    expect(mock.__state.ledger_events).toHaveLength(1);
    expect(mock.__state.ledger_events[0].event_type).toBe("review_item.composed");
  });

  it("cash basis + accrual-scoped rule -> basis_blocked, no row inserted", async () => {
    mock.__state.firm_clients[0].accounting_method = "cash";
    const composed = await composeProposal(composeInput("fire-2", balancedDraft()));
    expect(composed.status).toBe("basis_blocked");
    expect(mock.__state.pre_close_review_items).toHaveLength(0);
  });

  it("duplicate fireId -> insertReviewItem throws (unique constraint fires)", async () => {
    const composed = await composeProposal(composeInput("fire-3", balancedDraft()));
    if (composed.status !== "composed") throw new Error("expected composed");
    await insertReviewItem(composed.row);
    await expect(insertReviewItem(composed.row)).rejects.toThrow();
  });

  it("unbalanced draft -> invalid_draft, no row, no ledger event from composer", async () => {
    const bad = balancedDraft();
    bad.lines[1].crAmountCents = 9999;
    const composed = await composeProposal(composeInput("fire-4", bad));
    expect(composed.status).toBe("invalid_draft");
    expect(mock.__state.pre_close_review_items).toHaveLength(0);
    expect(mock.__state.ledger_events).toHaveLength(0);
  });
});
