import type { JePreviewPayload } from "./types";
import type { JeCompositionResult, JeLineWithEvidence } from "../je-evidence/types";

/**
 * Convert a PULSE-JE-1 preview into a JeCompositionResult that satisfies
 * the shipped je-evidence contract (validateJeComposition).
 *
 * Design (locked with user, Monday 2026-07-20):
 * - Full preview snapshot lives on the composition (narration + per-line evidenceSummary).
 * - sourceType is 'user_conversational_correction' so evidence trail is unambiguous.
 * - No sourceId (no upstream event); evidenceSummary carries the full context.
 */
export function buildJeCompositionFromPreview(
  preview: JePreviewPayload,
  actorUserId: string,
): JeCompositionResult {
  const previewJson = JSON.stringify({
    intent_signal: preview.intent_signal,
    txn_date_iso: preview.txn_date_iso,
    memo: preview.memo,
    currency_code: preview.currency_code,
    lines: preview.lines,
    balance_check: preview.balance_check,
    validation: preview.validation,
    meta: preview.meta,
    actor_user_id: actorUserId,
    confirmed_at_iso: new Date().toISOString(),
  });
  const lines: JeLineWithEvidence[] = preview.lines.map((l, i) => ({
    lineIndex: i,
    accountId: l.account_qbo_id,
    accountName: l.account_name,
    drAmount: l.side === "Debit" ? l.amount : 0,
    crAmount: l.side === "Credit" ? l.amount : 0,
    memo: preview.memo,
    evidence: {
      evidenceType: "manual_override",
      sourceType: "pulse_conversational_je",
      sourceId: null,
      sourceKey: {
        actor_user_id: actorUserId,
        firm_client_id: preview.meta.firm_client_id,
        company_id: preview.meta.company_id,
        user_question: preview.intent_signal.raw_text,
      },
      sourceAmount: l.amount,
      sourceDate: preview.txn_date_iso,
      evidenceSummary:
        `User instructed via Pulse: "${preview.intent_signal.raw_text}". ` +
        `Resolved ${l.side === "Debit" ? "debit" : "credit"} to ${l.account_name} ` +
        `for ${preview.currency_code} ${l.amount.toFixed(2)}. ` +
        `Resolver: ${preview.meta.resolver_from_cache ? "cache" : "live-qbo"} ` +
        `(ttl ${preview.meta.resolver_ttl_seconds}s). ` +
        `Confidence: ${preview.intent_signal.confidence.toFixed(2)}.`,
      calculationNotes: previewJson,
    },
  }));
  return {
    transactionDate: preview.txn_date_iso,
    narration: preview.memo,
    sourceType: "user_conversational_correction",
    sourceId: null,
    lines,
  };
}
