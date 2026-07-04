/**
 * D6.4c-1 — Basis guard matrix. Pure function; no mocks.
 */
import { describe, expect, it } from "vitest";
import { applyBasisGuard, type BasisGuardInput } from "@/lib/basis/guard";

function input(overrides: Partial<BasisGuardInput> = {}): BasisGuardInput {
  return {
    engagementMethod: "accrual",
    ruleScope: { applies_to_cash_basis: true, applies_to_accrual_basis: true },
    proposalShape: { hasAccrualLine: false },
    ruleId: "gen.test_rule",
    ...overrides,
  };
}

describe("basis/guard applyBasisGuard", () => {
  it("cash engagement + cash-scoped rule + non-accrual line -> allowed", () => {
    const r = applyBasisGuard(
      input({
        engagementMethod: "cash",
        ruleScope: { applies_to_cash_basis: true, applies_to_accrual_basis: false },
        proposalShape: { hasAccrualLine: false },
      }),
    );
    expect(r.allowed).toBe(true);
    expect(r.reason_code).toBeNull();
  });

  it("cash engagement + accrual-only rule -> blocked basis_mismatch_accrual_on_cash", () => {
    const r = applyBasisGuard(
      input({
        engagementMethod: "cash",
        ruleScope: { applies_to_cash_basis: false, applies_to_accrual_basis: true },
      }),
    );
    expect(r.allowed).toBe(false);
    expect(r.reason_code).toBe("basis_mismatch_accrual_on_cash");
    expect(r.reason_text).toContain("cash basis");
  });

  it("cash engagement + cash-scoped rule + accrual line -> blocked (belt-and-suspenders)", () => {
    const r = applyBasisGuard(
      input({
        engagementMethod: "cash",
        ruleScope: { applies_to_cash_basis: true, applies_to_accrual_basis: true },
        proposalShape: { hasAccrualLine: true },
      }),
    );
    expect(r.allowed).toBe(false);
    expect(r.reason_code).toBe("basis_mismatch_accrual_on_cash");
  });

  it("accrual engagement + accrual-only rule -> allowed", () => {
    const r = applyBasisGuard(
      input({
        engagementMethod: "accrual",
        ruleScope: { applies_to_cash_basis: false, applies_to_accrual_basis: true },
      }),
    );
    expect(r.allowed).toBe(true);
  });

  it("modified-cash engagement + cash-scoped rule -> allowed", () => {
    const r = applyBasisGuard(
      input({
        engagementMethod: "modified_cash",
        ruleScope: { applies_to_cash_basis: true, applies_to_accrual_basis: true },
      }),
    );
    expect(r.allowed).toBe(true);
  });

  it("modified-cash engagement + accrual-only rule -> blocked modified_cash reason", () => {
    const r = applyBasisGuard(
      input({
        engagementMethod: "modified_cash",
        ruleScope: { applies_to_cash_basis: false, applies_to_accrual_basis: true },
      }),
    );
    expect(r.allowed).toBe(false);
    expect(r.reason_code).toBe("basis_mismatch_modified_cash_accrual_rule");
  });

  it("rule missing both scopes -> blocked rule_missing_basis_scope", () => {
    const r = applyBasisGuard(
      input({
        engagementMethod: "accrual",
        ruleScope: { applies_to_cash_basis: false, applies_to_accrual_basis: false },
      }),
    );
    expect(r.allowed).toBe(false);
    expect(r.reason_code).toBe("rule_missing_basis_scope");
  });

  it("unknown method -> blocked unknown_accounting_method", () => {
    const r = applyBasisGuard(input({ engagementMethod: "tax" }));
    expect(r.allowed).toBe(false);
    expect(r.reason_code).toBe("unknown_accounting_method");
  });
});
