/**
 * @rule       gen.reversing_entry_period_check
 * @assertions primary:cutoff | secondary:accuracy
 * @accounts   accrued_liabilities, operating_expenses
 * @citation   ISA 315 ¶A190
 */
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — lib/qbo-rest.js is untyped
import { findJournalEntries } from "@/lib/qbo-rest";

export const RULE_ID = "gen.reversing_entry_period_check";
export const RULE_VERSION = 1;

interface QBOJournalEntry {
  Id: string;
  TxnDate: string;
  DocNumber?: string;
  PrivateNote?: string;
}

function isReversing(je: QBOJournalEntry): boolean {
  const note = (je.PrivateNote ?? "").toLowerCase();
  const doc = (je.DocNumber ?? "").toLowerCase();
  return note.includes("revers") || doc.includes("rev") || doc.startsWith("r-");
}
function firstDayOfMonth(dateISO: string): string {
  const d = new Date(dateISO);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function evaluate(ctx: RuleContext): Promise<RuleResult> {
  if (ctx.accountingMethod === "cash") {
    return {
      fired: false,
      outcome: "suppressed",
      reason_code: "not_applicable_cash_basis",
      reason_detail: {},
    };
  }
  if (!ctx.qbo) {
    return { fired: false, outcome: "suppressed", reason_code: "qbo_unavailable", reason_detail: {} };
  }
  const periodEnd =
    (ctx.inputs.periodEndDate as string | undefined) ?? new Date().toISOString().slice(0, 10);
  const end = new Date(periodEnd);
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  try {
    const jes = (await findJournalEntries(ctx.qbo.accessToken, ctx.qbo.realmId, {
      start_date: start.toISOString().slice(0, 10),
      end_date: periodEnd.slice(0, 10),
    })) as QBOJournalEntry[];

    const reversals = (jes ?? []).filter(isReversing);
    if (reversals.length === 0) {
      return {
        fired: false,
        outcome: "suppressed",
        reason_code: "no_reversals_this_period",
        reason_detail: {},
      };
    }

    const expected = firstDayOfMonth(periodEnd);
    const misdated = reversals.filter((r) => r.TxnDate !== expected);
    if (misdated.length === 0) {
      return {
        fired: false,
        outcome: "suppressed",
        reason_code: "all_reversals_correctly_dated",
        reason_detail: { expected, checked: reversals.length },
      };
    }

    return {
      fired: true,
      outcome: "fired",
      reason_code: "reversal_wrong_period",
      reason_detail: {
        expected,
        misdatedCount: misdated.length,
        totalReversals: reversals.length,
        misdated: misdated
          .slice(0, 20)
          .map((r) => ({ id: r.Id, docNumber: r.DocNumber, txnDate: r.TxnDate })),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { fired: false, outcome: "error", reason_code: "qbo_fetch_failed", reason_detail: { message } };
  }
}
