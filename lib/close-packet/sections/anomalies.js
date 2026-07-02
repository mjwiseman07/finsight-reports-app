import { completeJson } from "@/lib/close-packet/llm";

function periodLabel(closePeriod) {
  if (closePeriod?.period_label) return closePeriod.period_label;
  if (!closePeriod?.period_start) return "";
  const d = new Date(`${closePeriod.period_start}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return closePeriod.period_start;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export async function build(ctx) {
  const { firmClient, closePeriod, priorSections = {} } = ctx;
  try {
    const label = periodLabel(closePeriod);
    const pnl = priorSections.pnl ?? {};
    const bs = priorSections.bs ?? {};
    const cf = priorSections.cf ?? {};
    const varianceFlags = priorSections.variance?.flagged_items ?? [];
    const jeEntries = (priorSections.je_log?.entries ?? []).slice(0, 50);

    const system =
      "You are a controller reviewing a month-end close for anomalies that would concern the CFO. " +
      "Identify anomalies NOT already present in the variance flags provided. Categories to consider: " +
      "cash trending negative or below a 30-day operating expense floor; AR aging deterioration (if inferable from " +
      "balance sheet movement); expense category timing (e.g., prior-period expenses hitting this month); " +
      "round-dollar or repeated JE amounts suggesting adjusting entries out of place; new GL accounts appearing this " +
      "period; negative revenue lines (refunds/reversals) larger than normal. " +
      "Return up to 8 flags, ranked severity high -> low. Return an empty array if nothing is found. " +
      "Do NOT restate variance flags already caught. " +
      'Respond as JSON: {"flags": [{"severity": "high"|"med"|"low", "category": string, "description": string, "evidence": object}]}';

    const user = JSON.stringify({
      client: firmClient?.name ?? "the client",
      period: label,
      pnl_current_vs_prior: pnl,
      balance_sheet_current_vs_prior: bs,
      cash_flow: cf,
      variance_flags_already_caught: varianceFlags,
      top_50_journal_entries: jeEntries,
    });

    const result = await completeJson({
      system,
      user,
      temperature: 0.2,
      fallback: { flags: [] },
    });

    const flags = Array.isArray(result.data?.flags) ? result.data.flags.slice(0, 8) : [];

    return {
      status: "ok",
      flags,
      generated_by: result.source,
      generated_at: new Date().toISOString(),
    };
  } catch (err) {
    return { status: "error", error_message: err.message };
  }
}
