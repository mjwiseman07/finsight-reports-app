import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getERPAdapter } from "../../../../lib/erp-adapters";

export async function POST(request) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  if (!token) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authData?.user?.id) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const { start_date: startDate, end_date: endDate } = await request.json().catch(() => ({}));

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "start_date and end_date are required" }, { status: 400 });
  }

  try {
    const adapter = getERPAdapter("quickbooks", authData.user.id);
    const reports = await adapter.fetchReports({
      start_date: startDate,
      end_date: endDate,
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("[quickbooks/fetch-reports] failed", {
      message: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json({ error: error?.message || "Unable to fetch QuickBooks reports" }, { status: 500 });
  }
}
