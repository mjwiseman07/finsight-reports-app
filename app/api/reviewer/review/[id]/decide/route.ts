import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, ReviewerAuthError, authErrorResponse } from "@/lib/reviewer/auth";
import { applyDirective } from "@/lib/directives/apply-directive";
import { loadReviewItemForFirm, assertWriterForEngagement } from "@/lib/reviewer/review-detail";
import type { DecideRequestBody } from "@/lib/pre-close/reviewer-types";
import { createServiceClient } from "@/lib/supabase/service";

const VALID = new Set(["approved", "edit_and_approved", "rejected", "deferred"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireFirmAuth(req);
    const { id } = await params;
    const body = (await req.json()) as DecideRequestBody;

    if (!VALID.has(body.decision)) {
      return NextResponse.json({ error: "invalid_decision" }, { status: 400 });
    }
    if (body.decision === "edit_and_approved" && !body.editedJeDraft) {
      return NextResponse.json({ error: "edited_je_draft_required" }, { status: 400 });
    }
    if (body.decision !== "edit_and_approved" && body.editedJeDraft) {
      return NextResponse.json({ error: "edited_je_draft_not_allowed" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: item } = await supabase
      .from("pre_close_review_items")
      .select("engagement_id")
      .eq("id", id)
      .maybeSingle();
    if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const canWrite = await assertWriterForEngagement(item.engagement_id as string, ctx);
    if (!canWrite) throw new ReviewerAuthError("writer_required", 403);

    const result = await applyDirective({
      reviewItemId: id,
      decision: body.decision,
      decisionReasonCode: body.decisionReasonCode,
      decisionReasonText: body.decisionReasonText ?? "",
      editedJeDraft: body.editedJeDraft,
      reviewerUserId: ctx.userId,
      actorType: "user",
      actorId: ctx.userId,
    });

    const detail = await loadReviewItemForFirm(id, ctx);
    if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({
      status: result.status,
      row: detail,
      postOutcome: result.status === "applied" ? undefined : undefined,
    });
  } catch (e) {
    return authErrorResponse(e);
  }
}
