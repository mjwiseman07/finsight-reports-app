import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, ReviewerAuthError, authErrorResponse } from "@/lib/reviewer/auth";
import type { VisibilityUpdateBody } from "@/lib/pre-close/reviewer-types";
import { assertWriterForEngagement } from "@/lib/reviewer/review-detail";
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";

const DEFAULTS = {
  client_can_view_queue: false,
  client_can_view_evidence: false,
  client_can_view_je_draft: false,
};

async function loadVisibility(engagementId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("engagement_review_visibility")
    .select("*")
    .eq("engagement_id", engagementId)
    .maybeSingle();
  if (!data) return { engagementId, ...DEFAULTS, isDefaulted: true };
  return {
    engagementId,
    clientCanViewQueue: data.client_can_view_queue,
    clientCanViewEvidence: data.client_can_view_evidence,
    clientCanViewJeDraft: data.client_can_view_je_draft,
    updatedAt: data.updated_at,
    isDefaulted: false,
  };
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
    return NextResponse.json(await loadVisibility(engagementId));
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
    const body = (await req.json()) as VisibilityUpdateBody;

    const canWrite = await assertWriterForEngagement(engagementId, ctx);
    if (!canWrite) throw new ReviewerAuthError("writer_required", 403);

    const supabase = createServiceClient();
    const { error } = await supabase.from("engagement_review_visibility").upsert({
      engagement_id: engagementId,
      client_can_view_queue: body.clientCanViewQueue,
      client_can_view_evidence: body.clientCanViewEvidence,
      client_can_view_je_draft: body.clientCanViewJeDraft,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    const { data: eng } = await supabase
      .from("engagements")
      .select("firm_id")
      .eq("id", engagementId)
      .maybeSingle();

    await publishEvent({
      eventType: "review.visibility_updated",
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
      action_type: "review_visibility_update",
      action_category: "reviewer_ui_visibility_change",
      model_provider: "local",
      model_name: `user:${ctx.userId}`,
      input_summary: `engagement=${engagementId}`,
      output_summary: JSON.stringify(body),
      engagement_id: engagementId,
    });

    return NextResponse.json(await loadVisibility(engagementId));
  } catch (e) {
    return authErrorResponse(e);
  }
}
