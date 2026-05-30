import { NextResponse } from "next/server";
import { firmAiMemoryBoundaries } from "../../../../../lib/advisory-firm-portal";
import { auditFirmEvent, resolveFirmAccess } from "../../../../../lib/firm-security";
import { rateLimit } from "../../../../../lib/rate-limit";
import { supabaseAdmin } from "../../../../../lib/supabase";

const allowedMemoryTypes = new Set([
  "client_context",
  "historical_package_trend",
  "prior_executive_summary",
  "recurring_concern",
  "operational_trend",
]);

export async function GET(request, context) {
  const rateLimitResponse = rateLimit(request, { key: "firm-client-memory", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const { clientId } = await context.params;
  const access = await resolveFirmAccess(request, { clientId });
  if (access.response) return access.response;

  const { data, error } = await supabaseAdmin
    .from("client_ai_memory")
    .select("id, memory_type, summary, source_period, created_at, updated_at")
    .eq("firm_id", access.client.firm_id)
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "Client AI memory storage is not configured yet." }, { status: 501 });
  }

  if (error) {
    return NextResponse.json({ error: "Unable to load client AI memory." }, { status: 500 });
  }

  await auditFirmEvent({
    eventType: "firm_client_memory_opened",
    firmId: access.client.firm_id,
    clientId,
    actorUserId: access.userId,
  });

  return NextResponse.json({
    client: access.client,
    boundaries: firmAiMemoryBoundaries,
    memory: data || [],
  });
}

export async function POST(request, context) {
  const rateLimitResponse = rateLimit(request, { key: "firm-client-memory-write", limit: 12, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const { clientId } = await context.params;
  const access = await resolveFirmAccess(request, { clientId });
  if (access.response) return access.response;

  const body = await request.json().catch(() => ({}));
  const memoryType = String(body.memory_type || "").trim();
  const summary = String(body.summary || "").trim();

  if (!allowedMemoryTypes.has(memoryType)) {
    return NextResponse.json({ error: "Invalid client memory type." }, { status: 400 });
  }

  if (summary.length < 3 || summary.length > 1200) {
    return NextResponse.json({ error: "Client memory summary must be between 3 and 1200 characters." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("client_ai_memory")
    .insert({
      firm_id: access.client.firm_id,
      client_id: clientId,
      memory_type: memoryType,
      summary,
      source_period: body.source_period || null,
      created_by: access.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, memory_type, summary, source_period, created_at, updated_at")
    .single();

  if (error?.code === "42P01") {
    return NextResponse.json({ error: "Client AI memory storage is not configured yet." }, { status: 501 });
  }

  if (error) {
    return NextResponse.json({ error: "Unable to save client AI memory." }, { status: 500 });
  }

  await auditFirmEvent({
    eventType: "firm_client_memory_saved",
    firmId: access.client.firm_id,
    clientId,
    actorUserId: access.userId,
    metadata: { memory_type: memoryType },
  });

  return NextResponse.json({ memory: data });
}
