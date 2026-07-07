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
  "bill.duplicate_detected",
  "bill.duplicate_flagged",
  "bill.anomaly_detected",
  "bill.anomaly_flagged",
  "bill.fraud_score_updated",
  "bill.fraud_score_quarantine",
  // Block 6a — Requisitions
  "requisition.created",
  "requisition.submitted",
  "requisition.approved",
  "requisition.rejected",
  "requisition.converted_to_po",
  // Block 6a — Purchase Orders + Goods Receipts
  "purchase_order.created",
  "purchase_order.closed",
  "goods_receipt.recorded",
  // Block 6a — Three-Way-Match
  "three_way_match.evaluated",
  "three_way_match.hit",
  // Block 6a — Baseline Harvest
  "baseline_harvest.started",
  "baseline_harvest.completed",
  "baseline_harvest.failed",
] as const;

export type ApEventType = (typeof AP_EVENT_TYPES)[number];

export function isApEventType(eventType: string): eventType is ApEventType {
  return (AP_EVENT_TYPES as readonly string[]).includes(eventType);
}
