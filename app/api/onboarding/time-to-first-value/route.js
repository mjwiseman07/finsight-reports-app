import { NextResponse } from "next/server";
import { getAuthenticatedCompanyUser } from "../../../../lib/company-security";
import { rateLimit } from "../../../../lib/rate-limit";
import { supabaseAdmin } from "../../../../lib/supabase";
import { timeToFirstValueEvents } from "../../../../lib/onboarding-success";

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "time-to-first-value", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await getAuthenticatedCompanyUser(request);
  if (access.response) return access.response;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const eventType = String(body.event_type || "").trim();

  if (!timeToFirstValueEvents.includes(eventType)) {
    return NextResponse.json({ error: "Invalid time-to-first-value event type." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("time_to_first_value_events").insert({
    user_id: access.user.id,
    company_id: body.company_id || null,
    event_type: eventType,
    event_source: body.event_source || "app",
    account_type: body.account_type || null,
    step_label: body.step_label || null,
    estimated_seconds_remaining: Number.isFinite(Number(body.estimated_seconds_remaining))
      ? Number(body.estimated_seconds_remaining)
      : null,
    metadata: body.metadata || {},
  });

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "Run the time-to-first-value migration first." }, { status: 501 });
  }

  if (error) {
    return NextResponse.json({ error: "Unable to track time-to-first-value event." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
