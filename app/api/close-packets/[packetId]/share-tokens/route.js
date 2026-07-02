import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveFirmAccess } from "@/lib/firm-security";
import { createShareToken } from "@/lib/close-packet/share-tokens";

export const runtime = "nodejs";

async function loadPacketClient(supabase, packetId) {
  const { data: packet } = await supabase
    .from("close_packets")
    .select("id, close_period_id, status")
    .eq("id", packetId)
    .maybeSingle();
  if (!packet) return { packet: null, firmClientId: null };
  const { data: closePeriod } = await supabase
    .from("close_periods")
    .select("id, firm_client_id")
    .eq("id", packet.close_period_id)
    .maybeSingle();
  return { packet, firmClientId: closePeriod?.firm_client_id ?? null };
}

export async function POST(request, { params }) {
  const { packetId } = await params;
  const body = await request.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();

  const { packet, firmClientId } = await loadPacketClient(supabase, packetId);
  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await resolveFirmAccess(request, { clientId: firmClientId });
  if (access.response) return access.response;

  // Only locked packets may be shared — prevents leaking drafts.
  if (packet.status !== "locked") {
    return NextResponse.json({ error: "Only locked packets can be shared" }, { status: 400 });
  }

  const { rawToken, tokenId, expiresAt } = await createShareToken({
    packetId,
    createdByUserId: access.userId,
    label: body.label ?? null,
    ttlDays: body.ttl_days ?? 7,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return NextResponse.json({
    ok: true,
    token_id: tokenId,
    expires_at: expiresAt,
    share_url: `${appUrl}/share/packet/${rawToken}`,
  });
}

export async function GET(request, { params }) {
  const { packetId } = await params;
  const supabase = getSupabaseAdmin();

  const { packet, firmClientId } = await loadPacketClient(supabase, packetId);
  if (!packet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = await resolveFirmAccess(request, { clientId: firmClientId });
  if (access.response) return access.response;

  const { data: tokens } = await supabase
    .from("close_packet_share_tokens")
    .select("id, created_at, expires_at, revoked_at, last_accessed_at, access_count, label")
    .eq("packet_id", packetId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ ok: true, tokens: tokens ?? [] });
}
