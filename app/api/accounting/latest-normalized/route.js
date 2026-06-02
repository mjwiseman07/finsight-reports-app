import { NextResponse } from "next/server";
import { getLatestNormalizedAccountingData } from "../../../../lib/integrations/accounting";
import { supabaseAdmin } from "../../../../lib/supabase";
import { rateLimit } from "../../../../lib/rate-limit";

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "accounting-latest-normalized", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    const body = await request.json().catch(() => ({}));
    let connectionId = String(body.connectionId || body.connection_id || "");
    const sourceSystem = String(body.sourceSystem || body.source_system || "");
    const companyId = body.companyId || body.company_id || null;
    const reportPeriod = body.reportPeriod || body.report_period || null;
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
    const leadId = String(body.leadId || body.lead_id || "");

    if (!sourceSystem) return NextResponse.json({ error: "sourceSystem is required" }, { status: 400 });
    if (sourceSystem === "xero" && connectionId.startsWith("lead:xero:")) connectionId = "";

    if (token) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authData?.user?.id) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      let connectionQuery = supabaseAdmin
        .from("accounting_connections")
        .select("id")
        .eq("user_id", authData.user.id)
        .eq("provider", sourceSystem)
        .order("updated_at", { ascending: false });
      if (connectionId) connectionQuery = connectionQuery.eq("id", connectionId);
      const { data: connection, error: connectionError } = await connectionQuery.limit(1);
      if (connectionError) throw connectionError;
      if (!connection?.[0]) return NextResponse.json({ error: "Accounting connection not found" }, { status: 404 });
      connectionId = connection[0].id;
    } else if (leadId) {
      let connectionQuery = supabaseAdmin
        .from("accounting_connections")
        .select("id")
        .eq("user_id", leadId)
        .eq("provider", sourceSystem)
        .order("updated_at", { ascending: false });
      if (connectionId) connectionQuery = connectionQuery.eq("id", connectionId);
      const { data: connection, error: connectionError } = await connectionQuery.limit(1);
      if (connectionError) throw connectionError;
      if (!connection?.[0]) return NextResponse.json({ error: "Accounting connection not found for lead" }, { status: 404 });
      connectionId = connection[0].id;
    } else {
      return NextResponse.json({ error: "Missing Authorization bearer token or leadId" }, { status: 401 });
    }

    const result = await getLatestNormalizedAccountingData({
      companyId,
      connectionId,
      sourceSystem,
      reportPeriod,
    });
    if (!result) return NextResponse.json({ error: "No normalized accounting sync found" }, { status: 404 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[accounting/latest-normalized] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to load latest normalized accounting data" }, { status: 500 });
  }
}
