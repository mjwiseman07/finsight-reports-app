import { createHash } from "node:crypto";
import type { JePreviewPayload } from "./types";

/**
 * Deterministic idempotency key so double-tapping Confirm within the modal
 * cannot produce two QBO JEs. Hashes the semantic content only — not timestamps.
 */
export function computePulseJeIdempotencyKey(preview: JePreviewPayload, actorUserId: string): string {
  const semantic = {
    firm_client_id: preview.meta.firm_client_id,
    actor_user_id: actorUserId,
    txn_date_iso: preview.txn_date_iso,
    currency_code: preview.currency_code,
    memo: preview.memo,
    raw_text: preview.intent_signal.raw_text,
    lines: preview.lines
      .slice()
      .sort((a, b) => (a.account_qbo_id + a.side).localeCompare(b.account_qbo_id + b.side))
      .map((l) => `${l.side}:${l.account_qbo_id}:${l.amount.toFixed(2)}`),
  };
  const h = createHash("sha256").update(JSON.stringify(semantic)).digest("hex");
  return `pulse-je:${h.slice(0, 32)}`;
}
