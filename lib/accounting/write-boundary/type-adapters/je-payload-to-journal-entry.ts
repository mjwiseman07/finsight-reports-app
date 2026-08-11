import type { JournalEntry } from "@/lib/integrations/shared/contracts/AccountingSystemAdapter";
import type { JEPayload } from "@/lib/erp/types";

export type JePayloadToJournalEntryInput = {
  payload: JEPayload;
  tenantId: string;
  homeCurrency: string;
  externalRef: string;
  status?: "DRAFT" | "POSTED";
};

/**
 * WBP W1c.3 — Convert legacy JEPayload shape to the W1a canonical JournalEntry.
 *
 * Legacy JELine uses posting_type + amount; JournalLine uses debit + credit
 * (both numbers, one is 0). Legacy line.account_id maps to JournalLine.accountCode
 * because the legacy code passes account_id as the code (QBO uses numeric Ids,
 * which double as codes). For Xero this adapter is not exercised — W1c.3
 * only wires the QBO poster.
 */
export function jePayloadToJournalEntry(input: JePayloadToJournalEntryInput): JournalEntry {
  const { payload, tenantId, homeCurrency, externalRef, status = "POSTED" } = input;
  const currency = payload.currency ?? homeCurrency;
  return {
    tenantId,
    journalDate: payload.transaction_date,
    narration: payload.narration ?? "",
    currency,
    status,
    externalRef,
    lines: payload.lines.map((l) => ({
      accountCode: l.account_id,
      debit: l.posting_type === "Debit" ? Number(l.amount) : 0,
      credit: l.posting_type === "Credit" ? Number(l.amount) : 0,
      description: l.description,
      classId: l.class_id,
    })),
  };
}
