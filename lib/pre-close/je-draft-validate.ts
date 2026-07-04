/**
 * D6.4c-1 — Pure JE draft validator. Mirrors the migration's Postgres check.
 * Returned as a pure function so the composer can validate BEFORE inserting
 * (fail fast, useful test targeting, avoids DB round-trips on bad drafts).
 */
import type { JEDraft } from "./types";

export interface ValidateJeDraftResult {
  ok: boolean;
  totalDebitCents: number;
  totalCreditCents: number;
  lineCount: number;
  reason?: string;
}

export function validateJeDraft(draft: JEDraft): ValidateJeDraftResult {
  if (!draft || !Array.isArray(draft.lines)) {
    return { ok: false, totalDebitCents: 0, totalCreditCents: 0, lineCount: 0, reason: "missing_lines" };
  }
  if (draft.lines.length < 2) {
    return { ok: false, totalDebitCents: 0, totalCreditCents: 0, lineCount: draft.lines.length, reason: "min_two_lines" };
  }
  let dr = 0;
  let cr = 0;
  for (const l of draft.lines) {
    if (!Number.isInteger(l.drAmountCents) || l.drAmountCents < 0) {
      return { ok: false, totalDebitCents: dr, totalCreditCents: cr, lineCount: draft.lines.length, reason: "invalid_dr" };
    }
    if (!Number.isInteger(l.crAmountCents) || l.crAmountCents < 0) {
      return { ok: false, totalDebitCents: dr, totalCreditCents: cr, lineCount: draft.lines.length, reason: "invalid_cr" };
    }
    if (l.drAmountCents > 0 && l.crAmountCents > 0) {
      return { ok: false, totalDebitCents: dr, totalCreditCents: cr, lineCount: draft.lines.length, reason: "line_has_both_dr_and_cr" };
    }
    if (l.drAmountCents === 0 && l.crAmountCents === 0) {
      return { ok: false, totalDebitCents: dr, totalCreditCents: cr, lineCount: draft.lines.length, reason: "line_has_zero_amount" };
    }
    if (!l.accountId || !l.accountName) {
      return { ok: false, totalDebitCents: dr, totalCreditCents: cr, lineCount: draft.lines.length, reason: "line_missing_account" };
    }
    dr += l.drAmountCents;
    cr += l.crAmountCents;
  }
  if (dr !== cr) {
    return { ok: false, totalDebitCents: dr, totalCreditCents: cr, lineCount: draft.lines.length, reason: "unbalanced" };
  }
  if (!draft.narration || !draft.transactionDate) {
    return { ok: false, totalDebitCents: dr, totalCreditCents: cr, lineCount: draft.lines.length, reason: "missing_narration_or_date" };
  }
  return { ok: true, totalDebitCents: dr, totalCreditCents: cr, lineCount: draft.lines.length };
}
