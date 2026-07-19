import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, ReviewerAuthError, authErrorResponse } from "@/lib/reviewer/auth";
import { applyDirective, DirectiveError } from "@/lib/directives/apply-directive";
import { loadReviewItemForFirm, assertWriterForEngagement } from "@/lib/reviewer/review-detail";
import type { DecideRequestBody } from "@/lib/pre-close/reviewer-types";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyMfaStepUpForRequest } from "@/lib/pre-close/mfa-step-up-verify";
import { logGap3Action } from "@/lib/pre-close/gap3-log";

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
      .select(
        "engagement_id, firm_client_id, proposed_by_user_id, requires_mfa_step_up, materiality_bucket, autonomous_lane, decision",
      )
      .eq("id", id)
      .maybeSingle();
    if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (item.decision) return NextResponse.json({ error: "already_decided" }, { status: 409 });
    if (item.autonomous_lane) {
      return NextResponse.json({ error: "autonomous_lane_no_manual_approval" }, { status: 409 });
    }

    const canWrite = await assertWriterForEngagement(item.engagement_id as string, ctx);
    if (!canWrite) throw new ReviewerAuthError("writer_required", 403);

    const isApproval =
      body.decision === "approved" || body.decision === "edit_and_approved";

    if (
      isApproval &&
      item.proposed_by_user_id &&
      item.proposed_by_user_id === ctx.userId
    ) {
      await logGap3Action({
        firmClientId: item.firm_client_id as string,
        actionCategory: "gap3_sod_violation",
        actionType: "gap3.sod_blocked_at_decide",
        actorId: ctx.userId,
        inputSummary: JSON.stringify({ review_item_id: id }),
      });
      return NextResponse.json({ error: "sod_violation_same_user" }, { status: 403 });
    }

    let mfaStepUpVerifiedAt: string | null = null;
    let mfaStepUpMethod: "totp" | "webauthn" | null = null;
    if (isApproval && item.requires_mfa_step_up) {
      const mfa = await verifyMfaStepUpForRequest(ctx.userId);
      if (!mfa.ok) {
        return NextResponse.json(
          {
            error: "mfa_step_up_required",
            reason: mfa.reason,
            materiality_bucket: item.materiality_bucket,
          },
          { status: 401 },
        );
      }
      mfaStepUpVerifiedAt = mfa.verifiedAt.toISOString();
      mfaStepUpMethod = mfa.method;
    }

    let result;
    try {
      result = await applyDirective({
        reviewItemId: id,
        decision: body.decision,
        decisionReasonCode: body.decisionReasonCode,
        decisionReasonText: body.decisionReasonText ?? "",
        editedJeDraft: body.editedJeDraft,
        reviewerUserId: ctx.userId,
        actorType: "user",
        actorId: ctx.userId,
        mfaStepUpVerifiedAt,
        mfaStepUpMethod,
      });
    } catch (e) {
      if (e instanceof DirectiveError) {
        if (e.message === "gap3_sod_violation") {
          return NextResponse.json({ error: "sod_violation_same_user" }, { status: 403 });
        }
        if (e.message === "gap3_mfa_step_up_required") {
          return NextResponse.json({ error: "mfa_step_up_required" }, { status: 401 });
        }
      }
      throw e;
    }

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
