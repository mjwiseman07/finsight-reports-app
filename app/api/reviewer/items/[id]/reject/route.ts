import { NextResponse } from "next/server";
import { requireFirmAuth, ReviewerAuthError, authErrorResponse } from "@/lib/reviewer/auth";
import { assertWriterForEngagement } from "@/lib/reviewer/review-detail";
import { createServiceClient } from "@/lib/supabase/service";
import { logGap3Action } from "@/lib/pre-close/gap3-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const { decision_reason_code, decision_reason_text } = body ?? {};

    const auth = await requireFirmAuth(req);
    const sb = createServiceClient();
    const { data: ri, error } = await sb
      .from("pre_close_review_items")
      .select("id, firm_client_id, engagement_id, decision, autonomous_lane")
      .eq("id", id)
      .maybeSingle();

    if (error || !ri) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (ri.decision) return NextResponse.json({ error: "already_decided" }, { status: 409 });
    if (ri.autonomous_lane) {
      return NextResponse.json({ error: "autonomous_lane_no_manual_approval" }, { status: 409 });
    }

    const canWrite = await assertWriterForEngagement(ri.engagement_id as string, auth);
    if (!canWrite) throw new ReviewerAuthError("writer_required", 403);

    const now = new Date().toISOString();
    const { error: updErr } = await sb
      .from("pre_close_review_items")
      .update({
        decision: "rejected",
        decision_reason_code: decision_reason_code ?? "reviewer_rejected",
        decision_reason_text: decision_reason_text ?? null,
        reviewer_user_id: auth.userId,
        approved_by_user_id: auth.userId,
        decision_at: now,
      })
      .eq("id", id);

    if (updErr) {
      console.error("[gap3.reject] update failed", updErr);
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    await logGap3Action({
      firmClientId: ri.firm_client_id,
      actionCategory: "gap3_approval",
      actionType: "gap3.rejected",
      actorId: auth.userId,
      inputSummary: JSON.stringify({ review_item_id: id }),
    });

    return NextResponse.json({
      ok: true,
      review_item_id: id,
      decision: "rejected",
      decision_at: now,
    });
  } catch (e) {
    return authErrorResponse(e);
  }
}
