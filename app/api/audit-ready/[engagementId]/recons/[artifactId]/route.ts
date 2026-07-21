import { NextResponse } from "next/server";
import { getEngagementActor } from "@/lib/audit-ready/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReconArtifactRow = {
  id: string;
  engagement_id: string;
  format: string;
  storage_bucket: string;
  storage_object_key: string;
  file_size_bytes: number;
  period_end: string;
  qbo_account_id?: string | null;
  qbo_account_name?: string | null;
  scope_kind?: string | null;
  scope_label?: string | null;
};

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

  // Try bs_account_recon artifacts first, then fa_rollforward.
  let artifactKind: "bs_account_recon" | "fa_rollforward" | null = null;
  let art: ReconArtifactRow | null = null;

  {
    const { data } = await supabase
      .from("audit_ready_bs_recon_artifacts")
      .select(
        "id, engagement_id, qbo_account_id, qbo_account_name, period_end, format, storage_bucket, storage_object_key, file_size_bytes",
      )
      .eq("id", artifactId)
      .maybeSingle();
    if (data) {
      artifactKind = "bs_account_recon";
      art = data as ReconArtifactRow;
    }
  }

  if (!art) {
    const { data } = await supabase
      .from("audit_ready_fa_rollforward_artifacts")
      .select(
        "id, engagement_id, scope_kind, scope_label, period_end, format, storage_bucket, storage_object_key, file_size_bytes",
      )
      .eq("id", artifactId)
      .maybeSingle();
    if (data) {
      artifactKind = "fa_rollforward";
      art = data as ReconArtifactRow;
    }
  }

  if (!art || !artifactKind) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (art.engagement_id !== engagementId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(art.storage_bucket)
    .createSignedUrl(art.storage_object_key, 600);
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: "sign_failed", detail: signErr?.message ?? null },
      { status: 500 },
    );
  }

  return NextResponse.json({
    artifact_id: art.id,
    artifact_kind: artifactKind,
    qbo_account_id: art.qbo_account_id ?? null,
    qbo_account_name: art.qbo_account_name ?? null,
    scope_kind: art.scope_kind ?? null,
    scope_label: art.scope_label ?? null,
    period_end: art.period_end,
    format: art.format,
    file_size_bytes: art.file_size_bytes,
    signed_url: signed.signedUrl,
    expires_in_seconds: 600,
  });
}
