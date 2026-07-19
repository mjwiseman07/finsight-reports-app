/**
 * D6.4c-1 — Apply a reviewer decision to a pre_close_review_items row.
 *
 * THE ONLY sanctioned way to write decision-tail columns. Emits:
 *   - a ledger_event (directive category)
 *   - a curated_rule_fires reviewer_action reflection
 *   - an ai_action_log row (action_category='directive_apply')
 *   - a memory-service reinforcement so the rule engine learns per-client
 *
 * Set-once semantics enforced at DB level (immutability trigger). This function
 * detects the "already decided" case and returns the existing decision rather
 * than double-writing — critical for retries.
 *
 * NOTE on ai_action_log: the live ai_action_log schema (D-Platform) has NOT-NULL
 * action_type/model_name/model_provider and no actor_type/actor_id/payload/
 * engagement_id columns. We log through the real column contract: model_provider
 * 'local' with a synthetic model_name that captures the actor, action_category
 * 'directive_apply' (added to the CHECK by the D6.4c-1 migration).
 */
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";
import { validateJeDraft } from "@/lib/pre-close/je-draft-validate";
import { rowToReviewItem } from "@/lib/pre-close/insert-review-item";
import type { DirectiveInput, ReviewItemRow } from "@/lib/pre-close/types";

export class DirectiveError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "DirectiveError";
  }
}

export type ApplyDirectiveResult =
  | { status: "applied"; row: ReviewItemRow }
  | { status: "already_decided"; row: ReviewItemRow }
  | { status: "not_found" };

