/**
 * JE-3A — Pure provider-neutral → QBO payload preview mapper.
 * No network. Cents stay integer in domain; dollars only in adapter output.
 * Does NOT import or call the QBO journal-entry poster.
 */

import { composeJePrivateNote } from "./execution-correlation";
import type { JeProposalLine, JournalEntryProposalRow } from "./types";

export type JeQboPayloadPreviewLine = {
  Description: string | null;
  Amount: number;
  posting_type: "Debit" | "Credit";
  AccountRef: { value: string };
  ClassRef?: { value: string };
};

export type JeQboPayloadPreview = {
  TxnDate: string;
  PrivateNote: string;
  correlation_marker: string;
  Line: JeQboPayloadPreviewLine[];
  /** Domain cents retained for audit; not sent as-is to QBO. */
  domain_total_debits_cents: number;
  domain_total_credits_cents: number;
  currency: string;
};

function centsToDollars(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function mapLine(line: JeProposalLine): JeQboPayloadPreviewLine | null {
  const debit = Number(line.debitCents) || 0;
  const credit = Number(line.creditCents) || 0;
  if (debit > 0 && credit === 0) {
    const out: JeQboPayloadPreviewLine = {
      Description: line.description ? String(line.description) : null,
      Amount: centsToDollars(debit),
      posting_type: "Debit",
      AccountRef: { value: String(line.accountId) },
    };
    if (line.classId) out.ClassRef = { value: String(line.classId) };
    return out;
  }
  if (credit > 0 && debit === 0) {
    const out: JeQboPayloadPreviewLine = {
      Description: line.description ? String(line.description) : null,
      Amount: centsToDollars(credit),
      posting_type: "Credit",
      AccountRef: { value: String(line.accountId) },
    };
    if (line.classId) out.ClassRef = { value: String(line.classId) };
    return out;
  }
  return null;
}

/**
 * Map a governed proposal + correlation marker to a QBO-shaped preview.
 * Pure. Never sends. Never touches poster.
 */
export function mapGovernedProposalToQboPayload(args: {
  proposal: JournalEntryProposalRow;
  correlationMarker: string;
}): JeQboPayloadPreview {
  const privateNote = composeJePrivateNote({
    userMemo: args.proposal.memo,
    correlationMarker: args.correlationMarker,
  });
  const lines: JeQboPayloadPreviewLine[] = [];
  for (const line of args.proposal.lines || []) {
    const mapped = mapLine(line);
    if (mapped) lines.push(mapped);
  }
  return {
    TxnDate: String(args.proposal.txn_date).slice(0, 10),
    PrivateNote: privateNote,
    correlation_marker: args.correlationMarker,
    Line: lines,
    domain_total_debits_cents: Number(args.proposal.total_debits_cents) || 0,
    domain_total_credits_cents: Number(args.proposal.total_credits_cents) || 0,
    currency: String(args.proposal.currency || "USD"),
  };
}
