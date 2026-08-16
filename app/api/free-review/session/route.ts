import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Server authority for anonymous Free Review dashboard sessions.
 * Mirrors QBO connect lead mode: HttpOnly free_review_lead_id cookie + live DB row.
 * URL/localStorage leadId is never sufficient to grant access.allowed.
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = rateLimit(request, {
    key: "free-review-session",
    limit: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const cookieLeadId = String(request.cookies.get("free_review_lead_id")?.value || "").trim();

  if (!cookieLeadId) {
    return NextResponse.json(
      {
        allowed: false,
        reason: "missing_lead_cookie",
        error: "Free Review lead session cookie is required.",
      },
      { status: 401 },
    );
  }

  const { data: lead, error } = await supabaseAdmin
    .from("free_review_leads")
    .select("id, email, business_name, legal_company_name, first_name, last_name, status")
    .eq("id", cookieLeadId)
    .maybeSingle();

  if (error?.code === "42P01") {
    return NextResponse.json(
      { allowed: false, reason: "migration_required", error: "Run the free review leads migration." },
      { status: 501 },
    );
  }

  if (error || !lead?.id) {
    return NextResponse.json(
      {
        allowed: false,
        reason: "invalid_lead",
        error: "Free Review lead session is invalid or expired.",
      },
      { status: 401 },
    );
  }

  const businessName =
    String(lead.legal_company_name || lead.business_name || "").trim() || "Free Review Company";

  return NextResponse.json({
    allowed: true,
    reason: "lead_free_review",
    lead_id: lead.id,
    email: lead.email || "Lead captured",
    business_name: businessName,
    subscription_plan: "pulse_starter",
    subscription_status: "free_review",
    lead_status: lead.status || null,
  });
}
