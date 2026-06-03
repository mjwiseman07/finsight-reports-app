import { NextResponse } from "next/server";
import { rateLimit } from "../../../../lib/rate-limit";
import { supabaseAdmin } from "../../../../lib/supabase";
import { advisorySchemaError, auditAdvisoryAction, requireAdvisoryCompanyAccess } from "../../../../lib/advisory-intelligence/api-security";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "advisory-intelligence-recommendations", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    const { searchParams } = new URL(request.url);
    const companyId = String(searchParams.get("companyId") || searchParams.get("company_id") || "").trim();
    const access = await requireAdvisoryCompanyAccess(request, { companyId });
    if (access.response) return access.response;

    const { data, error } = await supabaseAdmin
      .from("advisory_recommendations")
      .select("*, advisory_signals(*)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    await auditAdvisoryAction({
      eventType: "advisory_recommendations_viewed",
      user: access.user,
      companyId,
      metadata: { count: data?.length || 0 },
    });

    return NextResponse.json({ ok: true, recommendations: data || [] });
  } catch (error) {
    if (advisorySchemaError(error)) return NextResponse.json({ error: "Run the advisory intelligence migration first." }, { status: 501 });
    console.error("[advisory-intelligence/recommendations] failed", { message: error?.message });
    return NextResponse.json({ error: "Unable to load advisory recommendations" }, { status: 500 });
  }
}
