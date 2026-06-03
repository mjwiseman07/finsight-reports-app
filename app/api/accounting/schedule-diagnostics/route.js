import { NextResponse } from "next/server";
import { getActiveAccountingContext } from "../../../../lib/integrations/accounting";
import { buildScheduleDiagnostics } from "../../../../lib/accounting/supporting-schedules/scheduleDiagnostics";
import { supabaseAdmin } from "../../../../lib/supabase";
import { rateLimit } from "../../../../lib/rate-limit";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "accounting-schedule-diagnostics", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    const url = new URL(request.url);
    const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const leadId = url.searchParams.get("leadId") || "";
    const companyId = url.searchParams.get("companyId") || "";
    const connectionId = url.searchParams.get("connectionId") || "";
    const sourceSystem = url.searchParams.get("sourceSystem") || "";

    let userId = leadId;
    if (token) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authData?.user?.id) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      userId = authData.user.id;
    }
    if (!userId) return NextResponse.json({ error: "Missing Authorization bearer token or leadId" }, { status: 401 });

    const context = await getActiveAccountingContext({
      companyId,
      connectionId,
      sourceSystem,
      userId,
      forceRefresh: false,
    });
    if (!context?.normalizedData) return NextResponse.json({ error: "No active accounting context found" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      ...buildScheduleDiagnostics(context.normalizedData),
    });
  } catch (error) {
    console.error("[accounting/schedule-diagnostics] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to load schedule diagnostics" }, { status: 500 });
  }
}
