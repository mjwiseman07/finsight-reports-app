import { NextResponse } from "next/server";
import { requireFirmAuth, ReviewerAuthError, authErrorResponse } from "@/lib/reviewer/auth";
import { assertWriterForEngagement } from "@/lib/reviewer/review-detail";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyMfaStepUpForRequest } from "@/lib/pre-close/mfa-step-up-verify";
import { logGap3Action } from "@/lib/pre-close/gap3-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const { decision, decision_reason_code, decision_reason_text, edited_je_draft } = body ?? {};

    if (!decision || (decision !== "approved" && decision !== "edit_and_approved")) {
      return NextResponse.json({ error: "invalid_decision" }, { status: 400 });
    }

    const auth = await requireFirmAuth(req);
    const sb = createServiceClient();
    const { data: ri, error } = await sb
      .from("pre_close_review_items")
      .select(
        "id, firm_client_id, engagement_id, proposed_by_user_id, materiality_bucket, requires_mfa_step_up, decision, autonomous_lane",
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !ri) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (ri.decision) return NextResponse.json({ error: "already_decided" }, { status: 409 });
    if (ri.autonomous_lane) {
      return NextResponse.json({ error: "autonomous_lane_no_manual_approval" }, { status: 409 });
    }

    const canWrite = await assertWriterForEngagement(ri.engagement_id as string, auth);
    if (!canWrite) throw new ReviewerAuthError("writer_required", 403);

    const approverUserId = auth.userId;

    if (ri.proposed_by_user_id && ri.proposed_by_user_id === approverUserId) {
      await logGap3Action({
        firmClientId: ri.firm_client_id,
        actionCategory: "gap3_sod_violation",
        actionType: "gap3.sod_blocked_at_route",
        actorId: approverUserId,
        inputSummary: JSON.stringify({ review_item_id: id }),
      });
      return NextResponse.json({ error: "sod_violation_same_user" }, { status: 403 });
    }

    let mfaVerifiedAt: string | null = null;
    let mfaMethod: "totp" | "webauthn" | null = null;
    if (ri.requires_mfa_step_up) {
      const mfa = await verifyMfaStepUpForRequest(approverUserId);
      if (!mfa.ok) {
        return NextResponse.json(
          {
            error: "mfa_step_up_required",
            reason: mfa.reason,
            materiality_bucket: ri.materiality_bucket,
          },
          { status: 401 },
        );
      }
      mfaVerifiedAt = mfa.verifiedAt.toISOString();
      mfaMethod = mfa.method;
    }

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      decision,
      decision_reason_code: decision_reason_code ?? "reviewer_approved",
      decision_reason_text: decision_reason_text ?? null,
      reviewer_user_id: approverUserId,
      approved_by_user_id: approverUserId,
      decision_at: now,
      mfa_step_up_verified_at: mfaVerifiedAt,
      mfa_step_up_method: mfaMethod,
    };
    if (decision === "edit_and_approved" && edited_je_draft) {
      update.edited_je_draft = edited_je_draft;
    }

    const { error: updErr } = await sb.from("pre_close_review_items").update(update).eq("id", id);
    if (updErr) {
      if (updErr.message?.includes("gap3_sod_violation")) {
        return NextResponse.json({ error: "sod_violation_same_user" }, { status: 403 });
      }
      if (updErr.message?.includes("gap3_mfa_step_up_required")) {
        return NextResponse.json({ error: "mfa_step_up_required" }, { status: 401 });
      }
      console.error("[gap3.approve] update failed", updErr);
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    await logGap3Action({
      firmClientId: ri.firm_client_id,
      actionCategory: "gap3_approval",
      actionType: "gap3.approved",
      actorId: approverUserId,
      inputSummary: JSON.stringify({
        decision,
        review_item_id: id,
        materiality_bucket: ri.materiality_bucket,
        mfa_step_up: ri.requires_mfa_step_up,
      }),
    });

    return NextResponse.json({ ok: true, review_item_id: id, decision, decision_at: now });
  } catch (e) {
    return authErrorResponse(e);
  }
}
