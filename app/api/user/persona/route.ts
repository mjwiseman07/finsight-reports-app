import { NextResponse } from "next/server";
import { getAuthenticatedCompanyUser } from "@/lib/company-security";
import { companyPersonaOptions } from "@/lib/company-account";
import { rateLimit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase";

const PERSONA_ALIASES: Record<string, string> = {
  owner: "business-owner",
  "business-owner": "business-owner",
  bookkeeper: "bookkeeper",
  controller: "controller",
  "fractional-cfo": "fractional-cfo",
  fractional_cfo: "fractional-cfo",
};

/**
 * DASH_1F — persist StartingPointCard persona chip selection onto the caller's company.
 * Uses companies.primary_persona (existing product path), not a new metadata silo.
 */
export async function POST(request: Request) {
  const rateLimitResponse = rateLimit(request, { key: "user-persona", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await getAuthenticatedCompanyUser(request);
  if (access.response) return access.response;
  if (!supabaseAdmin) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const requested = String(body.persona || "").trim().toLowerCase();
  const persona = PERSONA_ALIASES[requested] || requested;
  const companyId = String(body.companyId || body.company_id || "").trim();

  if (!companyPersonaOptions.some((option) => option.id === persona)) {
    return NextResponse.json({ error: "Invalid persona." }, { status: 400 });
  }

  let resolvedCompanyId = companyId;
  if (!resolvedCompanyId) {
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("company_users")
      .select("company_id")
      .eq("user_id", access.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (membershipError || !membership?.company_id) {
      return NextResponse.json({ error: "No active company membership found." }, { status: 404 });
    }
    resolvedCompanyId = String(membership.company_id);
  } else {
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("company_users")
      .select("company_id")
      .eq("user_id", access.user.id)
      .eq("company_id", resolvedCompanyId)
      .eq("status", "active")
      .maybeSingle();
    if (membershipError || !membership) {
      return NextResponse.json({ error: "Not a member of that company." }, { status: 403 });
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from("companies")
    .update({ primary_persona: persona, updated_at: new Date().toISOString() })
    .eq("id", resolvedCompanyId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message || "Unable to save persona." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, persona, companyId: resolvedCompanyId });
}
