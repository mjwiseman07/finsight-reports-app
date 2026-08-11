// WBP W1b — Compare the JournalEntry the caller sent vs the ProviderWriteResponse.
// Detects the W0.5 finding 3A silent-strip pattern (Xero returns 200 with fewer
// lines than requested). Also catches account rewriting and amount changes.

import type { JournalEntry, ProviderWriteResponse } from "./types";

const EPSILON = 0.01;

export type DriftResult = {
  drifted: boolean;
  reasons: string[];
};

export function detectDrift(request: JournalEntry, response: ProviderWriteResponse): DriftResult {
  const reasons: string[] = [];

  // Line count mismatch = silent strip
  if (response.recordedLines.length !== request.lines.length) {
    reasons.push(
      `line count mismatch: requested ${request.lines.length}, provider recorded ${response.recordedLines.length}`,
    );
  }

  // Provider warnings = drift signal
  if (response.warnings.length > 0) {
    reasons.push(`provider returned ${response.warnings.length} warning(s): ${response.warnings.join("; ")}`);
  }

  // Status mismatch (Xero only — QBO has no DRAFT concept per PARITY ASY-01)
  if (response.status !== request.status) {
    reasons.push(`status mismatch: requested ${request.status}, provider recorded ${response.status}`);
  }

  // Per-line comparison (only if line counts match)
  if (response.recordedLines.length === request.lines.length) {
    request.lines.forEach((reqLine, i) => {
      const resLine = response.recordedLines[i];
      if (reqLine.accountCode !== resLine.accountCode) {
        reasons.push(
          `line ${i} accountCode rewritten: requested "${reqLine.accountCode}", recorded "${resLine.accountCode}"`,
        );
      }
      if (Math.abs((reqLine.debit ?? 0) - resLine.debit) > EPSILON) {
        reasons.push(
          `line ${i} debit changed: requested ${reqLine.debit}, recorded ${resLine.debit}`,
        );
      }
      if (Math.abs((reqLine.credit ?? 0) - resLine.credit) > EPSILON) {
        reasons.push(
          `line ${i} credit changed: requested ${reqLine.credit}, recorded ${resLine.credit}`,
        );
      }
    });
  }

  return { drifted: reasons.length > 0, reasons };
}
