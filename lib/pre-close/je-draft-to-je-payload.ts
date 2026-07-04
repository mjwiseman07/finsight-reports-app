/**
 * D6.4c-3 — Convert an approved JEDraft (cents) to a JEPayload (dollars).
 */
import type { JEDraft, JEDraftLine } from "@/lib/pre-close/types";
import type { JEPayload, JELine } from "@/lib/erp/types";

const CENTS_PER_DOLLAR = 100;

export class JeDraftConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JeDraftConversionError";
  }
}

export function convertJeDraftToJEPayload(
  draft: JEDraft,
  opts: { privateNote?: string; currency?: string } = {},
): JEPayload {
  if (!draft || !Array.isArray(draft.lines) || draft.lines.length < 2) {
    throw new JeDraftConversionError(
      `invalid draft: expected >= 2 lines, got ${draft?.lines?.length ?? 0}`,
    );
  }

  const lines: JELine[] = draft.lines.map((l: JEDraftLine, i: number) => {
    if (l.drAmountCents > 0 && l.crAmountCents > 0) {
      throw new JeDraftConversionError(
        `line ${i} has both dr and cr amounts (should be blocked by validator)`,
      );
    }
    if (l.drAmountCents === 0 && l.crAmountCents === 0) {
      throw new JeDraftConversionError(
        `line ${i} has zero amount (should be blocked by validator)`,
      );
    }
    const isDebit = l.drAmountCents > 0;
    const amountCents = isDebit ? l.drAmountCents : l.crAmountCents;
    return {
      account_id: l.accountId,
      amount: amountCents / CENTS_PER_DOLLAR,
      posting_type: isDebit ? "Debit" : "Credit",
      description: l.accountName,
    };
  });

  return {
    transaction_date: draft.transactionDate,
    narration: draft.narration,
    private_note: opts.privateNote,
    lines,
    currency: opts.currency ?? "USD",
  };
}
