/**
 * D6.4c-1 — Composer round-trip (basis guard + entitlement gate) tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockDb } from "./_mock-db";

const mock = makeMockDb();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));

import { composeProposal } from "@/lib/pre-close/compose-proposal";
import { EntitlementDenied } from "@/lib/entitlements/gate";
import type { JEDraft } from "@/lib/pre-close/types";

function balancedDraft(): JEDraft {
  return {
    narration: "test proposal",
    transactionDate: "2026-07-06",
    lines: [
      { lineIndex: 0, accountId: "6000", accountName: "Rent Expense", drAmountCents: 10000, crAmountCents: 0, memo: "" },
      { lineIndex: 1, accountId: "1000", accountName: "Operating Cash", drAmountCents: 0, crAmountCents: 10000, memo: "" },
    ],
  };
}

function seedAccrualRule(ruleId = "gen.accrual_check") {
  mock.__seed("curated_rules_registry", [
    { rule_id: ruleId, applies_to_cash_basis: false, applies_to_accrual_basis: true, is_active: true },
  ]);
}

function baseInput(over: Record<string, unknown> = {}) {
  return {
    fireId: "fire-1",
    firmClientId: "fc1",
    ruleId: "gen.accrual_check",
    ruleVersion: 1,
    ruleReasonCode: "needs_accrual",
    ruleReasonDetail: {},
    severity: "warning" as const,
    closePeriodId: null,
    proposedJE: balancedDraft(),
    ...over,
  };
}

beforeEach(() => {
  mock.__reset();
});

describe("pre-close/compose-proposal composeProposal", () => {
  it("accrual engagement + accrual rule + balanced draft -> composed", async () => {
    mock.__seed("portcos", [{ firm_client_id: "fc1", engagement_id: "eng1", created_at: "2026-01-01T00:00:00Z" }]);
    mock.__seed("firm_clients", [{ id: "fc1", accounting_method: "accrual", firm_id: "firm1" }]);
    seedAccrualRule();

    const r = await composeProposal(baseInput());
    expect(r.status).toBe("composed");
    if (r.status === "composed") {
      expect(r.row.engagementId).toBe("eng1");
      expect(r.row.basisGuardReasonCode).toBeNull();
    }
  });

  it("cash engagement + accrual rule -> basis_blocked", async () => {
    mock.__seed("portcos", [{ firm_client_id: "fc1", engagement_id: "eng1", created_at: "2026-01-01T00:00:00Z" }]);
    mock.__seed("firm_clients", [{ id: "fc1", accounting_method: "cash", firm_id: "firm1" }]);
    seedAccrualRule();

    const r = await composeProposal(baseInput());
    expect(r.status).toBe("basis_blocked");
    if (r.status === "basis_blocked") {
      expect(r.reasonCode).toBe("basis_mismatch_accrual_on_cash");
    }
  });

  it("invalid draft (unbalanced) -> invalid_draft", async () => {
    const bad = balancedDraft();
    bad.lines[1].crAmountCents = 9999;
    const r = await composeProposal(baseInput({ proposedJE: bad }));
    expect(r.status).toBe("invalid_draft");
  });

  it("addonGate ap_intake without active entitlement -> throws EntitlementDenied", async () => {
    mock.__seed("portcos", [{ firm_client_id: "fc1", engagement_id: "eng1", created_at: "2026-01-01T00:00:00Z" }]);
    mock.__seed("firm_clients", [{ id: "fc1", accounting_method: "accrual", firm_id: "firm1" }]);
    seedAccrualRule();
    // no engagement_addons row -> gate denies

    await expect(composeProposal(baseInput({ addonGate: "ap_intake" }))).rejects.toBeInstanceOf(
      EntitlementDenied,
    );
  });

  it("addonGate ap_intake WITH active entitlement -> composes", async () => {
    mock.__seed("portcos", [{ firm_client_id: "fc1", engagement_id: "eng1", created_at: "2026-01-01T00:00:00Z" }]);
    mock.__seed("firm_clients", [{ id: "fc1", accounting_method: "accrual", firm_id: "firm1" }]);
    seedAccrualRule();
    mock.__seed("engagement_addons", [
      { engagement_id: "eng1", addon_code: "ap_intake", is_active: true },
    ]);

    const r = await composeProposal(baseInput({ addonGate: "ap_intake" }));
    expect(r.status).toBe("composed");
  });
});
