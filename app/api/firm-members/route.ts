import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

// GET /api/firm-members?can_approve=true — returns active firm memberships for the caller's firm
export async function GET(req: Request) {
  try {
    const auth = await requireFirmAuth(req);
    const firmId = auth.firmIds[0];
    if (!firmId) return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });

    const url = new URL(req.url);
    const canApproveOnly = url.searchParams.get("can_approve") === "true";

    const supabase = createServiceClient();
    let q = supabase
      .from("firm_memberships")
      .select("id, user_id, role, status, can_approve")
      .eq("firm_id", firmId)
      .eq("status", "active");

    if (canApproveOnly) q = q.eq("can_approve", true);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: "internal", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, members: data ?? [] });
  } catch (e) {
    return authErrorResponse(e);
  }
}
