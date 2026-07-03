import { NextResponse } from "next/server";
import { resolveFirmAccess } from "@/lib/firm-security.js";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PATTERN_TYPES = new Set([
  "vendor_gl_mapping",
  "recurring_pattern",
  "amount_range",
  "scan_run",
]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const firmClientId = url.searchParams.get("firm_client_id");
  if (!firmClientId) return NextResponse.json({ error: "missing_firm_client_id" }, { status: 400 });

  const access = (await resolveFirmAccess(req, { clientId: firmClientId })) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;

  const type = url.searchParams.get("type");
  if (type && !PATTERN_TYPES.has(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  const includeWeak = url.searchParams.get("include_weak") === "true";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 200);

  const supabase = getSupabaseAdmin();
  const { data: fc, error: fcErr } = await supabase
    .from("firm_clients")
    .select("company_id")
    .eq("id", firmClientId)
    .maybeSingle();
  if (fcErr) return NextResponse.json({ error: fcErr.message }, { status: 500 });
  if (!fc?.company_id) return NextResponse.json({ error: "firm_client_has_no_company" }, { status: 409 });

  let q = supabase
    .from("company_memory_records")
    .select("memory_id, memory_type, confidence_score, updated_at, payload")
    .eq("company_id", fc.company_id)
    .eq("memory_status", "active")
    .eq("persistence_status", "persisted")
    .order("updated_at", { ascending: false });

  if (type) {
    q = q.eq("memory_type", type);
  } else {
    q = q.in("memory_type", [...PATTERN_TYPES]);
  }

  // Fetch a little extra so weak-filtering does not starve the page.
  const { data, error } = await q.limit(includeWeak ? limit : limit * 2);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type PatternRow = {
    memory_id: string;
    memory_type: string;
    confidence_score: number | null;
    updated_at: string;
    payload: { weak?: boolean } | null;
  };
  let patterns = (data ?? []) as PatternRow[];
  if (!includeWeak) {
    patterns = patterns.filter((row) => row.payload?.weak !== true);
  }
  patterns = patterns.slice(0, limit);

  return NextResponse.json({ patterns });
}
