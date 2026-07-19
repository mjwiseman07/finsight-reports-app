import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security.js";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const access = await resolveSuperAdminAccess(req);
  if (access.response) return access.response;

  const body = await req.json().catch(() => ({}));
  const firm_id = body.firm_id as string | undefined;
  const reason = (body.reason as string | undefined) || "admin_legal_hold";
  if (!firm_id) return NextResponse.json({ error: "firm_id_required" }, { status: 400 });

  const supabase = createServiceClient();
  await supabase
    .from("firms")
    .update({
      legal_hold_reason: reason,
      purge_scheduled_at: null,
      purge_grace_until: null,
      purge_schedule_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", firm_id);

  const { data: scheduled } = await supabase
    .from("subscription_purge_schedule")
    .select("id")
    .eq("firm_id", firm_id)
    .eq("status", "scheduled")
    .maybeSingle();

  if (scheduled) {
    await supabase
      .from("subscription_purge_schedule")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_reason: "legal_hold",
        updated_at: new Date().toISOString(),
      })
      .eq("id", scheduled.id as string);
  }

  await supabase.from("subscription_purge_audit").insert({
    schedule_id: scheduled?.id ?? null,
    firm_id,
    event_type: "legal_hold_applied",
    actor_type: "super_admin",
    actor_user_id: access.userId ?? null,
    details: { reason },
  });

  return NextResponse.json({ ok: true });
}
