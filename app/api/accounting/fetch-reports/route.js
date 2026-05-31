import { NextResponse } from "next/server";
import { fetchCanonicalReports } from "../../../../lib/integrations/accounting";
import { supabaseAdmin } from "../../../../lib/supabase";
import { rateLimit } from "../../../../lib/rate-limit";

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "accounting-fetch-reports", limit: 8, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    const body = await request.json().catch(() => ({}));
    const connectionId = String(body.connectionId || body.connection_id || "");
    const startDate = String(body.startDate || body.start_date || "");
    const endDate = String(body.endDate || body.end_date || "");
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
    if (!connectionId || !startDate || !endDate) return NextResponse.json({ error: "connectionId, startDate, and endDate are required" }, { status: 400 });
    if (!token) return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user?.id) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    return NextResponse.json(await fetchCanonicalReports(connectionId, authData.user.id, { startDate, endDate }));
  } catch (error) {
    console.error("[accounting/fetch-reports] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to fetch accounting reports" }, { status: 500 });
  }
}
