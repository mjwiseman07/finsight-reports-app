import { NextResponse } from "next/server";
import { getActiveAccountingContext } from "../../../../lib/integrations/accounting";
import { supabaseAdmin } from "../../../../lib/supabase";
import { rateLimit } from "../../../../lib/rate-limit";

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "accounting-active-context", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    const body = await request.json().catch(() => ({}));
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
    const leadId = String(body.leadId || body.lead_id || "");
    const companyId = body.companyId || body.company_id || null;
    const connectionId = String(body.connectionId || body.connection_id || "");
    const sourceSystem = String(body.sourceSystem || body.source_system || "");

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
    });
    if (!context) return NextResponse.json({ error: "No active accounting context found" }, { status: 404 });
    return NextResponse.json({ ok: true, activeContext: context, ...context });
  } catch (error) {
    console.error("[accounting/active-context] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to load active accounting context" }, { status: 500 });
  }
}
