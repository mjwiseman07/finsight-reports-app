import { notFound } from "next/navigation";
import { verifyShareToken, recordShareAccess } from "@/lib/close-packet/share-tokens";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { signedUrlFor } from "@/lib/close-packet/pdf-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function periodLabel(closePeriod) {
  if (!closePeriod?.period_start) return "";
  const d = new Date(`${closePeriod.period_start}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return closePeriod.period_start;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function SharedPacketPage({ params }) {
  const { token } = await params;
  const verification = await verifyShareToken(token);

  if (!verification.valid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#111112] px-6 text-white">
        <div className="max-w-lg text-center">
          <h1 className="mb-3 text-2xl font-semibold">Link unavailable</h1>
          <p className="text-white/60">
            {verification.reason === "expired"
              ? "This share link has expired."
              : verification.reason === "revoked"
                ? "This share link was revoked."
                : "This share link is invalid."}
          </p>
          <p className="mt-6 text-sm text-white/40">Contact the sender for a new link.</p>
        </div>
      </main>
    );
  }

  await recordShareAccess(verification.tokenId);

  const supabase = getSupabaseAdmin();
  const { data: packet } = await supabase
    .from("close_packets")
    .select("id, close_period_id, pdf_object_path, locked_at")
    .eq("id", verification.packetId)
    .maybeSingle();
  if (!packet?.pdf_object_path) notFound();

  const { data: period } = await supabase
    .from("close_periods")
    .select("period_start, period_end, firm_client_id")
    .eq("id", packet.close_period_id)
    .maybeSingle();

  const { data: firmClient } = period?.firm_client_id
    ? await supabase.from("firm_clients").select("name").eq("id", period.firm_client_id).maybeSingle()
    : { data: null };

  const signedUrl = await signedUrlFor(packet.pdf_object_path, 300);
  const label = periodLabel(period);

  return (
    <main className="min-h-screen bg-[#111112] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <div className="text-sm text-white/50">Close Packet</div>
          <div className="text-lg font-medium">
            {firmClient?.name || "Client"}
            {label ? ` · ${label}` : ""}
          </div>
        </div>
        <a
          href={signedUrl}
          download
          className="rounded-lg bg-[#C9A961] px-4 py-2 text-sm font-medium text-black hover:bg-[#d8b972]"
        >
          Download PDF
        </a>
      </header>
      <div className="p-6">
        <iframe
          src={signedUrl}
          className="h-[calc(100vh-140px)] w-full rounded-xl border border-white/10 bg-white"
          title="Close Packet"
        />
      </div>
    </main>
  );
}
