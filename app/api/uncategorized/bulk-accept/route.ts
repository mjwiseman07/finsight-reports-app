import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security.js";
import { requireFlag } from "@/lib/review-assist/route-guard";
import { bulkAcceptProposals } from "@/lib/learning/proposal-service";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const proposalIds = body?.proposal_ids as string[] | undefined;
  if (!Array.isArray(proposalIds) || proposalIds.length === 0) {
    return NextResponse.json({ error: "missing_proposal_ids" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: rows } = await supabase
    .from("uncategorized_proposals")
    .select("firm_client_id")
    .in("proposal_id", proposalIds);
  const firmIds = [
    ...new Set((rows ?? []).map((r: { firm_client_id: string }) => r.firm_client_id)),
  ];
  if (firmIds.length !== 1) {
    return NextResponse.json({ error: "proposals_must_share_firm_client" }, { status: 400 });
  }

  const access = (await resolveFirmAccess(req, { clientId: firmIds[0] })) as {
    response?: NextResponse;
    userId?: string;
    client?: { firm_id: string };
  };
  if (access.response) return access.response;

  const gate = await requireFlag(access.client!.firm_id, "qbo_write_back");
  if (gate) return gate;

  if (!access.userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await bulkAcceptProposals(access.userId, { proposal_ids: proposalIds });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code =
      message === "bulk_accept_requires_green_bucket_only" ||
      message === "all_proposals_must_be_pending"
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status: code });
  }
}
