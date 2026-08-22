/**
 * JE-3A — Deterministic correlation marker for future QBO PrivateNote.
 * Safe, searchable, included in payload preview + Patent #6 events.
 */

/** Intuit QBO PrivateNote max length (chars). */
export const QBO_PRIVATE_NOTE_MAX_CHARS = 4000;

export const JE_CORRELATION_MARKER_PREFIX = "ADVJE:";

export function buildJeCorrelationMarker(executionId: string): string {
  const id = String(executionId || "").trim();
  if (!id) {
    throw new Error("executionId is required for correlation marker.");
  }
  return `${JE_CORRELATION_MARKER_PREFIX}${id}`;
}

export function parseJeCorrelationMarker(
  marker: string,
): { executionId: string } | null {
  const raw = String(marker || "").trim();
  if (!raw.startsWith(JE_CORRELATION_MARKER_PREFIX)) return null;
  const rest = raw.slice(JE_CORRELATION_MARKER_PREFIX.length).trim();
  if (!rest) return null;
  // Optional hash suffix: ADVJE:<uuid>:<hash8>
  const executionId = rest.split(":")[0]?.trim() || "";
  if (!executionId) return null;
  return { executionId };
}

/**
 * Compose PrivateNote so the correlation marker is never lost.
 * Format: "<user memo> | ADVJE:<execution-id>" or marker alone.
 */
export function composeJePrivateNote(args: {
  userMemo: string | null | undefined;
  correlationMarker: string;
}): string {
  const marker = String(args.correlationMarker || "").trim();
  if (!marker) {
    throw new Error("correlationMarker is required for PrivateNote.");
  }
  const memo = String(args.userMemo || "").trim();
  if (!memo) {
    return marker.slice(0, QBO_PRIVATE_NOTE_MAX_CHARS);
  }
  const separator = " | ";
  const combined = `${memo}${separator}${marker}`;
  if (combined.length <= QBO_PRIVATE_NOTE_MAX_CHARS) return combined;
  const budget = QBO_PRIVATE_NOTE_MAX_CHARS - separator.length - marker.length;
  if (budget <= 0) return marker.slice(0, QBO_PRIVATE_NOTE_MAX_CHARS);
  return `${memo.slice(0, budget)}${separator}${marker}`;
}

export function assertCorrelationMarkerSafeForPrivateNote(marker: string): void {
  const m = String(marker || "");
  if (!m || m.length > QBO_PRIVATE_NOTE_MAX_CHARS) {
    throw new Error("correlation marker exceeds PrivateNote max length.");
  }
  // QBO PrivateNote is plain text; reject control chars except tab/newline (we avoid those).
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(m)) {
    throw new Error("correlation marker contains unsafe control characters.");
  }
}
