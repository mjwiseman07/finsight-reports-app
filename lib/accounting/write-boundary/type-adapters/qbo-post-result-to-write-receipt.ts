// W1c.1 — Adapter that converts Q7 JEPostResult into the write-boundary
// WriteReceipt shape. Throws WriteRejected / WriteFailed for non-success
// branches so callers get typed error handling matching the W1a contract.
//
// NOTE (deviates from paste block ctor call shapes): WriteRejected /
// WriteFailed constructors shipped in W1a are
//   WriteRejected(issues: ValidationIssue[], lifecycleEventIds: string[])
//   WriteFailed(message, lifecycleEventIds, httpStatus?, providerErrorCode?)
// The paste block had inverted arg order vs that freeze; this adapter matches
// the shipped contract. ValidationIssue.code is a closed W1a union — Q7
// rejection reasons are encoded in `message` with a casted issue until W1c.2
// widens the union if needed.

import type {
  JournalEntry,
  ValidationIssue,
  WriteReceipt,
} from "@/lib/integrations/shared/contracts/AccountingSystemAdapter";
import {
  WriteRejected,
  WriteFailed,
} from "@/lib/integrations/shared/contracts/AccountingSystemAdapter";
import type { JEPostResult } from "@/lib/erp/types";

export type ToWriteReceiptContext = {
  /**
   * Lifecycle event IDs already emitted for this write, in emission order.
   * Typically [write-validated, write-posted] on happy path.
   */
  lifecycleEventIds: string[];
  /**
   * ISO8601 UTC timestamp for the write. Callers should pass the same value
   * they used for the lifecycle emit so the receipt and event align.
   */
  writtenAt: string;
  /**
   * DRAFT or POSTED. Q7 always posts final (no draft path), so callers
   * default to "POSTED" unless a future path adds draft support.
   */
  status?: "DRAFT" | "POSTED";
};

/**
 * Converts Q7 JEPostResult into a write-boundary WriteReceipt.
 *
 * - status='posted' → returns WriteReceipt
 * - status='rejected' → throws WriteRejected with the reason + details
 * - status='failed' → throws WriteFailed with the error + retryable flag
 *
 * The resolvedAccounts array is populated with the input entry's lines
 * (accountCode + accountId) because Q7's success payload does not itemize
 * per-line resolved IDs (QBO returns them but Q7's poster doesn't expose them
 * through JEPostResult). The write-boundary drift-detector in W1c.2 will
 * re-fetch the JE from QBO and validate line resolution independently.
 */
export function toWriteReceipt(
  result: JEPostResult,
  entry: JournalEntry,
  ctx: ToWriteReceiptContext,
): WriteReceipt {
  if (result.status === "posted") {
    return {
      providerJournalId: result.qbo_je_id,
      status: ctx.status ?? "POSTED",
      writtenAt: ctx.writtenAt,
      resolvedAccounts: entry.lines.map((l) => ({
        accountCode: l.accountCode,
        accountId: l.accountId ?? l.accountCode,
      })),
      lifecycleEventIds: ctx.lifecycleEventIds,
    };
  }

  if (result.status === "rejected") {
    const issues: ValidationIssue[] = [
      {
        code: "provider-rejected",
        message: `QBO write rejected: ${result.reason}; details=${JSON.stringify(result.details ?? {})}`,
      },
    ];
    throw new WriteRejected(issues, ctx.lifecycleEventIds);
  }

  // result.status === "failed"
  throw new WriteFailed(
    `${result.error}${result.retryable ? " (retryable)" : " (non-retryable)"}`,
    ctx.lifecycleEventIds,
    undefined,
    result.retryable ? "retryable" : "non_retryable",
  );
}
