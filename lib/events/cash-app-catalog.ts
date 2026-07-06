/**
 * D6.7 — Cash application ledger event types under cash_app category.
 */
export const CASH_APP_EVENT_TYPES = [
  "remittance_ingested",
  "remittance_parsed",
  "payment_ingested",
  "match_candidate_proposed",
  "match_candidate_approved",
  "match_candidate_rejected",
  "cash_applied_to_invoice",
  "cash_app_config_updated",
  "customer_email_domain_learned",
  // D6.7 Part 2 — Layer 2 + Layer 4 + cross-tenant patterns
  "cash_app.layer2_scored",
  "cash_app.layer2_escalated_to_toptier",
  "cash_app.layer2_dropped_to_review",
  "cash_app.review_item_created",
  "cash_app.review_item_resolved",
  "cash_app.pattern_learned",
  "cash_app.pattern_matched",
] as const;

export type CashAppEventType = (typeof CASH_APP_EVENT_TYPES)[number];

export function isCashAppEventType(eventType: string): eventType is CashAppEventType {
  return (CASH_APP_EVENT_TYPES as readonly string[]).includes(eventType);
}
