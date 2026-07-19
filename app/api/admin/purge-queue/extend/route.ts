import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security.js";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const access = await resolveSuperAdminAccess(req);
  if (access.response) return access.response;

  const body = await req.json().catch(() => ({}));
  const schedule_id = body.schedule_id as string | undefined;
  const days = Number(body.days ?? 30);
  if (!schedule_id) return NextResponse.json({ error: "schedule_id_required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("subscription_purge_schedule")
    .select("id, firm_id, grace_until, status")
    .eq("id", schedule_id)
    .maybeSingle();
  if (!row || row.status !== "scheduled") {
    return NextResponse.json({ error: "not_found_or_not_scheduled" }, { status: 404 });
  }

  const base = new Date(Math.max(Date.now(), new Date(row.grace_until as string).getTime()));
  const grace_until = new Date(base.getTime() + days * 86400000).toISOString();

  await supabase
    .from("subscription_purge_schedule")
    .update({ grace_until, updated_at: new Date().toISOString() })
    .eq("id", schedule_id);
  await supabase
    .from("firms")
    .update({ purge_grace_until: grace_until, updated_at: new Date().toISOString() })
    .eq("id", row.firm_id as string);
  await supabase.from("subscription_purge_audit").insert({
    schedule_id,
    firm_id: row.firm_id,
    event_type: "grace_extended",
    actor_type: "super_admin",
    actor_user_id: access.userId ?? null,
    details: { days, grace_until },
  });

  return NextResponse.json({ ok: true, grace_until });
}
