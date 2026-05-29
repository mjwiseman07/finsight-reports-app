import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getERPAdapter } from "../../../../lib/erp-adapters";

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
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

    const { data: userRecord } = await supabaseAdmin
      .from("users")
      .select("subscription_status, subscription_plan, subscription_price_id")
      .eq("id", authData.user.id)
      .maybeSingle();
    const currentSubscription =
      userRecord?.subscription_plan ||
      (userRecord?.subscription_price_id === process.env.STRIPE_PRICE_VIRTUAL_CFO
        ? "virtual_cfo"
        : userRecord?.subscription_price_id === process.env.STRIPE_PRICE_PROFESSIONAL
          ? "professional"
          : userRecord?.subscription_price_id === process.env.STRIPE_PRICE_ESSENTIAL
            ? "essential"
            : null);

    const adapter = getERPAdapter("quickbooks", authData.user.id);
    return NextResponse.json(await adapter.detectCapabilities({ currentSubscription }));
  } catch (error) {
    console.error("[quickbooks/detect-capabilities] failed", {
      message: error?.message,
      stack: error?.stack,
      fullError: error,
    });
    return NextResponse.json({ error: error?.message || "Unable to detect QuickBooks capabilities" }, { status: 500 });
  }
}
