import { NextResponse } from "next/server";
import { rateLimit } from "../../../../lib/rate-limit";
import { supabaseAdmin } from "../../../../lib/supabase";
import { auditOwnerEvent } from "../../../../lib/owner-security";

function requireBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

async function getAuthenticatedUser(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  if (!token) return { response: NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 }) };

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData?.user?.id) {
    return { response: NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }) };
  }

  return { user: authData.user };
}

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "owner-delivery-settings", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured for owner delivery settings." }, { status: 503 });
  }

  const auth = await getAuthenticatedUser(request);
  if (auth.response) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("owner_delivery_settings")
    .select("*")
    .eq("owner_user_id", auth.user.id)
    .maybeSingle();

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "Owner delivery settings storage is not configured yet." }, { status: 501 });
  }

  if (error) {
    return NextResponse.json({ error: "Unable to load owner delivery settings." }, { status: 500 });
  }

  return NextResponse.json({ settings: data || null });
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "owner-delivery-settings", limit: 10, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured for owner delivery settings." }, { status: 503 });
  }

  const auth = await getAuthenticatedUser(request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const recipientEmail = String(body.recipient_email || auth.user.email || "").trim();

  if (!recipientEmail || !recipientEmail.includes("@")) {
    return NextResponse.json({ error: "A valid owner recipient email is required." }, { status: 400 });
  }

  const settings = {
    owner_user_id: auth.user.id,
    persona: "business-owner",
    weekly_brief_enabled: requireBoolean(body.weekly_brief_enabled, true),
    monthly_package_enabled: requireBoolean(body.monthly_package_enabled, true),
    delivery_day: String(body.delivery_day || "Friday").trim(),
    delivery_time: String(body.delivery_time || "8:00 AM").trim(),
    recipient_email: recipientEmail,
    require_approval_before_sending: requireBoolean(body.require_approval_before_sending, true),
    auto_send_enabled: requireBoolean(body.auto_send_enabled, false),
    package_level: ["essential", "professional", "virtualCfo"].includes(body.package_level)
      ? body.package_level
      : "essential",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("owner_delivery_settings")
    .upsert(settings, { onConflict: "owner_user_id" })
    .select("*")
    .single();

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "Owner delivery settings storage is not configured yet." }, { status: 501 });
  }

  if (error) {
    return NextResponse.json({ error: "Unable to save owner delivery settings." }, { status: 500 });
  }

  await auditOwnerEvent({
    eventType: "owner_delivery_settings_saved",
    ownerUserId: auth.user.id,
    metadata: {
      persona: "business-owner",
      weekly_brief_enabled: settings.weekly_brief_enabled,
      monthly_package_enabled: settings.monthly_package_enabled,
      package_level: settings.package_level,
    },
  });

  return NextResponse.json({ settings: data });
}
