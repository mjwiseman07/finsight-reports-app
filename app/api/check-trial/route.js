import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { rateLimit } from "../../../lib/rate-limit";

const priceIdToPlan = {
  [process.env.STRIPE_PRICE_PULSE_STARTER]: "pulse_starter",
  [process.env.STRIPE_PRICE_PULSE_PRO]: "pulse_pro",
  [process.env.STRIPE_PRICE_ADVISACOR_PROFESSIONAL]: "advisacor_professional",
  [process.env.STRIPE_PRICE_ADVISACOR_CFO]: "advisacor_cfo",
  [process.env.STRIPE_PRICE_ESSENTIAL]: "essential",
  [process.env.STRIPE_PRICE_PROFESSIONAL]: "professional",
  [process.env.STRIPE_PRICE_VIRTUAL_CFO]: "virtualCfo",
};

const userAccessColumns = "email, business_name, trial_used, subscription_status, subscription_price_id, subscription_plan";
const fallbackUserAccessColumns = "email, business_name, trial_used, subscription_status";

function isMissingColumnError(error) {
  const message = String(error?.message || "");
  return error?.code === "42703" || message.includes("column") || message.includes("schema cache");
}

async function resolvePrimaryPersona(userId) {
  try {
    const { data: membership, error } = await supabaseAdmin
      .from("company_users")
      .select("role, companies(primary_persona)")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return membership?.companies?.primary_persona || null;
  } catch {
    return null;
  }
}

function isDevelopmentBypassRequest(request) {
  if (process.env.NODE_ENV !== "development") return false;

  const headerBypass = request.headers.get("x-dev-bypass") === "true";
  const queryBypass = new URL(request.url).searchParams.get("x-dev-bypass") === "true";

  return headerBypass || queryBypass;
}

async function loadUserRecord(userId, selectColumns) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select(selectColumns)
    .eq("id", userId)
    .limit(1);

  return {
    data: Array.isArray(data) ? data[0] || null : null,
    error,
  };
}

async function loadUserRecordByEmail(email, selectColumns) {
  if (!email) return { data: null, error: null };

  const { data, error } = await supabaseAdmin
    .from("users")
    .select(selectColumns)
    .eq("email", email)
    .limit(1);

  return {
    data: Array.isArray(data) ? data[0] || null : null,
    error,
  };
}

async function loadUserAccessById(userId) {
  const result = await loadUserRecord(userId, userAccessColumns);
  if (!result.error || !isMissingColumnError(result.error)) return result;

  const fallbackResult = await loadUserRecord(userId, fallbackUserAccessColumns);
  return {
    data: fallbackResult.data
      ? {
          ...fallbackResult.data,
          subscription_price_id: null,
          subscription_plan: null,
        }
      : null,
    error: fallbackResult.error,
  };
}

async function loadUserAccessByEmail(email) {
  const result = await loadUserRecordByEmail(email, userAccessColumns);
  if (!result.error || !isMissingColumnError(result.error)) return result;

  const fallbackResult = await loadUserRecordByEmail(email, fallbackUserAccessColumns);
  return {
    data: fallbackResult.data
      ? {
          ...fallbackResult.data,
          subscription_price_id: null,
          subscription_plan: null,
        }
      : null,
    error: fallbackResult.error,
  };
}

async function createMissingUserRecord(authUser) {
  const metadata = authUser.user_metadata || {};
  const email = authUser.email || "";
  if (!email) return { data: null, error: null };

  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      id: authUser.id,
      email,
      first_name: metadata.first_name || "",
      last_name: metadata.last_name || "",
      business_name: metadata.business_name || "",
      trial_used: false,
      subscription_status: "trial",
    })
    .select(fallbackUserAccessColumns)
    .limit(1);

  return {
    data: Array.isArray(data)
      ? {
          ...(data[0] || {}),
          subscription_price_id: null,
          subscription_plan: null,
        }
      : null,
    error,
  };
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

  const userId = authData.user.id;
  const primaryPersona = await resolvePrimaryPersona(userId);

  let { data: userRecord, error: userError } = await loadUserAccessById(userId);

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!userRecord) {
    const emailLookup = await loadUserAccessByEmail(authData.user.email || "");

    if (emailLookup.error) {
      return NextResponse.json({ error: emailLookup.error.message }, { status: 500 });
    }

    userRecord = emailLookup.data;
  }

  if (!userRecord) {
    const createdUser = await createMissingUserRecord(authData.user);

    if (createdUser.error && isMissingColumnError(createdUser.error)) {
      return NextResponse.json({ error: "User profile table is missing required onboarding columns." }, { status: 501 });
    }

    if (createdUser.error) {
      return NextResponse.json({ error: createdUser.error.message }, { status: 500 });
    }

    userRecord = createdUser.data;
  }

  if (!userRecord) {
    return NextResponse.json({ error: "User record not found" }, { status: 404 });
  }

  const authSubscriptionStatus =
    authData.user.app_metadata?.subscription_status ||
    authData.user.user_metadata?.subscription_status ||
    null;
  const authSubscriptionPlan =
    authData.user.app_metadata?.subscription_plan ||
    authData.user.user_metadata?.subscription_plan ||
    null;

  if (userRecord.subscription_status === "active" || authSubscriptionStatus === "active") {
    const plan = userRecord.subscription_plan || priceIdToPlan[userRecord.subscription_price_id] || authSubscriptionPlan || null;
    return NextResponse.json({
      allowed: true,
      reason: "subscriber",
      email: userRecord.email || authData.user.email || "",
      business_name: userRecord.business_name || "",
      subscription_status: userRecord.subscription_status || authSubscriptionStatus,
      subscription_price_id: userRecord.subscription_price_id,
      subscription_plan: plan,
      primary_persona: primaryPersona,
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
      primary_persona: primaryPersona,
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
    primary_persona: primaryPersona,
  });
}
