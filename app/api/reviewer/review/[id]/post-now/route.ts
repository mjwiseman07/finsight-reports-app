import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, ReviewerAuthError, authErrorResponse } from "@/lib/reviewer/auth";
import { postApprovedReviewItem } from "@/lib/pre-close/post-approved-review-item";
import { assertWriterForEngagement } from "@/lib/reviewer/review-detail";
import type { PostNowRequestBody } from "@/lib/pre-close/reviewer-types";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireFirmAuth(req);
    const { id } = await params;
    const body = (await req.json()) as PostNowRequestBody;

    if (body.overridePolicy !== true) {
      return NextResponse.json({ error: "override_policy_required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: item } = await supabase
      .from("pre_close_review_items")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const canWrite = await assertWriterForEngagement(item.engagement_id as string, ctx);
    if (!canWrite) throw new ReviewerAuthError("writer_required", 403);

    if (item.decision !== "approved" && item.decision !== "edit_and_approved") {
      return NextResponse.json({ error: "not_decided" }, { status: 409 });
    }
    if (item.posted_je_attempt_id) {
      return NextResponse.json({ error: "already_posted" }, { status: 409 });
    }
    if (item.post_block_reason) {
      return NextResponse.json({ error: "already_blocked" }, { status: 409 });
    }

    const outcome = await postApprovedReviewItem({
      reviewItemId: id,
      actorType: "user",
      actorId: ctx.userId,
      overridePolicy: true,
    });

    return NextResponse.json(outcome);
  } catch (e) {
    return authErrorResponse(e);
  }
}
