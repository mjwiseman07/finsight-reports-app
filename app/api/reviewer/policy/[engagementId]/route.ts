import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, ReviewerAuthError, authErrorResponse } from "@/lib/reviewer/auth";
import { resolvePostingPolicy } from "@/lib/pre-close/posting-policy-resolver";
import type { PostingPolicyUpdateBody } from "@/lib/pre-close/reviewer-types";
import { assertWriterForEngagement } from "@/lib/reviewer/review-detail";
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";

const PRESETS = new Set([
  "advisacor_conservative",
  "advisacor_balanced",
  "advisacor_aggressive",
]);

function presetFlags(preset: string) {
  if (preset === "advisacor_conservative") {
    return { auto_post_on_approved: false, auto_post_on_edit_and_approved: false };
  }
  if (preset === "advisacor_aggressive") {
    return { auto_post_on_approved: true, auto_post_on_edit_and_approved: true };
  }
  return { auto_post_on_approved: true, auto_post_on_edit_and_approved: false };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  try {
    const ctx = await requireFirmAuth(req);
    const { engagementId } = await params;
    const supabase = createServiceClient();
    const { data: eng } = await supabase
      .from("engagements")
      .select("firm_id")
      .eq("id", engagementId)
      .maybeSingle();
    if (!eng || !ctx.firmIds.includes(eng.firm_id as string)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const policy = await resolvePostingPolicy(engagementId);
    return NextResponse.json(policy);
  } catch (e) {
    return authErrorResponse(e);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  try {
    const ctx = await requireFirmAuth(req);
    const { engagementId } = await params;
    const body = (await req.json()) as PostingPolicyUpdateBody;

    const canWrite = await assertWriterForEngagement(engagementId, ctx);
    if (!canWrite) throw new ReviewerAuthError("writer_required", 403);

    if (body.advisacorPreset && !PRESETS.has(body.advisacorPreset)) {
      return NextResponse.json({ error: "invalid_preset" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const patch: Record<string, unknown> = {
      engagement_id: engagementId,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    };

    if (body.advisacorPreset === null) {
      patch.advisacor_preset = null;
      patch.policy_code = "custom";
      if (body.autoPostOnApproved != null) patch.auto_post_on_approved = body.autoPostOnApproved;
      if (body.autoPostOnEditAndApproved != null) {
        patch.auto_post_on_edit_and_approved = body.autoPostOnEditAndApproved;
      }
    } else if (body.advisacorPreset) {
      const flags = presetFlags(body.advisacorPreset);
      patch.advisacor_preset = body.advisacorPreset;
      patch.policy_code = body.advisacorPreset;
      patch.auto_post_on_approved = flags.auto_post_on_approved;
      patch.auto_post_on_edit_and_approved = flags.auto_post_on_edit_and_approved;
    } else {
      if (body.autoPostOnApproved != null) patch.auto_post_on_approved = body.autoPostOnApproved;
      if (body.autoPostOnEditAndApproved != null) {
        patch.auto_post_on_edit_and_approved = body.autoPostOnEditAndApproved;
      }
    }

    const { error } = await supabase.from("engagement_posting_policy").upsert(patch);
    if (error) {
      if (error.message?.includes("requires")) {
        return NextResponse.json({ error: "preset_flag_mismatch" }, { status: 409 });
      }
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    const { data: eng } = await supabase
      .from("engagements")
      .select("firm_id")
      .eq("id", engagementId)
      .maybeSingle();

    await publishEvent({
      eventType: "posting.policy_updated",
      eventCategory: "reviewer_ui",
      firmId: eng?.firm_id as string | undefined,
      engagementId,
      aggregateType: "engagement",
      aggregateId: engagementId,
      actorType: "user",
      actorId: ctx.userId,
      payload: body as unknown as Record<string, unknown>,
    });

    await supabase.from("ai_action_log").insert({
      action_type: "posting_policy_update",
      action_category: "reviewer_ui_policy_change",
      model_provider: "local",
      model_name: `user:${ctx.userId}`,
      input_summary: `engagement=${engagementId}`,
      output_summary: JSON.stringify(patch),
      engagement_id: engagementId,
    });

    const policy = await resolvePostingPolicy(engagementId);
    return NextResponse.json(policy);
  } catch (e) {
    return authErrorResponse(e);
  }
}
