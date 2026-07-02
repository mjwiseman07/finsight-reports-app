import { getSupabaseAdmin } from "@/lib/supabase-admin";

import { build as buildCover } from "./sections/cover";
import { build as buildExecSummary } from "./sections/exec_summary";
import { build as buildPnl } from "./sections/pnl";
import { build as buildBs } from "./sections/bs";
import { build as buildCf } from "./sections/cf";
import { build as buildVariance } from "./sections/variance";
import { build as buildJeLog } from "./sections/je_log";
import { build as buildRecon } from "./sections/recon";
import { build as buildAnomalies } from "./sections/anomalies";
import { build as buildChecklist } from "./sections/checklist";
import { build as buildDisclaimer } from "./sections/disclaimer";

// Execution order matters: variance depends on pnl, cf depends on bs, and
// exec_summary (C3) references nearly everything, so it runs last. The persisted
// sort_order is derived from a fixed display order (below), not execution order.
const SECTION_PIPELINE = [
  { key: "cover", builder: buildCover, ai: false },
  { key: "pnl", builder: buildPnl, ai: false },
  { key: "bs", builder: buildBs, ai: false },
  { key: "cf", builder: buildCf, ai: false },
  { key: "variance", builder: buildVariance, ai: true },
  { key: "je_log", builder: buildJeLog, ai: false },
  { key: "recon", builder: buildRecon, ai: false },
  { key: "anomalies", builder: buildAnomalies, ai: true },
  { key: "checklist", builder: buildChecklist, ai: false },
  { key: "disclaimer", builder: buildDisclaimer, ai: false },
  { key: "exec_summary", builder: buildExecSummary, ai: true },
];

// Fixed display order for the rendered packet (exec_summary appears near the top
// even though it is built last).
const SECTION_DISPLAY_ORDER = [
  "cover",
  "exec_summary",
  "pnl",
  "bs",
  "cf",
  "variance",
  "je_log",
  "recon",
  "anomalies",
  "checklist",
  "disclaimer",
];

function displaySortOrder(key) {
  const idx = SECTION_DISPLAY_ORDER.indexOf(key);
  return (idx === -1 ? SECTION_DISPLAY_ORDER.length : idx + 1) * 10;
}

async function loadRenderContext(supabase, closePeriodId) {
  const { data: closePeriod, error: cpErr } = await supabase
    .from("close_periods")
    .select("*")
    .eq("id", closePeriodId)
    .single();
  if (cpErr || !closePeriod) {
    throw new Error(cpErr?.message || `close period ${closePeriodId} not found`);
  }

  const { data: firmClient } = await supabase
    .from("firm_clients")
    .select("id, firm_id, name, owner_user_id")
    .eq("id", closePeriod.firm_client_id)
    .maybeSingle();

  let firm = null;
  if (firmClient?.firm_id) {
    const { data: firmRow } = await supabase
      .from("firms")
      .select("id, name, logo_url, advisor_name, footer_disclaimer")
      .eq("id", firmClient.firm_id)
      .maybeSingle();
    firm = firmRow || null;
  }

  const { data: checklistRun } = await supabase
    .from("close_checklist_runs")
    .select("*, close_checklist_run_items(*, close_checklist_items(*))")
    .eq("close_period_id", closePeriodId)
    .maybeSingle();

  return { closePeriod, firmClient, firm, checklistRun };
}

export async function renderPacket({
  closePeriodId,
  preparer = null,
  reviewer = null,
  renderedByUserId = null,
  forceRegenerate = false,
}) {
  const startedAt = Date.now();
  const supabase = getSupabaseAdmin();

  const { data: prior } = await supabase
    .from("close_packets")
    .select("id, version, status")
    .eq("close_period_id", closePeriodId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prior?.status === "locked") {
    throw new Error("Packet is locked");
  }

  if (prior && !forceRegenerate) {
    const { data: existingSections } = await supabase
      .from("close_packet_sections")
      .select("*")
      .eq("packet_id", prior.id)
      .order("sort_order");
    const { data: packet } = await supabase
      .from("close_packets")
      .select("*")
      .eq("id", prior.id)
      .single();
    return { packet, sections: existingSections || [], reused: true };
  }

  const context = await loadRenderContext(supabase, closePeriodId);
  const version = (prior?.version || 0) + 1;

  const ctx = { ...context, preparer, reviewer, version, supabase, priorSections: {} };

  const builtSections = [];
  for (let i = 0; i < SECTION_PIPELINE.length; i += 1) {
    const { key, builder, ai } = SECTION_PIPELINE[i];
    let content;
    try {
      content = await builder(ctx);
    } catch (err) {
      content = { status: "error", error_message: err.message };
    }
    ctx.priorSections[key] = content;
    builtSections.push({
      section_key: key,
      sort_order: displaySortOrder(key),
      is_included: true,
      content_json: content,
      ai_generated: ai,
    });
  }

  builtSections.sort((a, b) => a.sort_order - b.sort_order);

  const payload = Object.fromEntries(
    builtSections.map((s) => [s.section_key, s.content_json]),
  );

  const { data: packet, error: packetErr } = await supabase
    .from("close_packets")
    .insert({
      close_period_id: closePeriodId,
      version,
      status: "draft",
      payload_json: payload,
      rendered_by_user_id: renderedByUserId,
    })
    .select()
    .single();
  if (packetErr) throw new Error(packetErr.message);

  const sectionRows = builtSections.map((s) => ({
    packet_id: packet.id,
    section_key: s.section_key,
    sort_order: s.sort_order,
    is_included: s.is_included,
    content_json: s.content_json,
    ai_generated: s.ai_generated,
  }));

  const { data: sections, error: sectionsErr } = await supabase
    .from("close_packet_sections")
    .insert(sectionRows)
    .select();
  if (sectionsErr) throw new Error(sectionsErr.message);

  return {
    packet,
    sections: sections || [],
    reused: false,
    durationMs: Date.now() - startedAt,
    sectionsRendered: sectionRows.length,
  };
}
