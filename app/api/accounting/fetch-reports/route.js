import { NextResponse } from "next/server";
import { fetchCanonicalReports } from "../../../../lib/integrations/accounting";
import { supabaseAdmin } from "../../../../lib/supabase";
import { rateLimit } from "../../../../lib/rate-limit";
import { auditSecurityEvent } from "../../../../lib/security-audit";

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "accounting-fetch-reports", limit: 8, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    const body = await request.json().catch(() => ({}));
    const connectionId = String(body.connectionId || body.connection_id || "");
    const startDate = String(body.startDate || body.start_date || "");
    const endDate = String(body.endDate || body.end_date || "");
    const sourceSystem = String(body.sourceSystem || body.source_system || body.selectedProvider || body.selected_provider || "");
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
    if (!connectionId || !startDate || !endDate || !sourceSystem) return NextResponse.json({ error: "connectionId, startDate, endDate, and sourceSystem are required" }, { status: 400 });
    if (!token) return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user?.id) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    const result = await fetchCanonicalReports({
      connectionId,
      userId: authData.user.id,
      dateRange: { startDate, endDate },
      sourceSystem,
    });
    await auditSecurityEvent({
      eventType: "data_import_requested",
      actorUserId: authData.user.id,
      actorEmail: authData.user.email || null,
      resourceType: "accounting_connection",
      resourceId: connectionId,
      metadata: { start_date: startDate, end_date: endDate, provider: result.provider },
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[accounting/fetch-reports] failed", { message: error?.message });
    if (error?.status === 422 || error?.preflight) {
      return NextResponse.json({
        error: error.message,
        preflight: error.preflight,
        diagnostics: error.diagnostics || null,
      }, { status: 422 });
    }
    if (
      String(error?.message || "").includes("Normalized Advisacor financial data is incomplete") ||
      String(error?.message || "").includes("Provider mismatch") ||
      error?.diagnostics
    ) {
      return NextResponse.json({ error: error.message, diagnostics: error.diagnostics || null }, { status: 422 });
    }
    return NextResponse.json({ error: error?.message || "Unable to fetch accounting reports" }, { status: 500 });
  }
}
