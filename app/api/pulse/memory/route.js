import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { rateLimit } from "../../../../lib/rate-limit";
import {
  buildPulseMemoryScore,
  buildPulseMemoryTimeline,
  demoPulseInsightMemory,
} from "../../../../lib/pulse-insight-memory";

async function resolveUser(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!token) return { response: NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 }) };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) {
    return { response: NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }) };
  }

  return { user: data.user };
}

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "pulse-memory", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    }

    const resolved = await resolveUser(request);
    if (resolved.response) return resolved.response;

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const clientId = searchParams.get("clientId");

    let query = supabaseAdmin
      .from("pulse_insight_memory")
      .select(
        "id, company_id, client_id, user_id, date_identified, insight_category, insight_type, severity, description, financial_impact, financial_impact_label, recommended_action, status, current_trend, follow_up_notes, source_type, source_reference, last_reviewed_at, created_at, updated_at",
      )
      .order("date_identified", { ascending: false })
      .limit(50);

    if (companyId) query = query.eq("company_id", companyId);
    else if (clientId) query = query.eq("client_id", clientId);
    else query = query.eq("user_id", resolved.user.id);

    const { data, error } = await query;
    const insights = error ? demoPulseInsightMemory : data || [];

    return NextResponse.json({
      insights,
      timeline: buildPulseMemoryTimeline(insights),
      score: buildPulseMemoryScore(insights),
      source: error ? "fallback" : "supabase",
    });
  } catch (error) {
    console.error("[pulse/memory] failed", { message: error?.message });
    return NextResponse.json(
      {
        insights: demoPulseInsightMemory,
        timeline: buildPulseMemoryTimeline(demoPulseInsightMemory),
        score: buildPulseMemoryScore(demoPulseInsightMemory),
        source: "fallback",
      },
      { status: 200 },
    );
  }
}