export async function applyDirective(
  input: DirectiveInput,
): Promise<ApplyDirectiveResult> {
  const supabase = createServiceClient();

  // 1. Load current state — set-once enforcement uses this snapshot
  const { data: current, error: loadErr } = await supabase
    .from("pre_close_review_items")
    .select("*")
    .eq("id", input.reviewItemId)
    .maybeSingle();
  if (loadErr) throw new DirectiveError("load failed", loadErr);
  if (!current) return { status: "not_found" };

  const currentRow = rowToReviewItem(current);
  if (currentRow.decision !== null) {
    return { status: "already_decided", row: currentRow };
  }

  // 2. Validate edited draft if decision is edit_and_approved
  if (input.decision === "edit_and_approved") {
    if (!input.editedJeDraft) {
      throw new DirectiveError("edit_and_approved requires editedJeDraft");
    }
    const v = validateJeDraft(input.editedJeDraft);
    if (!v.ok) {
      throw new DirectiveError(`invalid edited_je_draft: ${v.reason}`);
    }
  } else if (input.editedJeDraft) {
    throw new DirectiveError("editedJeDraft only allowed for edit_and_approved");
  }

  // 3. Update — the immutability trigger enforces decision set-once at DB level
  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = {
    decision: input.decision,
    decision_reason_code: input.decisionReasonCode,
    decision_reason_text: input.decisionReasonText,
    reviewer_user_id: input.reviewerUserId,
    decision_at: nowIso,
    edited_je_draft: input.decision === "edit_and_approved" ? input.editedJeDraft : null,
  };
  // Gap 3: stamp approver identity for SoD trigger + POST gate (approve/reject).
  if (
    input.decision === "approved" ||
    input.decision === "edit_and_approved" ||
    input.decision === "rejected"
  ) {
    patch.approved_by_user_id = input.reviewerUserId;
  }
  if (input.mfaStepUpVerifiedAt) {
    patch.mfa_step_up_verified_at = input.mfaStepUpVerifiedAt;
    patch.mfa_step_up_method = input.mfaStepUpMethod ?? null;
  }
  const { data: updated, error: updErr } = await supabase
    .from("pre_close_review_items")
    .update(patch)
    .eq("id", input.reviewItemId)
    .is("decision", null) // additional guard vs races
    .select("*")
    .maybeSingle();
  if (updErr) {
    const msg = String(updErr.message ?? "");
    if (msg.includes("gap3_sod_violation")) {
      throw new DirectiveError("gap3_sod_violation", updErr);
    }
    if (msg.includes("gap3_mfa_step_up_required")) {
      throw new DirectiveError("gap3_mfa_step_up_required", updErr);
    }
    throw new DirectiveError("update failed", updErr);
  }
  if (!updated) {
    // Race — another writer decided between our load and update
    const { data: raced } = await supabase
      .from("pre_close_review_items")
      .select("*")
      .eq("id", input.reviewItemId)
      .maybeSingle();
    if (raced) {
      return { status: "already_decided", row: rowToReviewItem(raced) };
    }
    return { status: "not_found" };
  }

  const updatedRow = rowToReviewItem(updated);

  // 3b. Reflect the decision on the originating rule fire
  const fireAction =
    input.decision === "approved" || input.decision === "edit_and_approved"
      ? "accepted"
      : input.decision === "rejected"
        ? "dismissed"
        : "escalated"; // deferred -> escalated
  const { error: fireErr } = await supabase
    .from("curated_rule_fires")
    .update({
      reviewer_action: fireAction,
      reviewer_action_at: nowIso,
      reviewer_user_id: input.reviewerUserId,
    })
    .eq("fire_id", updatedRow.fireId)
    .is("reviewer_action", null);
  if (fireErr) {
    console.error("[apply-directive] curated_rule_fires reviewer_action update failed", fireErr);
    // Non-fatal — review item is durable
  }

  // 4. Emit ledger event (directive category)
  await publishEvent({
    eventType: `directive.${input.decision}`,
    eventCategory: "directive",
    firmClientId: updatedRow.firmClientId,
    engagementId: updatedRow.engagementId,
    aggregateType: "pre_close_review_item",
    aggregateId: updatedRow.id,
    actorType: input.actorType,
    actorId: input.actorId ?? input.reviewerUserId ?? undefined,
    correlationId: input.correlationId,
    payload: {
      rule_id: updatedRow.ruleId,
      rule_version: updatedRow.ruleVersion,
      decision: input.decision,
      decision_reason_code: input.decisionReasonCode,
      decision_reason_text: input.decisionReasonText,
      severity: updatedRow.severity,
    },
  });

  // 5. AI action log (real column contract — see file header note)
  const { error: aiErr } = await supabase.from("ai_action_log").insert({
    firm_client_id: updatedRow.firmClientId,
    action_type: `directive.${input.decision}`,
    action_category: "directive_apply",
    model_name:
      input.actorType === "ai_agent" ? input.actorId ?? "ai:unknown" : "system:reviewer",
    model_provider: "local",
    input_summary: `review_item=${updatedRow.id} rule=${updatedRow.ruleId} decision=${input.decision}`,
    output_summary: input.decisionReasonCode,
  });
  if (aiErr) {
    console.error("[apply-directive] ai_action_log insert failed", aiErr);
    // Non-fatal — the directive itself is durable; the log is best-effort.
  }

  // 6. Memory reinforcement — teach the rule engine what reviewers decided
  //    (best-effort; failure here does NOT roll back the directive)
  try {
    const clientMemory = await import("@/lib/memory/client-memory-service").catch(() => null);
    if (clientMemory && typeof (clientMemory as { reinforce?: unknown }).reinforce === "function") {
      await (clientMemory as unknown as {
        reinforce: (args: Record<string, unknown>) => Promise<unknown>;
      }).reinforce({
        firm_client_id: updatedRow.firmClientId,
        rule_id: updatedRow.ruleId,
        signal: input.decision === "rejected" ? "negative" : "positive",
        reason_code: input.decisionReasonCode,
      });
    }
  } catch (e) {
    console.warn("[apply-directive] memory reinforce failed (non-fatal)", e);
  }

  // 7. D6.4c-3 — If the decision is post-eligible, invoke the poster.
  if (input.decision === "approved" || input.decision === "edit_and_approved") {
    try {
      const { postApprovedReviewItem } = await import("@/lib/pre-close/post-approved-review-item");
      const postResult = await postApprovedReviewItem({
        reviewItemId: updatedRow.id,
        actorType: input.actorType,
        actorId: input.actorId ?? input.reviewerUserId ?? undefined,
        correlationId: input.correlationId,
      });
      console.log("[apply-directive] post outcome", {
        reviewItemId: updatedRow.id,
        postStatus: postResult.status,
      });
    } catch (e) {
      console.error("[apply-directive] postApprovedReviewItem threw (non-fatal)", {
        reviewItemId: updatedRow.id,
        error: e,
      });
    }
  }

  return { status: "applied", row: updatedRow };
}
