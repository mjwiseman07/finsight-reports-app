import { NextResponse } from "next/server";
import { getEngagementActor } from "@/lib/audit-ready/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ engagementId: string; artifactId: string }> },
) {
  const { engagementId, artifactId } = await ctx.params;
  const actor = await getEngagementActor(engagementId);
  if (!actor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!actor.canRead) {
    return NextResponse.json({ error: "no_read" }, { status: 403 });
  }
  const supabase = getSupabaseAdmin();
  const { data: art, error } = await supabase
    .from("audit_ready_bs_recon_artifacts")
    .select(
      "id, engagement_id, qbo_account_id, qbo_account_name, period_end, format, storage_bucket, storage_object_key, file_size_bytes",
    )
    .eq("id", artifactId)
    .maybeSingle();
  if (error || !art) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (art.engagement_id !== engagementId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { data: signed, error: signErr } = await supabase.storage
    .from(art.storage_bucket as string)
    .createSignedUrl(art.storage_object_key as string, 600); // 10-minute TTL
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: "sign_failed", detail: signErr?.message ?? null },
      { status: 500 },
    );
  }
  return NextResponse.json({
    artifact_id: art.id,
    qbo_account_id: art.qbo_account_id,
    qbo_account_name: art.qbo_account_name,
    period_end: art.period_end,
    format: art.format,
    file_size_bytes: art.file_size_bytes,
    signed_url: signed.signedUrl,
    expires_in_seconds: 600,
  });
}
