import { NextResponse } from "next/server";
import { rateLimit } from "../../../../lib/rate-limit";
import { supabaseAdmin } from "../../../../lib/supabase";
import {
  clearLeadAuthCookies,
  issueLeadSession,
  planLeadEnrichUpdate,
  resolveLeadSessionFromRequest,
  rotateLeadSessionForRequest,
  setLeadSessionCookie,
} from "@/lib/free-review/lead-session";

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

  let issued;
  try {
    issued = await issueLeadSession({ leadId: data.id });
  } catch {
    return NextResponse.json({ error: "Unable to establish free review session." }, { status: 500 });
  }

  const response = NextResponse.json({ lead: data });
  setLeadSessionCookie(response, issued.token);
  return response;
}

export async function PATCH(request) {
  const rateLimitResponse = rateLimit(request, { key: "free-review-lead-enrich", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const session = await resolveLeadSessionFromRequest(request);
  if (!session) {
    const denial = NextResponse.json(
      { error: "Free Review lead session is required to update this lead." },
      { status: 401 },
    );
    clearLeadAuthCookies(denial);
    return denial;
  }

  const body = await request.json().catch(() => ({}));
  const claimedLeadId = normalizeText(body.lead_id, 80);
  // Body lead_id is UX only; session proves identity. Mismatch → deny.
  if (claimedLeadId && claimedLeadId !== session.leadId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Lifecycle status is server-controlled; clients cannot set authorization-relevant status.
  if (
    Object.prototype.hasOwnProperty.call(body, "status") ||
    Object.prototype.hasOwnProperty.call(body, "lead_status")
  ) {
    return NextResponse.json({ error: "status_not_writable" }, { status: 400 });
  }

  // Conditional plan: revalidate exact status at UPDATE time (never trust resolve-only status).
  const enrichPlan = planLeadEnrichUpdate(session.leadStatus);
  if (!enrichPlan.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nextBusinessName = normalizeText(body.business_name || body.legal_company_name, 180);
  const updatePayload = {
    industry: normalizeText(body.industry, 120),
    revenue_range: normalizeText(body.revenue_range, 120),
    fiscal_year: normalizeText(body.fiscal_year, 120),
    additional_business_information:
      body.additional_business_information && typeof body.additional_business_information === "object"
        ? body.additional_business_information
        : {},
    updated_at: new Date().toISOString(),
  };
  // Only write status when advancing lead_captured → onboarding_started under exact predicate.
  if (enrichPlan.statusWrite) {
    updatePayload.status = enrichPlan.statusWrite;
  }
  if (nextBusinessName) {
    updatePayload.legal_company_name = nextBusinessName;
    updatePayload.business_name = nextBusinessName;
  }

  const { data, error } = await supabaseAdmin
    .from("free_review_leads")
    .update(updatePayload)
    .eq("id", session.leadId)
    .eq("status", enrichPlan.statusPredicate)
    .select("*")
    .maybeSingle();

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "Run the free review leads migration before enriching leads." }, { status: 501 });
  }

  if (error) {
    return NextResponse.json({ error: "Unable to enrich free review lead." }, { status: 500 });
  }

  // Zero rows ⇒ concurrent deactivation / status change — fail closed, no enrichment committed.
  if (!data?.id) {
    const denial = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    clearLeadAuthCookies(denial);
    return denial;
  }

  const response = NextResponse.json({ lead: data });
  // Rotate session at enrich lifecycle transition.
  await rotateLeadSessionForRequest({ request, response });
  return response;
}
