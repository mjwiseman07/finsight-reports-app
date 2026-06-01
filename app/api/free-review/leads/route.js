import { NextResponse } from "next/server";
import { rateLimit } from "../../../../lib/rate-limit";
import { supabaseAdmin } from "../../../../lib/supabase";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value, maxLength = 240) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeUtmTracking(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => String(key).startsWith("utm_"))
      .map(([key, entryValue]) => [String(key).slice(0, 80), normalizeText(entryValue, 240)]),
  );
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "free-review-lead-create", limit: 20, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const firstName = normalizeText(body.first_name, 120);
  const lastName = normalizeText(body.last_name, 120);
  const businessName = normalizeText(body.business_name, 180);
  const email = normalizeEmail(body.email);
  const phone = normalizeText(body.phone, 80);

  if (!firstName) return NextResponse.json({ error: "First name is required." }, { status: 400 });
  if (!lastName) return NextResponse.json({ error: "Last name is required." }, { status: 400 });
  if (!businessName) return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("free_review_leads")
    .insert({
      first_name: firstName,
      last_name: lastName,
      business_name: businessName,
      email,
      phone,
      source_page: normalizeText(body.source_page || request.headers.get("referer") || "free-review", 500),
      referral_information: normalizeText(body.referral_information || request.headers.get("referer") || "", 500),
      utm_tracking_data: normalizeUtmTracking(body.utm_tracking_data),
      status: "lead_captured",
    })
    .select("*")
    .single();

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "Run the free review leads migration before capturing leads." }, { status: 501 });
  }

  if (error) {
    return NextResponse.json({ error: "Unable to capture free review lead." }, { status: 500 });
  }

  const response = NextResponse.json({ lead: data });
  response.cookies.set("free_review_lead_id", data.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}

export async function PATCH(request) {
  const rateLimitResponse = rateLimit(request, { key: "free-review-lead-enrich", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const leadId = normalizeText(body.lead_id, 80);
  if (!leadId) return NextResponse.json({ error: "Lead id is required." }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("free_review_leads")
    .update({
      legal_company_name: normalizeText(body.legal_company_name || body.business_name, 180),
      industry: normalizeText(body.industry, 120),
      revenue_range: normalizeText(body.revenue_range, 120),
      fiscal_year: normalizeText(body.fiscal_year, 120),
      additional_business_information:
        body.additional_business_information && typeof body.additional_business_information === "object"
          ? body.additional_business_information
          : {},
      status: normalizeText(body.status || "onboarding_started", 80),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .select("*")
    .maybeSingle();

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "Run the free review leads migration before enriching leads." }, { status: 501 });
  }

  if (error) {
    return NextResponse.json({ error: "Unable to enrich free review lead." }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}
