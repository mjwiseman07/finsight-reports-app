import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveFirmAccess } from "@/lib/firm-security";
import { revokeShareToken } from "@/lib/close-packet/share-tokens";

export const runtime = "nodejs";

export async function DELETE(request, { params }) {
  const { packetId, tokenId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: packet } = await supabase
    .from("close_packets")
    .select("id, close_period_id")
    .eq("id", packetId)
    .maybeSingle();
  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: closePeriod } = await supabase
    .from("close_periods")
    .select("id, firm_client_id")
    .eq("id", packet.close_period_id)
    .maybeSingle();

  const access = await resolveFirmAccess(request, { clientId: closePeriod?.firm_client_id ?? null });
  if (access.response) return access.response;

  await revokeShareToken({ tokenId, packetId });
  return NextResponse.json({ ok: true });
}
