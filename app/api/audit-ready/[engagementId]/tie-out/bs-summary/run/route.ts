import { NextResponse } from "next/server";
import { getEngagementActor } from "@/lib/audit-ready/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { resolveQBOTokenForFirmClient } from "@/lib/erp/quickbooks/token-resolver";
import { runBsSummaryResolver } from "@/lib/audit-ready/tie-out/bs-summary-resolver";
import type { PolicySnapshot } from "@/lib/audit-ready/tie-out/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  as_of_date: string;
  bs_account_ids?: string[];
};

export async function POST(
  request: Request,
  ctx: { params: Promise<{ engagementId: string }> },
) {
  const { engagementId } = await ctx.params;
  const actor = await getEngagementActor(engagementId);
  if (!actor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!actor.canWrite) {
    return NextResponse.json({ error: "read_only" }, { status: 403 });
  }
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body.as_of_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.as_of_date)) {
    return NextResponse.json({ error: "as_of_date_format" }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const { data: eng } = await supabase
    .from("audit_ready_engagements")
    .select("id, firm_client_id, company_id")
    .eq("id", engagementId)
    .maybeSingle();
  if (!eng) {
    return NextResponse.json({ error: "engagement_not_found" }, { status: 404 });
  }
  // Resolve firm_client_id (same shape as worker).
  let firmClientId: string | null =
    (eng.firm_client_id as string | null) ?? null;
  if (!firmClientId && eng.company_id) {
    const { data: fc } = await supabase
      .from("firm_clients")
      .select("id")
      .eq("company_id", eng.company_id as string)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    firmClientId = (fc?.id as string) ?? null;
  }
  if (!firmClientId) {
    return NextResponse.json(
      { error: "firm_client_not_bound" },
      { status: 400 },
    );
  }
  const { data: policy } = await supabase
    .from("audit_ready_tie_out_policies")
    .select(
      "policy_mode, auto_reconcile_max_dollar, auto_reconcile_max_percent, kickout_min_dollar, kickout_min_percent, authoritative_comparison",
    )
    .eq("engagement_id", engagementId)
    .maybeSingle();
  if (!policy) {
    return NextResponse.json(
      { error: "no_tolerance_policy" },
      { status: 400 },
    );
  }
  let token: { accessToken: string; realmId: string };
  try {
    const resolved = await resolveQBOTokenForFirmClient(firmClientId);
    if (!resolved?.accessToken || !resolved.realmId) {
      return NextResponse.json(
        { error: "qbo_not_connected" },
        { status: 400 },
      );
    }
    token = { accessToken: resolved.accessToken, realmId: resolved.realmId };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { error: `qbo_token_error: ${msg}` },
      { status: 502 },
    );
  }
  const result = await runBsSummaryResolver({
    engagementId,
    realmId: token.realmId,
    accessToken: token.accessToken,
    asOfDate: body.as_of_date,
    policy: policy as PolicySnapshot & { policy_mode: string },
    triggeredByUserId: actor.userId,
    triggerReason: "manual",
    bsAccountIds: body.bs_account_ids,
  });
  if (result.status === "completed") {
    return NextResponse.json({
      ok: true,
      kind: "bs_recon_summary",
      runId: result.runId,
      summaryArtifactId: result.summaryArtifactId,
      totalsStatus: result.totalsStatus,
      accountCountTotal: result.accountCountTotal,
      bsEquationVarianceCents: result.bsEquationVarianceCents,
    });
  }
  return NextResponse.json(
    {
      ok: false,
      code: result.errorCode,
      reason: result.errorMessage,
      runId: result.runId,
    },
    { status: 500 },
  );
}
