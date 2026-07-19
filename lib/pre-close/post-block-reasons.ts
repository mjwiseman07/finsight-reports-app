/**
 * D6.4c-3 — Enumerated reasons the remediation pipeline blocks a QBO post.
 */
export const POST_BLOCK_REASONS = {
  DRAFT_INVALID_UNBALANCED: "draft_invalid_unbalanced",
  DRAFT_INVALID_LINE_SHAPE: "draft_invalid_line_shape",
  DRAFT_INVALID_MISSING_ACCOUNT: "draft_invalid_missing_account",
  DRAFT_INVALID_MISSING_NARRATION: "draft_invalid_missing_narration",
  ACCOUNT_MAPPING_UNRESOLVED: "account_mapping_unresolved",
  ROUNDING_UNFIXABLE: "rounding_unfixable",
  PERIOD_LOCKED_NO_FALLBACK: "period_locked_no_fallback",
  NARRATION_TOO_LONG_UNFIXABLE: "narration_too_long_unfixable",
  QBO_INVALID_ACCOUNT_ID: "qbo_invalid_account_id",
  QBO_PERIOD_LOCKED: "qbo_period_locked",
  QBO_UNBALANCED: "qbo_unbalanced",
  QBO_INVALID_AMOUNT: "qbo_invalid_amount",
  QBO_INVALID_POSTING_TYPE: "qbo_invalid_posting_type",
  POLICY_BLOCKED_MANUAL_ONLY: "policy_blocked_manual_only",
  ENTITLEMENT_DENIED: "entitlement_denied",
  BASIS_GUARD_REJECTED: "basis_guard_rejected",
  GAP3_APPROVAL_GATE_DENIED: "gap3_approval_gate_denied",
  UNKNOWN_ERROR: "unknown_error",
} as const;

export type PostBlockReason =
  (typeof POST_BLOCK_REASONS)[keyof typeof POST_BLOCK_REASONS];

export function isPostBlockReason(v: string): v is PostBlockReason {
  return Object.values(POST_BLOCK_REASONS).includes(v as PostBlockReason);
}
