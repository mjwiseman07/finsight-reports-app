import { NextResponse } from "next/server";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security.js";
import { reinforceFromPostedJEs } from "@/lib/learning/forward-learner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const access = (await resolveSuperAdminAccess(req)) as { response?: NextResponse; userId?: string };
  if (access.response) return access.response;

  const body = await req.json().catch(() => ({}));
  const { firm_client_id, since_date } = body ?? {};
  if (!firm_client_id) {
    return NextResponse.json({ error: "missing_firm_client_id" }, { status: 400 });
  }

  const result = await reinforceFromPostedJEs(firm_client_id, { sinceDate: since_date });
  return NextResponse.json(result, { status: 200 });
}
