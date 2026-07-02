import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { headingFont } from "@/components/site-ui";
import PacketPageClient from "./PacketPageClient";
import RegenerateButton from "./RegenerateButton";

export const dynamic = "force-dynamic";

const PRINT_CSS = `
@media print {
  .no-print { display: none !important; }
  .section-card { break-inside: avoid; page-break-inside: avoid; }
  body { background: white !important; color: black !important; }
  .section-card { background: white !important; border: 1px solid #ddd !important; color: black !important; }
  .section-card h2, .section-card h3 { color: black !important; }
}
`;

function periodLabel(closePeriod) {
  if (closePeriod?.period_label) return closePeriod.period_label;
  if (!closePeriod?.period_start) return "";
  const d = new Date(`${closePeriod.period_start}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return closePeriod.period_start;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function PacketPage({ params }) {
  const { id: closePeriodId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: closePeriod } = await supabase
    .from("close_periods")
    .select("id, firm_client_id, period_start, period_end, status")
    .eq("id", closePeriodId)
    .maybeSingle();

  const { data: firmClient } = closePeriod?.firm_client_id
    ? await supabase
        .from("firm_clients")
        .select("id, name, firm_id")
        .eq("id", closePeriod.firm_client_id)
        .maybeSingle()
    : { data: null };

  const { data: firm } = firmClient?.firm_id
    ? await supabase.from("firms").select("id, name").eq("id", firmClient.firm_id).maybeSingle()
    : { data: null };

  const { data: packet } = await supabase
    .from("close_packets")
    .select("id, version, status, locked_at, rendered_at")
    .eq("close_period_id", closePeriodId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: sections } = packet
    ? await supabase
        .from("close_packet_sections")
        .select("id, section_key, sort_order, content_json, manually_edited")
        .eq("packet_id", packet.id)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const label = periodLabel(closePeriod);
  const clientName = firmClient?.name || "Client";
  const firmName = firm?.name || "";

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {!closePeriod ? (
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className={`${headingFont} text-2xl text-white`}>Close period not found</h1>
          <p className="mt-2 text-white/60">This close period does not exist or was removed.</p>
        </div>
      ) : !packet ? (
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className={`${headingFont} text-3xl text-white`}>{clientName}</h1>
          <p className="mt-2 text-white/60">{label}</p>
          <p className="mt-8 text-white/70">No close packet has been generated yet.</p>
          <div className="mt-6 flex justify-center">
            <RegenerateButton closePeriodId={closePeriodId} packetLocked={false} label="Generate Packet" />
          </div>
        </div>
      ) : (
        <PacketPageClient
          closePeriodId={closePeriodId}
          packet={packet}
          clientName={clientName}
          firmName={firmName}
          periodLabel={label}
          sections={sections || []}
        />
      )}
    </div>
  );
}
