import { NextResponse } from "next/server";
import { getEngagementActor } from "@/lib/audit-ready/server-auth";
import { runTieOut } from "@/lib/audit-ready/tie-out/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  pbc_request_id: string;
  as_of_date: string;
  ar_account_id?: string;
  ap_account_id?: string;
  inventory_account_id?: string;
  grni_clearing_account_id?: string;
  bs_account_id?: string;
  activity_start_date?: string;
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
  if (!body.pbc_request_id || !body.as_of_date) {
    return NextResponse.json(
      { error: "missing_required_fields" },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.as_of_date)) {
    return NextResponse.json({ error: "as_of_date_format" }, { status: 400 });
  }
  if (
    body.activity_start_date &&
    !/^\d{4}-\d{2}-\d{2}$/.test(body.activity_start_date)
  ) {
    return NextResponse.json(
      { error: "activity_start_date_format" },
      { status: 400 },
    );
  }
  const outcome = await runTieOut({
    engagementId,
    pbcRequestId: body.pbc_request_id,
    asOfDate: body.as_of_date,
    arAccountId: body.ar_account_id,
    apAccountId: body.ap_account_id,
    inventoryAccountId: body.inventory_account_id,
    grniClearingAccountId: body.grni_clearing_account_id,
    bsAccountId: body.bs_account_id,
    activityStartDate: body.activity_start_date,
    triggeredByUserId: actor.userId,
    triggerReason: "manual",
  });
  return NextResponse.json(outcome);
}
