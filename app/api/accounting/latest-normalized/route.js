import { NextResponse } from "next/server";
import { getLatestNormalizedAccountingData } from "../../../../lib/integrations/accounting";
import { supabaseAdmin } from "../../../../lib/supabase";
import {
  isAccountingPrincipalDenial,
  resolveAccountingRequestPrincipal,
} from "../../../../lib/integrations/accounting/resolve-request-principal";
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

    if (!sourceSystem) return NextResponse.json({ error: "sourceSystem is required" }, { status: 400 });
    if (sourceSystem === "xero" && connectionId.startsWith("lead:xero:")) connectionId = "";

    const principal = await resolveAccountingRequestPrincipal({ request, body });
    if (isAccountingPrincipalDenial(principal)) {
      return NextResponse.json(principal.body, { status: principal.status });
    }

    let connectionQuery = supabaseAdmin
      .from("accounting_connections")
      .select("id")
      .eq("user_id", principal.userId)
      .eq("provider", sourceSystem)
      .order("updated_at", { ascending: false });
    if (connectionId) connectionQuery = connectionQuery.eq("id", connectionId);
    const { data: connection, error: connectionError } = await connectionQuery.limit(1);
    if (connectionError) throw connectionError;
    if (!connection?.[0]) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    connectionId = connection[0].id;

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
