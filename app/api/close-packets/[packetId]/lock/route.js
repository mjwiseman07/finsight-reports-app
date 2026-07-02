import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveFirmAccess } from "@/lib/firm-security";

export async function POST(req, { params }) {
  const { packetId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: packet } = await supabase
    .from("close_packets")
    .select("id, status, close_period_id")
    .eq("id", packetId)
    .maybeSingle();
  if (!packet) {
    return NextResponse.json({ error: "Packet not found" }, { status: 404 });
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

  const { data: sections } = await supabase
    .from("close_packet_sections")
    .select("section_key, content_json")
    .eq("packet_id", packetId);

  const failed = (sections || [])
    .filter((s) => s.content_json?.status === "error")
    .map((s) => s.section_key);
  if (failed.length > 0) {
    return NextResponse.json(
      { error: `Cannot lock: ${failed.length} sections have errors`, failed_sections: failed },
      { status: 400 },
    );
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("close_packets")
    .update({
      status: "locked",
      locked_at: nowIso,
      locked_signature_json: { locked_by_user_id: access.userId, locked_at: nowIso },
    })
    .eq("id", packetId)
    .select()
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Cascade the close period forward: drafting -> review_ready.
  await supabase
    .from("close_periods")
    .update({ status: "review_ready" })
    .eq("id", packet.close_period_id);

  return NextResponse.json({ ok: true, packet: updated });
}
