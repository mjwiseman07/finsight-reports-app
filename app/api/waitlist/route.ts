import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const ALLOWED_SKUS = new Set([
  "owner_lite",
  "owner_pro",
  "accounting_pro",
  "firm",
  "enterprise_firm",
  "industry_premium",
]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { sku_key, email, persona_context, submitted_from, utm_source, utm_medium, utm_campaign } =
    body ?? {};

  if (!sku_key || !ALLOWED_SKUS.has(sku_key)) {
    return NextResponse.json({ error: "invalid_sku_key" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("sku_launch_waitlist").upsert(
    {
      sku_key,
      email: email.toLowerCase(),
      persona_context: persona_context ?? null,
      submitted_from: submitted_from ?? null,
      utm_source: utm_source ?? null,
      utm_medium: utm_medium ?? null,
      utm_campaign: utm_campaign ?? null,
    },
    { onConflict: "sku_key,email" },
  );

  if (error) {
    console.error("[api/waitlist] insert failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
