import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

const priceIdToPlan = {
  [process.env.STRIPE_PRICE_ESSENTIAL]: "essential",
  [process.env.STRIPE_PRICE_PROFESSIONAL]: "professional",
  [process.env.STRIPE_PRICE_VIRTUAL_CFO]: "virtualCfo",
};

export async function POST(request) {
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
    .select("trial_used, subscription_status, subscription_price_id, subscription_plan")
    .eq("id", authData.user.id)
    .single();

  if (
    userError &&
    (userError.code === "42703" || String(userError.message || "").includes("subscription_price_id"))
  ) {
    const fallbackResult = await supabaseAdmin
      .from("users")
      .select("trial_used, subscription_status")
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
      subscription_status: userRecord.subscription_status,
      subscription_price_id: userRecord.subscription_price_id,
      subscription_plan: plan,
    });
  }

  if (userRecord.trial_used === false) {
    return NextResponse.json({
      allowed: true,
      reason: "trial",
      subscription_status: userRecord.subscription_status,
      subscription_price_id: userRecord.subscription_price_id,
      subscription_plan: null,
    });
  }

  return NextResponse.json({
    allowed: false,
    reason: "trial_expired",
    subscription_status: userRecord.subscription_status,
    subscription_price_id: userRecord.subscription_price_id,
    subscription_plan: null,
  });
}
