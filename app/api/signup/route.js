import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { rateLimit } from "../../../lib/rate-limit";

function isDuplicateEmailError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("already") ||
    message.includes("duplicate") ||
    message.includes("registered") ||
    message.includes("exists")
  );
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "signup", limit: 5, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const { first_name, last_name, business_name, email, password } = await request.json();

  if (!first_name || !last_name || !business_name || !email || !password) {
    return NextResponse.json(
      { error: "first_name, last_name, business_name, email, and password are required" },
      { status: 400 },
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name,
      last_name,
      business_name,
    },
  });

  if (authError) {
    console.error("[api/signup] Supabase auth user creation failed", {
      message: authError.message,
      code: authError.code,
      status: authError.status,
      name: authError.name,
    });

    return NextResponse.json(
      { error: authError.message, code: authError.code },
      { status: isDuplicateEmailError(authError) ? 409 : 400 },
    );
  }

  const userId = authData?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Supabase did not return a user id" }, { status: 500 });
  }

  // public.users row is created by handle_new_auth_user from raw_user_meta_data
  // (first_name / last_name / business_name already passed in user_metadata above).
  // ip_address_signup is request-derived — update-after-create only (FIX-USERS-PKEY).
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddressSignup = forwardedFor || null;

  if (ipAddressSignup) {
    const { error: ipErr } = await supabaseAdmin
      .from("users")
      .update({ ip_address_signup: ipAddressSignup })
      .eq("id", userId);
    if (ipErr) {
      console.error("[api/signup] failed to write ip_address_signup", {
        userId,
        message: ipErr.message,
        code: ipErr.code,
      });
    }
  }

  return NextResponse.json({ success: true, user_id: userId });
}
