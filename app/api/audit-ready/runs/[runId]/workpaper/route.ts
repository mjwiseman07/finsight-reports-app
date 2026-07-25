import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  requireAuditReadyUser,
  getEngagementActor,
} from "@/lib/audit-ready/server-auth";
import { getEmitter } from "@/lib/audit-ready/tie-out/emitters/registry";
import { getSignedArtifactUrl } from "@/lib/audit-ready/tie-out/upload-artifact";
import type { TieOutKind } from "@/lib/audit-ready/tie-out-kind-classifier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/audit-ready/runs/[runId]/workpaper
 * Path Y: emitter.build(runId) reads persisted tables + raw_qbo_payload_jsonb.
 * Never live-fetches QBO.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ runId: string }> },
) {
  const { runId } = await ctx.params;

  const auth = await requireAuditReadyUser();
  if ("error" in auth) return auth.error;

  const supabase = getSupabaseAdmin();
  const { data: run, error: runErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .select("id, engagement_id, tie_out_kind, status")
    .eq("id", runId)
    .maybeSingle();

  if (runErr) {
    return NextResponse.json({ error: runErr.message }, { status: 500 });
  }
  if (!run) {
    return NextResponse.json({ error: "run_not_found" }, { status: 404 });
  }

  const actor = await getEngagementActor(run.engagement_id as string);
  if (!actor || !actor.canRead) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const kind = run.tie_out_kind as TieOutKind;
  const emitter = getEmitter(kind);
  if (!emitter) {
    return NextResponse.json(
      { error: "emitter_not_yet_shipped", kind },
      { status: 501 },
    );
  }

  let payload;
  try {
    payload = await emitter.build(runId);
  } catch (err) {
    console.error("[workpaper GET] emitter.build failed", runId, err);
    return NextResponse.json({ error: "build_failed" }, { status: 500 });
  }

  const { data: artifacts } = await supabase
    .from("audit_ready_run_artifacts")
    .select("artifact_kind, storage_path")
    .eq("tie_out_run_id", runId);

  const downloads: { xlsx: string | null; pdf: string | null } = {
    xlsx: null,
    pdf: null,
  };
  for (const a of artifacts ?? []) {
    try {
      const url = await getSignedArtifactUrl({
        storagePath: a.storage_path as string,
        expiresInSeconds: 3600,
      });
      if (a.artifact_kind === "xlsx") downloads.xlsx = url;
      if (a.artifact_kind === "pdf") downloads.pdf = url;
    } catch (err) {
      console.error(
        "[workpaper GET] signed URL failed",
        a.storage_path,
        err,
      );
    }
  }

  return NextResponse.json({ payload, downloads });
}
