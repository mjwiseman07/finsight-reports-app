import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveFirmAccess } from "@/lib/firm-security";
import { renderPacket } from "@/lib/close-packet/renderer";

export async function POST(req, { params }) {
  const { id: closePeriodId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: closePeriod } = await supabase
    .from("close_periods")
    .select("id, firm_client_id, status")
    .eq("id", closePeriodId)
    .maybeSingle();
  if (!closePeriod) {
    return NextResponse.json({ error: "Close period not found" }, { status: 404 });
  }

  const access = await resolveFirmAccess(req, { clientId: closePeriod.firm_client_id });
  if (access.response) return access.response;

  if (closePeriod.status === "locked") {
    return NextResponse.json({ error: "Packet is locked" }, { status: 409 });
  }

  const { data: latestPacket } = await supabase
    .from("close_packets")
    .select("id, status")
    .eq("close_period_id", closePeriodId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestPacket?.status === "locked") {
    return NextResponse.json({ error: "Packet is locked" }, { status: 409 });
  }

  try {
    const result = await renderPacket({
      closePeriodId,
      renderedByUserId: access.userId,
      forceRegenerate: true,
    });
    const section_statuses = Object.fromEntries(
      (result.sections || []).map((s) => [s.section_key, s.content_json?.status ?? "ok"]),
    );
    return NextResponse.json({
      ok: true,
      packet_id: result.packet?.id,
      section_statuses,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
