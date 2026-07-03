import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security.js";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const firmClientId = url.searchParams.get("firm_client_id");
  if (!firmClientId) return NextResponse.json({ error: "missing_firm_client_id" }, { status: 400 });

  const access = (await resolveFirmAccess(req, { clientId: firmClientId })) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;

  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("je_posting_audit")
    .select("*")
    .eq("firm_client_id", firmClientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attempts: data });
}
