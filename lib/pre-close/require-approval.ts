/**
 * Gap 3 — approval gate for JE post endpoint.
 * Returns { ok, bundle } on pass; { ok:false, reason } otherwise. Never throws.
 */
import { createServiceClient } from "@/lib/supabase/service";

export type ApprovalDenialReason =
  | "review_item_not_found"
  | "review_item_wrong_firm"
  | "review_item_not_decided"
  | "review_item_not_approved"
  | "sod_violation_missing_approver"
  | "sod_violation_same_user"
  | "mfa_step_up_required"
  | "mfa_step_up_expired"
  | "review_item_already_posted"
  | "autonomous_bucket_exceeded";

export interface ApprovalBundle {
  review_item_id: string;
  firm_client_id: string;
  engagement_id: string;
  decision: "approved" | "edit_and_approved";
  proposed_by_user_id: string | null;
  approved_by_user_id: string | null;
  materiality_bucket: "low" | "medium" | "high";
  requires_mfa_step_up: boolean;
  mfa_step_up_verified_at: string | null;
  mfa_step_up_method: "totp" | "webauthn" | null;
  gap3_grandfathered: boolean;
  autonomous_lane: boolean;
}

export type ApprovalGateResult =
  | { ok: true; bundle: ApprovalBundle }
  | { ok: false; reason: ApprovalDenialReason; details?: unknown };

export const MFA_STEP_UP_WINDOW_MS = 15 * 60 * 1000;

export async function requireApproval(
  reviewItemId: string,
  requestingFirmClientId: string,
): Promise<ApprovalGateResult> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("v_pre_close_approval_bundle")
    .select("*")
    .eq("review_item_id", reviewItemId)
    .maybeSingle();

  if (error) {
    console.error("[gap3.require-approval] bundle load failed", { reviewItemId, error });
    return { ok: false, reason: "review_item_not_found", details: { db_error: error.message } };
  }
  if (!data) return { ok: false, reason: "review_item_not_found" };
  if (data.firm_client_id !== requestingFirmClientId) {
    return { ok: false, reason: "review_item_wrong_firm" };
  }
  if (data.posted_je_attempt_id) return { ok: false, reason: "review_item_already_posted" };
  if (data.decision === null || data.decision === undefined) {
    return { ok: false, reason: "review_item_not_decided" };
  }
  if (data.decision !== "approved" && data.decision !== "edit_and_approved") {
    return { ok: false, reason: "review_item_not_approved" };
  }

  if (data.autonomous_lane) {
    const maxBucket = data.autonomous_max_bucket as "low" | "medium" | null;
    if (!maxBucket) {
      return { ok: false, reason: "autonomous_bucket_exceeded", details: { reason: "autonomy_disabled" } };
    }
    if (data.materiality_bucket === "high") {
      return { ok: false, reason: "autonomous_bucket_exceeded", details: { bucket: "high" } };
    }
    if (data.materiality_bucket === "medium" && maxBucket === "low") {
      return { ok: false, reason: "autonomous_bucket_exceeded", details: { bucket: "medium", max: "low" } };
    }
    return { ok: true, bundle: toBundle(data) };
  }

  if (!data.approved_by_user_id) return { ok: false, reason: "sod_violation_missing_approver" };
  if (data.proposed_by_user_id && data.proposed_by_user_id === data.approved_by_user_id) {
    return { ok: false, reason: "sod_violation_same_user" };
  }

  if (data.requires_mfa_step_up && !data.gap3_grandfathered) {
    if (!data.mfa_step_up_verified_at) return { ok: false, reason: "mfa_step_up_required" };
    const verifiedAt = new Date(data.mfa_step_up_verified_at).getTime();
    if (Number.isNaN(verifiedAt)) return { ok: false, reason: "mfa_step_up_required" };
    if (Date.now() - verifiedAt > MFA_STEP_UP_WINDOW_MS) {
      return { ok: false, reason: "mfa_step_up_expired" };
    }
  }

  return { ok: true, bundle: toBundle(data) };
}

function toBundle(data: Record<string, unknown>): ApprovalBundle {
  return {
    review_item_id: data.review_item_id as string,
    firm_client_id: data.firm_client_id as string,
    engagement_id: data.engagement_id as string,
    decision: data.decision as "approved" | "edit_and_approved",
    proposed_by_user_id: (data.proposed_by_user_id as string | null) ?? null,
    approved_by_user_id: (data.approved_by_user_id as string | null) ?? null,
    materiality_bucket: data.materiality_bucket as "low" | "medium" | "high",
    requires_mfa_step_up: Boolean(data.requires_mfa_step_up),
    mfa_step_up_verified_at: (data.mfa_step_up_verified_at as string | null) ?? null,
    mfa_step_up_method: (data.mfa_step_up_method as "totp" | "webauthn" | null) ?? null,
    gap3_grandfathered: Boolean(data.gap3_grandfathered),
    autonomous_lane: Boolean(data.autonomous_lane),
  };
}

/** Pure helper for unit tests / client-side display. Mirrors SQL gap3_materiality_bucket defaults. */
export function classifyMaterialityBucket(
  totalDebitCents: number | null,
  thresholds?: { lowMaxCents?: number | null; mediumMaxCents?: number | null },
): "low" | "medium" | "high" | null {
  if (totalDebitCents == null) return null;
  const lowMax = thresholds?.lowMaxCents ?? 100_000;
  const medMax = thresholds?.mediumMaxCents ?? 1_000_000;
  if (totalDebitCents <= lowMax) return "low";
  if (totalDebitCents <= medMax) return "medium";
  return "high";
}
