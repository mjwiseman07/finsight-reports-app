import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveFirmAccess } from "@/lib/firm-security";
import { renderPacketPdf } from "@/lib/close-packet/pdf";
import { uploadPacketPdf, signedUrlFor } from "@/lib/close-packet/pdf-storage";

export const runtime = "nodejs";
export const maxDuration = 60;

async function loadPacketAndClient(supabase, packetId) {
  const { data: packet } = await supabase
    .from("close_packets")
    .select("id, close_period_id, status, pdf_object_path")
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
  const supabase = getSupabaseAdmin();

  const { packet, firmClientId } = await loadPacketAndClient(supabase, packetId);
  if (!packet) return NextResponse.json({ error: "Packet not found" }, { status: 404 });

  const access = await resolveFirmAccess(request, { clientId: firmClientId });
  if (access.response) return access.response;

  // Block 6 entitlement gate.
  const { requireFlag } = await import("@/lib/review-assist/route-guard");
  const gate = await requireFlag(access.client.firm_id, "close_packet_generation");
  if (gate) return gate;

  let pdfBuffer;
  try {
    pdfBuffer = await renderPacketPdf({ closePeriodId: packet.close_period_id });
  } catch (err) {
    return NextResponse.json({ error: `PDF render failed: ${err.message}` }, { status: 500 });
  }

  let objectPath;
  try {
    objectPath = await uploadPacketPdf({
      packetId,
      closePeriodId: packet.close_period_id,
      pdfBuffer,
    });
  } catch (err) {
    return NextResponse.json({ error: `PDF upload failed: ${err.message}` }, { status: 500 });
  }

  await supabase
    .from("close_packets")
    .update({
      pdf_object_path: objectPath,
      pdf_generated_at: new Date().toISOString(),
      pdf_url: null,
      rendered_by_user_id: access.userId,
      rendered_at: new Date().toISOString(),
    })
    .eq("id", packetId);

  const signedUrl = await signedUrlFor(objectPath, 300);
  return NextResponse.json({ ok: true, signed_url: signedUrl, object_path: objectPath });
}

// GET returns a fresh signed URL for the existing PDF (no re-render).
export async function GET(request, { params }) {
  const { packetId } = await params;
  const supabase = getSupabaseAdmin();

  const { packet, firmClientId } = await loadPacketAndClient(supabase, packetId);
  if (!packet) return NextResponse.json({ error: "Packet not found" }, { status: 404 });

  const access = await resolveFirmAccess(request, { clientId: firmClientId });
  if (access.response) return access.response;

  if (!packet.pdf_object_path) {
    return NextResponse.json({ error: "PDF not yet generated" }, { status: 404 });
  }
  const signedUrl = await signedUrlFor(packet.pdf_object_path, 300);
  return NextResponse.json({ ok: true, signed_url: signedUrl });
}
