import { NextResponse } from "next/server";
import { verifyAndConsumePurgeToken } from "@/lib/gap2/purge-tokens";
import { scheduleGap2Purge } from "@/lib/gap2/stripe-integration";
import { executePurge } from "@/lib/gap2/purge-executor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteBase() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    "https://www.advisacor.com"
  ).replace(/\/$/, "");
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${siteBase()}/?purge_error=missing_token`);
  }

  const consumed = await verifyAndConsumePurgeToken(token);
  if (!consumed) {
    return NextResponse.redirect(`${siteBase()}/?purge_error=invalid_or_expired`);
  }

  const schedule_id = await scheduleGap2Purge({
    firm_id: consumed.firm_id,
    stripe_subscription_id: "customer_initiated",
    reason: "customer_initiated",
    triggered_by_user_id: consumed.user_id,
    grace_days: 0,
  });

  if (schedule_id) {
    await executePurge(schedule_id);
  }

  return NextResponse.redirect(`${siteBase()}/?purge_confirmed=1`);
}
