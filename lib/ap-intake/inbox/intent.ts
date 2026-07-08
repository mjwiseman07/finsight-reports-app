export const AP_INBOX_INTENTS = [
  "invoice_submission",
  "invoice_inquiry",
  "statement_request",
  "dispute",
  "credit_request",
  "refund_request",
  "bank_change_request",
  "payment_status",
  "generic",
  "wire_transfer_initiation",
  "refund_transmission_request",
] as const;

export type ApInboxIntent = (typeof AP_INBOX_INTENTS)[number];

export function isApInboxIntent(v: unknown): v is ApInboxIntent {
  return typeof v === "string" && (AP_INBOX_INTENTS as readonly string[]).includes(v);
}
