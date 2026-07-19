import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security.js";
import { createServiceClient } from "@/lib/supabase/service";
import { executePurge } from "@/lib/gap2/purge-executor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const access = await resolveSuperAdminAccess(req);
  if (access.response) return access.response;

  const body = await req.json().catch(() => ({}));
  const schedule_id = body.schedule_id as string | undefined;
  if (!schedule_id) return NextResponse.json({ error: "schedule_id_required" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("subscription_purge_schedule")
    .select("id, firm_id, status")
    .eq("id", schedule_id)
    .maybeSingle();
  if (!row || row.status !== "scheduled") {
    return NextResponse.json({ error: "not_found_or_not_scheduled" }, { status: 404 });
  }

  // Force grace to now so executor eligibility is clear, then execute.
  await supabase
    .from("subscription_purge_schedule")
    .update({
      grace_until: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", schedule_id);

  await supabase.from("subscription_purge_audit").insert({
    schedule_id,
    firm_id: row.firm_id,
    event_type: "admin_override",
    actor_type: "super_admin",
    actor_user_id: access.userId ?? null,
    details: { action: "execute_now" },
  });

  const result = await executePurge(schedule_id);
  return NextResponse.json(result);
}
