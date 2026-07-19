/**
 * Gap 3 — firm-admin posting-policy surface (aliases reviewer policy PUT with Gap 3 fields).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, ReviewerAuthError, authErrorResponse } from "@/lib/reviewer/auth";
import { resolvePostingPolicy } from "@/lib/pre-close/posting-policy-resolver";
import type { PostingPolicyUpdateBody } from "@/lib/pre-close/reviewer-types";
import { assertWriterForEngagement } from "@/lib/reviewer/review-detail";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireFirmAuth(req);
    const { id: engagementId } = await params;
    const supabase = createServiceClient();
    const { data: eng } = await supabase
      .from("engagements")
      .select("firm_id")
      .eq("id", engagementId)
      .maybeSingle();
    if (!eng || !ctx.firmIds.includes(eng.firm_id as string)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(await resolvePostingPolicy(engagementId));
  } catch (e) {
    return authErrorResponse(e);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireFirmAuth(req);
    const { id: engagementId } = await params;
    const body = (await req.json()) as PostingPolicyUpdateBody;

    const canWrite = await assertWriterForEngagement(engagementId, ctx);
    if (!canWrite) throw new ReviewerAuthError("writer_required", 403);

    if ((body.autonomousMaxBucket as string | null | undefined) === "high") {
      return NextResponse.json({ error: "autonomous_high_forbidden" }, { status: 400 });
    }
    if (body.autonomousPostingEnabled === true) {
      if (body.autonomousMaxBucket !== "low" && body.autonomousMaxBucket !== "medium") {
        return NextResponse.json({ error: "autonomous_max_bucket_required" }, { status: 400 });
      }
    }

    const supabase = createServiceClient();
    const patch: Record<string, unknown> = {
      engagement_id: engagementId,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    };

    if ("materialityLowMaxCents" in body) {
      patch.materiality_low_max_cents = body.materialityLowMaxCents;
    }
    if ("materialityMediumMaxCents" in body) {
      patch.materiality_medium_max_cents = body.materialityMediumMaxCents;
    }
    if ("materialityHighRequiresMfa" in body) {
      patch.materiality_high_requires_mfa = body.materialityHighRequiresMfa;
    }
    if (body.autonomousPostingEnabled != null) {
      patch.autonomous_posting_enabled = body.autonomousPostingEnabled;
      patch.autonomous_max_bucket = body.autonomousPostingEnabled
        ? body.autonomousMaxBucket
        : null;
    } else if ("autonomousMaxBucket" in body) {
      patch.autonomous_max_bucket = body.autonomousMaxBucket;
    }

    const { error } = await supabase.from("engagement_posting_policy").upsert(patch);
    if (error) {
      console.error("[gap3.firm-policy] upsert failed", error);
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    await supabase.from("ai_action_log").insert({
      action_type: "posting_policy_update",
      action_category: "reviewer_ui_policy_change",
      model_provider: "local",
      model_name: `user:${ctx.userId}`,
      input_summary: `engagement=${engagementId}`,
      output_summary: JSON.stringify(patch),
      engagement_id: engagementId,
    });

    return NextResponse.json(await resolvePostingPolicy(engagementId));
  } catch (e) {
    return authErrorResponse(e);
  }
}
