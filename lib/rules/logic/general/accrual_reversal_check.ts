import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";
import type { JEDraft, JEDraftLine } from "@/lib/pre-close/types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — lib/qbo-rest.js is untyped
import { findJournalEntries } from "@/lib/qbo-rest";

export const RULE_ID = "gen.accrual_reversal_check";
export const RULE_VERSION = 1;

interface QBOJournalEntry {
  Id: string;
  TxnDate: string;
  DocNumber?: string;
  PrivateNote?: string;
  Line?: Array<{
    Amount?: number;
    JournalEntryLineDetail?: {
      PostingType?: "Debit" | "Credit";
      AccountRef?: { value?: string; name?: string };
    };
  }>;
  Adjustment?: boolean;
}

function isReversing(je: QBOJournalEntry): boolean {
  const note = (je.PrivateNote ?? "").toLowerCase();
  const doc = (je.DocNumber ?? "").toLowerCase();
  return note.includes("revers") || doc.includes("rev") || doc.startsWith("r-");
}
function isAccrual(je: QBOJournalEntry): boolean {
  const note = (je.PrivateNote ?? "").toLowerCase();
  return note.includes("accrual") || note.includes("accrue");
}
function priorPeriod(endDateISO: string): { start: string; end: string } {
  const end = new Date(endDateISO);
  const priorEnd = new Date(end.getFullYear(), end.getMonth(), 0);
  const priorStart = new Date(priorEnd.getFullYear(), priorEnd.getMonth(), 1);
  return {
    start: priorStart.toISOString().slice(0, 10),
    end: priorEnd.toISOString().slice(0, 10),
  };
}
function currentPeriod(endDateISO: string): { start: string; end: string } {
  const end = new Date(endDateISO);
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: endDateISO.slice(0, 10),
  };
}

/**
 * D6.4c-2 — build a reversing JE draft from a source accrual JE.
 * Swaps debit/credit sides. Amounts in integer cents to match the JEDraft
 * contract. Returns null if the source JE is unusable (missing lines, missing
 * amounts/accounts, unbalanced, or zero total) — in which case the rule still
 * fires but emits no proposal.
 */
function buildReversalDraft(source: QBOJournalEntry, transactionDate: string): JEDraft | null {
  const lines = source.Line ?? [];
  if (lines.length < 2) return null;
  const draftLines: JEDraftLine[] = [];
  let idx = 0;
  for (const line of lines) {
    const posting = line.JournalEntryLineDetail?.PostingType;
    const amountDollars = line.Amount;
    const accountId = line.JournalEntryLineDetail?.AccountRef?.value;
    const accountName = line.JournalEntryLineDetail?.AccountRef?.name;
    if (!posting || typeof amountDollars !== "number" || !accountId || !accountName) return null;
    const amountCents = Math.round(amountDollars * 100);
    if (amountCents <= 0) return null;
    // Swap: source debit -> reversal credit, source credit -> reversal debit.
    draftLines.push({
      lineIndex: idx++,
      accountId,
      accountName,
      drAmountCents: posting === "Credit" ? amountCents : 0,
      crAmountCents: posting === "Debit" ? amountCents : 0,
      memo: `Reversal of accrual ${source.DocNumber ?? source.Id}`,
      evidenceRef: {
        kind: "curated_rule_fire",
        ref: source.Id,
        detail: { source_doc_number: source.DocNumber, source_txn_date: source.TxnDate },
      },
    });
  }
  const totalDr = draftLines.reduce((s, l) => s + l.drAmountCents, 0);
  const totalCr = draftLines.reduce((s, l) => s + l.crAmountCents, 0);
  if (totalDr !== totalCr || totalDr === 0) return null;
  return {
    narration: `Reverse missed accrual JE ${source.DocNumber ?? source.Id} (${source.TxnDate})`,
    transactionDate,
    lines: draftLines,
  };
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
  const prior = priorPeriod(periodEnd);
  const current = currentPeriod(periodEnd);
  try {
    // lib/qbo-rest.js findJournalEntries takes { start_date, end_date } and
    // returns a flat array of JournalEntry entities.
    const [priorJEs, currentJEs] = await Promise.all([
      findJournalEntries(ctx.qbo.accessToken, ctx.qbo.realmId, {
        start_date: prior.start,
        end_date: prior.end,
      }) as Promise<QBOJournalEntry[]>,
      findJournalEntries(ctx.qbo.accessToken, ctx.qbo.realmId, {
        start_date: current.start,
        end_date: current.end,
      }) as Promise<QBOJournalEntry[]>,
    ]);

    const accruals = (priorJEs ?? []).filter(isAccrual);
    if (accruals.length === 0) {
      return {
        fired: false,
        outcome: "suppressed",
        reason_code: "no_prior_accruals",
        reason_detail: { prior },
      };
    }

    const currentReversals = (currentJEs ?? []).filter(isReversing);
    const unmatched = accruals.filter((a) => {
      const marker = a.DocNumber ?? a.Id;
      return !currentReversals.some(
        (r) => (r.PrivateNote ?? "").includes(marker) || (r.DocNumber ?? "").includes(marker),
      );
    });

    if (unmatched.length === 0) {
      return {
        fired: false,
        outcome: "suppressed",
        reason_code: "all_accruals_reversed",
        reason_detail: { checked: accruals.length },
      };
    }

    const firstUnmatched = unmatched[0];
    const proposedJE = buildReversalDraft(firstUnmatched, periodEnd);
    return {
      fired: true,
      outcome: "fired",
      reason_code: "missing_reversals",
      reason_detail: {
        missingCount: unmatched.length,
        totalAccruals: accruals.length,
        priorPeriod: prior,
        currentPeriod: current,
        missing: unmatched
          .slice(0, 20)
          .map((a) => ({ id: a.Id, docNumber: a.DocNumber, txnDate: a.TxnDate })),
        // D6.4c-2: emit proposedJE for the first unmatched accrual so the
        // orchestrator can compose it into a pre_close_review_items row. Left
        // undefined when the source JE shape can't be safely reversed (missing
        // amounts/accounts, unbalanced, or zero total) — the rule still fires.
        proposedJE: proposedJE ?? undefined,
        evidenceRefs: proposedJE
          ? [
              {
                kind: "prior_period_je",
                qbo_id: firstUnmatched.Id,
                doc_number: firstUnmatched.DocNumber,
                txn_date: firstUnmatched.TxnDate,
              },
            ]
          : [],
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { fired: false, outcome: "error", reason_code: "qbo_fetch_failed", reason_detail: { message } };
  }
}
