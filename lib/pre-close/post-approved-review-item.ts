/**
 * D6.4c-3 — Post an approved (or edit-and-approved) review item to QBO.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent, type ActorType } from "@/lib/events/publisher";
import { qboJournalEntryPoster } from "@/lib/erp/quickbooks/journal-entry-poster";
import { runRemediationPipeline } from "@/lib/pre-close/remediation-pipeline";
import {
  resolvePostingPolicy,
  policyPermitsAutoPost,
  type ReviewerDecision,
} from "@/lib/pre-close/posting-policy-resolver";
import { POST_BLOCK_REASONS, type PostBlockReason } from "@/lib/pre-close/post-block-reasons";
import { rowToReviewItem } from "@/lib/pre-close/insert-review-item";
import { assertEntitlement, EntitlementDenied } from "@/lib/entitlements/gate";
import type { JEDraft } from "@/lib/pre-close/types";

export interface PostApprovedInput {
  reviewItemId: string;
  actorType: "user" | "ai_agent" | "system";
  actorId?: string | null;
  correlationId?: string;
  overridePolicy?: boolean;
}

export type PostApprovedResult =
  | {
      status: "posted";
      reviewItemId: string;
      qboJeId: string;
      attemptId: string;
      remediationsApplied: string[];
    }
  | {
      status: "post_blocked";
      reviewItemId: string;
      reason: PostBlockReason;
      details?: unknown;
      remediationsApplied: string[];
    }
  | { status: "policy_skip"; reviewItemId: string; policyCode: string }
  | { status: "not_eligible"; reviewItemId: string; note: string }
  | { status: "not_found"; reviewItemId: string }
  | { status: "already_posted"; reviewItemId: string; attemptId: string }
  | { status: "already_blocked"; reviewItemId: string; reason: string };

export class PostApprovedError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PostApprovedError";
  }
}

const ELIGIBLE_DECISIONS: ReviewerDecision[] = ["approved", "edit_and_approved"];

export async function postApprovedReviewItem(
  input: PostApprovedInput,
): Promise<PostApprovedResult> {
  const supabase = createServiceClient();

  const { data: raw, error: loadErr } = await supabase
    .from("pre_close_review_items")
    .select("*")
    .eq("id", input.reviewItemId)
    .maybeSingle();
  if (loadErr) throw new PostApprovedError("load failed", loadErr);
  if (!raw) return { status: "not_found", reviewItemId: input.reviewItemId };

  const row = rowToReviewItem(raw);
  if (row.postedJeAttemptId) {
    return { status: "already_posted", reviewItemId: row.id, attemptId: row.postedJeAttemptId };
  }
  if (row.postBlockReason) {
    return { status: "already_blocked", reviewItemId: row.id, reason: row.postBlockReason };
  }
  if (!row.decision || !ELIGIBLE_DECISIONS.includes(row.decision as ReviewerDecision)) {
    return {
      status: "not_eligible",
      reviewItemId: row.id,
      note: `decision=${row.decision ?? "null"} not in [approved, edit_and_approved]`,
    };
  }

  try {
    await assertEntitlement("ap_pay", row.engagementId, {
      caller: "pre-close.post-approved-review-item",
      firmClientId: row.firmClientId,
      actorType: input.actorType,
      actorId: input.actorId ?? undefined,
      correlationId: input.correlationId,
    });
  } catch (e) {
    if (e instanceof EntitlementDenied) {
      return await markBlocked({
        row,
        supabase,
        reason: POST_BLOCK_REASONS.ENTITLEMENT_DENIED,
        details: { addon: "ap_pay", entitlement_reason: e.reason },
        remediationsApplied: [],
        actor: input,
      });
    }
    throw e;
  }

  if (!input.overridePolicy) {
    const policy = await resolvePostingPolicy(row.engagementId);
    if (!policyPermitsAutoPost(policy, row.decision as ReviewerDecision)) {
      return { status: "policy_skip", reviewItemId: row.id, policyCode: policy.policyCode };
    }
  }

  const draftToPost: JEDraft = (row.editedJeDraft ?? row.jeDraft) as JEDraft;
  const pipeline = await runRemediationPipeline(draftToPost, {
    firmClientId: row.firmClientId,
    engagementId: row.engagementId,
    reviewItemId: row.id,
  });
  if (!pipeline.ok) {
    return await markBlocked({
      row,
      supabase,
      reason: pipeline.reason,
      details: pipeline.details,
      remediationsApplied: pipeline.remediationsApplied,
      actor: input,
    });
  }

  const idempotencyKey = `pre_close_review_${row.id}`;
  const post = await qboJournalEntryPoster.post({
    firm_client_id: row.firmClientId,
    idempotency_key: idempotencyKey,
    source_type: "rule",
    source_id: row.id,
    posted_by: input.actorType === "ai_agent" ? "ai" : "human",
    posted_by_user_id: input.actorId ?? undefined,
    payload: pipeline.payload,
  });

  if (post.status === "posted") {
    const { error: updErr } = await supabase
      .from("pre_close_review_items")
      .update({ posted_je_attempt_id: post.attempt_id })
      .eq("id", row.id)
      .is("posted_je_attempt_id", null);
    if (updErr) throw new PostApprovedError("posted_je_attempt_id write failed", updErr);

    await publishEvent({
      eventType: "review_item.posted",
      eventCategory: "posting",
      firmClientId: row.firmClientId,
      engagementId: row.engagementId,
      aggregateType: "pre_close_review_item",
      aggregateId: row.id,
      actorType: input.actorType as ActorType,
      actorId: input.actorId ?? undefined,
      correlationId: input.correlationId,
      payload: {
        qbo_je_id: post.qbo_je_id,
        attempt_id: post.attempt_id,
        idempotency_key: idempotencyKey,
        remediations_applied: pipeline.remediationsApplied,
        posted_draft_source: row.editedJeDraft ? "edited_je_draft" : "je_draft",
      },
    });

    await supabase.from("ai_action_log").insert({
      firm_client_id: row.firmClientId,
      action_type: "posting.posted",
      action_category: "posting_attempt",
      model_name:
        input.actorType === "ai_agent" ? input.actorId ?? "ai:unknown" : "system:reviewer",
      model_provider: "local",
      input_summary: `review_item=${row.id} idempotency=${idempotencyKey}`,
      output_summary: `qbo_je_id=${post.qbo_je_id} attempt=${post.attempt_id}`,
    });

    return {
      status: "posted",
      reviewItemId: row.id,
      qboJeId: post.qbo_je_id,
      attemptId: post.attempt_id,
      remediationsApplied: pipeline.remediationsApplied,
    };
  }

  const reason =
    post.status === "rejected"
      ? mapQboRejectReasonToBlockCode(post.reason)
      : POST_BLOCK_REASONS.UNKNOWN_ERROR;
  return await markBlocked({
    row,
    supabase,
    reason,
    details: {
      poster_status: post.status,
      attempt_id: post.attempt_id,
      ...(post.status === "rejected"
        ? { poster_reason: post.reason, poster_details: post.details }
        : {}),
      ...(post.status === "failed" ? { poster_error: post.error, retryable: post.retryable } : {}),
    },
    remediationsApplied: pipeline.remediationsApplied,
    actor: input,
  });
}

async function markBlocked(args: {
  row: ReturnType<typeof rowToReviewItem>;
  supabase: ReturnType<typeof createServiceClient>;
  reason: PostBlockReason;
  details?: unknown;
  remediationsApplied: string[];
  actor: PostApprovedInput;
}): Promise<PostApprovedResult> {
  const { row, supabase, reason, details, remediationsApplied, actor } = args;
  const { error: updErr } = await supabase
    .from("pre_close_review_items")
    .update({ post_block_reason: reason })
    .eq("id", row.id)
    .is("post_block_reason", null);
  if (updErr) {
    console.error("[post-approved] post_block_reason write failed", {
      reviewItemId: row.id,
      error: updErr,
    });
  }

  await publishEvent({
    eventType: "review_item.post_blocked",
    eventCategory: "posting",
    firmClientId: row.firmClientId,
    engagementId: row.engagementId,
    aggregateType: "pre_close_review_item",
    aggregateId: row.id,
    actorType: actor.actorType as ActorType,
    actorId: actor.actorId ?? undefined,
    correlationId: actor.correlationId,
    payload: { reason, details, remediations_applied: remediationsApplied },
  });

  await supabase.from("ai_action_log").insert({
    firm_client_id: row.firmClientId,
    action_type: "posting.blocked",
    action_category: "posting_blocked",
    model_name: actor.actorType === "ai_agent" ? actor.actorId ?? "ai:unknown" : "system:reviewer",
    model_provider: "local",
    input_summary: `review_item=${row.id} reason=${reason}`,
    output_summary: JSON.stringify({ details, remediations_applied: remediationsApplied }).slice(
      0,
      4000,
    ),
  });

  return {
    status: "post_blocked",
    reviewItemId: row.id,
    reason,
    details,
    remediationsApplied,
  };
}

function mapQboRejectReasonToBlockCode(reason: string): PostBlockReason {
  switch (reason) {
    case "period_locked":
      return POST_BLOCK_REASONS.QBO_PERIOD_LOCKED;
    case "invalid_account_id":
    case "missing_account_id":
      return POST_BLOCK_REASONS.QBO_INVALID_ACCOUNT_ID;
    case "unbalanced":
      return POST_BLOCK_REASONS.QBO_UNBALANCED;
    case "invalid_amount":
      return POST_BLOCK_REASONS.QBO_INVALID_AMOUNT;
    case "invalid_posting_type":
      return POST_BLOCK_REASONS.QBO_INVALID_POSTING_TYPE;
    default:
      return POST_BLOCK_REASONS.UNKNOWN_ERROR;
  }
}
