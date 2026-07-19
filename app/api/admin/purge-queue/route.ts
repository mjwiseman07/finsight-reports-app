import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security.js";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const access = await resolveSuperAdminAccess(req);
  if (access.response) return access.response;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("subscription_purge_schedule")
    .select("id, firm_id, status, reason, scheduled_at, grace_until, firms(id, name)")
    .in("status", ["scheduled", "executing", "failed"])
    .order("grace_until", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}
