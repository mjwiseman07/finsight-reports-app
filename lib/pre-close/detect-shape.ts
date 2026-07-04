/**
 * D6.4c-1 — Detect whether a JE draft contains an accrual line. Used by the
 * basis guard's proposalShape.hasAccrualLine hint. Pure.
 *
 * An "accrual line" is a credit to a liability account whose name matches a
 * curated set of accrual patterns, OR a debit to a contract-asset / prepaid
 * pattern. This is deliberately name-based because the D6.0 chart-of-accounts
 * shape is not yet available in the fires; account_type will subsume this in
 * D-Assertions Part 1 when we join through curated_rules_registry.
 */
import type { JEDraft } from "./types";

const ACCRUAL_LIABILITY_PATTERNS = [
  /accrued\s/i,
  /accrual/i,
  /warranty\s+reserve/i,
  /returns\s+reserve/i,
  /deferred\s+revenue/i,
  /unearned\s+revenue/i,
  /gift\s+card\s+liability/i,
  /loyalty\s+.*\s+liability/i,
];

const ACCRUAL_ASSET_PATTERNS = [
  /contract\s+asset/i,
  /prepaid/i,
  /unbilled\s+(ar|receivable)/i,
  /wip\s+.*\s+(billable|hours)/i,
];

export function detectAccrualLine(draft: JEDraft): boolean {
  for (const line of draft.lines ?? []) {
    const name = line.accountName ?? "";
    if (line.crAmountCents > 0 && ACCRUAL_LIABILITY_PATTERNS.some((r) => r.test(name))) {
      return true;
    }
    if (line.drAmountCents > 0 && ACCRUAL_ASSET_PATTERNS.some((r) => r.test(name))) {
      return true;
    }
  }
  return false;
}
