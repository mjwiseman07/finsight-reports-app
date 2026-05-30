import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { rateLimit } from "../../../lib/rate-limit";

const priceIdToPlan = {
  [process.env.STRIPE_PRICE_ESSENTIAL]: "essential",
  [process.env.STRIPE_PRICE_PROFESSIONAL]: "professional",
  [process.env.STRIPE_PRICE_VIRTUAL_CFO]: "virtualCfo",
};

function isMissingColumnError(error) {
  const message = String(error?.message || "");
  return error?.code === "42703" || message.includes("column") || message.includes("schema cache");
}

function isDevelopmentBypassRequest(request) {
  if (process.env.NODE_ENV !== "development") return false;

  const headerBypass = request.headers.get("x-dev-bypass") === "true";
  const queryBypass = new URL(request.url).searchParams.get("x-dev-bypass") === "true";

  return headerBypass || queryBypass;
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "check-trial", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  if (isDevelopmentBypassRequest(request)) {
    return NextResponse.json({ allowed: true, reason: "subscriber" });
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        allowed: false,
        reason: "supabase_not_configured",
        error: "Supabase is not configured for this deployment.",
      },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  if (!token) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authData?.user?.id) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  let { data: userRecord, error: userError } = await supabaseAdmin
    .from("users")
    .select("email, business_name, trial_used, subscription_status, subscription_price_id, subscription_plan")
    .eq("id", authData.user.id)
    .single();

  if (userError && isMissingColumnError(userError)) {
    const fallbackResult = await supabaseAdmin
      .from("users")
      .select("email, trial_used, subscription_status")
      .eq("id", authData.user.id)
      .single();

    userRecord = fallbackResult.data
      ? {
          ...fallbackResult.data,
          subscription_price_id: null,
          subscription_plan: null,
        }
      : null;
    userError = fallbackResult.error;
  }

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!userRecord) {
    return NextResponse.json({ error: "User record not found" }, { status: 404 });
  }

  if (userRecord.subscription_status === "active") {
    const plan = userRecord.subscription_plan || priceIdToPlan[userRecord.subscription_price_id] || null;
    return NextResponse.json({
      allowed: true,
      reason: "subscriber",
      email: userRecord.email || authData.user.email || "",
      business_name: userRecord.business_name || "",
      subscription_status: userRecord.subscription_status,
      subscription_price_id: userRecord.subscription_price_id,
      subscription_plan: plan,
    });
  }

  if (userRecord.trial_used === false) {
    return NextResponse.json({
      allowed: true,
      reason: "trial",
      email: userRecord.email || authData.user.email || "",
      business_name: userRecord.business_name || "",
      subscription_status: userRecord.subscription_status,
      subscription_price_id: userRecord.subscription_price_id,
      subscription_plan: null,
    });
  }

  return NextResponse.json({
    allowed: false,
    reason: "trial_expired",
    email: userRecord.email || authData.user.email || "",
    business_name: userRecord.business_name || "",
    subscription_status: userRecord.subscription_status,
    subscription_price_id: userRecord.subscription_price_id,
    subscription_plan: null,
  });
}
