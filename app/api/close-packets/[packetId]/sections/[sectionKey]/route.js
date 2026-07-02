import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveFirmAccess } from "@/lib/firm-security";

export async function PATCH(req, { params }) {
  const { packetId, sectionKey } = await params;
  const supabase = getSupabaseAdmin();

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body?.payload_json === "undefined") {
    return NextResponse.json({ error: "payload_json is required" }, { status: 400 });
  }

  // Resolve the firm client that owns this packet so we can auth-scope the caller.
  const { data: packet } = await supabase
    .from("close_packets")
    .select("id, status, close_period_id")
    .eq("id", packetId)
    .maybeSingle();
  if (!packet) {
    return NextResponse.json({ error: "Packet not found" }, { status: 404 });
  }
  if (packet.status === "locked") {
    return NextResponse.json({ error: "Packet is locked" }, { status: 409 });
  }

  const { data: closePeriod } = await supabase
    .from("close_periods")
    .select("id, firm_client_id")
    .eq("id", packet.close_period_id)
    .maybeSingle();
  if (!closePeriod) {
    return NextResponse.json({ error: "Close period not found" }, { status: 404 });
  }

  const access = await resolveFirmAccess(req, { clientId: closePeriod.firm_client_id });
  if (access.response) return access.response;

  const { data: updated, error } = await supabase
    .from("close_packet_sections")
    .update({
      content_json: body.payload_json,
      manually_edited: true,
      edited_by_user_id: access.userId,
      edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("packet_id", packetId)
    .eq("section_key", sectionKey)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, section: updated });
}
