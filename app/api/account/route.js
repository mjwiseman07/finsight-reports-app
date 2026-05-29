import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

export async function PATCH(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  if (!token) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authData?.user?.id) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const { business_name: businessName } = await request.json().catch(() => ({}));
  const trimmedBusinessName = typeof businessName === "string" ? businessName.trim() : "";

  const { data, error } = await supabaseAdmin
    .from("users")
    .update({ business_name: trimmedBusinessName })
    .eq("id", authData.user.id)
    .select("email, business_name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    email: data.email || authData.user.email || "",
    business_name: data.business_name || "",
  });
}
