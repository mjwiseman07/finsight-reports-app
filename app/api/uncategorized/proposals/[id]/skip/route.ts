import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security.js";
import { skipProposal } from "@/lib/learning/proposal-service";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  const supabase = getSupabaseAdmin();
  const { data: proposal } = await supabase
    .from("uncategorized_proposals")
    .select("firm_client_id")
    .eq("proposal_id", id)
    .maybeSingle();
  if (!proposal?.firm_client_id) {
    return NextResponse.json({ error: "proposal_not_found" }, { status: 404 });
  }

  const access = (await resolveFirmAccess(req, { clientId: proposal.firm_client_id })) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;
  if (!access.userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await skipProposal(id, access.userId, body);
    return NextResponse.json({ status: "skipped", proposal_id: id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = message === "proposal_not_pending" ? 409 : 500;
    return NextResponse.json({ error: message }, { status: code });
  }
}
