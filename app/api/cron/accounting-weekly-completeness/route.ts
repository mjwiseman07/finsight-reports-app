import { NextResponse } from "next/server";
import { runRaProWeeklyCompleteness } from "@/lib/accounting-automation/weekly-completeness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (process.env.ENABLE_RA_PRO_ACCOUNTING_AUTOMATION !== "true") {
    return NextResponse.json({ status: "disabled", reason: "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION_not_true" });
  }
  try {
    const result = await runRaProWeeklyCompleteness();
    return NextResponse.json(result, { status: result.status === "ok" ? 200 : 207 });
  } catch {
    return NextResponse.json({ error: "weekly_completeness_failed" }, { status: 500 });
  }
}
