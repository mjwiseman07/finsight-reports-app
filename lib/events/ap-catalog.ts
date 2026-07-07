/**
 * D6.5 Part 2 — AP intake ledger event types under ap category.
 */
export const AP_EVENT_TYPES = [
  "bill.received",
  "bill.extracted",
  "fingerprint.new_version_created",
  "vendor.mirror_refreshed",
  "bill.quarantined",
  "bill.release_requested",
  "bill.released",
  "bill.release_blocked",
  "vendor.bank_info_observed",
  "vendor.bank_change_detected",
] as const;

export type ApEventType = (typeof AP_EVENT_TYPES)[number];

export function isApEventType(eventType: string): eventType is ApEventType {
  return (AP_EVENT_TYPES as readonly string[]).includes(eventType);
}
