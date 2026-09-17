import { NextResponse } from "next/server";
import { runRaProHourlyAccountingRefresh } from "@/lib/accounting-automation/hourly-refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return provided === secret;
}

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (process.env.ENABLE_RA_PRO_ACCOUNTING_AUTOMATION !== "true") {
    return NextResponse.json({
      status: "disabled",
      reason: "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION_not_true",
    });
  }

  try {
    const result = await runRaProHourlyAccountingRefresh();
    return NextResponse.json(result, {
      status: result.status === "ok" ? 200 : 207,
    });
  } catch (error) {
    console.error("[ra-pro-accounting-hourly] fatal", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "hourly_refresh_failed" },
      { status: 500 },
    );
  }
}

