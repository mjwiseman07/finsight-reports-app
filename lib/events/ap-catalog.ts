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
  // Block 6b — Approval Chain
  "requisition.approval_chain_created",
  "requisition.approval_step_assigned",
  "requisition.approval_step_approved",
  "requisition.approval_step_rejected",
  "requisition.approval_step_delegated",
  "requisition.approval_chain_completed",
  // Block 6b — Delegation
  "approval.delegation_created",
  "approval.delegation_revoked",
  // Block 6b — Comments
  "requisition.commented",
  "requisition.comment_edited",
  "requisition.comment_deleted",
  // Block 6b — Amendments
  "requisition.amendment_requested",
  "requisition.amendment_approved",
  "requisition.amendment_rejected",
  // Block 6b — Budget Controls
  "budget.evaluated",
  "budget.exceeded",
  "budget.tolerance_hit",
  "vendor_spend.updated",
  // Block 7a — Credits / Prepayment Sub-Ledger
  "vendor_credit.issued",
  "vendor_credit.applied",
  "vendor_credit.application_reversed",
  "vendor_credit.expired",
  "vendor_credit.voided",
  "prepayment.received",
  "prepayment.applied",
  "prepayment.aged_flagged",
  "prepayment.refund_draft_created",
  "prepayment.refund_draft_reviewed",
  // Block 7b — Multimodal AP Inbox
  "ap_inbox.message_received",
  "ap_inbox.message_classified",
  "ap_inbox.classification_failed",
  "ap_inbox.draft_created",
  "ap_inbox.draft_reviewer_approved",
  "ap_inbox.draft_reviewer_rejected",
  "ap_inbox.draft_reviewer_deferred",
  "ap_inbox.draft_sent",
  "ap_inbox.autonomy_config_updated",
  "ap_inbox.permanent_exclusion_enforced",
  "ap_inbox.vendor_matched",
  "ap_inbox.reclassified",
  // Block 8a — Payment Interlock + Banking Rail Fan-Out
  "ap_batch.created",
  "ap_batch.line_added",
  "ap_batch.interlock_computed",
  "ap_batch.interlock_passed",
  "ap_batch.interlock_failed",
  "ap_batch.interlock_reviewer_approved",
  "ap_batch.interlock_reviewer_rejected",
  "ap_rail.vendor_account_registered",
  "ap_rail.vendor_account_updated",
  "ap_rail.vendor_account_deactivated",
  "ap_rail.fanout_attempted",
  "ap_rail.fanout_recorded",
  // Block 8b — L12 Preset Packs
  "ap_preset.pack_selected",
  "ap_preset.pack_swapped",
  "ap_preset.override_applied",
  // Block 8b — L13 Adaptive Self-Governance
  "ap_selfgov.observation_recorded",
  "ap_selfgov.amendment_drafted",
  "ap_selfgov.amendment_applied",
  "ap_selfgov.amendment_rejected",
] as const;

export type ApEventType = (typeof AP_EVENT_TYPES)[number];

export function isApEventType(eventType: string): eventType is ApEventType {
  return (AP_EVENT_TYPES as readonly string[]).includes(eventType);
}
