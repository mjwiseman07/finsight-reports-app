import { NextResponse } from "next/server";
import { resolveFirmAccessFromEngagement } from "@/lib/firm-security-engagement";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const engagementId = url.searchParams.get("engagement_id");
  if (!engagementId) {
    return NextResponse.json({ error: "engagement_id_required" }, { status: 400 });
  }

  const access = await resolveFirmAccessFromEngagement(req, engagementId);
  if (access.response) return access.response;

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("pre_close_review_items")
    .select(
      "id, materiality_bucket, je_draft_total_debit_cents, rule_reason_code, created_at, autonomous_lane, requires_mfa_step_up, proposed_by_user_id",
    )
    .eq("engagement_id", engagementId)
    .is("decision", null)
    .eq("autonomous_lane", false)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) return NextResponse.json({ error: "load_failed" }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
