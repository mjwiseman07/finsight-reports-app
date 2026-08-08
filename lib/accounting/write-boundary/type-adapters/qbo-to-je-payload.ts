// W1c.1 — Adapter that converts write-boundary JournalEntry (shipped in W1b
// via lib/integrations/shared/contracts/AccountingSystemAdapter) into the Q7
// JEPayload shape consumed by the ported qbo-preflight helpers.
//
// This adapter is pure. It does not touch DB, network, or memory. It exists
// so W1c.2's QuickBooksAccountingProvider can call the ported Q7 helpers
// without either side having to know about the other's type system.

import type { JournalEntry } from "@/lib/integrations/shared/contracts/AccountingSystemAdapter";
import type { JEPayload, JELine } from "@/lib/erp/types";

export type ToJEPayloadContext = {
  /**
   * Currency for the JE. Callers should have already resolved this via
   * resolveCurrencyForFirmClient from the qbo-preflight barrel.
   */
  currency: string;
  /**
   * Optional private note to attach to the QBO JE (Q7 populates this from the
   * caller). If omitted, the JEPayload private_note remains undefined.
   */
  privateNote?: string;
};

/**
 * Converts a write-boundary JournalEntry into a Q7 JEPayload.
 *
 * The write-boundary contract uses one JournalLine row per account with
 * separate `debit` and `credit` numeric fields (positive amounts on the
 * relevant side, zero on the other). Q7's JEPayload uses one JELine row per
 * posting side with a `posting_type` discriminator and a single `amount`
 * field.
 *
 * Conversion rules:
 *   - If line.debit > 0 → emit one JELine with posting_type='Debit', amount=line.debit
 *   - If line.credit > 0 → emit one JELine with posting_type='Credit', amount=line.credit
 *   - If both are > 0 → throw (invalid — write-boundary validator should have
 *     rejected this already; this is a defense-in-depth safety net)
 *   - If both are 0 → skipped (zero-amount lines are dropped)
 *   - Order preserved: emitted JELines follow the same order as input lines
 *
 * Field mapping:
 *   - entry.journalDate → payload.transaction_date (both ISO YYYY-MM-DD)
 *   - entry.narration → payload.narration
 *   - ctx.privateNote → payload.private_note (optional)
 *   - line.accountCode (canonical account code from write-boundary) → JELine.account_id
 *     (QBO uses numeric account IDs; the write-boundary JournalLine stores the
 *     QBO Account.Id in .accountCode per the shipped contract commentary).
 *   - line.description → JELine.description
 *   - line.classId → JELine.class_id
 *   - line.trackingCategoryId is dropped (Xero-only field; irrelevant for QBO)
 *   - ctx.currency → payload.currency (uppercased)
 */
export function toJEPayload(
  entry: JournalEntry,
  ctx: ToJEPayloadContext,
): JEPayload {
  const lines: JELine[] = [];

  for (let i = 0; i < entry.lines.length; i++) {
    const line = entry.lines[i];
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;

    if (debit > 0 && credit > 0) {
      throw new Error(
        `toJEPayload: line ${i} has both debit=${debit} and credit=${credit}; ` +
          `write-boundary validator should have rejected this`,
      );
    }

    if (debit > 0) {
      lines.push({
        account_id: line.accountCode,
        amount: debit,
        posting_type: "Debit",
        description: line.description,
        class_id: line.classId,
      });
    } else if (credit > 0) {
      lines.push({
        account_id: line.accountCode,
        amount: credit,
        posting_type: "Credit",
        description: line.description,
        class_id: line.classId,
      });
    }
    // debit === 0 && credit === 0 → dropped
  }

  return {
    transaction_date: entry.journalDate,
    narration: entry.narration,
    private_note: ctx.privateNote,
    currency: ctx.currency.toUpperCase(),
    lines,
  };
}
