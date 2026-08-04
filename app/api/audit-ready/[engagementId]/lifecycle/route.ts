import { NextResponse } from "next/server";
import {
  getEngagementActor,
  requireAuditReadyUser,
} from "@/lib/audit-ready/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ROWS = 500;

const EVENT_SELECT = [
  "id",
  "event_kind",
  "event_at",
  "schema_version",
  "chain_seq",
  "pilot_slot_id",
  "from_status",
  "to_status",
  "classification_hint",
  "company_id",
  "firm_id",
  "actor_kind",
  "actor_user_id",
  "actor_via",
  "assertions_covered",
  "evidence_refs",
  "reason_code",
  "reason_text",
  "payload",
  "prev_hash",
  "row_hash",
].join(", ");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  const { engagementId } = await params;
  if (!engagementId) {
    return NextResponse.json({ error: "engagement_id required" }, { status: 400 });
  }

  const auth = await requireAuditReadyUser();
  if ("error" in auth) return auth.error;

  const actor = await getEngagementActor(engagementId);
  if (!actor || !actor.canRead) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();

  const { data: eng, error: engErr } = await admin
    .from("audit_ready_engagements")
    .select("id, company_id, firm_id")
    .eq("id", engagementId)
    .maybeSingle();
  if (engErr || !eng) {
    return NextResponse.json({ error: "engagement not found" }, { status: 404 });
  }

  if (!eng.company_id && !eng.firm_id) {
    return NextResponse.json({
      engagement: { id: eng.id, company_id: eng.company_id, firm_id: eng.firm_id },
      events: [],
      server_verify: { ok: true, breaks: [] },
      max_rows: MAX_ROWS,
      truncated: false,
      note: "engagement has neither company_id nor firm_id",
    });
  }

  let query = admin
    .from("pilot_lifecycle_events")
    .select(EVENT_SELECT)
    .order("chain_seq", { ascending: true })
    .limit(MAX_ROWS);
  if (eng.company_id) {
    query = query.eq("company_id", eng.company_id);
  } else {
    query = query.eq("firm_id", eng.firm_id);
  }

  const { data: events, error: evErr } = await query;
  if (evErr) {
    return NextResponse.json(
      { error: "read failed", detail: evErr.message },
      { status: 500 },
    );
  }

  const { data: verifyResult, error: verifyErr } = await admin.rpc(
    "pilot_lifecycle_events_verify_chain",
    {
      p_company_id: eng.company_id ?? null,
      p_firm_id: eng.firm_id ?? null,
    },
  );

  // RPC returns TABLE of break rows — empty array / null means intact.
  const breaks = Array.isArray(verifyResult) ? verifyResult : [];

  return NextResponse.json({
    engagement: {
      id: eng.id,
      company_id: eng.company_id,
      firm_id: eng.firm_id,
    },
    events: events ?? [],
    server_verify: verifyErr
      ? { ok: false, error: verifyErr.message }
      : { ok: breaks.length === 0, breaks },
    max_rows: MAX_ROWS,
    truncated: (events?.length ?? 0) === MAX_ROWS,
  });
}
