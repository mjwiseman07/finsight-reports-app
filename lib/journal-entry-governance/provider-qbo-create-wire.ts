/**
 * JE-3B2 — Convert hashed governed preview → QBO JournalEntry wire body.
 * Hash authority remains the preview (provider_request_hash). Wire body is
 * the transport encoding of that preview. Never imports the legacy poster.
 */

import type { JeQboPayloadPreview } from "./execution-payload";

export type JeQboJournalEntryWireBody = {
  TxnDate: string;
  PrivateNote: string;
  Line: Array<{
    Id: string;
    DetailType: "JournalEntryLineDetail";
    Amount: number;
    Description: string | null;
    JournalEntryLineDetail: {
      PostingType: "Debit" | "Credit";
      AccountRef: { value: string };
      ClassRef?: { value: string };
    };
  }>;
};

/**
 * Map preview → Intuit JournalEntry create body.
 * PrivateNote must already contain the exact persisted correlation marker.
 */
export function toGovernedQboJournalEntryWireBody(
  preview: JeQboPayloadPreview,
): JeQboJournalEntryWireBody {
  return {
    TxnDate: String(preview.TxnDate).slice(0, 10),
    PrivateNote: String(preview.PrivateNote),
    Line: (preview.Line || []).map((line, idx) => {
      const detail: JeQboJournalEntryWireBody["Line"][number]["JournalEntryLineDetail"] =
        {
          PostingType: line.posting_type,
          AccountRef: { value: String(line.AccountRef.value) },
        };
      if (line.ClassRef?.value) {
        detail.ClassRef = { value: String(line.ClassRef.value) };
      }
      return {
        Id: String(idx),
        DetailType: "JournalEntryLineDetail" as const,
        Amount: Number(line.Amount),
        Description: line.Description,
        JournalEntryLineDetail: detail,
      };
    }),
  };
}

export function assertWirePrivateNoteContainsMarker(args: {
  privateNote: string;
  correlationMarker: string;
}): void {
  if (!args.privateNote.includes(args.correlationMarker)) {
    throw new Error(
      "Governed QBO create PrivateNote must contain the exact persisted correlation marker.",
    );
  }
}
