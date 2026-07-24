import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { requireAuditReadyUser } from "@/lib/audit-ready/server-auth";
import { listVisibleEngagementIds } from "@/lib/audit-ready/kickouts/list-visible-engagements.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_SOURCE_TYPES = new Set(["bs_summary_line", "pbc_run"]);
const ALLOWED_STATUSES = new Set(["pending", "resolved", "escalated"]);

export async function POST(req: Request) {
  const auth = await requireAuditReadyUser();
  if ("error" in auth) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const engagement_id = body?.engagement_id;
  const kickout_source_type = body?.kickout_source_type;
  const kickout_source_id = body?.kickout_source_id;
  const note = body?.note;
  const resolution_status = body?.resolution_status;

  if (typeof engagement_id !== "string" || engagement_id.length < 10) {
    return NextResponse.json(
      { error: "engagement_id required" },
      { status: 400 },
    );
  }
  if (
    typeof kickout_source_type !== "string" ||
    !ALLOWED_SOURCE_TYPES.has(kickout_source_type)
  ) {
    return NextResponse.json(
      { error: "invalid kickout_source_type" },
      { status: 400 },
    );
  }
  if (typeof kickout_source_id !== "string" || kickout_source_id.length < 10) {
    return NextResponse.json(
      { error: "kickout_source_id required" },
      { status: 400 },
    );
  }
  if (typeof note !== "string" || note.trim().length === 0) {
    return NextResponse.json({ error: "note required" }, { status: 400 });
  }
  const status =
    typeof resolution_status === "string" ? resolution_status : "pending";
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json(
      { error: "invalid resolution_status" },
      { status: 400 },
    );
  }

  const visible = await listVisibleEngagementIds(auth.user.id);
  if (!visible.includes(engagement_id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("audit_ready_kickout_investigations")
    .insert({
      engagement_id,
      kickout_source_type,
      kickout_source_id,
      investigated_by: auth.user.id,
      note: note.trim(),
      resolution_status: status,
    })
    .select()
    .single();

  if (error) {
    console.error("[investigations POST]", error);
    return NextResponse.json(
      { error: "insert_failed", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ investigation: data });
}
