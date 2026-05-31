import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { rateLimit } from "../../../lib/rate-limit";

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "mark-trial-used", limit: 10, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase is not configured for this deployment." }, { status: 503 });
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

  // Call this route only after a report has been successfully generated.
  let { data: userRows, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, reports_generated")
    .eq("id", authData.user.id)
    .limit(1);

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  let userRecord = Array.isArray(userRows) ? userRows[0] || null : null;

  if (!userRecord && authData.user.email) {
    const fallbackResult = await supabaseAdmin
      .from("users")
      .select("id, reports_generated")
      .eq("email", authData.user.email)
      .limit(1);

    if (fallbackResult.error) {
      return NextResponse.json({ error: fallbackResult.error.message }, { status: 500 });
    }

    userRows = fallbackResult.data;
    userRecord = Array.isArray(userRows) ? userRows[0] || null : null;
  }

  if (!userRecord) {
    return NextResponse.json({ error: "User record not found" }, { status: 404 });
  }

  const reportsGenerated = Number(userRecord?.reports_generated || 0) + 1;

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({
      trial_used: true,
      reports_generated: reportsGenerated,
    })
    .eq("id", userRecord.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
